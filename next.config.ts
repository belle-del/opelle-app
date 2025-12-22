import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/\\(auth\\)/:path*",
        destination: "/:path*",
      },
    ];
  },
};

export default nextConfig;
