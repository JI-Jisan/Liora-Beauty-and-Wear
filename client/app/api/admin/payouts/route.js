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
    const filterPeriod = searchParams.get("period") || "all"; // 'all' | 'today' | 'this_week' | 'this_month'
    const searchQuery = (searchParams.get("search") || "").trim();

    // Time calculations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const query = {
      type: "payout_withdrawal",
      isDeleted: { $ne: true },
    };

    if (filterStatus !== "all") {
      query.status = filterStatus;
    }

    if (filterPeriod === "today") {
      query.createdAt = { $gte: startOfToday };
    } else if (filterPeriod === "this_week") {
      query.createdAt = { $gte: startOfWeek };
    } else if (filterPeriod === "this_month") {
      query.createdAt = { $gte: startOfMonth };
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
      .limit(300)
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

    // Calculate comprehensive stats (Today, Week, Month, All-Time)
    const allCompleted = await ResellerLedger.find({
      type: "payout_withdrawal",
      status: "completed",
      isDeleted: { $ne: true },
    }).select("amount createdAt").lean();

    let todayAmount = 0;
    let todayCount = 0;
    let weekAmount = 0;
    let weekCount = 0;
    let monthAmount = 0;
    let monthCount = 0;
    let totalCompletedAmount = 0;
    let totalCompletedCount = allCompleted.length;

    allCompleted.forEach((item) => {
      const amt = Math.abs(item.amount);
      const d = new Date(item.createdAt);
      totalCompletedAmount += amt;

      if (d >= startOfToday) {
        todayAmount += amt;
        todayCount++;
      }
      if (d >= startOfWeek) {
        weekAmount += amt;
        weekCount++;
      }
      if (d >= startOfMonth) {
        monthAmount += amt;
        monthCount++;
      }
    });

    // Pending stats
    const pendingItems = await ResellerLedger.find({
      type: "payout_withdrawal",
      status: "pending",
      isDeleted: { $ne: true },
    }).select("amount").lean();

    const pendingCount = pendingItems.length;
    const pendingAmount = pendingItems.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

    // Cancelled stats
    const cancelledCount = await ResellerLedger.countDocuments({
      type: "payout_withdrawal",
      status: "cancelled",
      isDeleted: { $ne: true },
    });

    // List of resellers with positive balance (ready to be paid directly)
    const payableResellers = await Customer.find({
      role: { $in: ["reseller", "team_leader"] },
      walletBalance: { $gt: 0 },
      status: { $ne: "suspended" },
    })
      .select("email name phone resellerStoreName resellerStorePhone walletBalance")
      .sort({ walletBalance: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      payouts,
      payableResellers,
      stats: {
        todayAmount,
        todayCount,
        weekAmount,
        weekCount,
        monthAmount,
        monthCount,
        totalCompletedAmount,
        totalCompletedCount,
        pendingCount,
        pendingAmount,
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
    const {
      action,
      ledgerId,
      resellerEmail,
      amount,
      payoutMethod,
      payoutAccount,
      adminSenderAccount,
      transactionId,
      adminNote,
      reason,
    } = body;

    // ACTION: Direct Instant Payout without prior request
    if (action === "direct_pay") {
      const cleanEmail = (resellerEmail || "").toLowerCase().trim();
      const numAmount = Number(amount);

      if (!cleanEmail) {
        return NextResponse.json({ message: "রিসেলার নির্বাচন করুন" }, { status: 400 });
      }
      if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ message: "সঠিক টাকার পরিমাণ দিন" }, { status: 400 });
      }
      if (!payoutAccount || payoutAccount.trim().length < 11) {
        return NextResponse.json({ message: "সঠিক বিকাশ/নগদ প্রাপক নম্বর দিন" }, { status: 400 });
      }
      if (!transactionId || !transactionId.trim()) {
        return NextResponse.json({ message: "বিকাশ/নগদ Transaction ID (TrxID) দেওয়া আবশ্যক" }, { status: 400 });
      }

      const customer = await Customer.findOne({ email: cleanEmail });
      if (!customer) {
        return NextResponse.json({ message: "রিসেলার অ্যাকাউন্ট পাওয়া যায়নি" }, { status: 404 });
      }

      // Deduct from wallet balance
      const prevBalance = customer.walletBalance || 0;
      customer.walletBalance = Math.max(0, prevBalance - numAmount);
      await customer.save();

      const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;

      const ledger = await ResellerLedger.create({
        resellerUid: customer.firebaseUid || "",
        resellerEmail: customer.email,
        type: "payout_withdrawal",
        amount: -numAmount,
        balanceAfter: customer.walletBalance,
        status: "completed",
        payoutMethod: payoutMethod || "bKash",
        payoutAccount: payoutAccount.trim(),
        adminSenderAccount: (adminSenderAccount || "").trim(),
        transactionId: transactionId.trim().toUpperCase(),
        paidAt: new Date(),
        processedBy: admin.email || "admin",
        adminNote: adminNote || "অ্যাডমিন কর্তৃক সরাসরি পে-আউট",
        receiptNumber,
      });

      return NextResponse.json({
        success: true,
        message: `৳${numAmount.toLocaleString()} টাকা সফলভাবে পরিশোধ করা হয়েছে ও রিসিট ${receiptNumber} তৈরি হয়েছে!`,
        payout: ledger,
        customer,
      });
    }

    // Existing actions require ledgerId
    if (!ledgerId) {
      return NextResponse.json({ message: "রেকর্ড আইডি আবশ্যক" }, { status: 400 });
    }

    const ledger = await ResellerLedger.findById(ledgerId);
    if (!ledger || ledger.isDeleted) {
      return NextResponse.json({ message: "পে-আউট রেকর্ড পাওয়া যায়নি" }, { status: 404 });
    }

    // ACTION: Mark as Paid for requested payouts
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
