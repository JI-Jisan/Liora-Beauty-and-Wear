import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    await connectToDatabase();
    
    // শুধুমাত্র সফল বা ডেলিভারড (Delivered/Completed) অর্ডারের হিসাব
    const orders = await Order.find({
      status: { $in: ["Delivered", "delivered", "Completed", "completed"] },
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    let totalRevenue = 0; // মোট বিক্রি
    let totalCost = 0;    // মোট কেনার খরচ
    let totalOrders = orders.length;

    orders.forEach(order => {
      totalRevenue += order.total || order.subtotal || 0;
      
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const buyPrice = item.purchasePrice || item.costAtSale || 0;
          const qty = item.quantity || 1;
          totalCost += (buyPrice * qty);
        });
      }
    });

    const netProfit = totalRevenue - totalCost;

    return NextResponse.json(
      {
        totalOrders,
        totalRevenue,
        totalCost,
        netProfit,
        orders
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
