import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.buka.sh",
      },
    ],
  },
  compiler: {
    // removeConsole: process.env.NODE_ENV === "production",
  },
  async rewrites() {
    return [
      {
        source: "/@:username",
        destination: "/user/:username",
      },
      // {
      //   source: '/journal',
      //   destination: 'https://journal.buka.sh',
      // }
    ];
  },
};
export default nextConfig;
