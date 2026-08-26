import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Menu } from "@/lib/models";

export const runtime = "nodejs";

export async function PUT(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const updated = await Menu.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
      return NextResponse.json({ message: "Menu not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Menus PUT error:", error);
    return NextResponse.json({ message: "Error updating menu" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const deleted = await Menu.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Menu not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Menu deleted successfully" });
  } catch (error) {
    console.error("Menus DELETE error:", error);
    return NextResponse.json({ message: "Error deleting menu" }, { status: 500 });
  }
}
