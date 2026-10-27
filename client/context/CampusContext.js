"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getCampusCoupon, getProductCampusPricing } from "@/lib/campusCoupons";

const CampusContext = createContext(null);

export function CampusProvider({ children }) {
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage or URL query param
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        // 1. Check URL query params for auto-activation (e.g. ?coupon=DIU15 or ?code=DIU15)
        const params = new URLSearchParams(window.location.search);
        const urlCode = params.get("coupon") || params.get("code") || (params.get("campus") ? `${params.get("campus")}15` : null);
        
        let found = null;
        if (urlCode) {
          found = getCampusCoupon(urlCode);
        }

        // 2. Check localStorage if no URL param
        if (!found) {
          const stored = localStorage.getItem("liora_campus_coupon");
          if (stored) {
            found = getCampusCoupon(stored);
          }
        }

        if (found) {
          setActiveCoupon(found);
          localStorage.setItem("liora_campus_coupon", found.code);
        }
      }
    } catch (e) {
      console.error("Campus coupon init error:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const applyCampusCoupon = useCallback((inputCode) => {
    const coupon = getCampusCoupon(inputCode);
    if (!coupon) {
      return {
        success: false,
        message: "অকার্যকর কুপন কোড! দয়া করে সঠিক কুপন কোড লিখুন (যেমন: LIORA09)।"
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
      message: `${coupon.campus} (${coupon.short}) এর স্পেশাল ক্যাম্পাস প্রমোশন সক্রিয় হয়েছে!`
    };
  }, []);

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

  const getProductPrice = useCallback((product) => {
    return getProductCampusPricing(product, activeCoupon);
  }, [activeCoupon]);

  const value = useMemo(() => ({
    activeCoupon,
    isInitialized,
    applyCampusCoupon,
    removeCampusCoupon,
    getProductPrice,
    isCampusActive: !!activeCoupon
  }), [activeCoupon, isInitialized, applyCampusCoupon, removeCampusCoupon, getProductPrice]);

  return (
    <CampusContext.Provider value={value}>
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  const ctx = useContext(CampusContext);
  if (!ctx) {
    return {
      activeCoupon: null,
      isInitialized: true,
      applyCampusCoupon: () => ({ success: false }),
      removeCampusCoupon: () => {},
      getProductPrice: () => null,
      isCampusActive: false
    };
  }
  return ctx;
}
