"use client";
import { useEffect } from "react";

export default function OverflowDebug() {
  useEffect(() => {
    const w = document.documentElement.clientWidth;
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > w + 1 || r.width > w + 1) {
        el.style.outline = "2px solid red";
        console.log("OVERFLOW →", el.tagName, el.className || el.id, Math.round(r.width), "px");
      }
    });
  }, []);
  return null;
}
