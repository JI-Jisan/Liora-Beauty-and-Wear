"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useState } from "react";

export default function TermsAndConditionsPage() {
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
            <Link href="/">Home</Link> / <span>Terms & Conditions</span>
          </div>

          <h1 className="jt-policy-title">Terms & Conditions (শর্তাবলী)</h1>
          <p className="jt-policy-date">সর্বশেষ আপডেট: ৯ আগস্ট, ২০২৬</p>

          <div className="jt-policy-content">
            <section>
              <h2>১. সাধারণ শর্তাবলী</h2>
              <p>
                <strong>LIORA Beauty & Wear</strong> ওয়েবসাইট ব্যবহার করে পণ্য অর্ডার করার মাধ্যমে আপনি এই ব্যবহারের শর্তাবলীতে সম্মত হচ্ছেন।
              </p>
            </section>

            <section>
              <h2>২. অর্ডার ও পেমেন্ট</h2>
              <ul>
                <li>আমাদের সাইটে অ্যাকাউন্ট না খুলেও গেস্ট হিসেবে সরাসরি অর্ডার প্লেস করা যায়।</li>
                <li>অর্ডার সম্পন্ন করার পর কাস্টমার প্রতিনিধির মাধ্যমে ফোনে অর্ডারটি কনফার্ম করা হবে।</li>
                <li>পণ্য হাতে পাওয়ার পর মূল্য পরিশোধ করার (Cash on Delivery) সুবিধা রয়েছে।</li>
              </ul>
            </section>

            <section>
              <h2>৩. পণ্যের তথ্য ও স্টক</h2>
              <p>
                আমরা সঠিক পণ্যের ছবি ও দাম প্রদর্শনের সর্বোচ্চ চেষ্টা করি। তবে অনিচ্ছাকৃত ভুল বা স্টক না থাকার কারণে যেকোনো অর্ডার বাতিল করার অধিকার LIORA Beauty & Wear সংরক্ষণ করে।
              </p>
            </section>

            <section>
              <h2>৪. বাতিল নীতি (Order Cancellation)</h2>
              <p>
                পণ্য শিপমেন্ট বা কুরিয়ারে হস্তান্তর করার পূর্বে গ্রাহক যেকোনো সময় অর্ডার বাতিল করতে পারেন। কুরিয়ারে হস্তান্তর হওয়ার পর পণ্য গ্রহণ না করলে ডেলিভারি চার্জ প্রযোজ্য হতে পারে।
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
