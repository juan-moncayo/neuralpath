# NeuralPath — Guía para Claude

Plataforma EdTech SaaS para niños colombianos de 6–14 años.
Dos módulos: **Marketplace de cursos en video** + **MentorAI** (tutor IA con avatar).

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 App Router + TypeScript + TailwindCSS + shadcn/ui |
| Backend | Fastify (Node.js + TypeScript) |
| Base de datos | Turso (libSQL remoto) + Prisma ORM |
| Cache | Redis (Docker local, puerto 6379) |
| Auth | NextAuth.js v5 — email/bcrypt + Google OAuth |
| Tokens | JWT access 15min + refresh 7d (cookies httpOnly) |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Vercel (frontend) + Railway (backends) |
| Emails | Resend |
| Videos | Mux |
| Pagos | Wompi (COP) |
| IA/Voz | OpenAI GPT-4, Whisper STT, ElevenLabs TTS, D-ID avatars |

---

## Comandos principales

```bash
# Instalar dependencias
pnpm install

# Desarrollo (levanta web :3000 y api-cursos :3001)
pnpm dev

# Build de producción
pnpm build

# Base de datos (requiere internet para conectar a Turso)
pnpm db:push       # Crea las 11 tablas en Turso vía libSQL
pnpm db:seed       # Inserta los 6 mentores iniciales
pnpm db:studio     # Prisma Studio (GUI) — usar con DATABASE_URL=file:./local.db
# Nota: db:push usa src/migrate.ts (SQL directo) porque Prisma CLI
# requiere file:// para sqlite pero Turso usa libsql://

# Redis (Docker)
docker compose up -d redis

# Solo web
pnpm --filter @neuralpath/web dev

# Solo api-cursos
pnpm --filter @neuralpath/api-cursos dev
```

---

## Estructura del Monorepo

```
neuralpath/
├── CLAUDE.md                    ← Este archivo
├── .env                         ← Variables de entorno (no commitear)
├── .env.example                 ← Plantilla sin valores reales
├── package.json                 ← Root pnpm workspaces
├── turbo.json                   ← Configuración Turborepo
├── docker-compose.yml           ← Redis en puerto 6379
│
├── apps/
│   ├── web/                     ← Next.js 14 (puerto 3000)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/      ← Rutas de auth (login, registro, onboarding...)
│   │       │   ├── (dashboard)/ ← Dashboard protegido por middleware
│   │       │   └── api/auth/    ← Route handler NextAuth
│   │       ├── actions/         ← Server Actions (formularios)
│   │       ├── components/      ← Componentes React
│   │       ├── lib/             ← auth.ts, utils.ts
│   │       ├── middleware.ts    ← Protección de rutas
│   │       └── types/           ← Extensiones de tipos
│   │
│   ├── api-cursos/              ← Fastify (puerto 3001)
│   │   └── src/
│   │       ├── routes/          ← /health, /courses, /lessons
│   │       └── server.ts        ← Bootstrap de Fastify
│   │
│   └── api-mentor/              ← Fastify MentorAI (puerto 3002) — En construcción
│       └── README.md
│
└── packages/
    ├── database/                ← Prisma + cliente Turso libSQL
    │   ├── prisma/schema.prisma ← 11 modelos
    │   └── src/
    │       ├── client.ts        ← PrismaClient singleton con adaptador libSQL
    │       ├── seed.ts          ← Inserta 6 mentores
    │       └── index.ts         ← Re-exporta prisma + tipos
    │
    ├── ui/                      ← Componentes compartidos (Button, Card, cn)
    └── config/                  ← Base tsconfig, eslint, tailwind
```

---

## Base de Datos — 11 Tablas

### `User`
Cuenta principal del padre/tutor, instructor o admin. Guarda el hash bcrypt de la contraseña y el Google ID. El plan se almacena aquí: `free | premium | pro`.

### `ChildProfile`
Perfil del niño. Hijo de `User` (parentId). Guarda nombre, edad, avatarEmoji y un JSON array de intereses. El contenido se adapta por edad.

### `Subscription`
Historial de suscripciones Wompi. Estados: `active | cancelled | expired`. Incluye `periodStart` y `periodEnd`.

### `Course`
Curso creado por un instructor. Tiene `ageMin` / `ageMax` para filtrar por edad. `isPublished` controla visibilidad pública. `priceCop` es 0 para cursos gratuitos.

### `Lesson`
Lección de un curso. `order` define el orden de reproducción. `isFree` permite ver la primera lección sin pago. `muxAssetId` enlaza con Mux para streaming.

### `Enrollment`
Inscripción de un `ChildProfile` en un `Course`. Guarda `progressPct` (0–100) y `completedAt` cuando termina.

### `PaymentCop`
Registro de pagos Wompi en pesos colombianos. Métodos: `pse | nequi | daviplata | card`. Estados: `pending | approved | declined | voided`.

### `ChatMessage`
Mensajes del chat IA dentro de una lección. `role` es `child | ai`. Guarda `tokensUsed` para monitoreo de costos.

### `Mentor`
Perfil de un tutor IA. Define `specialty`, rango de edad, URL del avatar pre-renderizado, `voiceId` de ElevenLabs y `systemPrompt`.

### `MentorSession`
Sesión de conversación entre un niño y un mentor IA. `status`: `active | completed | cancelled`. Guarda `durationSecs` y `scoreTotal`.

### `SessionFeedback`
Reporte automático de una sesión: `strengths`, `improvements`, `recommendations`. `sentToParentAt` registra cuándo se envió al padre (solo plan Pro).

---

## Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| `parent` | Padre/tutor — paga, ve reportes, crea perfiles de hijos |
| `child` | Niño — usa la plataforma, nunca ve precios |
| `instructor` | Sube y gestiona cursos |
| `admin` | Acceso total a la plataforma |

---

## Planes de Precios (COP)

| Plan | Precio | Beneficios |
|------|--------|-----------|
| Free | Gratis | 2 sesiones MentorAI/mes + 1ª lección gratis por curso |
| Premium | $29.900/mes | Cursos ilimitados |
| Pro | $59.900/mes | Cursos + 10 sesiones MentorAI + feedback al padre |

---

## Reglas de Negocio Críticas

1. **El niño NUNCA ve precios** — solo el padre/tutor.
2. **No grabar audio/video del niño** — el audio de Whisper solo se procesa en memoria, nunca se almacena.
3. **Todos los pagos en COP** (pesos colombianos) vía Wompi.
4. **El padre siempre paga** — los niños no tienen acceso a métodos de pago.
5. **UI siempre en español colombiano** amigable para niños. Lenguaje cálido, emojis, fuente Fredoka One.
6. **Server Actions** de Next.js para todos los formularios del frontend.
7. **TypeScript estricto** — cero `any`, validación Zod en todos los endpoints.
8. **Edad mínima**: 6 años. Edad máxima: 14 años. El contenido se adapta al rango.
9. **Rate limiting** en API: 100 req/min por IP.
10. **Auth**: email + bcrypt (salt 12) o Google OAuth. JWT access 15min + refresh 7d.

---

## Mentores IA Disponibles

| Emoji | Nombre | Especialidad | Edad |
|-------|--------|-------------|------|
| 🦁 | Prof. Luna | Matemáticas | 6–10 años |
| 🦊 | Dr. Max | Ciencias Naturales | 8–12 años |
| 🦋 | Miss Sofía | Inglés | 6–14 años |
| 🐼 | Profe Carlos | Lectura y Escritura | 7–11 años |
| 🦉 | Dra. Valeria | Historia y Geografía | 10–14 años |
| 🐱 | Profe Andrés | Arte y Creatividad | 6–12 años |

---

## Pipeline MentorAI

```
Niño habla (micrófono)
  → Whisper STT (OpenAI) — transcripción en memoria
  → GPT-4 — respuesta adaptada por edad y especialidad
  → ElevenLabs TTS — síntesis de voz del mentor
  → Avatar D-ID pre-renderizado con lip-sync local
  → Niño ve y escucha al mentor
```

**Sin API de avatar en tiempo real** — los avatares son videos pre-renderizados con lip-sync local para reducir latencia y costos.

---

## Variables de Entorno Requeridas

Ver `.env.example` para la lista completa. Las críticas son:

- `DATABASE_URL` + `DATABASE_AUTH_TOKEN` — Turso
- `AUTH_SECRET` — NextAuth (generar con `openssl rand -base64 32`)
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` — Google OAuth
- `RESEND_API_KEY` — Emails de recuperación
- `OPENAI_API_KEY` — GPT-4 + Whisper
- `ELEVENLABS_API_KEY` — TTS
- `WOMPI_PUBLIC_KEY` + `WOMPI_PRIVATE_KEY` — Pagos COP

---

## Convenciones de Código

- **Componentes**: PascalCase, `.tsx`
- **Utilities/hooks**: camelCase, `.ts`
- **Server Actions**: sufijo `Action` (ej: `loginAction`)
- **API routes Fastify**: sufijo `Routes` (ej: `coursesRoutes`)
- **Imports**: siempre `@/*` para `apps/web/src`, nunca rutas relativas largas
- **Errores**: nunca usar `throw` sin capturar en Server Actions — siempre retornar `{ success: false, error: string }`
