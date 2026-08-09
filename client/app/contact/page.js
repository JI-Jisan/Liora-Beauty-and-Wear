"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useState } from "react";

export default function ContactPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <main className="jt-page">
      <Header
        cartCount={0}
        onOpenCart={() => {}}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="jt-contact-wrapper">
        <div className="jt-contact-container">
          <div className="jt-policy-breadcrumb">
            <Link href="/">Home</Link> / <span>Contact Us</span>
          </div>

          <h1 className="jt-policy-title">Contact Us (যোগাযোগ করুন)</h1>
          <p className="jt-policy-subtitle">
            আপনার যেকোনো প্রশ্ন, অর্ডার সমস্যা বা সহায়তার জন্য আমাদের সাথে যোগাযোগ করুন।
          </p>

          <div className="jt-contact-grid">
            {/* Contact Details Card */}
            <div className="jt-contact-card">
              <h3>Our Contact Information</h3>
              <div className="jt-contact-item">
                <strong>📞 Phone Number:</strong>
                <p>+880 1700-000000</p>
              </div>

              <div className="jt-contact-item">
                <strong>📧 Email Address:</strong>
                <p>support@jisantrends.com</p>
              </div>

              <div className="jt-contact-item">
                <strong>📍 Office Address:</strong>
                <p>Dhaka, Bangladesh</p>
              </div>

              <div className="jt-contact-item">
                <strong>⏰ Business Hours:</strong>
                <p>10:00 AM - 10:00 PM (Daily)</p>
              </div>

              <div className="jt-contact-whatsapp-box">
                <a
                  href="https://wa.me/8801700000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="jt-whatsapp-direct-btn"
                >
                  💬 Chat on WhatsApp Directly
                </a>
              </div>
            </div>

            {/* Inquiry Form Card */}
            <div className="jt-contact-card">
              <h3>Send us a Message</h3>
              {submitted ? (
                <div className="jt-contact-success">
                  <h4>Thank you for reaching out!</h4>
                  <p>We have received your message and will respond shortly.</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="jt-contact-reset-btn"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form className="jt-contact-form" onSubmit={handleSubmit}>
                  <input
                    type="text"
                    name="name"
                    placeholder="আপনার নাম *"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                  <input
                    type="text"
                    name="phone"
                    placeholder="ফোন নম্বর *"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />

                  <input
                    type="email"
                    name="email"
                    placeholder="ইমেইল এড্রেস (ঐচ্ছিক)"
                    value={formData.email}
                    onChange={handleChange}
                  />

                  <textarea
                    name="message"
                    placeholder="আপনার বার্তা বা প্রশ্ন লিখুন *"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  ></textarea>

                  <button type="submit" className="jt-contact-submit-btn">
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
