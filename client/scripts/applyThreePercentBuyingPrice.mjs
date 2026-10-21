import xlsx from 'xlsx';
import mongoose from 'mongoose';

const URI = 'mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority';

// mode can be 'purchaseOnly', 'offerOnly', or 'both'
export async function updatePrices(mode = 'purchaseOnly') {
  await mongoose.connect(URI);
  const wb = xlsx.readFile('C:/Users/atiku/Downloads/E-Com CPP Month of October (Ogerio.com).xlsx');
  const sheetRows = xlsx.utils.sheet_to_json(wb.Sheets['All sku CPP sku']);
  const prodsColl = mongoose.connection.collection('products');

  let updatedCount = 0;
  const sampleResults = [];

  for (const r of sheetRows) {
    const name = (r['Sku Updated Perfect Name'] || '').trim();
    if (!name) continue;

    const baseBuyingPrice = Number(r['Eff.TP']);
    if (isNaN(baseBuyingPrice) || baseBuyingPrice <= 0) continue;

    // Buying price + 3%
    const calculatedPrice = Math.round((baseBuyingPrice * 1.03) * 100) / 100;

    const updateFields = {
      updatedAt: new Date()
    };

    if (mode === 'purchaseOnly') {
      updateFields.purchasePrice = calculatedPrice;
      updateFields.wholesalePrice = calculatedPrice;
    } else if (mode === 'offerOnly') {
      updateFields.offerPrice = Math.round(calculatedPrice);
    } else if (mode === 'both') {
      updateFields.purchasePrice = calculatedPrice;
      updateFields.wholesalePrice = calculatedPrice;
      updateFields.offerPrice = Math.round(calculatedPrice);
    }

    const res = await prodsColl.updateOne(
      { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
      { $set: updateFields }
    );

    if (res.matchedCount > 0) {
      updatedCount++;
      if (sampleResults.length < 5) {
        sampleResults.push({
          name,
          baseEffTP: baseBuyingPrice,
          plusThreePercent: calculatedPrice,
          mode
        });
      }
    }
  }

  console.log(`Updated ${updatedCount} products in mode: ${mode}`);
  console.log('Sample updates:', sampleResults);
  return { updatedCount, sampleResults };
}

if (process.argv[2]) {
  updatePrices(process.argv[2]).then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
