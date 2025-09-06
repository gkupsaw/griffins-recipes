import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.s3.us-east-1.amazonaws.com', // Wildcard for subdomains
      }
    ]
  }
};

export default nextConfig;
