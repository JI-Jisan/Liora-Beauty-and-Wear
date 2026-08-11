import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Category } from "@/lib/models";

const DEMO_CATEGORIES = [
  { _id: "cat-1", name: "Perfume", type: "main" },
  { _id: "cat-2", name: "Watches", type: "main" },
  { _id: "cat-3", name: "Fan Light", type: "main" },
  { _id: "cat-4", name: "Beauty & Wear", type: "main" },
];

export async function GET() {
  try {
    await connectToDatabase();
    const categories = await Category.find();
    if (categories && categories.length > 0) {
      return NextResponse.json(categories);
    }
    return NextResponse.json(DEMO_CATEGORIES);
  } catch {
    return NextResponse.json(DEMO_CATEGORIES);
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, type } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    const category = new Category({
      name: name.trim(),
      type: type || "main",
    });

    await category.save();
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
