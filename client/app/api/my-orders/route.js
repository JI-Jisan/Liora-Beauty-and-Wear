import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";
import { getUserFromRequest } from "@/lib/firebaseAdmin";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const orders = await Order.find({ firebaseUid: user.uid })
      .select("orderNumber status total items createdAt accessToken")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return Response.json({ orders });
  } catch {
    return Response.json({ message: "Server error" }, { status: 500 });
  }
}
