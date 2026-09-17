import { GET } from "../app/api/marketing/[...slug]/route.js";

async function run() {
  const req = new Request("http://localhost:3000/api/marketing/brands");
  const params = Promise.resolve({ slug: ["brands"] });
  try {
    const res = await GET(req, { params });
    const json = await res.json();
    console.log("Brands API Response status:", res.status);
    console.log("Brands count:", json.brands ? json.brands.length : 0);
    console.log("Response:", JSON.stringify(json).slice(0, 300));
  } catch (err) {
    console.error("API error:", err);
  }
  process.exit(0);
}

run();
