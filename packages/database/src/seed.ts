import "dotenv/config";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";

// 🔥 cargar .env raíz
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

const url = process.env["DATABASE_URL"];
const authToken = process.env["DATABASE_AUTH_TOKEN"];

if (!url || !authToken) {
  console.error("❌ DATABASE_URL y DATABASE_AUTH_TOKEN requeridos");
  process.exit(1);
}

// ✅ FIX: config correcta para Turso
const db = createClient({
  url,
  authToken,
  intMode: "number",
});

const mentors = [
  {
    name: "Prof. Luna",
    specialty: "Matemáticas",
    ageMin: 6,
    ageMax: 10,
    avatarVideoUrl: "/avatars/luna.mp4",
    voiceId: "luna-voice-id",
    emoji: "🦁",
    systemPrompt: "Eres Prof. Luna, una maestra divertida para niños.",
    isActive: 1,
  },
  {
    name: "Dr. Max",
    specialty: "Ciencias Naturales",
    ageMin: 8,
    ageMax: 12,
    avatarVideoUrl: "/avatars/max.mp4",
    voiceId: "max-voice-id",
    emoji: "🦊",
    systemPrompt: "Eres Dr. Max, científico curioso.",
    isActive: 1,
  },
  {
    name: "Miss Sofía",
    specialty: "Inglés",
    ageMin: 6,
    ageMax: 14,
    avatarVideoUrl: "/avatars/sofia.mp4",
    voiceId: "sofia-voice-id",
    emoji: "🦋",
    systemPrompt: "Eres Miss Sofía, enseñas inglés divertido.",
    isActive: 1,
  },
  {
    name: "Profe Carlos",
    specialty: "Lectura y Escritura",
    ageMin: 7,
    ageMax: 11,
    avatarVideoUrl: "/avatars/carlos.mp4",
    voiceId: "carlos-voice-id",
    emoji: "🐼",
    systemPrompt: "Eres Profe Carlos, enseñas lectura.",
    isActive: 1,
  },
  {
    name: "Dra. Valeria",
    specialty: "Historia y Geografía",
    ageMin: 10,
    ageMax: 14,
    avatarVideoUrl: "/avatars/valeria.mp4",
    voiceId: "valeria-voice-id",
    emoji: "🦉",
    systemPrompt: "Eres Dra. Valeria, cuentas historia.",
    isActive: 1,
  },
  {
    name: "Profe Andrés",
    specialty: "Arte y Creatividad",
    ageMin: 6,
    ageMax: 12,
    avatarVideoUrl: "/avatars/andres.mp4",
    voiceId: "andres-voice-id",
    emoji: "🐱",
    systemPrompt: "Eres Profe Andrés, creativo.",
    isActive: 1,
  },
];

async function seed() {
  console.log("🌱 Iniciando seed...");

  for (const mentor of mentors) {
    // 🔍 verificar si existe
    const existing = await db.execute({
      sql: `SELECT id FROM Mentor WHERE name = ? LIMIT 1`,
      args: [mentor.name],
    });

    if (existing.rows.length > 0) {
      console.log(`↩️ ${mentor.name} ya existe`);
      continue;
    }

    // ✅ INSERT usando batch (FIX REAL)
    await db.batch([
      {
        sql: `
          INSERT INTO Mentor (
            id, name, specialty, ageMin, ageMax,
            avatarVideoUrl, voiceId, systemPrompt, emoji,
            isActive, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `,
        args: [
          crypto.randomUUID(),
          mentor.name,
          mentor.specialty,
          mentor.ageMin,
          mentor.ageMax,
          mentor.avatarVideoUrl,
          mentor.voiceId,
          mentor.systemPrompt,
          mentor.emoji,
          mentor.isActive,
        ],
      },
    ]);

    console.log(`✅ ${mentor.name} creado`);
  }

  // 📊 mostrar todos
  const all = await db.execute(`SELECT name, specialty, emoji FROM Mentor`);

  console.log("\n🎉 Mentores en DB:");
  for (const m of all.rows) {
    console.log(`  ${m.emoji} ${m.name} — ${m.specialty}`);
  }
}

seed().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});