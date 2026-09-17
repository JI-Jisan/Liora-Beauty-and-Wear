const mongoose = require('../server/node_modules/mongoose');
const dotenv = require('../server/node_modules/dotenv');
dotenv.config({ path: './server/.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const c of collections) {
    const list = await mongoose.connection.db.collection(c.name).find({}).limit(500).toArray();
    for (const doc of list) {
      const str = JSON.stringify(doc);
      if (str.includes('91') && !str.includes('1991') && !str.includes('sha512') && !str.includes('ObjectId')) {
        // Find keys containing 91
        for (const [k, v] of Object.entries(doc)) {
          if (v === 91 || v === '91') {
            console.log(`Found in collection "${c.name}", doc ${doc._id}: ${k} = ${v}`);
          }
        }
      }
    }
  }
  console.log('Search finished.');
  process.exit(0);
}
run();
