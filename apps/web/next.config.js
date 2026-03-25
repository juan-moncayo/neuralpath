// Cargar .env desde la raíz del monorepo
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@neuralpath/ui"],
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "avatars.githubusercontent.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "@prisma/adapter-libsql",
      "@libsql/client",
      "@libsql/hrana-client",
      "@neuralpath/database",
      "bcryptjs",
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Marcar todos los paquetes Node.js como externos en el cliente
      const originalExternals = config.externals || [];
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        "@libsql/client",
        "@libsql/hrana-client",
        "@prisma/client",
        "@prisma/adapter-libsql",
        "@neuralpath/database",
      ];

      // Fallbacks para módulos Node.js que no existen en el browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
        http: false,
        https: false,
        zlib: false,
      };
    }

    // Ignorar archivos que webpack no puede parsear en node_modules
    config.module.rules.push(
      { test: /\.md$/, use: "null-loader" },
    );

    return config;
  },
};

module.exports = nextConfig;
