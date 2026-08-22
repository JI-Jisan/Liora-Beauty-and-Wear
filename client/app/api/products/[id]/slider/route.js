import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models";

export async function PATCH(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const { isSlider } = await req.json();

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { isSlider },
      { new: true }
    );

    return NextResponse.json(updatedProduct);
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
