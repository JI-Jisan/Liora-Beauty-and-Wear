import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  title: "LIORA Beauty & Wear | Beauty. Style. You.",
  description:
    "Shop 100% authentic cosmetics, luxury perfumes, skincare, and trendy fashion wear in Bangladesh. Easy Cash on Delivery nationwide.",
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
  return (
    <html lang="en">
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
