import { GET } from '../app/api/marketing/[...slug]/route.js';

async function test() {
  // Test brands
  console.log('Testing /api/marketing/brands ...');
  const brandsReq = new Request('http://localhost:3000/api/marketing/brands');
  const brandsRes = await GET(brandsReq, { params: Promise.resolve({ slug: ['brands'] }) });
  const brandsJson = await brandsRes.json();
  console.log('Brands status:', brandsRes.status);
  console.log('First brand:', brandsJson.brands ? brandsJson.brands[0] : null);

  // Test products for instock_ready
  console.log('\nTesting /api/marketing/products?brandId=instock_ready ...');
  const prodReq = new Request('http://localhost:3000/api/marketing/products?brandId=instock_ready');
  const prodRes = await GET(prodReq, { params: Promise.resolve({ slug: ['products'] }) });
  const prodJson = await prodRes.json();
  console.log('Products count:', prodJson.products ? prodJson.products.length : 0);
  if (prodJson.products && prodJson.products.length > 0) {
    console.log('First product:', prodJson.products[0]);

    // Test preview of first product
    console.log('\nTesting /api/marketing/preview/' + prodJson.products[0]._id + ' ...');
    const prevReq = new Request('http://localhost:3000/api/marketing/preview/' + prodJson.products[0]._id);
    const prevRes = await GET(prevReq, { params: Promise.resolve({ slug: ['preview', prodJson.products[0]._id] }) });
    const prevJson = await prevRes.json();
    console.log('Preview success:', prevJson.success);
    console.log('Banner base64 prefix:', prevJson.bannerBase64 ? prevJson.bannerBase64.slice(0, 35) : null);
    console.log('Caption preview:', prevJson.caption ? prevJson.caption.slice(0, 100) : null);
  }

  process.exit(0);
}

test().catch(e => { console.error('Test error:', e); process.exit(1); });
