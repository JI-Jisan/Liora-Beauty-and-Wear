"use client";

import { useEffect, useState } from "react";

export default function BrandingPage() {
  const [settings, setSettings] = useState({
    brandName: "",
    brandSubtitle: "",
    heroTitle: "",
    heroText: "",
    offerText: "",
    promoSlides: [],
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
          promoSlides: data.promoSlides || [],
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

  const handleSlideChange = (index, field, value) => {
    const updatedSlides = [...settings.promoSlides];
    updatedSlides[index][field] = value;

    setSettings({
      ...settings,
      promoSlides: updatedSlides,
    });
  };

  const addSlide = () => {
    setSettings({
      ...settings,
      promoSlides: [
        ...settings.promoSlides,
        {
          badge: "",
          title: "",
          subtitle: "",
          buttonText: "",
          buttonLink: "",
          image: "",
        },
      ],
    });
  };

  const removeSlide = (index) => {
    const updatedSlides = settings.promoSlides.filter((_, i) => i !== index);

    setSettings({
      ...settings,
      promoSlides: updatedSlides,
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

      <h3>Promo Slides</h3>

      {settings.promoSlides.map((slide, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #ddd",
            padding: "12px",
            marginBottom: "14px",
            borderRadius: "8px",
          }}
        >
          <input
            type="text"
            placeholder="Badge"
            value={slide.badge}
            onChange={(e) =>
              handleSlideChange(index, "badge", e.target.value)
            }
          />
          <br />
          <br />

          <input
            type="text"
            placeholder="Title"
            value={slide.title}
            onChange={(e) =>
              handleSlideChange(index, "title", e.target.value)
            }
          />
          <br />
          <br />

          <textarea
            placeholder="Subtitle"
            value={slide.subtitle}
            onChange={(e) =>
              handleSlideChange(index, "subtitle", e.target.value)
            }
          />
          <br />
          <br />

          <input
            type="text"
            placeholder="Button Text"
            value={slide.buttonText}
            onChange={(e) =>
              handleSlideChange(index, "buttonText", e.target.value)
            }
          />
          <br />
          <br />

          <input
            type="text"
            placeholder="Button Link"
            value={slide.buttonLink}
            onChange={(e) =>
              handleSlideChange(index, "buttonLink", e.target.value)
            }
          />
          <br />
          <br />

          <input
            type="text"
            placeholder="Image URL or /uploads/filename"
            value={slide.image}
            onChange={(e) =>
              handleSlideChange(index, "image", e.target.value)
            }
          />
          <br />
          <br />

          <button type="button" onClick={() => removeSlide(index)}>
            Delete Slide
          </button>
        </div>
      ))}

      <button type="button" onClick={addSlide}>
        + Add Slide
      </button>

      <br />
      <br />

      <button onClick={saveSettings}>Save Settings</button>
    </div>
  );
}