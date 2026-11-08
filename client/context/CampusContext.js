"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getCampusCoupon, getProductCampusPricing } from "@/lib/campusCoupons";

const CampusContext = createContext(null);

export function CampusProvider({ children }) {
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to fetch dynamic or preset coupon
  const resolveCoupon = useCallback(async (code) => {
    if (!code) return null;
    const clean = code.trim().toUpperCase();

    // 1. Check local preset dictionary first
    const preset = getCampusCoupon(clean);
    if (preset) return preset;

    // 2. Fetch from database API
    try {
      const res = await fetch(`/api/campus-coupons?code=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.coupon) {
          return json.coupon;
        }
      }
    } catch (e) {
      console.warn("Dynamic coupon fetch error:", e?.message);
    }

    return null;
  }, []);

  // Initialize from localStorage or URL query param
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const urlCode =
            params.get("coupon") ||
            params.get("code") ||
            (params.get("campus") ? `${params.get("campus")}15` : null);

          let found = null;
          if (urlCode) {
            found = await resolveCoupon(urlCode);
          }

          if (!found) {
            const stored = localStorage.getItem("liora_campus_coupon");
            if (stored) {
              found = await resolveCoupon(stored);
            }
          }

          if (isMounted && found) {
            setActiveCoupon(found);
            localStorage.setItem("liora_campus_coupon", found.code);
          }
        }
      } catch (e) {
        console.error("Campus coupon init error:", e);
      } finally {
        if (isMounted) setIsInitialized(true);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [resolveCoupon]);

  const applyCampusCoupon = useCallback(
    async (inputCode) => {
      const coupon = await resolveCoupon(inputCode);
      if (!coupon) {
        return {
          success: false,
          message:
            "অকার্যকর কুপন কোড! অনুগ্রহ করে আপনার বিশ্ববিদ্যালয়ের সঠিক ক্যাম্পাস কোড লিখুন।",
        };
      }

      setActiveCoupon(coupon);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("liora_campus_coupon", coupon.code);
        }
      } catch (e) {
        console.error("Failed to save campus coupon:", e);
      }

      return {
        success: true,
        coupon,
        message: `${coupon.campus || coupon.universityName} (${coupon.short || coupon.shortName}) এর স্পেশাল ক্যাম্পাস প্রমোশন সক্রিয় হয়েছে!`,
      };
    },
    [resolveCoupon]
  );

  const removeCampusCoupon = useCallback(() => {
    setActiveCoupon(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("liora_campus_coupon");
      }
    } catch (e) {
      console.error("Failed to remove campus coupon:", e);
    }
  }, []);

  const getProductPrice = useCallback(
    (product) => {
      return getProductCampusPricing(product, activeCoupon);
    },
    [activeCoupon]
  );

  const value = useMemo(
    () => ({
      activeCoupon,
      isInitialized,
      applyCampusCoupon,
      removeCampusCoupon,
      getProductPrice,
      isCampusActive: !!activeCoupon,
    }),
    [activeCoupon, isInitialized, applyCampusCoupon, removeCampusCoupon, getProductPrice]
  );

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function useCampus() {
  const ctx = useContext(CampusContext);
  if (!ctx) {
    return {
      activeCoupon: null,
      isInitialized: false,
      applyCampusCoupon: async () => ({ success: false, message: "Context missing" }),
      removeCampusCoupon: () => {},
      getProductPrice: () => null,
      isCampusActive: false,
    };
  }
  return ctx;
}
