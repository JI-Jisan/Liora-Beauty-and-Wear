import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminGuard";
import { getSteadfastBalance } from "@/lib/steadfast";

export const runtime = "nodejs";

export async function GET(req) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getSteadfastBalance();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Steadfast balance error:", err);
    return NextResponse.json(
      { success: false, currentBalance: 0, message: err.message },
      { status: 500 }
    );
  }
}

