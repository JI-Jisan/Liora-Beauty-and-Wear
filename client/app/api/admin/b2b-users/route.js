import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer, Order, ResellerLedger, Brand } from "@/lib/models";
import { getAdminFromRequest } from "@/lib/adminGuard";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "অননুমোদিত: অ্যাডমিন টোকেন প্রয়োজন" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const filterRole = searchParams.get("role") || "all"; // 'all' | 'admin' | 'wholesale' | 'reseller' | 'customer' | 'pending'
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

    // 1. Fetch Firestore admins collection and environment variable admins
    const adminMap = new Map();
    try {
      const app = await getFirebaseAdminApp();
      if (app) {
        const { getFirestore } = await import("firebase-admin/firestore");
        const db = getFirestore(app);
        const adminDocs = await db.collection("admins").get();
        adminDocs.forEach((doc) => {
          const data = doc.data() || {};
          const docId = doc.id.toLowerCase().trim();
          adminMap.set(docId, data);
          if (data.email) adminMap.set(data.email.toLowerCase().trim(), data);
          if (data.uid) adminMap.set(data.uid, data);
        });
      }
    } catch (fsErr) {
      console.warn("Firestore admins fetch warning in b2b-users:", fsErr?.message);
    }

    const allowedEnvEmails = (process.env.ADMIN_EMAILS || "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    allowedEnvEmails.forEach((e) => {
      adminMap.set(e, { role: "admin", email: e });
    });

    // Known site admins
    ["jahidulislam01910889@gmail.com", "liorabeautyandwear@gmail.com"].forEach((e) => {
      adminMap.set(e, { role: "admin", email: e });
    });

    const query = {};
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
      .limit(500)
      .lean();

    // Attach order counts & stats
    const customerEmails = customers.map((c) => (c.email || "").toLowerCase().trim()).filter(Boolean);
    const orderAgg = await Order.aggregate([
      {
        $match: {
          customerEmail: { $in: customerEmails },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $toLower: "$customerEmail" },
          orderCount: { $sum: 1 },
          totalSpend: { $sum: "$total" },
        },
      },
    ]);

    const orderStatsMap = new Map();
    orderAgg.forEach((stat) => {
      if (stat._id) orderStatsMap.set(String(stat._id).toLowerCase(), stat);
    });

    // Sync and enrich users
    const enrichedUsers = [];
    const seenEmails = new Set();

    for (const c of customers) {
      const email = (c.email || "").toLowerCase().trim();
      const isAdmin =
        c.role === "admin" ||
        adminMap.has(email) ||
        (c.firebaseUid && adminMap.has(c.firebaseUid));

      let effectiveRole = c.role;
      if (isAdmin) {
        effectiveRole = "admin";
        if (c.role !== "admin") {
          Customer.updateOne({ _id: c._id }, { $set: { role: "admin" } }).catch(() => {});
        }
      } else if (c.role === "wholesale") {
        effectiveRole = "wholesale";
      } else if (c.role === "reseller") {
        effectiveRole = "reseller";
      } else if (c.role === "team_leader") {
        effectiveRole = "team_leader";
      } else {
        effectiveRole = "user"; // standard customer
      }

      if (email) seenEmails.add(email);

      const stats = orderStatsMap.get(email) || { orderCount: 0, totalSpend: 0 };
      enrichedUsers.push({
        ...c,
        role: effectiveRole,
        orderCount: stats.orderCount,
        totalSpend: stats.totalSpend,
      });
    }

    // Include any Firestore / ENV admins that are not in MongoDB customers yet
    for (const [key, data] of adminMap.entries()) {
      if (key.includes("@") && !seenEmails.has(key)) {
        seenEmails.add(key);
        enrichedUsers.push({
          _id: "admin_" + key.replace(/[^a-zA-Z0-9]/g, "_"),
          email: key,
          name: data?.name || data?.displayName || "Admin",
          role: "admin",
          status: "active",
          walletBalance: 0,
          orderCount: 0,
          totalSpend: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Filter by role if requested
    let finalUsers = enrichedUsers;
    if (filterRole === "admin") {
      finalUsers = enrichedUsers.filter((u) => u.role === "admin");
    } else if (filterRole === "wholesale") {
      finalUsers = enrichedUsers.filter((u) => u.role === "wholesale");
    } else if (filterRole === "reseller") {
      finalUsers = enrichedUsers.filter((u) => u.role === "reseller");
    } else if (filterRole === "team_leader") {
      finalUsers = enrichedUsers.filter((u) => u.role === "team_leader");
    } else if (filterRole === "customer" || filterRole === "user") {
      finalUsers = enrichedUsers.filter((u) => u.role === "user" || u.role === "customer");
    } else if (filterRole === "pending") {
      finalUsers = enrichedUsers.filter((u) => u.status === "pending");
    }

    // Role Counts
    const adminCount = enrichedUsers.filter((u) => u.role === "admin").length;
    const wholesaleCount = enrichedUsers.filter((u) => u.role === "wholesale").length;
    const resellerCount = enrichedUsers.filter((u) => u.role === "reseller").length;
    const teamLeaderRoleCount = enrichedUsers.filter((u) => u.role === "team_leader").length;
    const customerCount = enrichedUsers.filter((u) => u.role === "user" || u.role === "customer").length;
    const pendingCount = enrichedUsers.filter((u) => u.status === "pending").length;

    const liabilityAgg = await Customer.aggregate([
      { $match: { role: "reseller" } },
      { $group: { _id: null, totalBalance: { $sum: "$walletBalance" } } },
    ]);

    // Recent ledger transactions
    const recentLedger = await ResellerLedger.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const teamLeaders = await Customer.find({
      $or: [{ role: "team_leader" }, { role: "admin" }],
    })
      .select("_id name email phone role")
      .lean();

    const brands = await Brand.find({}).sort({ name: 1 }).select("_id name slug logo wholesaleMarginPct").lean();

    return NextResponse.json({
      success: true,
      users: finalUsers,
      teamLeaders,
      brands,
      stats: {
        adminCount,
        wholesaleCount,
        resellerCount,
        customerCount,
        pendingCount,
        starResellerCount: enrichedUsers.filter((u) => u.isWeeklyStar).length,
        teamLeaderCount: teamLeaders.length,
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
      role = "wholesale", // 'admin' | 'wholesale' | 'reseller' | 'team_leader' | 'user'
      businessName = "",
      resellerStoreName = "",
      resellerStorePhone = "",
      teamLeaderEmail = "",
      teamLeaderName = "",
      teamLeaderId = "",
      isWeeklyStar = false,
      name = "",
      phone = "",
      address = "",
      note = "",
      wholesaleDiscountPct = 0,
      minWholesaleOrderAmount = 5000,
      initialWalletBalance = 0,
      status = "active",
      fbPageLink = "",
      tradeLicense = "",
      appliedRole = "",
    } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ message: "সঠিক ইমেইল অ্যাড্রেস প্রদান করুন" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const normalizedRole = role === "customer" ? "user" : role;

    let customer = await Customer.findOne({ email: cleanEmail });

    if (customer) {
      customer.role = normalizedRole;
      if (businessName) customer.businessName = businessName.trim();
      if (resellerStoreName) customer.resellerStoreName = resellerStoreName.trim();
      if (resellerStorePhone) customer.resellerStorePhone = resellerStorePhone.trim();
      if (teamLeaderEmail) customer.teamLeaderEmail = teamLeaderEmail.toLowerCase().trim();
      if (teamLeaderName) customer.teamLeaderName = teamLeaderName.trim();
      if (teamLeaderId) customer.teamLeader = teamLeaderId;
      customer.isWeeklyStar = Boolean(isWeeklyStar);
      if (customer.isWeeklyStar) customer.weeklyStarMarkedAt = new Date();
      if (name && !customer.name) customer.name = name.trim();
      if (phone && !customer.phone) customer.phone = phone.trim();
      if (address && !customer.address) customer.address = address.trim();
      if (fbPageLink) customer.fbPageLink = fbPageLink.trim();
      if (tradeLicense) customer.tradeLicense = tradeLicense.trim();
      if (appliedRole) customer.appliedRole = appliedRole.trim();
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
        role: normalizedRole,
        businessName: businessName.trim(),
        resellerStoreName: resellerStoreName.trim(),
        resellerStorePhone: resellerStorePhone.trim(),
        teamLeaderEmail: teamLeaderEmail.toLowerCase().trim(),
        teamLeaderName: teamLeaderName.trim(),
        teamLeader: teamLeaderId || null,
        isWeeklyStar: Boolean(isWeeklyStar),
        weeklyStarMarkedAt: isWeeklyStar ? new Date() : null,
        status,
        fbPageLink: fbPageLink.trim(),
        tradeLicense: tradeLicense.trim(),
        appliedRole: appliedRole.trim(),
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

    // Sync Firestore admins if role is admin
    if (normalizedRole === "admin") {
      try {
        const app = await getFirebaseAdminApp();
        if (app) {
          const { getFirestore } = await import("firebase-admin/firestore");
          const db = getFirestore(app);
          await db.collection("admins").doc(cleanEmail).set(
            {
              email: cleanEmail,
              role: "admin",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (fsErr) {
        console.warn("Firestore admin sync warning on POST:", fsErr?.message);
      }
    }

    const roleLabels = {
      admin: "Admin (অ্যাডমিন)",
      wholesale: "Wholesale Buyer (হোলসেলার)",
      reseller: "Reseller (রিসেলার)",
      user: "Customer (সাধারণ কাস্টমার)",
    };

    return NextResponse.json({
      success: true,
      message: `${cleanEmail} কে সফলভাবে ${roleLabels[normalizedRole] || normalizedRole} হিসেবে সেট করা হয়েছে!`,
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

    // 1. Brand Wholesale Margins update
    if (Array.isArray(body.brandMargins)) {
      for (const bm of body.brandMargins) {
        if (bm.id && bm.margin !== undefined) {
          await Brand.findByIdAndUpdate(bm.id, { wholesaleMarginPct: Math.max(0, Number(bm.margin) || 0) });
        }
      }
      return NextResponse.json({
        success: true,
        message: "ব্র্যান্ড হোলসেল প্রফিট মার্জিন সফলভাবে সেভ হয়েছে!",
      });
    }

    // 2. Bulk Squad Assignment to Team Leader
    if (body.bulkAssignSquad && Array.isArray(body.resellerIds) && body.teamLeaderEmail) {
      await Customer.updateMany(
        { _id: { $in: body.resellerIds } },
        {
          $set: {
            teamLeaderEmail: body.teamLeaderEmail.toLowerCase().trim(),
            teamLeaderName: body.teamLeaderName || "",
            teamLeader: body.teamLeaderId || null,
          },
        }
      );
      return NextResponse.json({
        success: true,
        message: `${body.resellerIds.length} জন রিসেলারকে টিম লিডারের আন্ডারে এসাইন করা হয়েছে!`,
      });
    }

    // 3. Quick Toggle Weekly Star Performer (8% -> 10% Margin)
    if (body.toggleWeeklyStar && id) {
      const cust = await Customer.findById(id);
      if (cust) {
        cust.isWeeklyStar = !cust.isWeeklyStar;
        cust.weeklyStarMarkedAt = cust.isWeeklyStar ? new Date() : null;
        await cust.save();
        return NextResponse.json({
          success: true,
          message: `${cust.email} কে ${cust.isWeeklyStar ? "⭐ Weekly Star (10% Margin)" : "Standard (8% Margin)"} করা হয়েছে!`,
          isWeeklyStar: cust.isWeeklyStar,
        });
      }
    }

    if (!id) {
      return NextResponse.json({ message: "ইউজার আইডি প্রয়োজন" }, { status: 400 });
    }

    let customer = null;
    if (String(id).startsWith("admin_")) {
      const email = body.email?.toLowerCase().trim();
      if (email) customer = await Customer.findOne({ email });
      if (!customer && email) {
        customer = await Customer.create({
          email,
          name: name || "Admin",
          role: "admin",
          status: status || "active",
        });
      }
    } else {
      customer = await Customer.findById(id);
    }

    if (!customer) {
      return NextResponse.json({ message: "ইউজার পাওয়া যায়নি" }, { status: 404 });
    }

    const cleanEmail = (customer.email || "").toLowerCase().trim();

    if (role !== undefined) {
      const normalizedRole = role === "customer" ? "user" : role;
      customer.role = normalizedRole;

      // Sync with Firestore admins
      try {
        const app = await getFirebaseAdminApp();
        if (app && cleanEmail) {
          const { getFirestore } = await import("firebase-admin/firestore");
          const db = getFirestore(app);
          if (normalizedRole === "admin") {
            await db.collection("admins").doc(cleanEmail).set(
              {
                email: cleanEmail,
                role: "admin",
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } else {
            await db.collection("admins").doc(cleanEmail).delete();
          }
        }
      } catch (fsErr) {
        console.warn("Firestore admin sync warning on PUT:", fsErr?.message);
      }
    }

    if (status !== undefined) customer.status = status;
    if (businessName !== undefined) customer.businessName = String(businessName).trim();
    if (resellerStoreName !== undefined) customer.resellerStoreName = String(resellerStoreName).trim();
    if (resellerStorePhone !== undefined) customer.resellerStorePhone = String(resellerStorePhone).trim();
    if (name !== undefined) customer.name = String(name).trim();
    if (phone !== undefined) customer.phone = String(phone).trim();
    if (address !== undefined) customer.address = String(address).trim();
    if (body.fbPageLink !== undefined) customer.fbPageLink = String(body.fbPageLink).trim();
    if (body.tradeLicense !== undefined) customer.tradeLicense = String(body.tradeLicense).trim();
    if (body.appliedRole !== undefined) customer.appliedRole = String(body.appliedRole).trim();
    if (note !== undefined) customer.note = String(note).trim();
    if (body.isWeeklyStar !== undefined) {
      customer.isWeeklyStar = Boolean(body.isWeeklyStar);
      customer.weeklyStarMarkedAt = customer.isWeeklyStar ? new Date() : null;
    }
    if (body.teamLeaderEmail !== undefined) {
      customer.teamLeaderEmail = String(body.teamLeaderEmail || "").toLowerCase().trim();
      customer.teamLeaderName = String(body.teamLeaderName || "").trim();
      customer.teamLeader = body.teamLeaderId || null;
    }

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

    const cleanEmail = (customer.email || "").toLowerCase().trim();
    customer.role = "user";
    await customer.save();

    // If was admin, remove from Firestore admins
    try {
      const app = await getFirebaseAdminApp();
      if (app && cleanEmail) {
        const { getFirestore } = await import("firebase-admin/firestore");
        const db = getFirestore(app);
        await db.collection("admins").doc(cleanEmail).delete();
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `${customer.email}-এর রোল পরিবর্তন করে সাধারণ কাস্টমার (Customer) করা হয়েছে।`,
    });
  } catch (err) {
    console.error("DELETE /api/admin/b2b-users error:", err);
    return NextResponse.json({ message: "রোল পরিবর্তন করতে সমস্যা: " + err.message }, { status: 500 });
  }
}
