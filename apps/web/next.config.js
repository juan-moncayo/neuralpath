// Cargar .env desde la raíz del monorepo (Next.js busca solo en apps/web/)
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
      "@libsql/isomorphic-fetch",
      "@libsql/isomorphic-ws",
      "@neuralpath/database",
      "bcryptjs",
    ],
  },
  webpack: (config, { isServer }) => {
    // Externalizar TODOS los paquetes @libsql/* en server Y client
    const libsqlExternal = ({ request }, callback) => {
      if (request && request.startsWith("@libsql/")) {
        return callback(null, `commonjs ${request}`);
      }
      callback();
    };

    if (Array.isArray(config.externals)) {
      config.externals.push(libsqlExternal);
    } else {
      config.externals = [libsqlExternal];
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false, crypto: false,
        path: false, os: false, stream: false, buffer: false,
      };
    }

    // Ignorar archivos de texto que no son código (README, LICENSE, NOTICE, CHANGELOG)
    config.module.rules.push({
      test: /node_modules[\\/].*(README|LICENSE|NOTICE|CHANGELOG|AUTHORS)(\.md|\.txt)?$/,
      use: "null-loader",
    });
    // También ignorar archivos .md y .txt en general dentro de node_modules
    config.module.rules.push({
      test: /node_modules[\\/].*\.(md|txt|LICENSE)$/,
      use: "null-loader",
    });

    return config;
  },
};

module.exports = nextConfig;
