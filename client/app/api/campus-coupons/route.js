import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CampusCoupon } from "@/lib/models";
import { VALID_CAMPUS_COUPONS } from "@/lib/campusCoupons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    await connectToDatabase();

    // 1. If looking for a specific coupon
    if (code) {
      // Check MongoDB first
      const dbCoupon = await CampusCoupon.findOne({ code, isActive: true }).lean();
      if (dbCoupon) {
        // Increment usage count asynchronously
        CampusCoupon.updateOne({ _id: dbCoupon._id }, { $inc: { usageCount: 1 } }).catch(() => {});
        return NextResponse.json({
          success: true,
          coupon: {
            code: dbCoupon.code,
            campus: dbCoupon.universityName,
            universityName: dbCoupon.universityName,
            short: dbCoupon.shortName,
            shortName: dbCoupon.shortName,
            tagColor: dbCoupon.tagColor || "#e11d48",
            maxDiscount: dbCoupon.maxDiscount || 15,
            minProfitPct: dbCoupon.minProfitPct || 12,
            welcomeTitle: dbCoupon.welcomeTitle || `🎓 ${dbCoupon.universityName} Student Privilege Active!`,
            welcomeSubtitle: dbCoupon.welcomeSubtitle || `${dbCoupon.universityName}-এর শিক্ষার্থীদের জন্য সর্বোচ্চ ১৫% স্পেশাল ছাড় কার্যকর হয়েছে! ✨`,
          },
        });
      }

      // Fallback to static presets in campusCoupons.js
      if (VALID_CAMPUS_COUPONS && VALID_CAMPUS_COUPONS[code]) {
        const c = VALID_CAMPUS_COUPONS[code];
        return NextResponse.json({
          success: true,
          coupon: {
            code: c.code,
            campus: c.campus,
            universityName: c.campus,
            short: c.short,
            shortName: c.short,
            tagColor: c.tagColor || "#e11d48",
            maxDiscount: c.maxDiscount || 15,
            minProfitPct: 12,
            welcomeTitle: c.welcomeTitle,
            welcomeSubtitle: c.welcomeSubtitle,
          },
        });
      }

      return NextResponse.json({
        success: false,
        message: "অকার্যকর কুপন কোড! অনুগ্রহ করে আপনার বিশ্ববিদ্যালয়ের সঠিক ক্যাম্পাস কোড লিখুন।",
      }, { status: 404 });
    }

    // 2. If listing active campus coupons
    const coupons = await CampusCoupon.find({ isActive: true })
      .select("code universityName shortName tagColor maxDiscount")
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    console.error("Campus coupon public API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
