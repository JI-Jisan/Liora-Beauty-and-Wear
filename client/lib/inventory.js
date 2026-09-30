import { PurchaseBatch, Product } from "@/lib/models";

/** একটা প্রোডাক্টের মোট available (সব batch এর remaining, fallback to product.stockQuantity) */
export async function getAvailable(productId) {
  const match = { product: productId, remaining: { $gt: 0 } };
  const rows = await PurchaseBatch.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$remaining" } } },
  ]);
  const batchTotal = rows[0]?.total || 0;
  if (batchTotal > 0) return batchTotal;

  // Fallback: যদি ব্যাচে কোনো এন্ট্রি না থাকে তবে সরাসরি Product.stockQuantity দেখো
  const prod = await Product.findById(productId).select("stockQuantity").lean();
  return prod?.stockQuantity || 0;
}

/** Product.stockQuantity কে batch এর যোগফল দিয়ে sync করা (cache) */
export async function syncProductStock(productId, ProductModel = Product) {
  const total = await getAvailable(productId);
  const status = total <= 0 ? "Out of Stock" : total <= 5 ? "Limited Stock" : "In Stock";
  await ProductModel.findByIdAndUpdate(productId, {
    stockQuantity: total,
    stockStatus: status,
    inStock: total > 0 && status !== "Out of Stock",
  });
  return total;
}

/**
 * Admin যখন প্রোডাক্টের দাম ও স্টক এডিট করে স্টক পরিবর্তন করে,
 * তখন PurchaseBatch এর সাথে সেই স্টক সিঙ্ক রাখা
 */
export async function ensureProductBatchStock(productId, targetStock, unitCost = 0, productName = "") {
  const target = Math.max(0, parseInt(targetStock) || 0);
  const batches = await PurchaseBatch.find({ product: productId }).sort({ purchaseDate: -1, _id: -1 });
  const currentTotal = batches.reduce((sum, b) => sum + Math.max(0, b.remaining || 0), 0);
  const diff = target - currentTotal;

  if (diff > 0) {
    // স্টক বেড়েছে — ব্যাচ আপডেট বা তৈরি করো
    const openBatch = batches.find(
      (b) => b.ownerName === "Opening Stock" || b.supplier === "Initial Stock" || b.supplier === "Stock Adjustment"
    );
    if (openBatch) {
      await PurchaseBatch.findByIdAndUpdate(openBatch._id, {
        $inc: { remaining: diff, qty: diff },
        ...(unitCost > 0 ? { unitCost } : {}),
      });
    } else {
      await PurchaseBatch.create({
        product: productId,
        productName: productName || "Product",
        qty: diff,
        remaining: diff,
        unitCost: unitCost || 0,
        purchaseDate: new Date(),
        ownerName: "Owner",
        locationName: "Owner",
        supplier: "Stock Adjustment",
        note: "Admin Stock Update",
      });
    }
  } else if (diff < 0) {
    // স্টক কমেছে — ব্যাচ থেকে কমাও
    let toDeduct = Math.abs(diff);
    for (const b of batches) {
      if (toDeduct <= 0) break;
      const take = Math.min(toDeduct, b.remaining || 0);
      if (take > 0) {
        await PurchaseBatch.findByIdAndUpdate(b._id, {
          $inc: { remaining: -take },
        });
        toDeduct -= take;
      }
    }
  }

  const finalStatus = target <= 0 ? "Out of Stock" : target <= 5 ? "Limited Stock" : "In Stock";
  await Product.findByIdAndUpdate(productId, {
    stockQuantity: target,
    stockStatus: finalStatus,
    inStock: target > 0,
  });
}

/**
 * FIFO allocate — পুরোনো batch আগে।
 * ownerName দিলে শুধু ওই ব্যক্তির stock থেকে নেবে।
 * ফেরত দেয়: { ok, allocations, avgCost, totalCost } অথবা { ok:false, available }
 */
export async function allocateFIFO(productId, needQty, ownerName = null) {
  const filter = { product: productId, remaining: { $gt: 0 } };

  let batches = await PurchaseBatch.find(filter).sort({ purchaseDate: 1, _id: 1 });
  let totalInBatches = batches.reduce((s, b) => s + (b.remaining || 0), 0);

  // ⭐ SAFETY AUTO-RECONCILIATION:
  // যদি ব্যাচে পর্যাপ্ত স্টক না থাকে কিন্তু Product ডকুমেন্টে স্টক থাকে:
  if (totalInBatches < needQty) {
    const prod = await Product.findById(productId);
    if (prod && (prod.stockQuantity || 0) >= needQty) {
      const neededExtra = Math.max(needQty - totalInBatches, (prod.stockQuantity || 0) - totalInBatches);
      if (neededExtra > 0) {
        await PurchaseBatch.create({
          product: prod._id,
          productName: prod.name || "Product",
          qty: neededExtra,
          remaining: neededExtra,
          unitCost: Number(prod.purchasePrice) || 0,
          purchaseDate: new Date(),
          ownerName: "Owner",
          locationName: "Owner",
          supplier: "Stock Adjustment",
          note: "Auto-reconciled on checkout",
        });
        // ব্যাচ রি-লোড করো
        batches = await PurchaseBatch.find(filter).sort({ purchaseDate: 1, _id: 1 });
      }
    }
  }

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
 * অর্ডারের "কে পাঠাচ্ছে" ফিল্ড আপডেট করা (হিসাব রাখার জন্য)।
 * আলাদা owner/partner স্টক বিভাজন ছাড়াই মেইন স্টক থেকে কাজ সম্পন্ন হয়।
 */
export async function reassignOrderOwner(order, newOwner, ProductModel = Product) {
  order.shippedBy = String(newOwner || "Owner").trim();
  await order.save();
  return order;
}
