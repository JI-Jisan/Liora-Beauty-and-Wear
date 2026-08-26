import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Brand } from "@/lib/models";

export const runtime = "nodejs";

const slugify = (s) => s.toLowerCase().trim()
  .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '');

export async function GET(req) {
  try {
    await connectToDatabase();
    const all = new URL(req.url).searchParams.get('all');
    const q = all ? {} : { isActive: true };
    const brands = await Brand.find(q).sort({ order: 1, name: 1 })
      .select('name slug logo isActive order').lean();
    return NextResponse.json(brands);
  } catch (error) {
    console.error("Brands GET error:", error);
    return NextResponse.json({ message: "Error fetching brands" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const { name, logo } = await req.json();
    if (!name) return NextResponse.json({ message: 'নাম দিন' }, { status: 400 });

    const slug = slugify(name);
    if (await Brand.findOne({ slug })) {
      return NextResponse.json({ message: 'এই ব্র্যান্ড আগেই আছে' }, { status: 409 });
    }

    const last = await Brand.findOne().sort({ order: -1 }).select('order').lean();
    const brand = await Brand.create({ name, slug, logo, order: (last?.order ?? 0) + 1 });
    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("Brands POST error:", error);
    return NextResponse.json({ message: "Error creating brand" }, { status: 500 });
  }
}
