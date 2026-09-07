"use client";

const REVIEWS = [
  {
    id: 1,
    name: "Nasrin Akhter",
    location: "Dhanmondi, Dhaka",
    skinType: "Oily & Acne-prone",
    rating: 5,
    comment:
      "অয়েলি আর অ্যাকনে-প্রোন স্কিনের জন্য এই সানস্ক্রিনটা একদম পারফেক্ট! কোনো হোয়াইট কাস্ট নেই এবং ঘামেও চটচট করে না। প্রোডাক্ট ১০০% আসল পেয়েছি, অনেক ধন্যবাদ LIORA কে!",
    product: "Beauty of Joseon Relief Sun SPF50+",
    date: "2 days ago",
  },
  {
    id: 2,
    name: "Sadia Sara",
    location: "Uttara, Dhaka",
    skinType: "Combination Skin",
    rating: 5,
    comment:
      "আমি ৩ সপ্তাহ ধরে সিরামটি ব্যবহার করছি, আমার ব্রণের পুরনো দাগগুলো এখন অনেক হালকা হয়ে গেছে। আর ডেলিভারি ছিল সুপার ফাস্ট, অর্ডার করার ২৪ ঘণ্টার মধ্যেই পেয়ে গেছি!",
    product: "The Ordinary Niacinamide 10% + Zinc",
    date: "1 week ago",
  },
  {
    id: 3,
    name: "Tanzila Rahman",
    location: "Chittagong",
    skinType: "Dry & Sensitive",
    rating: 5,
    comment:
      "CeraVe এর আসল প্রোডাক্ট পাওয়া বাংলাদেশে অনেক কঠিন। LIORA থেকে অর্ডার করে একদম নিশ্চিন্ত হলাম। বাবল র‍্যাপ দিয়ে খুব সুরক্ষিতভাবে পাঠানো হয়েছিল।",
    product: "CeraVe Hydrating Cleanser",
    date: "3 days ago",
  },
  {
    id: 4,
    name: "Jarin Yasmin",
    location: "Sylhet",
    skinType: "Normal to Dry",
    rating: 5,
    comment:
      "স্টুডেন্ট বাজেট কম্বোটা নিয়েছিলাম। অল্প টাকায় ক্লিনজার, ময়েশ্চারাইজার আর সানস্ক্রিন একসাথে পেয়ে অনেক সাশ্রয় হলো। রেকমেন্ডেড শপ!",
    product: "Student Budget Skincare Trio",
    date: "5 days ago",
  },
];

export default function CustomerLove() {
  return (
    <section className="jt-customer-love-section">
      <div className="jt-customer-love-inner">
        <div className="jt-customer-love-header">
          <span className="jt-love-heart-badge">💖 REAL EXPERIENCES</span>
          <h2 className="jt-love-title">
            Loved by <span className="jt-love-highlight">5,000+ Customers</span> Across Bangladesh
          </h2>
          <p className="jt-love-subtitle">
            আসল পণ্যের নিশ্চয়তা ও দ্রুত সার্ভিসের উপর আমাদের সম্মানিত গ্রাহকদের বাস্তব অভিজ্ঞতা
          </p>
        </div>

        <div className="jt-reviews-grid">
          {REVIEWS.map((rev) => (
            <div key={rev.id} className="jt-review-card">
              <div className="jt-review-top">
                <div className="jt-review-user-wrap">
                  <div className="jt-review-avatar">
                    {rev.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="jt-review-name-row">
                      <strong className="jt-review-name">{rev.name}</strong>
                      <span className="jt-review-verified">
                        ✓ Verified
                      </span>
                    </div>
                    <span className="jt-review-location">{rev.location}</span>
                  </div>
                </div>

                <div className="jt-review-stars">
                  {"★".repeat(rev.rating)}
                </div>
              </div>

              <div className="jt-review-body">
                <p>&ldquo;{rev.comment}&rdquo;</p>
              </div>

              <div className="jt-review-footer">
                <div className="jt-review-product-tag">
                  <span>🛍️ Purchased: <strong>{rev.product}</strong></span>
                </div>
                <span className="jt-review-date">{rev.date}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Trust summary footer bar */}
        <div className="jt-love-trust-bar">
          <div className="jt-love-stat">
            <strong>4.9 / 5.0</strong>
            <span>Customer Rating</span>
          </div>
          <div className="jt-love-stat-divider" />
          <div className="jt-love-stat">
            <strong>100%</strong>
            <span>Authentic Products</span>
          </div>
          <div className="jt-love-stat-divider" />
          <div className="jt-love-stat">
            <strong>24-48h</strong>
            <span>Express Delivery</span>
          </div>
          <div className="jt-love-stat-divider" />
          <div className="jt-love-stat">
            <strong>Nationwide</strong>
            <span>Cash on Delivery</span>
          </div>
        </div>
      </div>
    </section>
  );
}
