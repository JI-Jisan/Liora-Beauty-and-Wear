"use client";
import { useEffect, useState } from "react";

export default function useHideOnScroll(threshold = 50) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || document.documentElement?.scrollTop || 0;
        if (y > threshold) {
          setCollapsed(true);
        } else if (y < 25) {
          setCollapsed(false);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return collapsed;
}
