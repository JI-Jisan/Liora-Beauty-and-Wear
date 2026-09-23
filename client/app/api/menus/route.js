import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Menu } from "@/lib/models";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === '1';

    const query = all ? {} : { isActive: true };
    const menus = await Menu.find(query)
      .sort({ order: 1, createdAt: 1 })
      .select('label href icon authOnly openInNew isActive order')
      .lean();
    
    const cacheHeader = all
      ? "no-store, no-cache, must-revalidate, max-age=0"
      : "public, s-maxage=300, stale-while-revalidate=86400";

    return NextResponse.json(menus, {
      headers: {
        "Cache-Control": cacheHeader,
      },
    });
  } catch (error) {
    console.error("Menus GET error:", error);
    return NextResponse.json({ message: "Error fetching menus" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const last = await Menu.findOne().sort({ order: -1 }).select('order').lean();
    const menu = await Menu.create({ ...body, order: (last?.order ?? 0) + 1 });
    return NextResponse.json(menu, { status: 201 });
  } catch (error) {
    console.error("Menus POST error:", error);
    return NextResponse.json({ message: "Error creating menu" }, { status: 500 });
  }
}
