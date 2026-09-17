import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectToDatabase } from "../lib/db.js";
import { Product } from "../lib/models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pubDir = path.join(__dirname, "..", "public", "banners");

async function check() {
  await connectToDatabase();
  const query = {
    inStock: true,
    stockQuantity: { $gt: 0 },
    stockStatus: { $ne: "Out of Stock" }
  };
  const totalInStock = await Product.countDocuments(query);

  const bannerFiles = fs.readdirSync(pubDir).filter(f => f.startsWith("banner_") && f.endsWith(".png"));
  const doneIds = new Set(bannerFiles.map(f => f.replace("banner_", "").replace(".png", "")));

  const allInStock = await Product.find(query, { _id: 1, name: 1, brand: 1, category: 1, price: 1, images: 1 }).lean();
  
  const remaining = allInStock.filter(p => !doneIds.has(p._id.toString()));
  console.log(`Total In-Stock Products in DB: ${totalInStock}`);
  console.log(`Currently Done Banners on Disk: ${doneIds.size}`);
  console.log(`Remaining In-Stock Products to Process: ${remaining.length}`);

  if (remaining.length > 0) {
    console.log(`\nNext ${Math.min(remaining.length, 10)} products to process:`);
    remaining.slice(0, 10).forEach((p, idx) => {
      console.log(`${idx + 1}. [${p._id}] ${p.name} (৳${p.price})`);
    });
  }
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
