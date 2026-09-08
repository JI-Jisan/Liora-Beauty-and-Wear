export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://liora-beauty-and-wear-seven.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/*", "/api/admin/*", "/account/*", "/checkout"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
