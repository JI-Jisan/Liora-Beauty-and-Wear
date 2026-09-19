"use client";

import { useState } from "react";
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
    customPhoto: null,
    // Back Side
    contact: "+880 1712 345678",
    email: "liorabeautyandwear@gmail.com",
    fbPage: "Liora Beauty and Wear",
    website: "liorabeautyandwear.com",
    address: "Rayerbag, Dhaka, Bangladesh",
    qrUrl: "https://liorabeautyandwear.com",
  });

  const isFrontModified =
    cardData.name !== "Jahidul Islam Jisan" ||
    cardData.designation !== "MANAGING DIRECTOR (MD)" ||
    cardData.empId !== "LIORA-001" ||
    cardData.customPhoto !== null;

  const isBackModified =
    cardData.contact !== "+880 1712 345678" ||
    cardData.email !== "liorabeautyandwear@gmail.com" ||
    cardData.qrUrl !== "https://liorabeautyandwear.com";

  const handleInputChange = (field, value) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCardData((prev) => ({ ...prev, customPhoto: event.target.result }));
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
      customPhoto: null,
      contact: "+880 1712 345678",
      email: "liorabeautyandwear@gmail.com",
      fbPage: "Liora Beauty and Wear",
      website: "liorabeautyandwear.com",
      address: "Rayerbag, Dhaka, Bangladesh",
      qrUrl: "https://liorabeautyandwear.com",
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fdf2f4", color: "#1e293b" }}>
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
              আসল মাস্টার টেমপ্লেটের সাথে ১০০% হুবহু লাইভ আইডি কার্ড এডিটর
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
            ↺ মূল ডিজাইনে রিসেট
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

          {activeTab === "photo" && (
            <div>
              <label style={labelStyle}>পাসপোর্ট সাইজ ছবি আপলোড করুন</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ ...inputStyle, padding: "8px", marginBottom: "16px" }}
              />
              <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                যেকোনো কর্মীর নতুন ছবি আপলোড করলে কার্ডের ফটো ফ্রেমে লাইভ সেট হয়ে যাবে।
              </p>
              {cardData.customPhoto && (
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <button
                    onClick={() => handleInputChange("customPhoto", null)}
                    style={{
                      background: "#be185d",
                      color: "white",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    আসল ছবি ফিরিয়ে আনুন
                  </button>
                </div>
              )}
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
                    onClick={() => {
                      setCardData((prev) => ({
                        ...prev,
                        name: r.name,
                        designation: r.des,
                        empId: r.id,
                        department: r.dept,
                        bloodGroup: r.bg,
                        joiningDate: r.date,
                        slogan: r.slogan,
                      }));
                    }}
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
            background: "radial-gradient(circle at center, #fff1f3 0%, #fde8ee 100%)",
            overflowY: "auto",
          }}
          id="print-stage"
        >
          <div
            style={{
              display: "flex",
              gap: "45px",
              alignItems: "flex-start",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
            className="cards-container"
          >
            {/* FRONT CARD */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: "332px",
                  height: "640px",
                  position: "relative",
                  backgroundImage: "url('/id_cards/front_with_ribbon.png')",
                  backgroundSize: "332px 640px",
                  backgroundRepeat: "no-repeat",
                  borderRadius: "24px",
                  boxShadow: "0 25px 50px -12px rgba(190, 24, 93, 0.25)",
                  overflow: "hidden",
                }}
                className="print-card"
              >
                {/* Dynamic Overlays (Visible when user edits) */}
                {cardData.customPhoto && (
                  <img
                    src={cardData.customPhoto}
                    alt="Custom Portrait"
                    style={{
                      position: "absolute",
                      left: "74px",
                      top: "215px",
                      width: "184px",
                      height: "156px",
                      borderRadius: "14px",
                      objectFit: "cover",
                      zIndex: 10,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                      border: "2px solid #be185d",
                    }}
                  />
                )}

                {isFrontModified && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: "382px",
                        left: "10px",
                        width: "312px",
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: "17px",
                        color: "#0f172a",
                        fontFamily: "'Inter', sans-serif",
                        background: "#ffffff",
                        padding: "2px 0",
                        zIndex: 10,
                      }}
                    >
                      {cardData.name}
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        top: "410px",
                        left: "0",
                        width: "332px",
                        textAlign: "center",
                        background: "#ffffff",
                        padding: "2px 0",
                        zIndex: 10,
                      }}
                    >
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

                    <div
                      style={{
                        position: "absolute",
                        top: "444px",
                        left: "55px",
                        width: "250px",
                        background: "#ffffff",
                        padding: "4px 6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        fontSize: "11px",
                        zIndex: 10,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{cardData.empId}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{cardData.department}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{cardData.bloodGroup}</span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{cardData.joiningDate}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#be185d", fontWeight: 700 }} className="no-print">
                সামনের অংশ (Front Side)
              </div>
            </div>

            {/* BACK CARD */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: "332px",
                  height: "640px",
                  position: "relative",
                  backgroundImage: "url('/id_cards/back_with_ribbon.png')",
                  backgroundSize: "332px 640px",
                  backgroundRepeat: "no-repeat",
                  borderRadius: "24px",
                  boxShadow: "0 25px 50px -12px rgba(190, 24, 93, 0.25)",
                  overflow: "hidden",
                }}
                className="print-card"
              >
                {isBackModified && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: "215px",
                        left: "85px",
                        width: "230px",
                        background: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        zIndex: 10,
                      }}
                    >
                      <div style={{ fontSize: "10.5px", color: "#0f172a", fontWeight: 700 }}>{cardData.contact}</div>
                      <div style={{ fontSize: "10.5px", color: "#0f172a", fontWeight: 700 }}>{cardData.email}</div>
                      <div style={{ fontSize: "10.5px", color: "#0f172a", fontWeight: 700 }}>{cardData.fbPage}</div>
                      <div style={{ fontSize: "10.5px", color: "#0f172a", fontWeight: 700 }}>{cardData.website}</div>
                      <div style={{ fontSize: "10.5px", color: "#0f172a", fontWeight: 700 }}>{cardData.address}</div>
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        top: "432px",
                        left: "45px",
                        width: "58px",
                        height: "58px",
                        background: "white",
                        padding: "2px",
                        borderRadius: "6px",
                        zIndex: 10,
                        border: "1px solid #fecdd3",
                      }}
                    >
                      <QRCodeSVG value={cardData.qrUrl} size={54} level="M" />
                    </div>
                  </>
                )}
              </div>
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#be185d", fontWeight: 700 }} className="no-print">
                পেছনের অংশ (Back Side)
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
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
