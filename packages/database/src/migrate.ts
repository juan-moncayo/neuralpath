import dotenv from "dotenv";
import path from "path";

// 🔥 Cargar .env desde la raíz (monorepo)
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

import { createClient } from "@libsql/client";

const url = process.env["DATABASE_URL"];
const authToken = process.env["DATABASE_AUTH_TOKEN"];

if (!url || !authToken) {
  console.error("❌ DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos");
  console.error("👉 Verifica que el .env esté en la raíz del proyecto");
  process.exit(1);
}

// ✅ Cliente configurado correctamente (evita bug de migrations)
const client = createClient({
  url,
  authToken,
  intMode: "number",
  concurrency: 1,
});

const statements = `
-- USERS
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT,
  "googleId" TEXT UNIQUE,
  "role" TEXT NOT NULL DEFAULT 'parent',
  "plan" TEXT NOT NULL DEFAULT 'free',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CHILD
CREATE TABLE IF NOT EXISTS "ChildProfile" (
  "id" TEXT PRIMARY KEY,
  "parentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "avatarEmoji" TEXT DEFAULT '👦',
  "interests" TEXT NOT NULL,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("parentId") REFERENCES "User" ("id")
);

-- SUBSCRIPTION
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "wompiId" TEXT,
  "periodStart" DATETIME NOT NULL,
  "periodEnd" DATETIME NOT NULL,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

-- COURSE
CREATE TABLE IF NOT EXISTS "Course" (
  "id" TEXT PRIMARY KEY,
  "instructorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "ageMin" INTEGER NOT NULL,
  "ageMax" INTEGER NOT NULL,
  "priceCop" INTEGER NOT NULL,
  "thumbnailUrl" TEXT,
  "isPublished" INTEGER DEFAULT 0,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("instructorId") REFERENCES "User" ("id")
);

-- LESSON
CREATE TABLE IF NOT EXISTS "Lesson" (
  "id" TEXT PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "videoUrl" TEXT,
  "muxAssetId" TEXT,
  "durationSecs" INTEGER DEFAULT 0,
  "order" INTEGER NOT NULL,
  "transcript" TEXT,
  "isFree" INTEGER DEFAULT 0,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("courseId") REFERENCES "Course" ("id")
);

-- ENROLLMENT
CREATE TABLE IF NOT EXISTS "Enrollment" (
  "id" TEXT PRIMARY KEY,
  "childId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "progressPct" INTEGER DEFAULT 0,
  "completedAt" DATETIME,
  "certificateUrl" TEXT,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id"),
  FOREIGN KEY ("courseId") REFERENCES "Course" ("id")
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS "PaymentCop" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amountCop" INTEGER NOT NULL,
  "plan" TEXT,
  "courseId" TEXT,
  "method" TEXT NOT NULL,
  "wompiRef" TEXT UNIQUE,
  "status" TEXT NOT NULL,
  "paidAt" DATETIME,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

-- CHAT
CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT PRIMARY KEY,
  "childId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tokensUsed" INTEGER DEFAULT 0,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id"),
  FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id")
);

-- MENTOR
CREATE TABLE IF NOT EXISTS "Mentor" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "specialty" TEXT NOT NULL,
  "ageMin" INTEGER NOT NULL,
  "ageMax" INTEGER NOT NULL,
  "avatarVideoUrl" TEXT NOT NULL,
  "voiceId" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "isActive" INTEGER DEFAULT 1,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- SESSION
CREATE TABLE IF NOT EXISTS "MentorSession" (
  "id" TEXT PRIMARY KEY,
  "childId" TEXT NOT NULL,
  "mentorId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "endedAt" DATETIME,
  "durationSecs" INTEGER DEFAULT 0,
  "scoreTotal" INTEGER DEFAULT 0,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id"),
  FOREIGN KEY ("mentorId") REFERENCES "Mentor" ("id")
);

-- FEEDBACK
CREATE TABLE IF NOT EXISTS "SessionFeedback" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT UNIQUE,
  "strengths" TEXT NOT NULL,
  "improvements" TEXT NOT NULL,
  "recommendations" TEXT NOT NULL,
  "sentToParentAt" DATETIME,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sessionId") REFERENCES "MentorSession" ("id")
);
`;

async function migrate(): Promise<void> {
  console.info("🚀 Aplicando schema a Turso...");
  console.info(`   URL: ${url}`);

  try {
    await client.executeMultiple(statements);
    console.info("🎉 Schema aplicado exitosamente en Turso (11 tablas)");
  } catch (err) {
    console.error("❌ Error aplicando schema:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

migrate();