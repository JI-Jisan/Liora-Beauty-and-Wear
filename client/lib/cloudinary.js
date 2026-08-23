export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dlgubaefs";
export const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "liora_store";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
export async function uploadToCloudinary(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      `Cloudinary env নেই → cloud:${CLOUD_NAME || "❌"} preset:${UPLOAD_PRESET || "❌"} (Vercel এ redeploy করুন)`
    );
  }
  if (file.size > MAX_SIZE) throw new Error("ছবির সাইজ ৫MB এর কম হতে হবে");

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  const data = await res.json().catch(() => ({}));
  console.log("Cloudinary response:", res.status, data);   // ডিবাগের জন্য

  if (!res.ok || !data.secure_url) {
    throw new Error(`Cloudinary ${res.status}: ${data?.error?.message || "আপলোড ব্যর্থ"}`);
  }
  return data.secure_url;
}

/**
 * ছবির alignment ঠিক রাখার মূল চাবি।
 * যেকোনো সাইজের ছবিকে ডেলিভারির সময়ই বর্গাকারে কেটে দেয়।
 * c_fill = ভরাট করে কাটবে, g_auto = গুরুত্বপূর্ণ অংশ (প্রোডাক্ট) ধরে রাখবে
 */
export function cld(url, w = 800, h = 800) {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("/upload/")) return url; // Cloudinary নয়, যেমন Unsplash
  return url.replace(
    "/upload/",
    `/upload/c_fill,g_auto,w_${w},h_${h},q_auto,f_auto/`
  );
}
