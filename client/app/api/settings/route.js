import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SiteSettings } from "@/lib/models";

const DEFAULT_SETTINGS = {
  brandName: "LIORA Beauty & Wear",
  brandSubtitle: "Beauty. Style. You.",
  heroTitle: "Beauty That Inspires Confidence & Style That Speaks Elegance",
  heroText:
    "Shop 100% authentic cosmetics, luxury perfumes, skincare, and fashion wear in one place.",
  heroImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
  offerText:
    "💖 Welcome to LIORA Beauty & Wear   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1500 Tk   ✨ 100% Authentic Products",
  promoSlides: [
    {
      badge: "Exclusive",
      title: "Royal Oud Collection",
      subtitle: "Experience luxury oriental fragrances with long-lasting scent.",
      buttonText: "Shop Perfumes",
      buttonLink: "/products?search=Perfume",
      image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&auto=format&fit=crop&q=80",
    },
  ],
  flashTitle: "Limited Time Special Offer",
  flashSubtitle: "Grab selected trending beauty & wear items before the timer runs out.",
  flashButtonText: "Shop Flash Sale",
  flashButtonLink: "/products",
  flashDurationHours: 6,
};

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create(DEFAULT_SETTINGS);
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    let settings = await SiteSettings.findOne();

    if (settings) {
      settings = await SiteSettings.findByIdAndUpdate(settings._id, body, { new: true });
    } else {
      settings = await SiteSettings.create({ ...DEFAULT_SETTINGS, ...body });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
