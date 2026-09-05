import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Brand, Product } from "@/lib/models";
import { getAdminFromRequest } from "@/lib/adminGuard";

export const runtime = "nodejs";

const slugify = (s) => s.toLowerCase().trim()
  .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '');

export async function PUT(req, { params }) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    if (body.name && !body.slug) {
      body.slug = slugify(body.name);
    }

    const updated = await Brand.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
      return NextResponse.json({ message: "Brand not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Brands PUT error:", error);
    return NextResponse.json({ message: "Error updating brand" }, { status: 500 });
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

    const used = await Product.countDocuments({ brand: id });
    if (used > 0) {
      return NextResponse.json({ message: `${used}টি প্রোডাক্ট যুক্ত, আগে সরান` }, { status: 400 });
    }

    const deleted = await Brand.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Brand not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Brands DELETE error:", error);
    return NextResponse.json({ message: "Error deleting brand" }, { status: 500 });
  }
}
