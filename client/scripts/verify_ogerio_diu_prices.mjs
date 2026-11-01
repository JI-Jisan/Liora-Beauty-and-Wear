import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function verify() {
  await mongoose.connect(MONGO_URI);
  const products = await mongoose.connection.collection("products").find({ ogerioPrice: { $gt: 0 } }).toArray();
  console.log(`Products with ogerioPrice in DB: ${products.length}`);

  let belowCount = 0;
  let exactCount = 0;
  let higherCount = 0;

  for (const p of products) {
    const diuPrice = Math.round(Number(p.offerPrice || 0) * (1 - Number(p.campusDiscountPct || 0) / 100));
    if (diuPrice < p.ogerioPrice) {
      belowCount++;
      console.log(`VIOLATION: ${p.name} | DIU price: ${diuPrice} | Ogerio: ${p.ogerioPrice}`);
    } else if (diuPrice === p.ogerioPrice) {
      exactCount++;
    } else {
      higherCount++;
    }
  }

  console.log("\n==========================================");
  console.log(`Products with DIU Price < Ogerio Price:  ${belowCount}`);
  console.log(`Products with DIU Price == Ogerio Price: ${exactCount}`);
  console.log(`Products with DIU Price > Ogerio Price:  ${higherCount}`);
  console.log("==========================================");

  if (belowCount === 0) {
    console.log("✅ VERIFIED: ZERO products are cheaper than Ogerio under DIU discount!");
  }

  await mongoose.disconnect();
}

verify().catch(console.error);
