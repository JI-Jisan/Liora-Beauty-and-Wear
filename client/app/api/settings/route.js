import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SiteSettings } from "@/lib/models";

const DEFAULT_SETTINGS = {
  brandName: "LIORA Beauty & Wear",
  brandSubtitle: "Beauty. Style. You.",
  heroTitle: "Beauty That Inspires Confidence & Style That Speaks Elegance",
  heroText:
    "Shop 100% authentic cosmetics, luxury perfumes, skincare, and fashion wear in one place.",
  heroImage: "",
  offerText:
    "💖 Welcome to LIORA Beauty & Wear   🚚 Cash on Delivery Available   🎁 Free delivery on orders above 1999 Tk   ✨ 100% Authentic Products",
  promoSlides: [
    {
      id: "banner-1111-swiss-cosmetics",
      title: "11.11 Mega Sale - Swiss Beauty & Cosmetics Up to 70% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793647403/liora_store/banners/jaibi6bgdo6xodnr4tro.webp",
      buttonLink: "/brand/swiss-beauty",
      buttonText: "Shop 11.11 Deals",
    },
    {
      id: "banner-1111-beauty-saga",
      title: "11.11 Beauty Saga - Tresemme & Hair Care Up to 45% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793647404/liora_store/banners/rhyy1m9sbuhbmhdywstn.webp",
      buttonLink: "/products?category=Hair+Care",
      buttonText: "Shop Beauty Saga",
    },
    {
      id: "banner-1111-k-beauty-fest",
      title: "11.11 K-Beauty Festival - Korean Glass Skin Up to 50% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793647405/liora_store/banners/embskiwgane2zn7wjwaz.webp",
      buttonLink: "/products?category=K-Beauty",
      buttonText: "Grab K-Beauty Deals",
    },
  ],
  flashTitle: "Limited Time Special Offer",
  flashSubtitle: "Grab selected trending beauty & wear items before the timer runs out.",
  flashButtonText: "Shop Flash Sale",
  flashButtonLink: "/products",
  flashDurationHours: 6,
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create(DEFAULT_SETTINGS);
    }
    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
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
