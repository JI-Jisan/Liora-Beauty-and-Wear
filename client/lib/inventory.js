import { PurchaseBatch, Product } from "@/lib/models";

/** একটা প্রোডাক্টের মোট available (সব batch এর remaining) */
export async function getAvailable(productId, ownerName = null) {
  const match = { product: productId, remaining: { $gt: 0 } };
  if (ownerName) match.locationName = ownerName;
  const rows = await PurchaseBatch.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$remaining" } } },
  ]);
  return rows[0]?.total || 0;
}

/** Product.stockQuantity কে batch এর যোগফল দিয়ে sync করা (cache) */
export async function syncProductStock(productId, ProductModel = Product) {
  const total = await getAvailable(productId);
  const status = total <= 0 ? "Out of Stock" : total <= 5 ? "Limited Stock" : "In Stock";
  await ProductModel.findByIdAndUpdate(productId, {
    stockQuantity: total,
    stockStatus: status,
  });
  return total;
}

/**
 * FIFO allocate — পুরোনো batch আগে।
 * ownerName দিলে শুধু ওই ব্যক্তির stock থেকে নেবে।
 * ফেরত দেয়: { ok, allocations, avgCost, totalCost } অথবা { ok:false, available }
 */
export async function allocateFIFO(productId, needQty, ownerName = null) {
  const filter = { product: productId, remaining: { $gt: 0 } };
  if (ownerName) filter.locationName = ownerName;

  const batches = await PurchaseBatch.find(filter).sort({ purchaseDate: 1, _id: 1 });

  const allocations = [];
  let left = needQty;

  for (const b of batches) {
    if (left <= 0) break;
    const take = Math.min(left, b.remaining);

    // atomic: remaining >= take হলেই কমবে, নাহলে skip
    const updated = await PurchaseBatch.findOneAndUpdate(
      { _id: b._id, remaining: { $gte: take } },
      { $inc: { remaining: -take } },
      { new: true }
    );
    if (!updated) continue; // অন্য কেউ নিয়ে ফেলেছে, পরের batch দেখো

    allocations.push({
      batch: b._id,
      qty: take,
      unitCost: b.unitCost,
      ownerName: b.ownerName,
    });
    left -= take;
  }

  if (left > 0) {
    // যা কেটেছি ফিরিয়ে দাও (partial allocation রাখা যাবে না)
    await releaseAllocations(allocations);
    return { ok: false, available: needQty - left, allocations: [] };
  }

  const totalCost = allocations.reduce((s, a) => s + a.qty * a.unitCost, 0);
  return { ok: true, allocations, avgCost: totalCost / needQty, totalCost };
}

/** allocation ফিরিয়ে দেওয়া (order cancel / reassign / rollback) */
export async function releaseAllocations(allocations = []) {
  for (const a of allocations) {
    if (a.batch && a.qty > 0) {
      await PurchaseBatch.findByIdAndUpdate(a.batch, { $inc: { remaining: a.qty } });
    }
  }
}

/** পুরো অর্ডারের stock ফেরত (cancel/return এর সময়) */
export async function releaseOrder(order, ProductModel = Product) {
  if (!order.stockDeducted) return;
  for (const item of order.items) {
    await releaseAllocations(item.allocations || []);
    const pId = item.productId || item.product || item._id;
    if (pId) {
      await syncProductStock(pId, ProductModel);
    }
  }
  order.stockDeducted = false;
  await order.save();
}

/**
 * অর্ডারের stock এক ব্যক্তির থেকে আরেকজনের stock এ সরানো।
 * অ্যাডমিন "কে পাঠাচ্ছে" বদলালে এটা চলবে।
 */
export async function reassignOrderOwner(order, newOwner, ProductModel = Product) {
  for (const item of order.items) {
    const current = item.allocations || [];
    const alreadyRight = current.length > 0 && current.every((a) => a.ownerName === newOwner);
    if (alreadyRight) continue;

    // আগে ফিরিয়ে দাও
    await releaseAllocations(current);

    // নতুন owner এর stock থেকে নাও
    const pId = item.productId || item.product;
    const res = await allocateFIFO(pId, item.quantity, newOwner);
    if (!res.ok) {
      // ব্যর্থ হলে আগের অবস্থায় ফিরে যাও
      const back = await allocateFIFO(pId, item.quantity, null);
      item.allocations = back.ok ? back.allocations : [];
      await order.save();
      throw new Error(
        `${item.productName || item.name || "প্রোডাক্ট"} — ${newOwner} এর কাছে পর্যাপ্ত stock নেই (আছে ${res.available} পিস)`
      );
    }
    item.allocations = res.allocations;
    item.costAtSale = res.avgCost;
    await syncProductStock(pId, ProductModel);
  }

  order.totalCost = order.items.reduce((s, i) => s + (i.costAtSale || 0) * i.quantity, 0);
  order.shippedBy = newOwner;
  await order.save();
  return order;
}
