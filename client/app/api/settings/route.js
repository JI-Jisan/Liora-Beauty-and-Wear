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
    "💖 LIORA আসল উৎসব লাইভ   🚚 ফ্রি ডেলিভারি: ঢাকায় ৳১৯৯৯ | সারাদেশে ৳২৯৯৯   ✨ ১০০% অথেনটিক স্কিনকেয়ার   🛡️ ক্যাশ অন ডেলিভারি",
  deliveryInside: 70,
  deliveryOutside: 130,
  freeDeliveryThreshold: 1999,
  freeDeliveryThresholdDhaka: 1999,
  freeDeliveryThresholdOutside: 2999,
  promoSlides: [
    {
      id: "banner-1111-swiss-beauty-pro",
      title: "Swiss Beauty 11.11 Mega Sale - Up to 70% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793650036/liora_store/banners/qii0c7gsgixdcqx5gj7g.webp",
      buttonLink: "/brands/swiss-beauty",
      buttonText: "Shop Swiss Beauty",
    },
    {
      id: "banner-1111-beauty-glazed-pro",
      title: "Beauty Glazed 11.11 Color Mania - Up to 65% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793650037/liora_store/banners/p1fonohzgobksm55r101.webp",
      buttonLink: "/brands/beauty-glazed",
      buttonText: "Shop Beauty Glazed",
    },
    {
      id: "banner-1111-k-beauty-fest",
      title: "11.11 K-Beauty Festival - Korean Glass Skin Up to 50% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793647405/liora_store/banners/embskiwgane2zn7wjwaz.webp",
      buttonLink: "/products?category=K-Beauty",
      buttonText: "Grab K-Beauty Deals",
    },
    {
      id: "banner-1111-beauty-saga",
      title: "11.11 Beauty Saga - Tresemme & Hair Care Up to 45% OFF",
      image: "https://res.cloudinary.com/dlgubaefs/image/upload/v1793647404/liora_store/banners/rhyy1m9sbuhbmhdywstn.webp",
      buttonLink: "/products?category=Hair+Care",
      buttonText: "Shop Hair Care",
    },
  ],
  flashTitle: "Limited Time Special Offer",
  flashSubtitle: "Grab selected trending beauty & wear items before the timer runs out.",
  flashButtonText: "Shop Flash Sale",
  flashButtonLink: "/products",
  flashDurationHours: 6,
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create(DEFAULT_SETTINGS);
    }
    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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
