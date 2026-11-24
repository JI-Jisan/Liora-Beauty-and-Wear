import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer, ResellerLedger } from "@/lib/models";
import { getAdminFromRequest } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "অননুমোদিত: অ্যাডমিন টোকেন প্রয়োজন" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get("status") || "all"; // 'all' | 'pending' | 'completed' | 'cancelled'
    const searchQuery = (searchParams.get("search") || "").trim();

    const query = {
      type: "payout_withdrawal",
      isDeleted: { $ne: true },
    };

    if (filterStatus !== "all") {
      query.status = filterStatus;
    }

    if (searchQuery) {
      query.$or = [
        { resellerEmail: { $regex: searchQuery, $options: "i" } },
        { payoutAccount: { $regex: searchQuery, $options: "i" } },
        { transactionId: { $regex: searchQuery, $options: "i" } },
        { receiptNumber: { $regex: searchQuery, $options: "i" } },
        { adminSenderAccount: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const rawPayouts = await ResellerLedger.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Fetch customer details to enrich
    const emails = [...new Set(rawPayouts.map((p) => (p.resellerEmail || "").toLowerCase().trim()).filter(Boolean))];
    const customers = await Customer.find({ email: { $in: emails } })
      .select("email name phone resellerStoreName resellerStorePhone walletBalance")
      .lean();

    const customerMap = new Map();
    customers.forEach((c) => {
      if (c.email) customerMap.set(c.email.toLowerCase().trim(), c);
    });

    const payouts = rawPayouts.map((p) => {
      const email = (p.resellerEmail || "").toLowerCase().trim();
      const cust = customerMap.get(email) || {};
      return {
        ...p,
        resellerName: cust.name || "",
        resellerPhone: cust.phone || "",
        resellerStoreName: cust.resellerStoreName || "",
        resellerStorePhone: cust.resellerStorePhone || "",
        currentWalletBalance: cust.walletBalance ?? 0,
      };
    });

    // Calculate overall stats
    const statsAgg = await ResellerLedger.aggregate([
      {
        $match: {
          type: "payout_withdrawal",
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: { $abs: "$amount" } },
        },
      },
    ]);

    let pendingCount = 0;
    let pendingAmount = 0;
    let completedCount = 0;
    let completedAmount = 0;
    let cancelledCount = 0;

    statsAgg.forEach((s) => {
      if (s._id === "pending") {
        pendingCount = s.count;
        pendingAmount = s.totalAmount;
      } else if (s._id === "completed") {
        completedCount = s.count;
        completedAmount = s.totalAmount;
      } else if (s._id === "cancelled") {
        cancelledCount = s.count;
      }
    });

    return NextResponse.json({
      success: true,
      payouts,
      stats: {
        pendingCount,
        pendingAmount,
        completedCount,
        completedAmount,
        cancelledCount,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/payouts error:", err);
    return NextResponse.json({ message: "পে-আউট ডাটা লোড ব্যর্থ: " + err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "অননুমোদিত: অ্যাডমিন টোকেন প্রয়োজন" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const { action, ledgerId, adminSenderAccount, transactionId, adminNote, reason } = body;

    if (!ledgerId) {
      return NextResponse.json({ message: "রেকর্ড আইডি আবশ্যক" }, { status: 400 });
    }

    const ledger = await ResellerLedger.findById(ledgerId);
    if (!ledger || ledger.isDeleted) {
      return NextResponse.json({ message: "পে-আউট রেকর্ড পাওয়া যায়নি" }, { status: 404 });
    }

    // ACTION: Mark as Paid
    if (action === "mark_paid") {
      if (!transactionId || !transactionId.trim()) {
        return NextResponse.json({ message: "বিকাশ/নগদ Transaction ID (TrxID) দেওয়া আবশ্যক" }, { status: 400 });
      }

      const receiptNumber = ledger.receiptNumber || `RCP-${Date.now().toString().slice(-6)}`;

      ledger.status = "completed";
      ledger.adminSenderAccount = (adminSenderAccount || "").trim();
      ledger.transactionId = transactionId.trim().toUpperCase();
      ledger.paidAt = new Date();
      ledger.processedBy = admin.email || "admin";
      ledger.adminNote = (adminNote || "").trim();
      ledger.receiptNumber = receiptNumber;

      await ledger.save();

      return NextResponse.json({
        success: true,
        message: `টাকা সফলভাবে পরিশোধ হিসেবে মার্ক করা হয়েছে! রিসিট নং: ${receiptNumber}`,
        payout: ledger,
      });
    }

    // ACTION: Reject & Refund
    if (action === "reject") {
      if (ledger.status !== "pending") {
        return NextResponse.json({ message: "শুধুমাত্র পেন্ডিং রিকোয়েস্ট রিজেক্ট ও রিফান্ড করা সম্ভব" }, { status: 400 });
      }

      ledger.status = "cancelled";
      ledger.adminNote = (reason || adminNote || "অ্যাডমিন কর্তৃক বাতিল").trim();
      ledger.processedBy = admin.email || "admin";
      await ledger.save();

      // Refund to Reseller Wallet
      const refundAmount = Math.abs(ledger.amount);
      const customer = await Customer.findOne({
        email: (ledger.resellerEmail || "").toLowerCase().trim(),
      });

      if (customer) {
        customer.walletBalance = (customer.walletBalance || 0) + refundAmount;
        await customer.save();

        await ResellerLedger.create({
          resellerUid: customer.firebaseUid || ledger.resellerUid,
          resellerEmail: customer.email,
          type: "manual_adjustment",
          amount: refundAmount,
          balanceAfter: customer.walletBalance,
          status: "completed",
          note: `পে-আউট রিকোয়েস্ট বাতিলপূর্বক রিফান্ড (কারণ: ${ledger.adminNote})`,
        });
      }

      return NextResponse.json({
        success: true,
        message: `রিকোয়েস্ট বাতিল করা হয়েছে এবং ৳${refundAmount} টাকা রিসেলারের ওয়ালেটে ফেরত দেওয়া হয়েছে।`,
        payout: ledger,
      });
    }

    // ACTION: Delete Record
    if (action === "delete") {
      ledger.isDeleted = true;
      await ledger.save();
      return NextResponse.json({
        success: true,
        message: "রেকর্ডটি সফলভাবে ডিলিট করা হয়েছে",
      });
    }

    return NextResponse.json({ message: "অজানা অ্যাকশন" }, { status: 400 });
  } catch (err) {
    console.error("PUT /api/admin/payouts error:", err);
    return NextResponse.json({ message: "অপারেশন ব্যর্থ: " + err.message }, { status: 500 });
  }
}
