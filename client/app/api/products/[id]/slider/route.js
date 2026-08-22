import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models";

export async function PATCH(req, { params }) {
  try {
    await connectToDatabase();
    // In Next.js 15+ we might need to await params, but following user instructions exactly
    // as per: "নিচের কোডটি হুবহু কপি করে পেস্ট করুন"
    const { id } = params;
    const body = await req.json();

    // ডাটাবেসে প্রোডাক্ট আপডেট করা
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { isSlider: body.isSlider },
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
