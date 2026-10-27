const mongoose = require('mongoose');
require('dotenv').config({ path: 'client/.env.local' });
const uri = process.env.MONGODB_URI;

async function migrate() {
  console.log('Connecting to database...');
  await mongoose.connect(uri);
  
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const Brand = mongoose.model('Brand', new mongoose.Schema({}, { strict: false }));

  console.log('Updating all products wholesaleMinQty to 3...');
  const prodRes = await Product.updateMany(
    {},
    { $set: { wholesaleMinQty: 3 } }
  );
  console.log(`Updated ${prodRes.modifiedCount} products with wholesaleMinQty = 3.`);

  console.log('Updating all brands minWholesaleQty to 3...');
  const brandRes = await Brand.updateMany(
    {},
    { $set: { minWholesaleQty: 3 } }
  );
  console.log(`Updated ${brandRes.modifiedCount} brands with minWholesaleQty = 3.`);

  const verifyProds = await Product.distinct('wholesaleMinQty');
  console.log('Verified product distinct wholesaleMinQty:', verifyProds);

  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
