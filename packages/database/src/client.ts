import dotenv from "dotenv";
import path from "path";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

// cargar .env desde raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function createPrismaClient(): PrismaClient {
  const url = process.env["DATABASE_URL"];
  const authToken = process.env["DATABASE_AUTH_TOKEN"];

  if (!url) throw new Error("DATABASE_URL required");
  if (!authToken) throw new Error("DATABASE_AUTH_TOKEN required");

  const libsql = createClient({
    url,
    authToken,
    intMode: "number",
    // 🔹 omitir verificación de migraciones (evita error 400)
    disableMigrations: true,
  });

  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}