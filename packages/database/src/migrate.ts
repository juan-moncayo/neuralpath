/**
 * Script para crear las tablas en Turso directamente via libSQL.
 * Equivalente a `prisma db push` pero compatible con el URL libsql://
 */
import { createClient } from "@libsql/client";

const url = process.env["DATABASE_URL"];
const authToken = process.env["DATABASE_AUTH_TOKEN"];

if (!url || !authToken) {
  console.error("❌ DATABASE_URL y DATABASE_AUTH_TOKEN son requeridos");
  process.exit(1);
}

const client = createClient({ url, authToken });

const statements = `
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT,
  "googleId" TEXT UNIQUE,
  "role" TEXT NOT NULL DEFAULT 'parent',
  "plan" TEXT NOT NULL DEFAULT 'free',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "ChildProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "parentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "avatarEmoji" TEXT NOT NULL DEFAULT '👦',
  "interests" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ChildProfile_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "wompiId" TEXT,
  "periodStart" DATETIME NOT NULL,
  "periodEnd" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Course" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "instructorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "ageMin" INTEGER NOT NULL,
  "ageMax" INTEGER NOT NULL,
  "priceCop" INTEGER NOT NULL,
  "thumbnailUrl" TEXT,
  "isPublished" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Lesson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "videoUrl" TEXT,
  "muxAssetId" TEXT,
  "durationSecs" INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL,
  "transcript" TEXT,
  "isFree" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Enrollment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "childId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "progressPct" INTEGER NOT NULL DEFAULT 0,
  "completedAt" DATETIME,
  "certificateUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Enrollment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PaymentCop" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amountCop" INTEGER NOT NULL,
  "plan" TEXT,
  "courseId" TEXT,
  "method" TEXT NOT NULL,
  "wompiRef" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "paidAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PaymentCop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "childId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tokensUsed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Mentor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "specialty" TEXT NOT NULL,
  "ageMin" INTEGER NOT NULL,
  "ageMax" INTEGER NOT NULL,
  "avatarVideoUrl" TEXT NOT NULL,
  "voiceId" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "MentorSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "childId" TEXT NOT NULL,
  "mentorId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" DATETIME,
  "durationSecs" INTEGER NOT NULL DEFAULT 0,
  "scoreTotal" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "MentorSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MentorSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SessionFeedback" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL UNIQUE,
  "strengths" TEXT NOT NULL,
  "improvements" TEXT NOT NULL,
  "recommendations" TEXT NOT NULL,
  "sentToParentAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionFeedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MentorSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
`.trim();

async function migrate(): Promise<void> {
  console.info("🚀 Aplicando schema a Turso...");
  console.info(`   URL: ${url}`);

  for (const stmt of statements.split(";").map((s) => s.trim()).filter(Boolean)) {
    const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1];
    try {
      await client.execute(stmt + ";");
      if (tableName) console.info(`  ✅ Tabla "${tableName}" lista`);
    } catch (err) {
      console.error(`  ❌ Error en "${tableName ?? "unknown"}":`, err);
      throw err;
    }
  }

  console.info("\n🎉 Schema aplicado exitosamente en Turso. 11 tablas creadas.");
  client.close();
}

migrate().catch((err) => {
  console.error("Error en migrate:", err);
  process.exit(1);
});
