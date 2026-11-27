import mongoose from "mongoose";

const MONGO_URI = "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

export async function syncPendingOrdersWithProductPrices(db) {
  const pendingOrders = await db.collection("orders").find({
    status: { $regex: /pending/i }
  }).toArray();

  if (pendingOrders.length === 0) {
    console.log("No pending orders to refresh.");
    return { updatedOrders: 0 };
  }

  console.log(`Found ${pendingOrders.length} pending orders to refresh with current product prices...\n`);

  let updatedOrdersCount = 0;

  for (const order of pendingOrders) {
    const isWholesale = order.orderType === "wholesale" || Boolean(order.wholesaleDetails?.businessName);
    const isReseller = order.orderType === "reseller" || Boolean(order.resellerDetails?.resellerUid);
    const customerRole = isWholesale ? "Wholesaler" : (isReseller ? "Reseller" : "Retail Customer");

    let newSubtotal = 0;
    let newTotalCost = 0;
    let hasChanges = false;

    const updatedItems = [];

    for (const item of (order.items || [])) {
      if (!item.productId) {
        updatedItems.push(item);
        newSubtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        newTotalCost += (Number(item.purchasePrice) || 0) * (Number(item.quantity) || 1);
        continue;
      }

      const p = await db.collection("products").findOne({ _id: new mongoose.Types.ObjectId(item.productId) });
      if (!p) {
        updatedItems.push(item);
        newSubtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        newTotalCost += (Number(item.purchasePrice) || 0) * (Number(item.quantity) || 1);
        continue;
      }

      // Determine applicable price based on customer role
      let newPrice = Number(p.offerPrice || p.originalPrice || 0);
      if (isWholesale) {
        newPrice = Number(p.wholesalePrice || p.offerPrice || 0);
      } else if (isReseller) {
        newPrice = Number(p.resellerPrice || p.wholesalePrice || p.offerPrice || 0);
      }

      const newBuyPrice = Number(p.purchasePrice || p.ogerioWholesalePrice || 0);
      const qty = Number(item.quantity || 1);

      if (item.price !== newPrice || item.purchasePrice !== newBuyPrice) {
        hasChanges = true;
      }

      const updatedAllocations = (item.allocations || []).map(alloc => ({
        ...alloc,
        unitCost: newBuyPrice
      }));

      updatedItems.push({
        ...item,
        price: newPrice,
        purchasePrice: newBuyPrice,
        costAtSale: newBuyPrice,
        originalPrice: Number(p.originalPrice || p.offerPrice || newPrice),
        allocations: updatedAllocations.length > 0 ? updatedAllocations : item.allocations
      });

      newSubtotal += newPrice * qty;
      newTotalCost += newBuyPrice * qty;
    }

    if (!hasChanges) {
      console.log(`Order ${order.orderNumber || order._id} is already up to date.`);
      continue;
    }

    // Preserve or reapply coupon discount properly
    let discount = Number(order.discount || 0);
    if (order.couponCode && order.subtotal > 0 && discount > 0) {
      const discountPct = discount / order.subtotal;
      discount = Math.round(newSubtotal * discountPct);
    }

    const deliveryCharge = Number(order.deliveryCharge || 0);
    const newTotal = Math.max(0, newSubtotal - discount) + deliveryCharge;

    const updateFields = {
      items: updatedItems,
      subtotal: newSubtotal,
      totalCost: newTotalCost,
      total: newTotal,
      discount: discount,
      lastPriceRefreshedAt: new Date(),
      updatedAt: new Date()
    };

    // If order was flagged due to 88 Tk glitch, we can also add note
    if (order.wholesaleDetails) {
      updateFields["wholesaleDetails.totalItemsQty"] = updatedItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
    }

    await db.collection("orders").updateOne(
      { _id: order._id },
      { $set: updateFields }
    );

    console.log(`✅ Order ${order.orderNumber} (${customerRole}) updated:`);
    console.log(`   Old Subtotal: ৳${order.subtotal} -> New Subtotal: ৳${newSubtotal}`);
    console.log(`   Old Cost: ৳${order.totalCost || 0} -> New Cost: ৳${newTotalCost}`);
    console.log(`   New Total Payable: ৳${newTotal}`);
    console.log(`   Net Profit: ৳${newTotal - deliveryCharge - newTotalCost}\n`);

    updatedOrdersCount++;
  }

  return { updatedOrders: updatedOrdersCount };
}

async function runStandalone() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 25000 });
  const db = mongoose.connection.db;
  console.log("Connected to MongoDB Atlas!");

  const res = await syncPendingOrdersWithProductPrices(db);
  console.log(`\n🎉 Refresh finished! ${res.updatedOrders} Pending orders updated.`);
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith("sync_pending_orders_prices.mjs")) {
  runStandalone().catch(console.error);
}
