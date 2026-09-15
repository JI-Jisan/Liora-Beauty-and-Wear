import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "sharp", "adm-zip"],
};

export default nextConfig;
