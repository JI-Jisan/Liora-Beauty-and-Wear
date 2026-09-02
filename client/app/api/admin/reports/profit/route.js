import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Expense, Order } from "@/lib/models";
import { requireAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req) {
  if (!(await requireAdmin(req))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const from = new Date(searchParams.get("from") || new Date(Date.now() - 30 * 864e5));
  const to = new Date((searchParams.get("to") || new Date().toISOString().slice(0, 10)) + "T23:59:59.999Z");

  // Delivered এবং Completed অর্ডার লাভ হিসেবে হিসাব হবে
  const orders = await Order.find({
    createdAt: { $gte: from, $lte: to },
    status: { $in: ["Delivered", "delivered", "Completed", "completed"] },
  }).lean();

  let revenue = 0;
  let cogs = 0;
  let deliveryCollected = 0;
  const perProduct = {};

  for (const o of orders) {
    deliveryCollected += o.deliveryCharge || 0;
    for (const it of o.items || []) {
      const rev = (it.price || 0) * (it.quantity || 1);
      const cost = (it.costAtSale || it.purchasePrice || 0) * (it.quantity || 1);
      revenue += rev;
      cogs += cost;

      const k = it.productName || it.name || String(it.productId || "Product");
      perProduct[k] = perProduct[k] || { name: k, qty: 0, revenue: 0, cost: 0 };
      perProduct[k].qty += it.quantity || 1;
      perProduct[k].revenue += rev;
      perProduct[k].cost += cost;
    }
  }

  const expenses = await Expense.find({ date: { $gte: from, $lte: to } }).lean();
  const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const expenseByCategory = expenses.reduce((a, e) => {
    a[e.category] = (a[e.category] || 0) + (e.amount || 0);
    return a;
  }, {});

  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenseTotal;

  // returned / cancelled অর্ডার
  const returned = await Order.countDocuments({
    createdAt: { $gte: from, $lte: to },
    status: { $in: ["Cancelled", "cancelled", "Returned", "returned"] },
  });

  return NextResponse.json({
    range: { from, to },
    orderCount: orders.length,
    returnedCount: returned,
    revenue,
    cogs,
    grossProfit,
    expenseTotal,
    expenseByCategory,
    netProfit,
    deliveryCollected,
    margin: revenue ? +((grossProfit / revenue) * 100).toFixed(1) : 0,
    products: Object.values(perProduct)
      .map((p) => ({ ...p, profit: p.revenue - p.cost }))
      .sort((a, b) => b.profit - a.profit),
  });
}
