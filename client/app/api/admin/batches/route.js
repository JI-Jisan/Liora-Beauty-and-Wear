import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { PurchaseBatch, Product } from "@/lib/models";
import { syncProductStock } from "@/lib/inventory";
import { requireAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const q = {};
  if (searchParams.get("product")) q.product = searchParams.get("product");
  if (searchParams.get("owner")) q.locationName = searchParams.get("owner");

  const batches = await PurchaseBatch.find(q)
    .populate("product", "name image")
    .sort({ purchaseDate: -1, createdAt: -1 })
    .limit(300)
    .lean();
  return NextResponse.json({ batches });
}

export async function POST(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const b = await req.json();

  const product = await Product.findById(b.product);
  if (!product) return NextResponse.json({ message: "প্রোডাক্ট পাওয়া যায়নি" }, { status: 400 });

  const qty = Number(b.qty);
  const unitCost = Number(b.unitCost);
  if (!qty || qty < 1) return NextResponse.json({ message: "সঠিক পরিমাণ দিন" }, { status: 400 });
  if (unitCost < 0 || Number.isNaN(unitCost))
    return NextResponse.json({ message: "সঠিক কেনা দাম দিন" }, { status: 400 });

  const batch = await PurchaseBatch.create({
    product: product._id,
    productName: product.name,
    qty,
    remaining: qty,
    unitCost,
    purchaseDate: b.purchaseDate ? new Date(b.purchaseDate) : new Date(),
    ownerName: b.ownerName || "Owner",
    locationName: b.locationName || b.ownerName || "Owner",
    supplier: b.supplier || "",
    note: b.note || "",
  });

  await syncProductStock(product._id, Product);
  // সর্বশেষ কেনা দাম product এ cache
  await Product.findByIdAndUpdate(product._id, { purchasePrice: unitCost });

  return NextResponse.json({ batch }, { status: 201 });
}
