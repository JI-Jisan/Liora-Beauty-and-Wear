import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

let uri = "";
for (const line of envContent.split(/\r?\n/)) {
  if (line.startsWith("MONGODB_URI=") || line.startsWith("MONGO_URI=")) {
    let val = line.substring(line.indexOf("=") + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    uri = val;
    break;
  }
}

const mongoose = (await import("mongoose")).default;

async function rollback() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection("products");

  const products = await col.find({ is1111Applied: true }).toArray();
  console.log(`Found ${products.length} products with 11.11 pricing to restore.`);

  const bulkOps = [];
  for (const p of products) {
    if (p.pre1111OfferPrice) {
      bulkOps.push({
        updateOne: {
          filter: { _id: p._id },
          update: {
            $set: {
              offerPrice: p.pre1111OfferPrice,
              originalPrice: p.pre1111OriginalPrice || p.originalPrice,
              is1111Applied: false,
            },
            $unset: {
              pre1111OfferPrice: "",
              pre1111OriginalPrice: "",
              applied1111At: "",
            },
          },
        },
      });
    }
  }

  const BATCH_SIZE = 500;
  for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
    const chunk = bulkOps.slice(i, i + BATCH_SIZE);
    await col.bulkWrite(chunk, { ordered: false });
  }

  console.log(`Successfully reverted ${bulkOps.length} products to pre-11.11 prices.`);
  await mongoose.disconnect();
}

rollback().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});

