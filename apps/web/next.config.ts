import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@neuralpath/ui", "@neuralpath/database"],
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "avatars.githubusercontent.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@libsql/client"],
  },
};

export default nextConfig;
