import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET(req) {
  try {
    await connectToDatabase();
    
    // শুধুমাত্র সফল বা ডেলিভারড অর্ডারগুলোর হিসাব ধরা ভালো
    const orders = await Order.find({ status: { $ne: "Cancelled" } }).sort({ createdAt: -1 });

    let totalRevenue = 0; // মোট বিক্রি
    let totalCost = 0;    // মোট কেনার খরচ (যদি প্রোডাক্টে purchasePrice থাকে)
    let totalOrders = orders.length;

    orders.forEach(order => {
      totalRevenue += order.total || order.subtotal || 0;
      
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const buyPrice = item.purchasePrice || 0;
          const qty = item.quantity || 1;
          totalCost += (buyPrice * qty);
        });
      }
    });

    const netProfit = totalRevenue - totalCost;

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      totalCost,
      netProfit,
      orders
    });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
