import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Order, Product, PartnerLedger } from "@/lib/models";
import { reassignOrderOwner } from "@/lib/inventory";
import { requireAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";
const PROFIT_SHARE = 0.5; // পার্টনারের লাভের ৫০% অংশ (প্রয়োজনে অ্যাডজাস্টেবল)

export async function PATCH(req, { params }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectToDatabase();

  const { id } = await params;
  const { shippedBy } = await req.json();
  const order = await Order.findById(id);
  if (!order) return NextResponse.json({ message: "অর্ডার পাওয়া যায়নি" }, { status: 404 });

  try {
    await reassignOrderOwner(order, shippedBy, Product);
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 409 });
  }

  // পার্টনারের মাল গেলে ledger entry
  if (shippedBy && shippedBy !== "Owner") {
    await PartnerLedger.deleteMany({ order: order._id }); // পুরোনো entry মুছে নতুন
    const cost = order.items.reduce((s, i) => s + (i.costAtSale || 0) * (i.quantity || 1), 0);
    const revenue = order.items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const profit = Math.max(0, revenue - cost);

    await PartnerLedger.create([
      {
        partnerName: shippedBy,
        type: "cost_payable",
        amount: cost,
        order: order._id,
        note: `অর্ডার #${order.orderNumber || order._id} — কেনা দাম`,
      },
      {
        partnerName: shippedBy,
        type: "profit_share",
        amount: +(profit * PROFIT_SHARE).toFixed(2),
        order: order._id,
        note: `লাভের ${PROFIT_SHARE * 100}% অংশ`,
      },
    ]);
  } else {
    await PartnerLedger.deleteMany({ order: order._id });
  }

  return NextResponse.json({ ok: true, order });
}
