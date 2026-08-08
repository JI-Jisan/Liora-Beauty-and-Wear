"use client";

import { useEffect, useState } from "react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    brandName: "",
    brandSubtitle: "",
    heroTitle: "",
    heroText: "",
    offerText: "",
  });

  useEffect(() => {
    fetch("http://localhost:5001/api/settings")
      .then((res) => res.json())
      .then((data) =>
        setSettings({
          brandName: data.brandName || "",
          brandSubtitle: data.brandSubtitle || "",
          heroTitle: data.heroTitle || "",
          heroText: data.heroText || "",
          offerText: data.offerText || "",
        })
      )
      .catch((err) => console.error(err));
  }, []);

  const handleChange = (e) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const saveSettings = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error("Failed to update settings");
      }

      alert("Settings Updated");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Branding Settings</h2>

      <input
        name="brandName"
        placeholder="Brand Name"
        value={settings.brandName}
        onChange={handleChange}
      />

      <br />
      <br />

      <input
        name="brandSubtitle"
        placeholder="Brand Subtitle"
        value={settings.brandSubtitle}
        onChange={handleChange}
      />

      <br />
      <br />

      <input
        name="heroTitle"
        placeholder="Hero Title"
        value={settings.heroTitle}
        onChange={handleChange}
      />

      <br />
      <br />

      <textarea
        name="heroText"
        placeholder="Hero Text"
        value={settings.heroText}
        onChange={handleChange}
      />

      <br />
      <br />

      <textarea
        name="offerText"
        placeholder="Top Offer Text"
        value={settings.offerText}
        onChange={handleChange}
      />

      <br />
      <br />

      <button onClick={saveSettings}>Save Settings</button>
    </div>
  );
}