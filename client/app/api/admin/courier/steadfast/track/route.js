import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminGuard";
import { getSteadfastStatusByTracking } from "@/lib/steadfast";

export const runtime = "nodejs";

export async function GET(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const trackingCode = searchParams.get("code");
    if (!trackingCode) {
      return NextResponse.json({ message: "ট্র্যাকিং কোড দিন" }, { status: 400 });
    }

    const result = await getSteadfastStatusByTracking(trackingCode);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Steadfast track error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

