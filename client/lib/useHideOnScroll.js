import { useEffect, useState } from "react";

export default function useHideOnScroll(threshold = 80) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let last = window.scrollY, ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < threshold) setCollapsed(false);
        else if (y > last + 6) setCollapsed(true);   // নিচে নামছে
        else if (y < last - 6) setCollapsed(false);  // উপরে উঠছে
        last = y; ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return collapsed;
}
