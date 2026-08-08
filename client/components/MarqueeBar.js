"use client";

export default function MarqueeBar({ offerText = "" }) {
  return (
    <div className="jt-marquee">
      <div className="jt-marquee-track">
        <span>{offerText}</span>
        <span>{offerText}</span>
      </div>
    </div>
  );
}