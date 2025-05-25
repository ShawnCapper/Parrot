import type { NextConfig } from "next";
// @ts-ignore - No need for type checking as we're using a JS import
const withPWA = require('next-pwa');

// Configure the PWA
const config: NextConfig = {
  trailingSlash: true,
  serverExternalPackages: ['openai'],
  // Enable WebAssembly support
  webpack: (config) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    return config;
  },
};

// Apply PWA configuration
const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})(config);

export default nextConfig;
