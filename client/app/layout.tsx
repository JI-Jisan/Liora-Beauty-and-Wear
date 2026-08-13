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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <CartProvider>
          <div className="jt-root-wrapper">
            <div className="jt-content-area">{children}</div>
            <Footer />
            <MobileBottomNav />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
