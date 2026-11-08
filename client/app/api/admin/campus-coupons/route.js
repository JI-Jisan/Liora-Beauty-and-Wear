import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CampusCoupon } from "@/lib/models";
import { requireAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // If database is empty, pre-seed with initial popular university coupons
    const count = await CampusCoupon.countDocuments();
    if (count === 0) {
      const presets = [
        {
          code: "DIU15",
          universityName: "Daffodil International University (DIU)",
          shortName: "DIU",
          tagColor: "#e11d48",
          maxDiscount: 15,
          minProfitPct: 12,
          welcomeTitle: "🎓 DIU Student Privilege Active!",
          welcomeSubtitle: "ড্যাফোডিল ইন্টারন্যাশনাল ইউনিভার্সিটির শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ছাড় সক্রিয় হয়েছে! ✨",
          isActive: true,
        },
        {
          code: "DU15",
          universityName: "University of Dhaka (DU)",
          shortName: "DU",
          tagColor: "#1e3a8a",
          maxDiscount: 15,
          minProfitPct: 12,
          welcomeTitle: "🎓 DU Student Privilege Active!",
          welcomeSubtitle: "ঢাকা বিশ্ববিদ্যালয়ের শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ছাড় সক্রিয় হয়েছে! ✨",
          isActive: true,
        },
        {
          code: "BRAC15",
          universityName: "BRAC University (BRACU)",
          shortName: "BRACU",
          tagColor: "#2563eb",
          maxDiscount: 15,
          minProfitPct: 12,
          welcomeTitle: "🎓 BRACU Student Privilege Active!",
          welcomeSubtitle: "ব্র্যাক বিশ্ববিদ্যালয়ের শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ছাড় কার্যকর হয়েছে! ✨",
          isActive: true,
        },
        {
          code: "NSU15",
          universityName: "North South University (NSU)",
          shortName: "NSU",
          tagColor: "#7c3aed",
          maxDiscount: 15,
          minProfitPct: 12,
          welcomeTitle: "🎓 NSU Student Privilege Active!",
          welcomeSubtitle: "নর্থ সাউথ বিশ্ববিদ্যালয়ের শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ছাড় সক্রিয় হয়েছে! ✨",
          isActive: true,
        },
        {
          code: "CAMPUS15",
          universityName: "All Universities & Colleges",
          shortName: "Campus",
          tagColor: "#be185d",
          maxDiscount: 15,
          minProfitPct: 12,
          welcomeTitle: "🎓 Universal Campus Privilege Active!",
          welcomeSubtitle: "সকল বিশ্ববিদ্যালয় ও কলেজের শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ফ্ল্যাট ছাড় সক্রিয় হয়েছে! ✨",
          isActive: true,
        },
      ];
      await CampusCoupon.insertMany(presets);
    }

    const coupons = await CampusCoupon.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    console.error("Admin campus coupons GET error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const code = (body.code || "").trim().toUpperCase();
    const universityName = (body.universityName || "").trim();
    const shortName = (body.shortName || "").trim().toUpperCase();

    if (!code || !universityName || !shortName) {
      return NextResponse.json(
        { success: false, message: "Coupon code, University name, and Short name are required." },
        { status: 400 }
      );
    }

    const couponData = {
      code,
      universityName,
      shortName,
      tagColor: body.tagColor || "#e11d48",
      maxDiscount: Math.min(25, Math.max(1, Number(body.maxDiscount) || 15)),
      minProfitPct: Math.min(40, Math.max(5, Number(body.minProfitPct) || 12)),
      welcomeTitle: body.welcomeTitle || `🎓 ${shortName} Student Privilege Active!`,
      welcomeSubtitle:
        body.welcomeSubtitle ||
        `${universityName}-এর শিক্ষার্থীদের জন্য সর্বোচ্চ ${body.maxDiscount || 15}% স্পেশাল ছাড় সক্রিয় হয়েছে! ✨`,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      createdBy: admin.name || "admin",
    };

    let coupon;
    if (body._id) {
      coupon = await CampusCoupon.findByIdAndUpdate(body._id, { $set: couponData }, { new: true });
    } else {
      // Upsert by code
      coupon = await CampusCoupon.findOneAndUpdate(
        { code },
        { $set: couponData },
        { new: true, upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: `ক্যাম্পাস কুপন "${coupon.code}" সফলভাবে সংরক্ষিত হয়েছে!`,
      coupon,
    });
  } catch (error) {
    console.error("Admin campus coupons POST error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Coupon ID is required." }, { status: 400 });
    }

    await CampusCoupon.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "কুপন মুছে ফেলা হয়েছে।" });
  } catch (error) {
    console.error("Admin campus coupons DELETE error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
