"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export default function AdminIdCardStudio() {
  const router = useRouter();

  // Presets & Templates
  const roleTemplates = [
    {
      roleName: "Managing Director (MD)",
      name: "Jahidul Islam Jisan",
      designation: "MANAGING DIRECTOR (MD)",
      empId: "LIORA-001",
      department: "Management & Marketing",
      bloodGroup: "O+",
      joiningDate: "01 Aug 2025",
      slogan: "Together We Grow ♥",
      theme: "pink",
    },
    {
      roleName: "Showroom Manager",
      name: "Nusrat Jahan",
      designation: "SHOWROOM MANAGER",
      empId: "LIORA-012",
      department: "Retail & Operations",
      bloodGroup: "A+",
      joiningDate: "15 Oct 2025",
      slogan: "Excellence in Service ♥",
      theme: "pink",
    },
    {
      roleName: "Beauty Consultant",
      name: "Fatema Tuz Zohra",
      designation: "BEAUTY & SKIN CONSULTANT",
      empId: "LIORA-025",
      department: "Customer Experience",
      bloodGroup: "B+",
      joiningDate: "01 Jan 2026",
      slogan: "Glow with Confidence ♥",
      theme: "pink",
    },
    {
      roleName: "Delivery Hero",
      name: "Md. Rakib Hasan",
      designation: "DELIVERY EXECUTIVE",
      empId: "LIORA-042",
      department: "Logistics & Supply",
      bloodGroup: "O+",
      joiningDate: "10 Feb 2026",
      slogan: "Fast & Safe Delivery ♥",
      theme: "pink",
    },
  ];

  // State
  const [activeTab, setActiveTab] = useState("info"); // 'info' | 'photo' | 'back' | 'theme' | 'saved'
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);

  // Card Info State
  const [cardData, setCardData] = useState({
    name: "Jahidul Islam Jisan",
    designation: "MANAGING DIRECTOR (MD)",
    empId: "LIORA-001",
    department: "Management & Marketing",
    bloodGroup: "O+",
    joiningDate: "01 Aug 2025",
    slogan: "Together We Grow ♥",
    photoUrl: "/id_cards/original_user_design.jpg",
    // Back Side
    contact: "+880 1712 345678",
    email: "liorabeautyandwear@gmail.com",
    fbPage: "Liora Beauty and Wear",
    website: "liorabeautyandwear.com",
    address: "Rayerbag, Dhaka, Bangladesh",
    qrUrl: "https://liorabeautyandwear.com",
    returnNotice: "If found, please return to Liora Beauty & Wear",
    tagline: "Beauty • Confidence • You ♥",
    // Theme
    theme: "pink", // 'pink' | 'black' | 'emerald'
  });

  // Saved Staff
  const [savedStaff, setSavedStaff] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("liora_saved_id_cards");
      if (stored) {
        setSavedStaff(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
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

  const applyTemplate = (tpl) => {
    setCardData((prev) => ({
      ...prev,
      ...tpl,
    }));
    setStatusMsg(`"${tpl.roleName}" টেমপ্লেট অ্যাপ্লাই করা হয়েছে!`);
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
    setTimeout(() => setStatusMsg(""), 3500);
  };

  const loadStaffProfile = (staff) => {
    setCardData(staff);
    setStatusMsg(`"${staff.name}" এর প্রোফাইল লোড হয়েছে!`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const deleteStaffProfile = (id) => {
    const updated = savedStaff.filter((s) => s.id !== id);
    setSavedStaff(updated);
    try {
      localStorage.setItem("liora_saved_id_cards", JSON.stringify(updated));
    } catch (e) {}
  };

  // Canvas Download Function (High-Res 300 DPI)
  const downloadCardAsImage = (side = "front") => {
    setDownloading(true);
    const scale = 3; // high-res
    const width = 320 * scale;
    const height = 500 * scale;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Colors based on theme
    const isPink = cardData.theme === "pink";
    const isBlack = cardData.theme === "black";
    const primaryColor = isPink ? "#ff4d6d" : isBlack ? "#eab308" : "#10b981";
    const bgBase = isPink ? "#fff7f8" : isBlack ? "#111827" : "#064e3b";
    const textColor = isPink ? "#1e293b" : isBlack ? "#f8fafc" : "#f0fdf4";
    const subColor = isPink ? "#64748b" : isBlack ? "#94a3b8" : "#a7f3d0";

    // Draw background
    ctx.fillStyle = bgBase;
    ctx.fillRect(0, 0, width, height);

    // Decorative top wave
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.bezierCurveTo(width * 0.75, 50 * scale, width * 0.25, 20 * scale, 0, 70 * scale);
    ctx.closePath();
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Load Logo
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = "/liora-logo.svg";

    logoImg.onload = () => {
      // Draw Logo
      const logoW = 160 * scale;
      const logoH = 60 * scale;
      ctx.drawImage(logoImg, (width - logoW) / 2, 20 * scale, logoW, logoH);

      if (side === "front") {
        // Draw Photo
        const photo = new Image();
        photo.crossOrigin = "anonymous";
        photo.src = cardData.photoUrl;

        const drawFrontDetails = () => {
          // Employee Name
          ctx.fillStyle = textColor;
          ctx.font = `bold ${16 * scale}px "Montserrat", sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(cardData.name, width / 2, 260 * scale);

          // Designation Pill Badge
          const desW = 190 * scale;
          const desH = 24 * scale;
          const desX = (width - desW) / 2;
          const desY = 272 * scale;
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.roundRect(desX, desY, desW, desH, 12 * scale);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${9 * scale}px "Montserrat", sans-serif`;
          ctx.fillText(cardData.designation, width / 2, desY + 16 * scale);

          // Details List Box
          const startY = 320 * scale;
          const rowH = 22 * scale;
          const labels = [
            { icon: "🪪", label: "Employee ID", val: cardData.empId },
            { icon: "🏢", label: "Department", val: cardData.department },
            { icon: "🩸", label: "Blood Group", val: cardData.bloodGroup },
            { icon: "📅", label: "Joining Date", val: cardData.joiningDate },
          ];

          ctx.textAlign = "left";
          labels.forEach((item, idx) => {
            const y = startY + idx * rowH;
            // icon circle
            ctx.fillStyle = primaryColor;
            ctx.beginPath();
            ctx.arc(45 * scale, y - 4 * scale, 7 * scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = subColor;
            ctx.font = `${8.5 * scale}px "Inter", sans-serif`;
            ctx.fillText(`${item.label} :`, 60 * scale, y);

            ctx.fillStyle = textColor;
            ctx.font = `bold ${8.5 * scale}px "Inter", sans-serif`;
            ctx.fillText(item.val, 150 * scale, y);
          });

          // Slogan & Wave bottom
          ctx.fillStyle = primaryColor;
          ctx.font = `italic ${11 * scale}px "Great Vibes", cursive`;
          ctx.textAlign = "left";
          ctx.fillText(cardData.slogan, 30 * scale, 450 * scale);

          // Download
          const link = document.createElement("a");
          link.download = `LIORA_ID_${cardData.empId}_FRONT.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          setDownloading(false);
        };

        photo.onload = () => {
          const pSize = 110 * scale;
          const pX = (width - pSize) / 2;
          const pY = 115 * scale;
          // Border
          ctx.fillStyle = primaryColor;
          ctx.roundRect(pX - 3 * scale, pY - 3 * scale, pSize + 6 * scale, pSize + 6 * scale, 14 * scale);
          ctx.fill();
          // Clip photo
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(pX, pY, pSize, pSize, 12 * scale);
          ctx.clip();
          ctx.drawImage(photo, pX, pY, pSize, pSize);
          ctx.restore();

          drawFrontDetails();
        };

        photo.onerror = () => {
          drawFrontDetails();
        };
      } else {
        // Back Side Canvas Draw
        const startY = 115 * scale;
        const rowH = 26 * scale;
        const contacts = [
          { label: "Official Contact", val: cardData.contact },
          { label: "Email", val: cardData.email },
          { label: "Facebook Page", val: cardData.fbPage },
          { label: "Website", val: cardData.website },
          { label: "Business Address", val: cardData.address },
        ];

        ctx.textAlign = "left";
        contacts.forEach((c, i) => {
          const y = startY + i * rowH;
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.arc(38 * scale, y + 2 * scale, 9 * scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = subColor;
          ctx.font = `${7.5 * scale}px "Inter", sans-serif`;
          ctx.fillText(c.label, 56 * scale, y - 2 * scale);

          ctx.fillStyle = textColor;
          ctx.font = `bold ${8.5 * scale}px "Inter", sans-serif`;
          ctx.fillText(c.val, 56 * scale, y + 10 * scale);
        });

        // Notice Box
        const nbY = 380 * scale;
        ctx.fillStyle = isPink ? "#ffe4e6" : isBlack ? "#1f2937" : "#065f46";
        ctx.beginPath();
        ctx.roundRect(25 * scale, nbY, width - 50 * scale, 42 * scale, 8 * scale);
        ctx.fill();

        ctx.fillStyle = primaryColor;
        ctx.font = `bold ${8 * scale}px "Inter", sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(cardData.returnNotice, width / 2, nbY + 24 * scale);

        // Tagline
        ctx.fillStyle = primaryColor;
        ctx.font = `bold ${9 * scale}px "Inter", sans-serif`;
        ctx.fillText(cardData.tagline, width / 2, 460 * scale);

        // Download
        const link = document.createElement("a");
        link.download = `LIORA_ID_${cardData.empId}_BACK.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setDownloading(false);
      }
    };

    logoImg.onerror = () => {
      setDownloading(false);
      alert("ছবি ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    };
  };

  // Theme Styles
  const currentTheme = cardData.theme;
  const themeStyles = {
    pink: {
      cardBg: "linear-gradient(145deg, #ffffff 0%, #fff1f3 60%, #ffe4e6 100%)",
      accent: "#ff4d6d",
      accentDark: "#be185d",
      textMain: "#1e293b",
      textSub: "#64748b",
      badgeBg: "linear-gradient(135deg, #ff4d6d, #e11d48)",
      ribbonBg: "linear-gradient(180deg, #ff4d6d 0%, #e11d48 100%)",
      ribbonText: "#ffffff",
      border: "#fbcfe8",
    },
    black: {
      cardBg: "linear-gradient(145deg, #18181b 0%, #09090b 100%)",
      accent: "#eab308",
      accentDark: "#ca8a04",
      textMain: "#f8fafc",
      textSub: "#a1a1aa",
      badgeBg: "linear-gradient(135deg, #eab308, #ca8a04)",
      ribbonBg: "linear-gradient(180deg, #18181b 0%, #09090b 100%)",
      ribbonText: "#eab308",
      border: "#3f3f46",
    },
    emerald: {
      cardBg: "linear-gradient(145deg, #ffffff 0%, #ecfdf5 70%, #d1fae5 100%)",
      accent: "#059669",
      accentDark: "#047857",
      textMain: "#064e3b",
      textSub: "#059669",
      badgeBg: "linear-gradient(135deg, #059669, #047857)",
      ribbonBg: "linear-gradient(180deg, #065f46 0%, #047857 100%)",
      ribbonText: "#fef3c7",
      border: "#a7f3d0",
    },
  }[currentTheme];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", padding: "0" }}>
      {/* Top Bar */}
      <header
        style={{
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "14px 24px",
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
            <h1 style={{ fontSize: "20px", margin: 0, color: "#ff4d6d", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🪪</span> LIORA ID Card Studio
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
              Canva-র মতো স্টাফ আইডি কার্ড জেনারেটর ও প্রিন্টিং টুল
            </p>
          </div>
        </div>

        {/* Action Buttons */}
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
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
            }}
          >
            🖨️ প্রিন্ট করুন (Print)
          </button>
          <button
            disabled={downloading}
            onClick={() => downloadCardAsImage("front")}
            style={{
              background: "#ff4d6d",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            📥 Front PNG
          </button>
          <button
            disabled={downloading}
            onClick={() => downloadCardAsImage("back")}
            style={{
              background: "#e11d48",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            📥 Back PNG
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

      {/* Notification Toast */}
      {statusMsg && (
        <div
          style={{
            background: "#10b981",
            color: "white",
            padding: "10px 20px",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          className="no-print"
        >
          {statusMsg}
        </div>
      )}

      {/* Main Studio Container */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          minHeight: "calc(100vh - 75px)",
          background: "#0f172a",
        }}
        className="studio-grid"
      >
        {/* Left Inspector Sidebar */}
        <aside
          style={{
            background: "#1e293b",
            borderRight: "1px solid #334155",
            padding: "20px",
            overflowY: "auto",
            maxHeight: "calc(100vh - 75px)",
          }}
          className="no-print"
        >
          {/* Navigation Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
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
              { key: "theme", label: "থিম" },
              { key: "saved", label: "সেভড" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: activeTab === t.key ? "#ff4d6d" : "transparent",
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

          {/* TAB 1: BASIC INFO */}
          {activeTab === "info" && (
            <div>
              <h3 style={{ fontSize: "15px", color: "#fce7ec", marginBottom: "16px" }}>
                👤 স্টাফের তথ্য (Employee Info)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    কর্মচারীর নাম (Full Name)
                  </label>
                  <input
                    type="text"
                    value={cardData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    পদবী (Designation)
                  </label>
                  <input
                    type="text"
                    value={cardData.designation}
                    onChange={(e) => handleInputChange("designation", e.target.value.toUpperCase())}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                      এমপ্লয়ি আইডি (ID)
                    </label>
                    <input
                      type="text"
                      value={cardData.empId}
                      onChange={(e) => handleInputChange("empId", e.target.value.toUpperCase())}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                      রক্তের গ্রুপ (Blood)
                    </label>
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
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    ডিপার্টমেন্ট (Department)
                  </label>
                  <input
                    type="text"
                    value={cardData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    যোগদানের তারিখ (Joining Date)
                  </label>
                  <input
                    type="text"
                    value={cardData.joiningDate}
                    onChange={(e) => handleInputChange("joiningDate", e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. 01 Aug 2025"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    কার্ডের স্লোগান / মটো (Slogan)
                  </label>
                  <input
                    type="text"
                    value={cardData.slogan}
                    onChange={(e) => handleInputChange("slogan", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PHOTO UPLOAD */}
          {activeTab === "photo" && (
            <div>
              <h3 style={{ fontSize: "15px", color: "#fce7ec", marginBottom: "16px" }}>
                📷 ছবি আপলোড ও প্রিভিউ
              </h3>
              <div
                style={{
                  border: "2px dashed #475569",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  background: "#0f172a",
                  cursor: "pointer",
                  marginBottom: "16px",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                  id="photo-upload-input"
                />
                <label htmlFor="photo-upload-input" style={{ cursor: "pointer" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📸</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#ff4d6d" }}>
                    পাসপোর্ট সাইজ ছবি আপলোড করুন
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                    PNG, JPG বা WEBP ফাইল সাপোর্ট করে
                  </div>
                </label>
              </div>

              {cardData.photoUrl && (
                <div style={{ textAlign: "center" }}>
                  <img
                    src={cardData.photoUrl}
                    alt="Uploaded Preview"
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      border: "3px solid #ff4d6d",
                      boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
                    }}
                  />
                  <div style={{ marginTop: "12px" }}>
                    <button
                      onClick={() => handleInputChange("photoUrl", "/id_cards/original_user_design.jpg")}
                      style={{
                        background: "#334155",
                        color: "#cbd5e1",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      ডিফল্ট ছবি ফিরিয়ে আনুন
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BACK SIDE & CONTACTS */}
          {activeTab === "back" && (
            <div>
              <h3 style={{ fontSize: "15px", color: "#fce7ec", marginBottom: "16px" }}>
                🔄 পেছনের কন্টাক্ট ও কিউআর কোড
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    অফিশিয়াল কন্টাক্ট নম্বর
                  </label>
                  <input
                    type="text"
                    value={cardData.contact}
                    onChange={(e) => handleInputChange("contact", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    অফিশিয়াল ইমেইল
                  </label>
                  <input
                    type="text"
                    value={cardData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    ফেসবুক পেজ নাম
                  </label>
                  <input
                    type="text"
                    value={cardData.fbPage}
                    onChange={(e) => handleInputChange("fbPage", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    ওয়েবসাইট
                  </label>
                  <input
                    type="text"
                    value={cardData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    অফিস অ্যাড্রেস
                  </label>
                  <input
                    type="text"
                    value={cardData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    কিউআর কোড লিঙ্ক (QR Target Link)
                  </label>
                  <input
                    type="text"
                    value={cardData.qrUrl}
                    onChange={(e) => handleInputChange("qrUrl", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    রিটার্ন নোটিশ টেক্সট
                  </label>
                  <input
                    type="text"
                    value={cardData.returnNotice}
                    onChange={(e) => handleInputChange("returnNotice", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEMPLATES & THEMES */}
          {activeTab === "theme" && (
            <div>
              <h3 style={{ fontSize: "15px", color: "#fce7ec", marginBottom: "16px" }}>
                🎨 রেডিমেড পদবী ও কালার থিম
              </h3>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "8px" }}>
                  ১-ক্লিক রোল টেমপ্লেট
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {roleTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => applyTemplate(tpl)}
                      style={{
                        background: "#0f172a",
                        color: "#f1f5f9",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>{tpl.roleName}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{tpl.department}</div>
                      </div>
                      <span style={{ fontSize: "12px", color: "#ff4d6d" }}>লোড করুন →</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "8px" }}>
                  কালার প্যালেট থিম
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { key: "pink", label: "🌸 Signature Blush Pink (আসল থিম)", desc: "ব্র্যান্ডের আসল সফট পিংক ও রোজ-ম্যাজেন্টা" },
                    { key: "black", label: "👑 Royal Matte Black & Gold", desc: "ম্যানেজিং ডিরেক্টর ও এক্সিকিউটিভ লাক্সারি" },
                    { key: "emerald", label: "🌿 Emerald Elegance & Gold", desc: "প্রিমিয়াম বিউটি ও ওয়েলনেস লুক" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => handleInputChange("theme", t.key)}
                      style={{
                        background: cardData.theme === t.key ? "#334155" : "#0f172a",
                        border: cardData.theme === t.key ? "2px solid #ff4d6d" : "1px solid #334155",
                        borderRadius: "8px",
                        padding: "12px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "#f8fafc",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>{t.label}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SAVED STAFF DIRECTORY */}
          {activeTab === "saved" && (
            <div>
              <h3 style={{ fontSize: "15px", color: "#fce7ec", marginBottom: "16px" }}>
                📁 সংরক্ষিত আইডি কার্ডসমূহ ({savedStaff.length})
              </h3>
              {savedStaff.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "30px 0" }}>
                  এখনো কোনো স্টাফের কার্ড সেভ করা হয়নি। উপরে "💾 প্রোফাইল সেভ" বাটনে ক্লিক করে সেভ করুন।
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {savedStaff.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        background: "#0f172a",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>{st.name}</div>
                        <div style={{ fontSize: "11px", color: "#ff4d6d" }}>{st.designation}</div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>ID: {st.empId}</div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => loadStaffProfile(st)}
                          style={{
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          লোড
                        </button>
                        <button
                          onClick={() => deleteStaffProfile(st.id)}
                          style={{
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Right Preview Canvas Stage */}
        <main
          style={{
            padding: "40px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            overflowY: "auto",
            background: "#0b1120",
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
              marginBottom: "30px",
              border: "1px solid #334155",
            }}
            className="no-print"
          >
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              style={zoomBtnStyle}
            >
              -
            </button>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#cbd5e1" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              style={zoomBtnStyle}
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              style={{ ...zoomBtnStyle, fontSize: "11px", width: "auto", padding: "0 8px" }}
            >
              Reset
            </button>
          </div>

          {/* Cards Display Stage */}
          <div
            style={{
              display: "flex",
              gap: "50px",
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
              {/* Ribbon Strap Preview */}
              <div
                style={{
                  width: "48px",
                  height: "100px",
                  background: themeStyles.ribbonBg,
                  borderRadius: "4px 4px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
                  position: "relative",
                  zIndex: 2,
                }}
                className="no-print"
              >
                <div
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    color: themeStyles.ribbonText,
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "4px",
                  }}
                >
                  LIORA
                </div>
              </div>

              {/* Metal Buckle Clip */}
              <div
                style={{
                  width: "36px",
                  height: "18px",
                  background: "linear-gradient(180deg, #94a3b8, #cbd5e1, #64748b)",
                  borderRadius: "4px",
                  marginBottom: "-4px",
                  zIndex: 3,
                  boxShadow: "0 2px 5px rgba(0,0,0,0.4)",
                }}
                className="no-print"
              />

              {/* Actual Physical Card (CR80 Standard Ratio: 320px x 500px) */}
              <div
                style={{
                  width: "320px",
                  height: "500px",
                  background: themeStyles.cardBg,
                  borderRadius: "18px",
                  border: `2px solid ${themeStyles.border}`,
                  boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px 18px 16px",
                  boxSizing: "border-box",
                }}
                className="print-card"
              >
                {/* Lanyard Slot Hole */}
                <div
                  style={{
                    width: "40px",
                    height: "10px",
                    background: "#0f172a",
                    borderRadius: "20px",
                    margin: "0 auto 10px",
                    border: "1px solid #334155",
                  }}
                />

                {/* Exact Brand Logo SVG */}
                <div style={{ textAlign: "center", marginBottom: "10px" }}>
                  <img
                    src="/liora-logo.svg"
                    alt="LIORA Beauty & Wear"
                    style={{
                      height: "48px",
                      width: "auto",
                      maxWidth: "200px",
                      display: "inline-block",
                      filter: currentTheme === "black" ? "brightness(1.5)" : "none",
                    }}
                  />
                </div>

                {/* Employee Portrait Photo */}
                <div style={{ textAlign: "center", marginBottom: "14px" }}>
                  <div
                    style={{
                      width: "115px",
                      height: "115px",
                      margin: "0 auto",
                      borderRadius: "16px",
                      padding: "3px",
                      background: themeStyles.accent,
                      boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                    }}
                  >
                    <img
                      src={cardData.photoUrl}
                      alt={cardData.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "13px",
                        display: "block",
                      }}
                    />
                  </div>
                </div>

                {/* Employee Name */}
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "18px",
                    color: themeStyles.textMain,
                    lineHeight: 1.2,
                    marginBottom: "6px",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  {cardData.name}
                </div>

                {/* Designation Pill Badge */}
                <div style={{ textAlign: "center", marginBottom: "14px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: themeStyles.badgeBg,
                      color: "white",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      letterSpacing: "0.8px",
                      padding: "4px 14px",
                      borderRadius: "999px",
                      boxShadow: "0 2px 8px rgba(255, 77, 109, 0.3)",
                    }}
                  >
                    {cardData.designation}
                  </span>
                </div>

                {/* Detailed Information List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    fontSize: "11px",
                    color: themeStyles.textMain,
                    padding: "0 10px",
                    flex: 1,
                  }}
                >
                  {[
                    { icon: "🪪", label: "Employee ID", val: cardData.empId },
                    { icon: "🏢", label: "Department", val: cardData.department },
                    { icon: "🩸", label: "Blood Group", val: cardData.bloodGroup },
                    { icon: "📅", label: "Joining Date", val: cardData.joiningDate },
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: themeStyles.textSub }}>
                        <span style={{ fontSize: "11px" }}>{row.icon}</span>
                        <span>{row.label} :</span>
                      </div>
                      <div style={{ fontWeight: 700, color: themeStyles.textMain }}>{row.val}</div>
                    </div>
                  ))}
                </div>

                {/* Card Footer Slogan */}
                <div
                  style={{
                    borderTop: `1px dashed ${themeStyles.border}`,
                    paddingTop: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: "15px",
                      color: themeStyles.accent,
                      fontWeight: "bold",
                    }}
                  >
                    {cardData.slogan}
                  </span>
                  <span style={{ fontSize: "11px", color: themeStyles.textSub, fontWeight: 600 }}>FRONT</span>
                </div>
              </div>
              <div style={{ marginTop: "10px", fontSize: "13px", color: "#94a3b8", fontWeight: 600 }} className="no-print">
                সামনের অংশ (Front Side)
              </div>
            </div>

            {/* BACK CARD */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Ribbon Strap Preview */}
              <div
                style={{
                  width: "48px",
                  height: "100px",
                  background: themeStyles.ribbonBg,
                  borderRadius: "4px 4px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
                  position: "relative",
                  zIndex: 2,
                }}
                className="no-print"
              >
                <div
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    color: themeStyles.ribbonText,
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "4px",
                  }}
                >
                  LIORA
                </div>
              </div>

              {/* Metal Buckle Clip */}
              <div
                style={{
                  width: "36px",
                  height: "18px",
                  background: "linear-gradient(180deg, #94a3b8, #cbd5e1, #64748b)",
                  borderRadius: "4px",
                  marginBottom: "-4px",
                  zIndex: 3,
                  boxShadow: "0 2px 5px rgba(0,0,0,0.4)",
                }}
                className="no-print"
              />

              {/* Actual Physical Card Back (CR80 Standard Ratio: 320px x 500px) */}
              <div
                style={{
                  width: "320px",
                  height: "500px",
                  background: themeStyles.cardBg,
                  borderRadius: "18px",
                  border: `2px solid ${themeStyles.border}`,
                  boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px 18px 16px",
                  boxSizing: "border-box",
                }}
                className="print-card"
              >
                {/* Lanyard Slot Hole */}
                <div
                  style={{
                    width: "40px",
                    height: "10px",
                    background: "#0f172a",
                    borderRadius: "20px",
                    margin: "0 auto 10px",
                    border: "1px solid #334155",
                  }}
                />

                {/* Exact Brand Logo SVG */}
                <div style={{ textAlign: "center", marginBottom: "14px" }}>
                  <img
                    src="/liora-logo.svg"
                    alt="LIORA Beauty & Wear"
                    style={{
                      height: "44px",
                      width: "auto",
                      maxWidth: "180px",
                      display: "inline-block",
                      filter: currentTheme === "black" ? "brightness(1.5)" : "none",
                    }}
                  />
                </div>

                {/* Contact Information List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", padding: "0 4px" }}>
                  {[
                    { icon: "📞", label: "Official Contact", val: cardData.contact },
                    { icon: "✉️", label: "Email", val: cardData.email },
                    { icon: "🌐", label: "Website", val: cardData.website },
                    { icon: "📍", label: "Address", val: cardData.address },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: themeStyles.accent,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {row.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "10px", color: themeStyles.textSub }}>{row.label}</div>
                        <div style={{ fontWeight: 600, color: themeStyles.textMain, fontSize: "11px", wordBreak: "break-all" }}>
                          {row.val}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dynamic QR Code & Scan Prompt */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "14px",
                    margin: "12px 0",
                    padding: "8px 12px",
                    background: currentTheme === "black" ? "#1f2937" : "rgba(255,255,255,0.8)",
                    borderRadius: "12px",
                    border: `1px solid ${themeStyles.border}`,
                  }}
                >
                  <div
                    style={{
                      background: "white",
                      padding: "4px",
                      borderRadius: "8px",
                      display: "inline-block",
                    }}
                  >
                    <QRCodeSVG value={cardData.qrUrl} size={64} level="M" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Great Vibes', cursive",
                        fontSize: "15px",
                        color: themeStyles.accent,
                        fontWeight: "bold",
                      }}
                    >
                      Scan for Website
                    </div>
                    <div style={{ fontSize: "10px", color: themeStyles.textSub }}>
                      Official Staff Verification
                    </div>
                  </div>
                </div>

                {/* Return Notice Box */}
                <div
                  style={{
                    background: currentTheme === "black" ? "#27272a" : "#ffe4e6",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    textAlign: "center",
                    fontSize: "10.5px",
                    color: themeStyles.accentDark,
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  🛡️ {cardData.returnNotice}
                </div>

                {/* Footer Tagline */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: themeStyles.accent,
                    letterSpacing: "0.5px",
                  }}
                >
                  {cardData.tagline}
                </div>
              </div>
              <div style={{ marginTop: "10px", fontSize: "13px", color: "#94a3b8", fontWeight: 600 }} className="no-print">
                পেছনের অংশ (Back Side)
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Embedded CSS for Print Styling */}
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
