"use client";
import { usePathname } from 'next/navigation';
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function LayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="jt-content-area">{children}</div>
      <Footer />
      <WhatsAppButton />
      <MobileBottomNav />
    </>
  );
}
