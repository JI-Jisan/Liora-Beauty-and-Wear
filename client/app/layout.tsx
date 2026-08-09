import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CartProvider>
          <div className="jt-root-wrapper">
            <div className="jt-content-area">{children}</div>
            <Footer />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
