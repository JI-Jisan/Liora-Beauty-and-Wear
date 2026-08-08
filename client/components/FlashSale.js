"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function FlashSale({
  flashTitle = "Limited Time Special Offer",
  flashSubtitle = "Grab selected trending products before the timer runs out.",
  flashButtonText = "Shop Flash Sale",
  flashButtonLink = "/products",
  flashDurationHours = 6,
}) {
  const [timeLeft, setTimeLeft] = useState({
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  useEffect(() => {
    const targetTime = new Date();
    targetTime.setHours(targetTime.getHours() + flashDurationHours);

    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetTime - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({
          hours: "00",
          minutes: "00",
          seconds: "00",
        });
        return;
      }

      const hours = String(
        Math.floor((difference / (1000 * 60 * 60)) % 24)
      ).padStart(2, "0");

      const minutes = String(
        Math.floor((difference / (1000 * 60)) % 60)
      ).padStart(2, "0");

      const seconds = String(
        Math.floor((difference / 1000) % 60)
      ).padStart(2, "0");

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [flashDurationHours]);

  return (
    <section className="jt-flash-sale">
      <div className="jt-flash-sale-inner">
        <div className="jt-flash-left">
          <span className="jt-flash-badge">Flash Sale</span>
          <h2>{flashTitle}</h2>
          <p>{flashSubtitle}</p>

          <div className="jt-flash-timer">
            <div className="jt-time-box">
              <strong>{timeLeft.hours}</strong>
              <span>Hours</span>
            </div>

            <div className="jt-time-box">
              <strong>{timeLeft.minutes}</strong>
              <span>Minutes</span>
            </div>

            <div className="jt-time-box">
              <strong>{timeLeft.seconds}</strong>
              <span>Seconds</span>
            </div>
          </div>

          <Link href={flashButtonLink} className="jt-flash-btn">
            {flashButtonText}
          </Link>
        </div>
      </div>
    </section>
  );
}