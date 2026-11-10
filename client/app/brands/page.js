import { connectToDatabase } from "@/lib/db";
import { Brand } from "@/lib/models";
import Header from "@/components/Header";
import BrandDirectoryClient from "@/components/BrandDirectoryClient";

export const revalidate = 60;

export const metadata = {
  title: "All Brands | LIORA Beauty & Wear",
  description: "Explore 100% authentic cosmetics, skincare, and beauty brands in Bangladesh at LIORA Beauty & Wear.",
};

export default async function BrandsPage() {
  await connectToDatabase();
  const brands = await Brand.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();

  const serializedBrands = brands.map((b) => ({
    _id: b._id.toString(),
    name: b.name,
    slug: b.slug,
    logo: b.logo || "",
    order: b.order || 0,
  }));

  return (
    <main style={{ minHeight: "100vh", background: "#fcfaf8" }}>
      <Header />
      <BrandDirectoryClient initialBrands={serializedBrands} />
    </main>
  );
}
