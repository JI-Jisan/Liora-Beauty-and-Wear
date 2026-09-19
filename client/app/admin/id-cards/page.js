"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export default function AdminIdCardStudio() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("info");
  const [zoom, setZoom] = useState(1);

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
    returnNotice: "If found, please return to Liora Beauty & Wear",
  });

  const [savedStaff, setSavedStaff] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("liora_saved_id_cards");
      if (stored) {
        setSavedStaff(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

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

  const resetPhoto = () => {
    setCardData((prev) => ({ ...prev, photoUrl: "/id_cards/jisan_portrait.jpg" }));
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
      slogan,
    }));
    setStatusMsg(`"${des}" রোল অ্যাপ্লাই করা হয়েছে!`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const saveCurrentStaff = () => {
    const newStaff = {
      id: Date.now(),
      savedAt: new Date().toLocaleDateString("bn-BD"),
      ...cardData,
    };
    const updated = [newStaff, ...savedStaff.filter((s) => s.empId !== cardData.empId)];
    setSavedStaff(updated);
    try {
      localStorage.setItem("liora_saved_id_cards", JSON.stringify(updated));
    } catch (e) {}
    setStatusMsg(`"${cardData.name}" এর প্রোফাইল সেভ হয়েছে!`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const loadStaff = (st) => {
    setCardData(st);
    setStatusMsg(`"${st.name}" এর প্রোফাইল লোড হয়েছে!`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1120", color: "#f8fafc", padding: "0" }}>
      {/* Top Header */}
      <header
        style={{
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
        className="no-print"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.push("/admin")}
            style={{
              background: "#334155",
              color: "#cbd5e1",
              border: "none",
              padding: "8px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            ← Admin Dashboard
          </button>
          <div>
            <h1 style={{ fontSize: "20px", margin: 0, color: "#be185d", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🪪</span> LIORA ID Card Studio
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
              আসল ব্র্যান্ড লোগো ও সফট পিংক থিমের হুবহু লাইভ আইডি কার্ড জেনারেটর
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => window.print()}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🖨️ প্রিন্ট করুন (Print Card)
          </button>
          <button
            onClick={saveCurrentStaff}
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            💾 প্রোফাইল সেভ
          </button>
        </div>
      </header>

      {statusMsg && (
        <div
          style={{
            background: "#10b981",
            color: "white",
            padding: "8px 16px",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "13px",
          }}
          className="no-print"
        >
          {statusMsg}
        </div>
      )}

      {/* Main Studio Grid */}
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
            background: "#1e293b",
            borderRight: "1px solid #334155",
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
              background: "#0f172a",
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
                  color: activeTab === t.key ? "white" : "#94a3b8",
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

          {/* TAB 1: INFO */}
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
                <label style={labelStyle}>স্লোগান / মটো (Slogan)</label>
                <input
                  type="text"
                  value={cardData.slogan}
                  onChange={(e) => handleInputChange("slogan", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PHOTO */}
          {activeTab === "photo" && (
            <div>
              <label style={labelStyle}>পাসপোর্ট সাইজ ছবি আপলোড করুন</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ ...inputStyle, padding: "8px", marginBottom: "16px" }}
              />
              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <button
                  onClick={resetPhoto}
                  style={{
                    background: "#be185d",
                    color: "white",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  আসল জিসান সাহেবের ছবি ফিরিয়ে আনুন
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: BACK SIDE */}
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
                <label style={labelStyle}>কিউআর কোড টার্গেট লিংক</label>
                <input
                  type="text"
                  value={cardData.qrUrl}
                  onChange={(e) => handleInputChange("qrUrl", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* TAB 4: ROLES */}
          {activeTab === "roles" && (
            <div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
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
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "white",
                    }}
                  >
                    <span>
                      {r.icon} {r.des}
                    </span>
                    <span style={{ color: "#be185d", fontSize: "12px" }}>লোড →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right Live Canvas Stage */}
        <main
          style={{
            padding: "30px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            background: "#090d16",
            overflowY: "auto",
          }}
          id="print-stage"
        >
          {/* Zoom Controller */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#1e293b",
              padding: "6px 14px",
              borderRadius: "20px",
              marginBottom: "24px",
              border: "1px solid #334155",
            }}
            className="no-print"
          >
            <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))} style={zoomBtnStyle}>
              -
            </button>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#cbd5e1" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))} style={zoomBtnStyle}>
              +
            </button>
            <button onClick={() => setZoom(1)} style={{ ...zoomBtnStyle, width: "auto", padding: "0 8px", fontSize: "11px" }}>
              Reset
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "40px",
              alignItems: "flex-start",
              justifyContent: "center",
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease",
            }}
            className="cards-container"
          >
            {/* FRONT CARD */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Ribbon */}
              <div
                style={{
                  width: "44px",
                  height: "75px",
                  background: "linear-gradient(180deg, #be185d 0%, #9d174d 100%)",
                  borderRadius: "4px 4px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 15px rgba(0,0,0,0.4)",
                  position: "relative",
                  zIndex: 2,
                }}
                className="no-print"
              >
                <div
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
                </div>
              </div>
              <div
                style={{
                  width: "32px",
                  height: "16px",
                  background: "linear-gradient(180deg, #94a3b8, #cbd5e1, #64748b)",
                  borderRadius: "4px",
                  marginBottom: "-4px",
                  zIndex: 3,
                  boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
                }}
                className="no-print"
              />

              {/* Exact Card Front */}
              <div
                style={{
                  width: "330px",
                  height: "530px",
                  background: "#ffffff",
                  borderRadius: "20px",
                  border: "1px solid #fecdd3",
                  boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px 20px 14px",
                  color: "#1e293b",
                  boxSizing: "border-box",
                }}
                className="print-card"
              >
                {/* Background Waves & Floral Art */}
                <svg
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                  viewBox="0 0 330 530"
                  preserveAspectRatio="none"
                >
                  <path d="M0 0 L330 0 L330 45 Q230 75 140 40 T0 85 Z" fill="#fdf2f4" />
                  <path d="M0 0 L330 0 L330 25 Q240 55 160 25 T0 50 Z" fill="#fce7ec" opacity="0.8" />
                  <path d="M0 530 L330 530 L330 460 Q240 500 130 480 T0 515 Z" fill="#fdf2f4" />
                  <path d="M70 530 L330 530 L330 480 Q240 520 150 500 T70 530 Z" fill="#be185d" opacity="0.85" />
                  <g transform="translate(245, 420) scale(0.65)" stroke="#be185d" fill="#be185d">
                    <path d="M40 120 C 50 70, 70 30, 95 0" strokeWidth="2.5" fill="none" opacity="0.6" />
                    <path d="M50 90 C 70 80, 95 85, 95 85 C 95 85, 80 105, 55 100 Z" opacity="0.5" />
                    <path d="M65 60 C 85 50, 105 55, 105 55 C 105 55, 90 75, 70 70 Z" opacity="0.4" />
                    <path d="M80 30 C 95 20, 110 25, 110 25 C 110 25, 100 40, 85 38 Z" opacity="0.5" />
                  </g>
                </svg>

                {/* Slot Hole */}
                <div
                  style={{
                    width: "38px",
                    height: "9px",
                    background: "#0f172a",
                    borderRadius: "20px",
                    margin: "0 auto 8px",
                    border: "1px solid #334155",
                    zIndex: 5,
                  }}
                />

                {/* Exact Brand Logo */}
                <div style={{ textAlign: "center", marginBottom: "8px", position: "relative", zIndex: 5 }}>
                  <div
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: "7.5px",
                      fontWeight: 700,
                      letterSpacing: "4px",
                      color: "#1e293b",
                      marginBottom: "2px",
                    }}
                  >
                    BEAUTY &amp; WEAR
                  </div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "32px",
                      fontWeight: 700,
                      letterSpacing: "2px",
                      color: "#be185d",
                      lineHeight: 1,
                      marginBottom: "2px",
                    }}
                  >
                    LIORA
                  </div>
                  <div
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: "18px",
                      color: "#be185d",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ height: "1px", width: "25px", background: "#be185d" }}></span>
                    <span>Beauty &amp; Wear</span>
                    <span style={{ height: "1px", width: "25px", background: "#be185d" }}></span>
                  </div>
                </div>

                {/* Photo Frame */}
                <div
                  style={{
                    width: "110px",
                    height: "110px",
                    margin: "0 auto 8px",
                    borderRadius: "14px",
                    border: "2px solid #be185d",
                    padding: "2px",
                    background: "white",
                    boxShadow: "0 4px 12px rgba(190, 24, 93, 0.2)",
                    zIndex: 5,
                  }}
                >
                  <img
                    src={cardData.photoUrl}
                    alt={cardData.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "10px",
                      display: "block",
                    }}
                  />
                </div>

                {/* Name */}
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: "18px",
                    color: "#0f172a",
                    marginBottom: "4px",
                    fontFamily: "'Inter', sans-serif",
                    zIndex: 5,
                  }}
                >
                  {cardData.name}
                </div>

                {/* Designation Pill */}
                <div style={{ textAlign: "center", marginBottom: "8px", zIndex: 5 }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#be185d",
                      color: "white",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      letterSpacing: "0.8px",
                      padding: "4px 16px",
                      borderRadius: "999px",
                      boxShadow: "0 2px 6px rgba(190, 24, 93, 0.3)",
                    }}
                  >
                    {cardData.designation}
                  </span>
                </div>

                {/* Details Rows */}
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    fontSize: "11px",
                    zIndex: 5,
                  }}
                >
                  {[
                    {
                      label: "Employee ID",
                      val: cardData.empId,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Department",
                      val: cardData.department,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.1 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Blood Group",
                      val: cardData.bloodGroup,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Joining Date",
                      val: cardData.joiningDate,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                        </svg>
                      ),
                    },
                  ].map((row, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#be185d",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {row.icon}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                        <span style={{ color: "#1e293b", fontWeight: 500, width: "85px" }}>{row.label}</span>
                        <span style={{ margin: "0 6px", color: "#64748b" }}>:</span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{row.val}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Slogan Footer */}
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "'Great Vibes', cursive",
                    fontSize: "17px",
                    color: "#be185d",
                    zIndex: 5,
                  }}
                >
                  <span>{cardData.slogan}</span>
                  <span style={{ flex: 1, height: "1px", background: "#fbcfe8", maxWidth: "60px" }}></span>
                </div>
              </div>
              <div style={{ marginTop: "10px", fontSize: "13px", color: "#94a3b8", fontWeight: 600 }} className="no-print">
                সামনের অংশ (Front)
              </div>
            </div>

            {/* BACK CARD */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Ribbon */}
              <div
                style={{
                  width: "44px",
                  height: "75px",
                  background: "linear-gradient(180deg, #be185d 0%, #9d174d 100%)",
                  borderRadius: "4px 4px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 15px rgba(0,0,0,0.4)",
                  position: "relative",
                  zIndex: 2,
                }}
                className="no-print"
              >
                <div
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
                </div>
              </div>
              <div
                style={{
                  width: "32px",
                  height: "16px",
                  background: "linear-gradient(180deg, #94a3b8, #cbd5e1, #64748b)",
                  borderRadius: "4px",
                  marginBottom: "-4px",
                  zIndex: 3,
                  boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
                }}
                className="no-print"
              />

              {/* Exact Card Back */}
              <div
                style={{
                  width: "330px",
                  height: "530px",
                  background: "#ffffff",
                  borderRadius: "20px",
                  border: "1px solid #fecdd3",
                  boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px 20px 14px",
                  color: "#1e293b",
                  boxSizing: "border-box",
                }}
                className="print-card"
              >
                {/* Background Waves & Floral Art */}
                <svg
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                  viewBox="0 0 330 530"
                  preserveAspectRatio="none"
                >
                  <path d="M0 0 L330 0 L330 50 Q230 15 120 40 T0 15 Z" fill="#fdf2f4" />
                  <path d="M0 0 L330 0 L330 30 Q220 5 110 25 T0 10 Z" fill="#fce7ec" />
                  <g transform="translate(260, 5) scale(0.65)" stroke="#be185d" fill="#be185d">
                    <path d="M40 0 C 50 40, 70 70, 95 100" strokeWidth="2" fill="none" opacity="0.5" />
                    <path d="M50 30 C 70 40, 95 35, 95 35 C 95 35, 80 15, 55 20 Z" opacity="0.4" />
                    <path d="M65 60 C 85 70, 105 65, 105 65 C 105 65, 90 45, 70 50 Z" opacity="0.4" />
                  </g>
                </svg>

                {/* Slot Hole */}
                <div
                  style={{
                    width: "38px",
                    height: "9px",
                    background: "#0f172a",
                    borderRadius: "20px",
                    margin: "0 auto 8px",
                    border: "1px solid #334155",
                    zIndex: 5,
                  }}
                />

                {/* Brand Logo */}
                <div style={{ textAlign: "center", marginBottom: "8px", position: "relative", zIndex: 5 }}>
                  <div
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: "7.5px",
                      fontWeight: 700,
                      letterSpacing: "4px",
                      color: "#1e293b",
                      marginBottom: "2px",
                    }}
                  >
                    BEAUTY &amp; WEAR
                  </div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "32px",
                      fontWeight: 700,
                      letterSpacing: "2px",
                      color: "#be185d",
                      lineHeight: 1,
                      marginBottom: "2px",
                    }}
                  >
                    LIORA
                  </div>
                  <div
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: "18px",
                      color: "#be185d",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ height: "1px", width: "25px", background: "#be185d" }}></span>
                    <span>Beauty &amp; Wear</span>
                    <span style={{ height: "1px", width: "25px", background: "#be185d" }}></span>
                  </div>
                </div>

                {/* Contacts List */}
                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "11px",
                    zIndex: 5,
                  }}
                >
                  {[
                    {
                      label: "Official Contact",
                      val: cardData.contact,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Email",
                      val: cardData.email,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Facebook Page",
                      val: cardData.fbPage,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Website",
                      val: cardData.website,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Business Address",
                      val: cardData.address,
                      icon: (
                        <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "white" }}>
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      ),
                    },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#be185d",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {row.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "10px", color: "#1e293b", fontWeight: 600 }}>{row.label}</div>
                        <div style={{ fontSize: "10.5px", color: "#0f172a", fontWeight: 700 }}>{row.val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* QR Section */}
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    borderTop: "1px solid #fce7ec",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "16px",
                    zIndex: 5,
                  }}
                >
                  <div
                    style={{
                      background: "white",
                      padding: "4px",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      border: "1px solid #fecdd3",
                    }}
                  >
                    <QRCodeSVG value={cardData.qrUrl} size={58} level="M" />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: "18px", color: "#be185d", lineHeight: 1.1 }}>
                      Scan for
                    </div>
                    <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: "18px", color: "#be185d", lineHeight: 1.1 }}>
                      Website / Facebook
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Official Verification</div>
                  </div>
                </div>

                {/* Return Notice */}
                <div
                  style={{
                    margin: "8px 0",
                    background: "#fce7ec",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "10px",
                    color: "#1e293b",
                    zIndex: 5,
                  }}
                >
                  <svg style={{ width: 14, height: 14, fill: "#be185d", flexShrink: 0 }} viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                  <span>
                    If found, please return to <strong style={{ color: "#be185d" }}>Liora Beauty &amp; Wear</strong>
                  </span>
                </div>

                {/* Bottom Wave Banner */}
                <div
                  style={{
                    margin: "auto -20px -14px",
                    height: "38px",
                    background: "linear-gradient(135deg, #be185d, #9d174d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    zIndex: 5,
                  }}
                >
                  Beauty • Confidence • You ♥
                </div>
              </div>
              <div style={{ marginTop: "10px", fontSize: "13px", color: "#94a3b8", fontWeight: 600 }} className="no-print">
                পেছনের অংশ (Back)
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #print-stage {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .studio-grid {
            display: block !important;
          }
          .cards-container {
            transform: none !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 20px !important;
            padding: 20px !important;
          }
          .print-card {
            box-shadow: none !important;
            page-break-inside: avoid !important;
            border: 1px solid #e2e8f0 !important;
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
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "6px",
  color: "#f8fafc",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: "12px",
  color: "#cbd5e1",
  display: "block",
  marginBottom: "4px",
  fontWeight: 500,
};

const zoomBtnStyle = {
  width: "28px",
  height: "28px",
  background: "#334155",
  color: "#f8fafc",
  border: "none",
  borderRadius: "50%",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
