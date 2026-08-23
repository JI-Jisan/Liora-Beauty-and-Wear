import { useEffect, useState } from "react";

export default function useHideOnScroll(threshold = 80) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let last = window.scrollY, ticking = false;
    let lockUntil = 0;
    
    const apply = (v) => {
      const now = Date.now();
      if (now < lockUntil) return;
      setCollapsed(prev => {
        if (prev === v) return prev;
        lockUntil = now + 350;
        return v;
      });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < threshold) { apply(false); }
        else if (y > last + 24) { apply(true); }
        else if (y < last - 24) { apply(false); }
        last = y; ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return collapsed;
}
