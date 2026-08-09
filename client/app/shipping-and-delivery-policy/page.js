"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useState } from "react";

export default function ShippingAndDeliveryPolicyPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <main className="jt-page">
      <Header
        cartCount={0}
        onOpenCart={() => {}}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="jt-policy-wrapper">
        <div className="jt-policy-container">
          <div className="jt-policy-breadcrumb">
            <Link href="/">Home</Link> / <span>Shipping & Delivery Policy</span>
          </div>

          <h1 className="jt-policy-title">Shipping & Delivery Policy (ডেলিভারি নীতি)</h1>
          <p className="jt-policy-date">সর্বশেষ আপডেট: ৯ আগস্ট, ২০২৬</p>

          <div className="jt-policy-content">
            <section>
              <h2>১. ডেলিভারি চার্জ</h2>
              <ul>
                <li><strong>ঢাকা সিটির ভেতরে:</strong> ৬৫ টাকা</li>
                <li><strong>ঢাকা সিটির বাইরে:</strong> ১১০ টাকা</li>
                <li>১৫০০ টাকার বেশি অর্ডারে বিশেষ অফারে ডেলিভারি ফ্রি হতে পারে।</li>
              </ul>
            </section>

            <section>
              <h2>২. ডেলিভারির সময়সীমা</h2>
              <ul>
                <li><strong>ঢাকা সিটির ভেতরে:</strong> ২৪ থেকে ৪৮ ঘণ্টার মধ্যে।</li>
                <li><strong>ঢাকা সিটির বাইরে:</strong> ৪৮ থেকে ৭২ ঘণ্টার মধ্যে।</li>
              </ul>
            </section>

            <section>
              <h2>৩. ডেলিভারি পর্যবেক্ষণ</h2>
              <p>
                আপনার অর্ডার কনফার্ম হওয়ার পর কুরিয়ার ট্র্যাকিং কোড বা কাস্টমার সাপোর্টের মাধ্যমে যেকোনো সময় ডেলিভারি স্ট্যাটাস জানতে পারবেন।
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
