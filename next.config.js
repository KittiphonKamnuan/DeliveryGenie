/** @type {import('next').NextConfig} */
const nextConfig = {
   turbopack: {}, // เพิ่มบรรทัดนี้เพื่อแก้ error

  
  /* config options here */
  reactStrictMode: true,

  // Speed up builds - skip type checking entirely
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during builds for faster compilation
  

  // Optimize images
  images: {
    unoptimized: true,
  },

    // 🚀 NEW: Redirect root URL (/) to the shop page (/shop)
  async redirects() {
    return [
      {
        // When someone hits the root URL (e.g., localhost:3000)
        source: '/', 
        // Send them to the shop page
        destination: '/shop', 
        // Use a permanent (308) redirect
        permanent: true, 
      },
    ];
  },

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Speed up compilation
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Faster compilation in dev mode
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    return config;
  },

  // Skip static page generation for faster builds
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizeCss: false,
  },
};

module.exports = nextConfig;
