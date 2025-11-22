import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,

  // Speed up development - skip type checking in dev mode
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // Skip ESLint during builds for faster compilation
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimize images
  images: {
    domains: ['maps.googleapis.com', 'maps.gstatic.com'],
  },

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
