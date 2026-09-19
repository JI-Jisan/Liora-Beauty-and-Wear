"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export default function AdminIdCardStudio() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("info");
  const [viewMode, setViewMode] = useState("live"); // "live" or "orig"

  const [cardData, setCardData] = useState({
    name: "Jahidul Islam Jisan",
    designation: "MANAGING DIRECTOR (MD)",
    empId: "LIORA-001",
    department: "Management & Marketing",
    bloodGroup: "O+",
    joiningDate: "01 Aug 2025",
    slogan: "Together We Grow ♥",
    photoUrl: "/id_cards/jisan_portrait.jpg",
    // Back Side
    contact: "+880 1712 345678",
    email: "liorabeautyandwear@gmail.com",
    fbPage: "Liora Beauty and Wear",
    website: "liorabeautyandwear.com",
    address: "Rayerbag, Dhaka, Bangladesh",
    qrUrl: "https://liorabeautyandwear.com",
  });

  const handleInputChange = (field, value) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCardData((prev) => ({ ...prev, photoUrl: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetToOriginal = () => {
    setCardData({
      name: "Jahidul Islam Jisan",
      designation: "MANAGING DIRECTOR (MD)",
      empId: "LIORA-001",
      department: "Management & Marketing",
      bloodGroup: "O+",
      joiningDate: "01 Aug 2025",
      slogan: "Together We Grow ♥",
      photoUrl: "/id_cards/jisan_portrait.jpg",
      contact: "+880 1712 345678",
      email: "liorabeautyandwear@gmail.com",
      fbPage: "Liora Beauty and Wear",
      website: "liorabeautyandwear.com",
      address: "Rayerbag, Dhaka, Bangladesh",
      qrUrl: "https://liorabeautyandwear.com",
    });
  };

  const applyRole = (name, des, id, dept, blood, date, slogan) => {
    setCardData((prev) => ({
      ...prev,
      name,
      designation: des,
      empId: id,
      department: dept,
      bloodGroup: blood,
      joiningDate: date,
      slogan: slogan || "Together We Grow ♥",
    }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8e6ea", color: "#1e293b", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #fce7ec",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 10px rgba(190, 24, 93, 0.05)",
        }}
        className="no-print"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.push("/admin")}
            style={{
              background: "#fce7ec",
              color: "#be185d",
              border: "none",
              padding: "8px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            ← Admin Dashboard
          </button>
          <div>
            <h1 style={{ fontSize: "20px", margin: 0, color: "#be185d", fontWeight: 800 }}>
              🪪 LIORA ID Card Studio
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              রেফারেন্স ছবির সাথে হুবহু মেলানো লাইভ ক্যানভা এডিটর (Zero Overlapping / 100% Exact Match)
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => window.print()}
            style={{
              background: "#be185d",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "13px",
              boxShadow: "0 4px 12px rgba(190, 24, 93, 0.25)",
            }}
          >
            🖨️ প্রিন্ট করুন (Print)
          </button>
          <button
            onClick={resetToOriginal}
            style={{
              background: "white",
              color: "#be185d",
              border: "1px solid #fbcfe8",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ↺ মূল তথ্যে রিসেট
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          minHeight: "calc(100vh - 65px)",
        }}
        className="studio-grid"
      >
        {/* Left Inspector */}
        <aside
          style={{
            background: "#ffffff",
            borderRight: "1px solid #fce7ec",
            padding: "20px",
            overflowY: "auto",
            maxHeight: "calc(100vh - 65px)",
          }}
          className="no-print"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "4px",
              background: "#fdf2f4",
              padding: "4px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {[
              { key: "info", label: "তথ্য" },
              { key: "photo", label: "ছবি" },
              { key: "back", label: "পেছন" },
              { key: "roles", label: "রোলস" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: activeTab === t.key ? "#be185d" : "transparent",
                  color: activeTab === t.key ? "white" : "#64748b",
                  border: "none",
                  padding: "8px 4px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>কর্মচারীর নাম (Full Name)</label>
                <input
                  type="text"
                  value={cardData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>পদবী (Designation)</label>
                <input
                  type="text"
                  value={cardData.designation}
                  onChange={(e) => handleInputChange("designation", e.target.value.toUpperCase())}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>এমপ্লয়ি আইডি (ID)</label>
                  <input
                    type="text"
                    value={cardData.empId}
                    onChange={(e) => handleInputChange("empId", e.target.value.toUpperCase())}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>রক্তের গ্রুপ</label>
                  <select
                    value={cardData.bloodGroup}
                    onChange={(e) => handleInputChange("bloodGroup", e.target.value)}
                    style={inputStyle}
                  >
                    {["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>ডিপার্টমেন্ট (Department)</label>
                <input
                  type="text"
                  value={cardData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>যোগদানের তারিখ (Joining Date)</label>
                <input
                  type="text"
                  value={cardData.joiningDate}
                  onChange={(e) => handleInputChange("joiningDate", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>স্লোগান (Slogan)</label>
                <input
                  type="text"
                  value={cardData.slogan}
                  onChange={(e) => handleInputChange("slogan", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {activeTab === "photo" && (
            <div>
              <label style={labelStyle}>পাসপোর্ট সাইজ ছবি পরিবর্তন করুন</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ ...inputStyle, padding: "8px", marginBottom: "16px" }}
              />
              <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                যেকোনো কর্মীর নতুন ছবি সিলেক্ট করলে তাৎক্ষণিকভাবে কার্ডের ফটো ফ্রেমে সেট হয়ে যাবে।
              </p>
              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <button
                  onClick={() => handleInputChange("photoUrl", "/id_cards/jisan_portrait.jpg")}
                  style={{
                    background: "#fce7ec",
                    color: "#be185d",
                    border: "1px solid #fbcfe8",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  আসল জিসান সাহেবের ছবি ফিরিয়ে আনুন
                </button>
              </div>
            </div>
          )}

          {activeTab === "back" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>অফিশিয়াল কন্টাক্ট নম্বর</label>
                <input
                  type="text"
                  value={cardData.contact}
                  onChange={(e) => handleInputChange("contact", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>অফিশিয়াল ইমেইল</label>
                <input
                  type="text"
                  value={cardData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>ফেসবুক পেজ</label>
                <input
                  type="text"
                  value={cardData.fbPage}
                  onChange={(e) => handleInputChange("fbPage", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>ওয়েবসাইট</label>
                <input
                  type="text"
                  value={cardData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>অফিস ঠিকানা</label>
                <input
                  type="text"
                  value={cardData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>কিউআর কোড লিংক</label>
                <input
                  type="text"
                  value={cardData.qrUrl}
                  onChange={(e) => handleInputChange("qrUrl", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {activeTab === "roles" && (
            <div>
              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                ১-ক্লিকে যেকোনো স্টাফের রোল অ্যাপ্লাই করুন:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  {
                    name: "Jahidul Islam Jisan",
                    des: "MANAGING DIRECTOR (MD)",
                    id: "LIORA-001",
                    dept: "Management & Marketing",
                    bg: "O+",
                    date: "01 Aug 2025",
                    slogan: "Together We Grow ♥",
                    icon: "👑",
                  },
                  {
                    name: "Nusrat Jahan",
                    des: "SHOWROOM MANAGER",
                    id: "LIORA-012",
                    dept: "Retail & Operations",
                    bg: "A+",
                    date: "15 Oct 2025",
                    slogan: "Excellence in Service ♥",
                    icon: "🏬",
                  },
                  {
                    name: "Fatema Tuz Zohra",
                    des: "BEAUTY CONSULTANT",
                    id: "LIORA-025",
                    dept: "Customer Experience",
                    bg: "B+",
                    date: "01 Jan 2026",
                    slogan: "Glow with Confidence ♥",
                    icon: "💄",
                  },
                  {
                    name: "Md. Rakib Hasan",
                    des: "DELIVERY HERO",
                    id: "LIORA-042",
                    dept: "Logistics & Supply",
                    bg: "O+",
                    date: "10 Feb 2026",
                    slogan: "Fast & Safe Delivery ♥",
                    icon: "🚚",
                  },
                ].map((r, i) => (
                  <button
                    key={i}
                    onClick={() => applyRole(r.name, r.des, r.id, r.dept, r.bg, r.date, r.slogan)}
                    style={{
                      background: "#fdf2f4",
                      border: "1px solid #fbcfe8",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "#be185d",
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      {r.icon} {r.des}
                    </span>
                    <span style={{ fontSize: "12px" }}>লোড →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right Stage */}
        <main
          style={{
            padding: "30px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            background: "radial-gradient(circle at center, #fcecee 0%, #f6dbe2 100%)",
            overflowY: "auto",
          }}
          id="print-stage"
        >
          {/* Mode Toggle */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              background: "white",
              padding: "4px",
              borderRadius: "30px",
              marginBottom: "25px",
              boxShadow: "0 4px 12px rgba(190, 24, 93, 0.1)",
              border: "1px solid #fbcfe8",
            }}
            className="no-print"
          >
            <button
              onClick={() => setViewMode("live")}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: viewMode === "live" ? "#be185d" : "transparent",
                color: viewMode === "live" ? "white" : "#64748b",
                boxShadow: viewMode === "live" ? "0 2px 8px rgba(190, 24, 93, 0.25)" : "none",
              }}
            >
              🎨 লাইভ এডিটর (Live Canva Mode)
            </button>
            <button
              onClick={() => setViewMode("orig")}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: viewMode === "orig" ? "#be185d" : "transparent",
                color: viewMode === "orig" ? "white" : "#64748b",
                boxShadow: viewMode === "orig" ? "0 2px 8px rgba(190, 24, 93, 0.25)" : "none",
              }}
            >
              📸 মূল রেফারেন্স মাস্টার (Exact Pic 2)
            </button>
          </div>

          {/* Mode 1: Exact Pic 2 Master */}
          {viewMode === "orig" && (
            <div style={{ maxWidth: "900px", width: "100%", textAlign: "center" }}>
              <img
                src="/id_cards/original_user_design.jpg"
                alt="Exact Pic 2 Master Reference"
                style={{
                  width: "100%",
                  borderRadius: "24px",
                  boxShadow: "0 25px 50px -12px rgba(190, 24, 93, 0.35)",
                  border: "2px solid #fecdd3",
                }}
              />
            </div>
          )}

          {/* Mode 2: Live Pure Vector Cards (Zero Overlapping / 100% Match) */}
          {viewMode === "live" && (
            <div
              style={{
                display: "flex",
                gap: "50px",
                alignItems: "flex-start",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
              className="cards-container"
            >
              {/* FRONT CARD */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Lanyard Ribbon Strap */}
                <div
                  style={{
                    width: "44px",
                    height: "75px",
                    background: "linear-gradient(180deg, #c02656 0%, #9d174d 100%)",
                    borderRadius: "4px 4px 0 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(190, 24, 93, 0.3)",
                    position: "relative",
                    zIndex: 2,
                  }}
                  className="no-print"
                >
                  <span
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "4px",
                    }}
                  >
                    LIORA
                  </span>
                </div>
                {/* Metal Clip */}
                <div
                  style={{
                    width: "32px",
                    height: "16px",
                    background: "linear-gradient(180deg, #94a3b8, #cbd5e1, #64748b)",
                    borderRadius: "4px",
                    marginBottom: "-4px",
                    zIndex: 3,
                    boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                  }}
                  className="no-print"
                />

                {/* Card Container */}
                <div
                  style={{
                    width: "330px",
                    height: "555px",
                    borderRadius: "22px",
                    boxShadow: "0 25px 50px -10px rgba(190, 24, 93, 0.3), 0 0 0 1px rgba(254, 205, 211, 0.5)",
                    overflow: "hidden",
                    position: "relative",
                    background: "#ffffff",
                  }}
                  className="print-card"
                >
                  <svg width="330" height="555" viewBox="0 0 330 555" style={{ display: "block" }}>
                    <defs>
                      <clipPath id="photo-clip-react">
                        <rect x="100" y="112" width="130" height="130" rx="14" ry="14" />
                      </clipPath>
                    </defs>

                    {/* Card Base */}
                    <rect width="330" height="555" rx="22" ry="22" fill="#fff7f8" stroke="#fecdd3" strokeWidth="1" />

                    {/* Top Organic Waves */}
                    <path d="M0,0 L330,0 L330,55 Q230,85 130,45 Q60,18 0,75 Z" fill="#fde2e7" opacity="0.9" />
                    <path d="M0,0 L330,0 L330,30 Q210,60 120,28 Q50,8 0,45 Z" fill="#fdf2f4" />

                    {/* Bottom Organic Waves */}
                    <path d="M0,555 L330,555 L330,490 Q240,535 130,510 Q60,495 0,540 Z" fill="#fde2e7" opacity="0.8" />
                    <path d="M85,555 L330,555 L330,502 Q240,542 150,528 Q105,520 85,555 Z" fill="#be185d" opacity="0.95" />

                    {/* Botanical Rose Leaves (Bottom Right) */}
                    <image href="/id_cards/leaf_front.png" x="240" y="430" width="90" height="125" preserveAspectRatio="none" />

                    {/* Slot Hole */}
                    <rect x="145" y="10" width="40" height="10" rx="5" fill="#1e293b" />

                    {/* Header Logo */}
                    <text x="165" y="44" textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontSize="7.5" fontWeight="700" letterSpacing="4.5" fill="#1e293b">
                      BEAUTY &amp; WEAR
                    </text>
                    <text x="165" y="76" textAnchor="middle" fontFamily="'Playfair Display', serif" fontSize="34" fontWeight="700" letterSpacing="2" fill="#be185d">
                      LIORA
                    </text>

                    {/* Ornamental Lines & Script Subtitle */}
                    <line x1="58" y1="88" x2="104" y2="88" stroke="#be185d" strokeWidth="1" />
                    <polygon points="58,88 61,86 64,88 61,90" fill="#be185d" />
                    <text x="165" y="93" textAnchor="middle" fontFamily="'Great Vibes', cursive" fontSize="19" fill="#be185d">
                      Beauty &amp; Wear
                    </text>
                    <line x1="226" y1="88" x2="272" y2="88" stroke="#be185d" strokeWidth="1" />
                    <polygon points="272,88 269,86 266,88 269,90" fill="#be185d" />

                    {/* Photo Frame & Image */}
                    <rect x="98" y="110" width="134" height="134" rx="16" ry="16" fill="#be185d" />
                    <image
                      href={cardData.photoUrl}
                      x="100"
                      y="112"
                      width="130"
                      height="130"
                      preserveAspectRatio="xMidYMid slice"
                      clipPath="url(#photo-clip-react)"
                    />

                    {/* Name */}
                    <text x="165" y="267" textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize="19" fontWeight="800" fill="#0f172a">
                      {cardData.name}
                    </text>

                    {/* Designation Pill Badge */}
                    <rect x="55" y="278" width="220" height="24" rx="12" fill="#be185d" />
                    <text x="165" y="294" textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontSize="9.5" fontWeight="800" letterSpacing="0.7" fill="#ffffff">
                      {cardData.designation}
                    </text>

                    {/* 4 Detail Rows */}
                    {/* Row 1: ID */}
                    <circle cx="48" cy="326" r="11" fill="#be185d" />
                    <g transform="translate(42, 320) scale(0.5)" fill="white">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z" />
                    </g>
                    <text x="70" y="330" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="500" fill="#1e293b">Employee ID</text>
                    <text x="142" y="330" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="500" fill="#64748b">:</text>
                    <text x="156" y="330" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.empId}</text>

                    {/* Row 2: Department */}
                    <circle cx="48" cy="358" r="11" fill="#be185d" />
                    <g transform="translate(42, 352) scale(0.5)" fill="white">
                      <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                    </g>
                    <text x="70" y="362" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="500" fill="#1e293b">Department</text>
                    <text x="142" y="362" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="500" fill="#64748b">:</text>
                    <text x="156" y="362" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.department}</text>

                    {/* Row 3: Blood Group */}
                    <circle cx="48" cy="390" r="11" fill="#be185d" />
                    <g transform="translate(42, 384) scale(0.5)" fill="white">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                    </g>
                    <text x="70" y="394" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="500" fill="#1e293b">Blood Group</text>
                    <text x="142" y="394" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="500" fill="#64748b">:</text>
                    <text x="156" y="394" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.bloodGroup}</text>

                    {/* Row 4: Joining Date */}
                    <circle cx="48" cy="422" r="11" fill="#be185d" />
                    <g transform="translate(42, 416) scale(0.5)" fill="white">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                    </g>
                    <text x="70" y="426" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="500" fill="#1e293b">Joining Date</text>
                    <text x="142" y="426" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="500" fill="#64748b">:</text>
                    <text x="156" y="426" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.joiningDate}</text>

                    {/* Slogan */}
                    <text x="32" y="482" fontFamily="'Great Vibes', cursive" fontSize="20" fill="#be185d">
                      {cardData.slogan}
                    </text>
                    <line x1="162" y1="477" x2="222" y2="477" stroke="#fbcfe8" strokeWidth="1.5" />
                  </svg>
                </div>
                <div style={{ marginTop: "14px", fontSize: "13px", color: "#be185d", fontWeight: 700 }} className="no-print">
                  সামনের অংশ (Front Side)
                </div>
              </div>

              {/* BACK CARD */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Lanyard Ribbon Strap */}
                <div
                  style={{
                    width: "44px",
                    height: "75px",
                    background: "linear-gradient(180deg, #c02656 0%, #9d174d 100%)",
                    borderRadius: "4px 4px 0 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(190, 24, 93, 0.3)",
                    position: "relative",
                    zIndex: 2,
                  }}
                  className="no-print"
                >
                  <span
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "4px",
                    }}
                  >
                    LIORA
                  </span>
                </div>
                {/* Metal Clip */}
                <div
                  style={{
                    width: "32px",
                    height: "16px",
                    background: "linear-gradient(180deg, #94a3b8, #cbd5e1, #64748b)",
                    borderRadius: "4px",
                    marginBottom: "-4px",
                    zIndex: 3,
                    boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                  }}
                  className="no-print"
                />

                {/* Card Container */}
                <div
                  style={{
                    width: "330px",
                    height: "555px",
                    borderRadius: "22px",
                    boxShadow: "0 25px 50px -10px rgba(190, 24, 93, 0.3), 0 0 0 1px rgba(254, 205, 211, 0.5)",
                    overflow: "hidden",
                    position: "relative",
                    background: "#ffffff",
                  }}
                  className="print-card"
                >
                  <svg width="330" height="555" viewBox="0 0 330 555" style={{ display: "block" }}>
                    {/* Card Base */}
                    <rect width="330" height="555" rx="22" ry="22" fill="#fff7f8" stroke="#fecdd3" strokeWidth="1" />

                    {/* Top Organic Waves */}
                    <path d="M0,0 L330,0 L330,55 Q230,15 120,42 T0,18 Z" fill="#fde2e7" opacity="0.9" />
                    <path d="M0,0 L330,0 L330,32 Q220,5 110,26 T0,10 Z" fill="#fdf2f4" />

                    {/* Botanical Rose Leaves (Top Right) */}
                    <image href="/id_cards/leaf_back.png" x="245" y="0" width="85" height="110" preserveAspectRatio="none" />

                    {/* Slot Hole */}
                    <rect x="145" y="10" width="40" height="10" rx="5" fill="#1e293b" />

                    {/* Logo */}
                    <text x="165" y="44" textAnchor="middle" fontFamily="'Montserrat', sans-serif" fontSize="7.5" fontWeight="700" letterSpacing="4.5" fill="#1e293b">
                      BEAUTY &amp; WEAR
                    </text>
                    <text x="165" y="76" textAnchor="middle" fontFamily="'Playfair Display', serif" fontSize="34" fontWeight="700" letterSpacing="2" fill="#be185d">
                      LIORA
                    </text>

                    <line x1="58" y1="88" x2="104" y2="88" stroke="#be185d" strokeWidth="1" />
                    <polygon points="58,88 61,86 64,88 61,90" fill="#be185d" />
                    <text x="165" y="93" textAnchor="middle" fontFamily="'Great Vibes', cursive" fontSize="19" fill="#be185d">
                      Beauty &amp; Wear
                    </text>
                    <line x1="226" y1="88" x2="272" y2="88" stroke="#be185d" strokeWidth="1" />
                    <polygon points="272,88 269,86 266,88 269,90" fill="#be185d" />

                    {/* 5 Contact Rows */}
                    {/* Contact 1: Phone */}
                    <circle cx="48" cy="138" r="11" fill="#be185d" />
                    <g transform="translate(42, 132) scale(0.5)" fill="white">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </g>
                    <text x="70" y="132" fontFamily="'Inter', sans-serif" fontSize="9.5" fontWeight="600" fill="#1e293b">Official Contact</text>
                    <text x="70" y="147" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.contact}</text>

                    {/* Contact 2: Email */}
                    <circle cx="48" cy="173" r="11" fill="#be185d" />
                    <g transform="translate(42, 167) scale(0.5)" fill="white">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </g>
                    <text x="70" y="167" fontFamily="'Inter', sans-serif" fontSize="9.5" fontWeight="600" fill="#1e293b">Email</text>
                    <text x="70" y="182" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.email}</text>

                    {/* Contact 3: Facebook */}
                    <circle cx="48" cy="208" r="11" fill="#be185d" />
                    <g transform="translate(42, 202) scale(0.5)" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </g>
                    <text x="70" y="202" fontFamily="'Inter', sans-serif" fontSize="9.5" fontWeight="600" fill="#1e293b">Facebook Page</text>
                    <text x="70" y="217" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.fbPage}</text>

                    {/* Contact 4: Website */}
                    <circle cx="48" cy="243" r="11" fill="#be185d" />
                    <g transform="translate(42, 237) scale(0.5)" fill="white">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </g>
                    <text x="70" y="237" fontFamily="'Inter', sans-serif" fontSize="9.5" fontWeight="600" fill="#1e293b">Website</text>
                    <text x="70" y="252" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.website}</text>

                    {/* Contact 5: Address */}
                    <circle cx="48" cy="278" r="11" fill="#be185d" />
                    <g transform="translate(42, 272) scale(0.5)" fill="white">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </g>
                    <text x="70" y="272" fontFamily="'Inter', sans-serif" fontSize="9.5" fontWeight="600" fill="#1e293b">Business Address</text>
                    <text x="70" y="287" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="800" fill="#0f172a">{cardData.address}</text>

                    {/* Middle Divider with Center Diamond */}
                    <line x1="25" y1="310" x2="305" y2="310" stroke="#fbcfe8" strokeWidth="1.2" />
                    <polygon points="165,307 168,310 165,313 162,310" fill="#be185d" />

                    {/* QR Code Container */}
                    <rect x="66" y="326" width="80" height="80" rx="10" fill="#ffffff" stroke="#f472b6" strokeWidth="1.5" />
                    <foreignObject x="71" y="331" width="70" height="70">
                      <div style={{ width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <QRCodeSVG value={cardData.qrUrl} size={66} level="M" />
                      </div>
                    </foreignObject>

                    {/* Scan Prompt */}
                    <text x="170" y="356" fontFamily="'Great Vibes', cursive" fontSize="19" fill="#be185d">Scan for</text>
                    <text x="170" y="377" fontFamily="'Great Vibes', cursive" fontSize="19" fill="#be185d">Website / Facebook</text>

                    {/* Curved Arrow */}
                    <path d="M 215,385 Q 195,405 154,395 L 160,388 M 154,395 L 161,402" stroke="#be185d" strokeWidth="2" fill="none" strokeLinecap="round" />

                    {/* Return Notice Box */}
                    <rect x="25" y="422" width="280" height="38" rx="10" fill="#fce7ec" />
                    <g transform="translate(38, 431) scale(0.7)" fill="#be185d">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </g>
                    <text x="68" y="445" fontFamily="'Inter', sans-serif" fontSize="10.5" fontWeight="500" fill="#1e293b">
                      If found, please return to <tspan fontWeight="800" fill="#be185d">Liora Beauty &amp; Wear</tspan>
                    </text>

                    {/* Bottom Wavy Crimson Banner */}
                    <path d="M0,470 Q80,455 165,470 Q250,485 330,460 L330,555 L0,555 Z" fill="#be185d" />
                    <text x="165" y="520" textAnchor="middle" fontFamily="'Great Vibes', cursive" fontSize="18" fill="#ffffff" letterSpacing="1">
                      Beauty  •  Confidence  •  You  ♥
                    </text>
                  </svg>
                </div>
                <div style={{ marginTop: "14px", fontSize: "13px", color: "#be185d", fontWeight: 700 }} className="no-print">
                  পেছনের অংশ (Back Side)
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');

        @media print {
          body {
            background: white !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #print-stage {
            padding: 0 !important;
            background: white !important;
          }
          .studio-grid {
            display: block !important;
          }
          .cards-container {
            display: flex !important;
            flex-direction: row !important;
            gap: 20px !important;
            padding: 20px !important;
          }
          .print-card {
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  background: "#fdf2f4",
  border: "1px solid #fbcfe8",
  borderRadius: "6px",
  color: "#0f172a",
  fontSize: "13px",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle = {
  fontSize: "12px",
  color: "#475569",
  display: "block",
  marginBottom: "4px",
  fontWeight: 600,
};
