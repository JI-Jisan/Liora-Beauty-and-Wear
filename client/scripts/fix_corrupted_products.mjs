import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

await mongoose.connect(URI);
const coll = mongoose.connection.collection('products');

// Fix W7 HD Foundation
await coll.updateOne(
  { _id: new mongoose.Types.ObjectId('6a9aba0ac63dd531aa8db328') },
  { $set: { offerPrice: 485, originalPrice: 580 } }
);

// Fix Laikou Sakura Skin Care Series
await coll.updateOne(
  { _id: new mongoose.Types.ObjectId('6a9abda4c63dd531aa8dbee8') },
  { $set: { offerPrice: 430, originalPrice: 495 } }
);

console.log("Fixed 2 corrupted products in DB");
await mongoose.disconnect();
