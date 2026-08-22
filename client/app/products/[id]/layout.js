export async function generateMetadata({ params }) {
  const { id } = params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"; // লাইভ হলে আপনার আসল ডোমেইন হবে

  try {
    // সার্ভার থেকে নির্দিষ্ট প্রোডাক্টের ডেটা ফেচ করা
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
      cache: "no-store", // সবসময় লেটেস্ট ডেটা দেখাবে
    });

    if (!res.ok) {
      return { title: "Product Not Found | LIORA Beauty & Wear" };
    }

    const product = await res.json();
    
    // ইমেজের সঠিক লিংক তৈরি করা (Cloudinary বা Local)
    const productImageUrl = product.image
      ? (product.image.startsWith("http") ? product.image : `${baseUrl}${product.image}`)
      : "https://via.placeholder.com/600x400?text=Liora+Product"; // ছবি না থাকলে ডিফল্ট ছবি

    const shortDesc = product.description
      ? product.description.substring(0, 120) + "..."
      : `Order ${product.name} today at the best price!`;

    // ফেসবুক ও অন্যান্য সোশ্যাল মিডিয়ার জন্য Open Graph (OG) ট্যাগ
    return {
      title: `${product.name} | LIORA`,
      description: shortDesc,
      openGraph: {
        title: `${product.name} - ৳${product.offerPrice}`,
        description: shortDesc,
        url: `${baseUrl}/products/${id}`,
        siteName: "LIORA Beauty & Wear",
        images: [
          {
            url: productImageUrl,
            width: 1200,
            height: 630, // ফেসবুক শেয়ার ইমেজের স্ট্যান্ডার্ড সাইজ
            alt: product.name,
          },
        ],
        locale: "en_US",
        type: "website",
      },
    };
  } catch (error) {
    return {
      title: "LIORA Beauty & Wear",
    };
  }
}

// Layout কম্পোনেন্ট যা আপনার page.js কে ভেতরে রেন্ডার করবে
export default function ProductLayout({ children }) {
  return <>{children}</>;
}
