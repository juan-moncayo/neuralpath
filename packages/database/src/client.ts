import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

function createPrismaClient(): PrismaClient {
  const url = process.env["DATABASE_URL"];
  const authToken = process.env["DATABASE_AUTH_TOKEN"];

  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const libsql = createClient({ url, authToken });
  const adapter = new PrismaLibSQL(libsql);

  return new PrismaClient({ adapter });
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__prisma = prisma;
}
