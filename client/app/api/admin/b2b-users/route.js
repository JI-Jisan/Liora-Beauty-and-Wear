import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer, Order, ResellerLedger } from "@/lib/models";
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
    const filterRole = searchParams.get("role") || "all"; // 'all' | 'wholesale' | 'reseller' | 'user'
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

    const query = {};
    if (filterRole === "b2b") {
      query.role = { $in: ["wholesale", "reseller"] };
    } else if (filterRole !== "all") {
      query.role = filterRole;
    }

    if (searchQuery) {
      query.$or = [
        { email: { $regex: searchQuery, $options: "i" } },
        { name: { $regex: searchQuery, $options: "i" } },
        { phone: { $regex: searchQuery, $options: "i" } },
        { businessName: { $regex: searchQuery, $options: "i" } },
        { resellerStoreName: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const customers = await Customer.find(query)
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean();

    // Attach order counts & stats
    const customerEmails = customers.map((c) => c.email).filter(Boolean);
    const orderAgg = await Order.aggregate([
      {
        $match: {
          customerEmail: { $in: customerEmails },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$customerEmail",
          orderCount: { $sum: 1 },
          totalSpend: { $sum: "$total" },
        },
      },
    ]);

    const orderStatsMap = new Map();
    orderAgg.forEach((stat) => {
      if (stat._id) orderStatsMap.set(String(stat._id).toLowerCase(), stat);
    });

    const enrichedUsers = customers.map((c) => {
      const email = (c.email || "").toLowerCase();
      const stats = orderStatsMap.get(email) || { orderCount: 0, totalSpend: 0 };
      return {
        ...c,
        orderCount: stats.orderCount,
        totalSpend: stats.totalSpend,
      };
    });

    // Summary counts
    const [wholesaleCount, resellerCount, pendingCount, liabilityAgg] = await Promise.all([
      Customer.countDocuments({ role: "wholesale" }),
      Customer.countDocuments({ role: "reseller" }),
      Customer.countDocuments({ status: "pending" }),
      Customer.aggregate([
        { $match: { role: "reseller" } },
        { $group: { _id: null, totalBalance: { $sum: "$walletBalance" } } },
      ]),
    ]);

    // Recent ledger transactions
    const recentLedger = await ResellerLedger.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      stats: {
        wholesaleCount,
        resellerCount,
        pendingCount,
        totalWalletLiability: liabilityAgg[0]?.totalBalance || 0,
      },
      recentLedger,
    });
  } catch (err) {
    console.error("GET /api/admin/b2b-users error:", err);
    return NextResponse.json({ message: "B2B ইউজার লোড করতে সমস্যা: " + err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "অননুমোদিত: অ্যাডমিন টোকেন প্রয়োজন" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      email,
      role = "wholesale",
      businessName = "",
      resellerStoreName = "",
      resellerStorePhone = "",
      name = "",
      phone = "",
      address = "",
      note = "",
      wholesaleDiscountPct = 0,
      minWholesaleOrderAmount = 5000,
      initialWalletBalance = 0,
      status = "active",
    } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ message: "সঠিক ইমেইল অ্যাড্রেস প্রদান করুন" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    let customer = await Customer.findOne({ email: cleanEmail });

    if (customer) {
      customer.role = role;
      if (businessName) customer.businessName = businessName.trim();
      if (resellerStoreName) customer.resellerStoreName = resellerStoreName.trim();
      if (resellerStorePhone) customer.resellerStorePhone = resellerStorePhone.trim();
      if (name && !customer.name) customer.name = name.trim();
      if (phone && !customer.phone) customer.phone = phone.trim();
      if (address && !customer.address) customer.address = address.trim();
      if (note) customer.note = note.trim();
      customer.status = status;
      customer.wholesaleDiscountPct = Number(wholesaleDiscountPct) || 0;
      customer.minWholesaleOrderAmount = Number(minWholesaleOrderAmount) || 5000;

      if (Number(initialWalletBalance) > 0) {
        const bal = Number(initialWalletBalance);
        customer.walletBalance = (customer.walletBalance || 0) + bal;
        await ResellerLedger.create({
          resellerUid: customer.firebaseUid || "",
          resellerEmail: cleanEmail,
          type: "manual_adjustment",
          amount: bal,
          balanceAfter: customer.walletBalance,
          status: "completed",
          note: "Initial wallet balance credited by Admin",
        });
      }

      await customer.save();
    } else {
      customer = await Customer.create({
        email: cleanEmail,
        name: name.trim() || cleanEmail.split("@")[0],
        phone: phone.trim(),
        address: address.trim(),
        role,
        businessName: businessName.trim(),
        resellerStoreName: resellerStoreName.trim(),
        resellerStorePhone: resellerStorePhone.trim(),
        status,
        walletBalance: Number(initialWalletBalance) || 0,
        wholesaleDiscountPct: Number(wholesaleDiscountPct) || 0,
        minWholesaleOrderAmount: Number(minWholesaleOrderAmount) || 5000,
        note: note.trim(),
      });

      if (Number(initialWalletBalance) > 0) {
        await ResellerLedger.create({
          resellerUid: "",
          resellerEmail: cleanEmail,
          type: "manual_adjustment",
          amount: Number(initialWalletBalance),
          balanceAfter: Number(initialWalletBalance),
          status: "completed",
          note: "Initial wallet balance credited by Admin",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${cleanEmail} কে সফলভাবে ${role === "wholesale" ? "Wholesale Buyer" : "Reseller"} এক্সেস দেওয়া হয়েছে!`,
      user: customer,
    });
  } catch (err) {
    console.error("POST /api/admin/b2b-users error:", err);
    return NextResponse.json({ message: "অপারেশন সম্পন্ন করতে সমস্যা: " + err.message }, { status: 500 });
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
      id,
      role,
      status,
      businessName,
      resellerStoreName,
      resellerStorePhone,
      name,
      phone,
      address,
      note,
      wholesaleDiscountPct,
      minWholesaleOrderAmount,
      walletAdjustment,
      adjustmentNote = "Admin balance adjustment",
    } = body;

    if (!id) {
      return NextResponse.json({ message: "ইউজার আইডি প্রয়োজন" }, { status: 400 });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ message: "ইউজার পাওয়া যায়নি" }, { status: 404 });
    }

    if (role !== undefined) customer.role = role;
    if (status !== undefined) customer.status = status;
    if (businessName !== undefined) customer.businessName = String(businessName).trim();
    if (resellerStoreName !== undefined) customer.resellerStoreName = String(resellerStoreName).trim();
    if (resellerStorePhone !== undefined) customer.resellerStorePhone = String(resellerStorePhone).trim();
    if (name !== undefined) customer.name = String(name).trim();
    if (phone !== undefined) customer.phone = String(phone).trim();
    if (address !== undefined) customer.address = String(address).trim();
    if (note !== undefined) customer.note = String(note).trim();
    if (wholesaleDiscountPct !== undefined) customer.wholesaleDiscountPct = Number(wholesaleDiscountPct) || 0;
    if (minWholesaleOrderAmount !== undefined) customer.minWholesaleOrderAmount = Number(minWholesaleOrderAmount) || 5000;

    if (walletAdjustment !== undefined && Number(walletAdjustment) !== 0) {
      const adj = Number(walletAdjustment);
      customer.walletBalance = Math.max(0, (customer.walletBalance || 0) + adj);
      await ResellerLedger.create({
        resellerUid: customer.firebaseUid || "",
        resellerEmail: customer.email,
        type: adj > 0 ? "manual_adjustment" : "payout_withdrawal",
        amount: adj,
        balanceAfter: customer.walletBalance,
        status: "completed",
        note: adjustmentNote || "Admin balance adjustment",
      });
    }

    await customer.save();

    return NextResponse.json({
      success: true,
      message: `${customer.email} সফলভাবে আপডেট হয়েছে!`,
      user: customer,
    });
  } catch (err) {
    console.error("PUT /api/admin/b2b-users error:", err);
    return NextResponse.json({ message: "আপডেট করতে সমস্যা: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "অননুমোদিত: অ্যাডমিন টোকেন প্রয়োজন" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ইউজার আইডি প্রয়োজন" }, { status: 400 });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ message: "ইউজার পাওয়া যায়নি" }, { status: 404 });
    }

    customer.role = "user";
    await customer.save();

    return NextResponse.json({
      success: true,
      message: `${customer.email}-এর B2B এক্সেস প্রত্যাহার করে সাধারণ ইউজার করা হয়েছে।`,
    });
  } catch (err) {
    console.error("DELETE /api/admin/b2b-users error:", err);
    return NextResponse.json({ message: "ডিলিট করতে সমস্যা: " + err.message }, { status: 500 });
  }
}
