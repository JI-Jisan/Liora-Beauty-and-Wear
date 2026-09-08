import { connectToDatabase } from "@/lib/db";
import { Product, Brand } from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.liorabeautyandwear.com";

  const staticRoutes = [
    "",
    "/products",
    "/brands",
    "/blog",
    "/contact",
    "/flash-sales",
    "/clearance",
    "/combo",
    "/privacy-policy",
    "/terms-and-conditions",
    "/shipping-and-delivery-policy",
    "/return-and-refund-policy",
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === "" || route === "/products" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    await connectToDatabase();

    const [products, brands] = await Promise.all([
      Product.find({ inStock: true })
        .select("_id updatedAt")
        .sort({ updatedAt: -1 })
        .limit(5000)
        .lean(),
      Brand.find({ isActive: true }).select("slug updatedAt").lean(),
    ]);

    const productRoutes = (products || []).map((p) => ({
      url: `${siteUrl}/products/${p._id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
      changeFrequency: "daily",
      priority: 0.9,
    }));

    const brandRoutes = (brands || []).map((b) => ({
      url: `${siteUrl}/brands/${b.slug}`,
      lastModified: b.updatedAt ? new Date(b.updatedAt).toISOString() : new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...productRoutes, ...brandRoutes];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticRoutes;
  }
}
