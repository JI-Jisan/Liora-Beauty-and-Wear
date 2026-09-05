"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyOrdersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
      অ্যাকাউন্টে নিয়ে যাওয়া হচ্ছে...
    </div>
  );
}
