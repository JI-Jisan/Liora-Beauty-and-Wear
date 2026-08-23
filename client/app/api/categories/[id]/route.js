import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase as connectDB } from "@/lib/db";
import { Category, Product } from "@/lib/models";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ message: "নাম দিন" }, { status: 400 });

    const cat = await Category.findByIdAndUpdate(id, { name }, { new: true });
    if (!cat) return NextResponse.json({ message: "পাওয়া যায়নি" }, { status: 404 });

    return NextResponse.json(cat);
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return NextResponse.json({ message: "ভুল id" }, { status: 400 });

    const kids = await Category.find({ ancestors: id }).select("_id").lean();
    const ids = [id, ...kids.map((k) => String(k._id))];

    const used = await Product.countDocuments({ category: { $in: ids } });
    if (used > 0) {
      return NextResponse.json(
        { message: `এই ক্যাটাগরিতে ${used} টি প্রোডাক্ট আছে। আগে সেগুলো সরান।` },
        { status: 409 }
      );
    }

    await Category.deleteMany({ _id: { $in: ids } });
    return NextResponse.json({ deleted: ids.length });
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
