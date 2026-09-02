"use client";

import Link from "next/link";
import LioraLogo from "./LioraLogo";

export default function Footer() {
  return (
    <footer className="jt-footer">
      <div className="jt-footer-top">
        <div className="jt-footer-container">
          {/* Brand Info Column */}
          <div className="jt-footer-col jt-footer-brand">
            <div className="jt-footer-logo-row" style={{ background: "#FFF0F3", padding: "12px 16px", borderRadius: "14px", display: "inline-block", marginBottom: "16px" }}>
              <LioraLogo />
            </div>
            <p className="jt-footer-desc">
              Your trusted online destination for 100% authentic cosmetics, skincare, luxury perfumes & trendy fashion wear across Bangladesh. Style that speaks elegance.
            </p>
            <div className="jt-footer-dbid">
              <span>DBID / Trade License Registered Store</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="jt-footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/products">All Products</Link>
              </li>
              <li>
                <Link href="/checkout">Quick Checkout</Link>
              </li>
              <li>
                <Link href="/order-tracking">Track Order</Link>
              </li>
              <li>
                <Link href="/contact">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Customer Policies Column */}
          <div className="jt-footer-col">
            <h4>Customer Policies</h4>
            <ul>
              <li>
                <Link href="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms-and-conditions">Terms & Conditions</Link>
              </li>
              <li>
                <Link href="/return-and-refund-policy">Return & Refund Policy</Link>
              </li>
              <li>
                <Link href="/shipping-and-delivery-policy">Shipping & Delivery Policy</Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support Column */}
          <div className="jt-footer-col">
            <h4>Contact Support</h4>
            <div className="jt-footer-contact-info">
              <p>
                <strong>Facebook:</strong>{" "}
                <a
                  href="https://www.facebook.com/share/19YizuGAnM/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "underline" }}
                >
                  Liora Beauty & Wear
                </a>
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                <a href="tel:+8801837223147" style={{ color: "inherit" }}>
                  +880 1837-223147
                </a>
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:liorabeautyandwear@gmail.com" style={{ color: "inherit" }}>
                  liorabeautyandwear@gmail.com
                </a>
              </p>
              <p>
                <strong>Address:</strong> Tejgaon, Dhaka, Bangladesh
              </p>
              <p>
                <strong>Hours:</strong> 10:00 AM - 10:00 PM (Daily)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="jt-footer-bottom">
        <div className="jt-footer-container jt-footer-bottom-inner">
          <p className="jt-footer-copy">
            &copy; {new Date().getFullYear()} <strong>LIORA Beauty & Wear</strong>. All rights reserved.
          </p>

          <div className="jt-footer-payments">
            <span className="jt-pay-pill">Cash on Delivery</span>
            <span className="jt-pay-pill">bKash</span>
            <span className="jt-pay-pill">Nagad</span>
            <span className="jt-pay-pill">Rocket</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
