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
    let targetTimestamp;
    try {
      const storedTime = localStorage.getItem("jt_flash_end_timestamp");
      const now = Date.now();

      if (storedTime && Number(storedTime) > now) {
        targetTimestamp = Number(storedTime);
      } else {
        targetTimestamp = now + flashDurationHours * 60 * 60 * 1000;
        localStorage.setItem("jt_flash_end_timestamp", String(targetTimestamp));
      }
    } catch (e) {
      targetTimestamp = Date.now() + flashDurationHours * 60 * 60 * 1000;
    }

    const updateTimer = () => {
      const now = Date.now();
      const difference = targetTimestamp - now;

      if (difference <= 0) {
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
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

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