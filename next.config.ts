import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  allowedDevOrigins: [
    "static-collectibles-stayed-finished.trycloudflare.com",
    "192.168.1.94",
  ],
};

export default nextConfig;
