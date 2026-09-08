import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { CartProvider } from "@/context/CartContext";

const siteUrl = "https://www.liorabeautyandwear.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LIORA Beauty & Wear | Authentic Cosmetics & Skincare in Bangladesh",
    template: "%s | LIORA Beauty & Wear",
  },
  description:
    "Shop 100% authentic cosmetics, luxury perfumes, skincare, and trendy fashion wear at best price in Bangladesh. Fast Cash on Delivery nationwide.",
  keywords: [
    "cosmetics price in bangladesh",
    "authentic skincare bd",
    "makeup price in bangladesh",
    "the face shop price in bangladesh",
    "korean skincare bangladesh",
    "liora beauty and wear",
  ],
  openGraph: {
    title: "LIORA Beauty & Wear | Authentic Cosmetics & Skincare in Bangladesh",
    description:
      "Shop 100% authentic cosmetics, luxury perfumes, skincare, and trendy fashion wear at best price in Bangladesh.",
    url: siteUrl,
    siteName: "LIORA Beauty & Wear",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LIORA Beauty & Wear",
    description: "Authentic Cosmetics, Skincare & Luxury Wear in Bangladesh",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  verification: {
    google: "llyiJThwVTT8mmTN2qLuQAAcb5lO_9ejDLjHOGx8vN0",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import LayoutChrome from "@/components/LayoutChrome";
import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const storeSchema = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "LIORA Beauty & Wear",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description:
      "Shop 100% authentic cosmetics, luxury perfumes, skincare, and trendy fashion wear in Bangladesh.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "BD",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="llyiJThwVTT8mmTN2qLuQAAcb5lO_9ejDLjHOGx8vN0" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <CartProvider>
            <div className="jt-root-wrapper">
              <LayoutChrome>{children}</LayoutChrome>
            </div>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
