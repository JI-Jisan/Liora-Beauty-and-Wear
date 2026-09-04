import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models";
import { getAdminFromRequest } from "@/lib/adminGuard";
import { buildPayload } from "@/lib/productPayload";
export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const isAdmin = !!getAdminFromRequest(req);

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      const product = await Product.findById(id)
        .select(isAdmin ? "" : "-purchasePrice")
        .populate({
          path: "category",
          select: "name ancestors",
          populate: { path: "ancestors", select: "name" }
        })
        .populate("brand", "name slug")
        .lean();
      
      if (product) {
        return NextResponse.json(product);
      }
    }

    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}


export async function PUT(req, { params }) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const { id } = await params;
    const payload = buildPayload(await req.json());
    
    const updated = await Product.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).populate("category");
    if (!updated) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(updated.toJSON());
  } catch (error) {
    const isValidation = error?.name === "ValidationError" || error?.message?.length < 120;
    return NextResponse.json(
      { message: isValidation ? error.message : "Product update failed" },
      { status: isValidation ? 400 : 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const { id } = await params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
