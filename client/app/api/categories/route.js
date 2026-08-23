import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { Category } from "@/lib/models";

const MAX_DEPTH = 4;

export async function GET() {
  try {
    await connectDB();
    const cats = await Category.find({}).sort({ level: 1, order: 1, name: 1 }).lean();
    return NextResponse.json(cats);
  } catch (e) {
    return NextResponse.json({ message: "লোড করা যায়নি" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ message: "ক্যাটাগরির নাম দিন" }, { status: 400 });

    let parent = null, ancestors = [], level = 0;
    if (body.parent) {
      if (!mongoose.Types.ObjectId.isValid(body.parent))
        return NextResponse.json({ message: "ভুল parent" }, { status: 400 });
        
      const p = await Category.findById(body.parent).lean();
      if (!p) return NextResponse.json({ message: "Parent পাওয়া যায়নি" }, { status: 404 });
      if ((p.level ?? 0) + 1 >= MAX_DEPTH)
        return NextResponse.json({ message: `সর্বোচ্চ ${MAX_DEPTH} ধাপ পর্যন্ত করা যাবে` }, { status: 400 });
        
      parent = p._id;
      ancestors = [...(p.ancestors || []), p._id];
      level = (p.level ?? 0) + 1;
    }

    const dup = await Category.findOne({ name, parent });
    if (dup) return NextResponse.json({ message: "এই নামে একটি ক্যাটাগরি আছে" }, { status: 409 });

    const cat = await Category.create({
      name,
      parent,
      ancestors,
      level,
      type: level === 0 ? (body.type === "more" ? "more" : "main") : "main",
      order: Number(body.order) || 0,
    });

    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    if (e.code === 11000) return NextResponse.json({ message: "ডুপ্লিকেট নাম" }, { status: 409 });
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
