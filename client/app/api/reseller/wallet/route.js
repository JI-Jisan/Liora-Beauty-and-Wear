import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer, Order, ResellerLedger } from "@/lib/models";
import { getUserFromRequest } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: "লগইন করুন" }, { status: 401 });
    }

    await connectToDatabase();
    let customer = await Customer.findOne({ firebaseUid: user.uid });
    if (!customer && user.email) {
      customer = await Customer.findOne({ email: user.email.toLowerCase().trim() });
    }

    if (!customer) {
      return NextResponse.json({ message: "অ্যাকাউন্ট পাওয়া যায়নি" }, { status: 404 });
    }

    if (customer.role !== "reseller" && customer.role !== "admin") {
      return NextResponse.json({ message: "আপনি রিসেলার অ্যাকাউন্টে অনুমোদিত নন" }, { status: 403 });
    }

    const cleanEmail = (customer.email || user.email || "").toLowerCase().trim();

    // Fetch dropship orders
    const orders = await Order.find({
      $or: [
        { "resellerDetails.resellerUid": user.uid },
        { "resellerDetails.resellerEmail": cleanEmail },
        { customerEmail: cleanEmail },
      ],
      orderType: "reseller",
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Fetch ledger
    const ledger = await ResellerLedger.find({
      $or: [
        { resellerUid: user.uid },
        { resellerEmail: cleanEmail },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Calculate pending profit (orders shipped or pending that haven't delivered yet)
    let pendingProfit = 0;
    let totalEarned = 0;
    orders.forEach((ord) => {
      const p = Number(ord.resellerDetails?.resellerProfit) || 0;
      if (ord.status === "Delivered") {
        totalEarned += p;
      } else if (ord.status !== "Cancelled") {
        pendingProfit += p;
      }
    });

    return NextResponse.json({
      success: true,
      walletBalance: customer.walletBalance || 0,
      resellerStoreName: customer.resellerStoreName || "",
      resellerStorePhone: customer.resellerStorePhone || "",
      ordersCount: orders.length,
      pendingProfit,
      totalEarned,
      orders,
      ledger,
    });
  } catch (err) {
    console.error("GET /api/reseller/wallet error:", err);
    return NextResponse.json({ message: "ডাটা লোড করতে সমস্যা: " + err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: "লগইন করুন" }, { status: 401 });
    }

    await connectToDatabase();
    let customer = await Customer.findOne({ firebaseUid: user.uid });
    if (!customer && user.email) {
      customer = await Customer.findOne({ email: user.email.toLowerCase().trim() });
    }

    if (!customer || (customer.role !== "reseller" && customer.role !== "admin")) {
      return NextResponse.json({ message: "অননুমোদিত অ্যাকশন" }, { status: 403 });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const payoutMethod = String(body.payoutMethod || "bKash").trim();
    const payoutAccount = String(body.payoutAccount || "").trim();
    const note = String(body.note || "").trim();

    if (!amount || isNaN(amount) || amount < 300) {
      return NextResponse.json({ message: "নূন্যতম ৩০০ টাকা ক্যাশআউট রিকোয়েস্ট করতে হবে" }, { status: 400 });
    }

    if ((customer.walletBalance || 0) < amount) {
      return NextResponse.json(
        { message: `আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${customer.walletBalance || 0}` },
        { status: 400 }
      );
    }

    if (!payoutAccount || payoutAccount.length < 11) {
      return NextResponse.json({ message: "সঠিক বিকাশ/নগদ/রকেট মোবাইল নম্বর দিন" }, { status: 400 });
    }

    // Deduct from balance
    customer.walletBalance = Math.max(0, (customer.walletBalance || 0) - amount);
    await customer.save();

    // Create pending ledger entry
    const ledgerEntry = await ResellerLedger.create({
      resellerUid: user.uid,
      resellerEmail: (customer.email || user.email || "").toLowerCase().trim(),
      type: "payout_withdrawal",
      amount: -amount,
      balanceAfter: customer.walletBalance,
      status: "pending",
      payoutMethod,
      payoutAccount,
      note: note || `Payout request via ${payoutMethod} to ${payoutAccount}`,
    });

    return NextResponse.json({
      success: true,
      message: `৳${amount} এর ক্যাশআউট রিকোয়েস্ট সফলভাবে গৃহীত হয়েছে! অ্যাডমিন অনুমোদনের পর টাকা পাঠানো হবে।`,
      walletBalance: customer.walletBalance,
      ledgerEntry,
    });
  } catch (err) {
    console.error("POST /api/reseller/wallet error:", err);
    return NextResponse.json({ message: "রিকোয়েস্ট ব্যর্থ হয়েছে: " + err.message }, { status: 500 });
  }
}
