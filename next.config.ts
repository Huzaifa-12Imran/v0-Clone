import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  reactCompiler: true,
  experimental: {
    optimizeCss: false,
    cssChunking: true,
    inlineCss: true,
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.thum.io",
      },
    ],
  },
};

export default nextConfig;
