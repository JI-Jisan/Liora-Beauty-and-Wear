"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useState } from "react";

export default function ReturnAndRefundPolicyPage() {
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
            <Link href="/">Home</Link> / <span>Return & Refund Policy</span>
          </div>

          <h1 className="jt-policy-title">Return & Refund Policy (রিটার্ন ও রিফান্ড নীতি)</h1>
          <p className="jt-policy-date">সর্বশেষ আপডেট: ৯ আগস্ট, ২০২৬</p>

          <div className="jt-policy-content">
            <section>
              <h2>১. পণ্য ফেরতের সময়সীমা</h2>
              <p>
                পণ্য গ্রহণের পর কোনো ত্রুটি বা ভুল পণ্য পাওয়া গেলে আপনি <strong>৭ দিনের মধ্যে</strong> প্রফ বা ছবিসহ আমাদের সাথে যোগাযোগ করে রিটার্ন বা এক্সচেঞ্জ করতে পারবেন।
              </p>
            </section>

            <section>
              <h2>২. রিটার্নের শর্তাবলী</h2>
              <ul>
                <li>পণ্যটি অব্যবহৃত এবং মূল প্যাকেজিং সহ থাকতে হবে।</li>
                <li>ডেলিভারিম্যানের সামনেই সম্ভব হলে পণ্য চেক করে গ্রহণ করুন।</li>
                <li>পরফিউম বা কসমেটিক্স জাতীয় পণ্য ব্যবহারের পর বা সিল খোলার পর ফেরত নেওয়া সম্ভব নয় (যদি না ভুল বা ভাঙা পণ্য হয়ে থাকে)।</li>
              </ul>
            </section>

            <section>
              <h2>৩. রিফান্ড প্রক্রিয়া</h2>
              <p>
                পণ্য আমাদের কাছে ফেরত আসার পর কোয়ালিটি চেক করে <strong>৩ থেকে ৭ কার্যদিবসের মধ্যে</strong> আপনার বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে রিফান্ডের টাকা পাঠিয়ে দেওয়া হবে।
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
