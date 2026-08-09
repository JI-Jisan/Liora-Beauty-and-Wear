"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useState } from "react";

export default function PrivacyPolicyPage() {
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
            <Link href="/">Home</Link> / <span>Privacy Policy</span>
          </div>

          <h1 className="jt-policy-title">Privacy Policy (গোপনীয়তা নীতি)</h1>
          <p className="jt-policy-date">সর্বশেষ আপডেট: ৯ আগস্ট, ২০২৬</p>

          <div className="jt-policy-content">
            <section>
              <h2>১. ভূমিকা</h2>
              <p>
                <strong>LIORA Beauty & Wear</strong> আপনার তথ্যের সুরক্ষাকে সর্বোচ্চ প্রাধান্য দেয়। আপনি যখন আমাদের ওয়েবসাইট ব্যবহার করেন বা পণ্য অর্ডার করেন, তখন আপনার ব্যক্তিগত তথ্য কীভাবে সংগ্রহ, ব্যবহার ও সুরক্ষিত রাখা হয়, তা এই পলিসিতে ব্যাখ্যা করা হয়েছে।
              </p>
            </section>

            <section>
              <h2>২. আমরা যেসব তথ্য সংগ্রহ করি</h2>
              <p>পণ্য ডেলিভারি ও কাস্টমার সার্ভিসের জন্য আমরা নিচের তথ্যগুলো সংগ্রহ করি:</p>
              <ul>
                <li>গ্রাহকের নাম (Customer Name)</li>
                <li>মোবাইল নম্বর (Phone Number)</li>
                <li>ডেলিভারি ঠিকানা (Delivery Address)</li>
                <li>অর্ডার নোট বা বিশেষ নির্দেশাবলী (Order Notes)</li>
              </ul>
            </section>

            <section>
              <h2>৩. তথ্যের ব্যবহার</h2>
              <p>আপনার সংগৃহীত তথ্য শুধুমাত্র নিচের কাজগুলোতে ব্যবহৃত হয়:</p>
              <ul>
                <li>আপনার কাঙ্ক্ষিত পণ্য আপনার ঠিকানায় ডেলিভারি নিশ্চিত করা।</li>
                <li>অর্ডার কনফার্মেশন ও ডেলিভারি স্ট্যাটাস সম্পর্কিত যোগাযোগ।</li>
                <li>কাস্টমার সাপোর্ট প্রদান করা।</li>
              </ul>
            </section>

            <section>
              <h2>৪. তথ্যের সুরক্ষা ও তৃতীয় পক্ষ (Third-Party Policy)</h2>
              <p>
                আমরা আপনার কোনো ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি বা পাচার করি না। শুধুমাত্র ডেলিভারি সম্পন্ন করার জন্য আমাদের নিবন্ধিত কুরিয়ার সার্ভিস (যেমন: Pathao, Steadfast, RedX) এর সাথে আপনার নাম, ফোন নম্বর ও ঠিকানা শেয়ার করা হয়।
              </p>
            </section>

            <section>
              <h2>৫. কুকিজ (Cookies)</h2>
              <p>
                আমাদের ওয়েবসাইটে ব্রাউজিং অভিজ্ঞতা উন্নত করার জন্য এবং আপনার কার্ট (Cart) আইটেমগুলো সাময়িকভাবে মনে রাখার জন্য LocalStorage ও সাধারণ কুকিজ প্রযুক্তি ব্যবহৃত হয়।
              </p>
            </section>

            <section>
              <h2>৬. যোগাযোগ</h2>
              <p>
                আমাদের গোপনীয়তা নীতি সংক্রান্ত কোনো প্রশ্ন থাকলে সরাসরি ইমেইল করুন: <strong>support@jisantrends.com</strong> অথবা কল করুন: <strong>+880 1700-000000</strong>।
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
