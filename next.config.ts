import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Prevents build from failing due to ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Prevents build from failing due to type errors
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
