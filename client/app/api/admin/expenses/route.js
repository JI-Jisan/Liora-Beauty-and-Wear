import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Expense, Product } from "@/lib/models";
import { requireAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req) {
  if (!(await requireAdmin(req))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = {};
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) q.date.$lte = new Date(to + "T23:59:59");
  }

  const expenses = await Expense.find(q)
    .populate("product", "name")
    .sort({ date: -1, createdAt: -1 })
    .limit(500)
    .lean();
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
    return acc;
  }, {});
  return NextResponse.json({ expenses, total, byCategory });
}

export async function POST(req) {
  if (!(await requireAdmin(req))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectToDatabase();
  const b = await req.json();

  if (!b.category || !(Number(b.amount) > 0))
    return NextResponse.json({ message: "ক্যাটাগরি ও সঠিক টাকার পরিমাণ দিন" }, { status: 400 });

  const exp = await Expense.create({
    date: b.date ? new Date(b.date) : new Date(),
    category: b.category,
    amount: Number(b.amount),
    paidBy: b.paidBy || "Owner",
    product: b.product || null,
    note: b.note || "",
  });
  return NextResponse.json({ expense: exp }, { status: 201 });
}

export async function DELETE(req) {
  if (!(await requireAdmin(req))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    await Expense.findByIdAndDelete(id);
  }
  return NextResponse.json({ ok: true });
}
