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

# Desarrollo (levanta web :3002 y api-cursos :3001)
pnpm dev

# Build de producción
pnpm build

# Base de datos (requiere internet para conectar a Turso)
pnpm db:push       # Crea las 11 tablas en Turso vía libSQL
pnpm db:seed       # Inserta los 6 mentores iniciales
pnpm db:studio     # Prisma Studio (GUI) — usar con DATABASE_URL=file:./local.db

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
├── CLAUDE.md
├── .env                         ← Variables de entorno (no commitear)
├── .env.example
├── package.json
├── turbo.json
├── docker-compose.yml           ← Redis en puerto 6379
│
├── apps/
│   ├── web/                     ← Next.js 14 (puerto 3002)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/      ← login, registro, onboarding
│   │       │   ├── (dashboard)/ ← auth guard raíz (solo verifica session)
│   │       │   │   └── dashboard/
│   │       │   │       ├── page.tsx         → /dashboard → redirect /dashboard/padre
│   │       │   │       ├── padre/           ← Dashboard del padre/tutor
│   │       │   │       │   ├── layout.tsx   → sidebar oscuro + header del padre
│   │       │   │       │   ├── page.tsx     → /dashboard/padre (selector de hijos) ✅
│   │       │   │       │   ├── pagos/       → /dashboard/padre/pagos ✅
│   │       │   │       │   ├── plan/        → /dashboard/padre/plan ✅
│   │       │   │       │   ├── feedback/    → /dashboard/padre/feedback ✅
│   │       │   │       │   └── cuenta/      → /dashboard/padre/cuenta ✅
│   │       │   │       └── nino/            ← Dashboard del niño
│   │       │   │           ├── layout.tsx   → lee cookie activeChildId, guard redirect
│   │       │   │           ├── inicio/      → /dashboard/nino/inicio ✅ datos reales
│   │       │   │           ├── cursos/      → /dashboard/nino/cursos ✅ datos reales
│   │       │   │           ├── mentores/    → /dashboard/nino/mentores ✅
│   │       │   │           └── progreso/    → /dashboard/nino/progreso ✅
│   │       │   ├── cursos/
│   │       │   │   ├── page.tsx             → /cursos (catálogo público) ✅
│   │       │   │   └── [id]/
│   │       │   │       ├── page.tsx         → /cursos/:id (detalle) ✅
│   │       │   │       └── leccion/[lessonId]/page.tsx → reproductor + chatbot ✅
│   │       │   ├── instructor/page.tsx      → /instructor (panel instructor) ✅
│   │       │   ├── planes/page.tsx          → /planes (Wompi checkout) ✅
│   │       │   ├── checkout/resultado/page.tsx → resultado del pago ✅
│   │       │   └── api/auth/               ← Route handler NextAuth
│   │       ├── actions/
│   │       │   ├── auth.ts      ← login, register, logout, onboarding
│   │       │   └── children.ts  ← createChild, enterChildProfile, exitChildProfile
│   │       ├── components/
│   │       │   └── dashboard/
│   │       │       ├── PadreSidebar.tsx    ← sidebar oscuro del padre
│   │       │       ├── NinoSidebar.tsx     ← sidebar colorido del niño
│   │       │       ├── NinoHeader.tsx      ← header del niño + botón salir perfil
│   │       │       ├── DashboardHeader.tsx ← header del padre
│   │       │       └── AddChildModal.tsx   ← modal para agregar hijo
│   │       ├── context/
│   │       ├── lib/
│   │       │   ├── auth.ts         ← NextAuth config
│   │       │   ├── active-child.ts ← cookie helpers (get/set/clear activeChildId)
│   │       │   └── utils.ts        ← cn, formatCop, getPlanLabel
│   │       ├── middleware.ts
│   │       └── types/
│   │
│   ├── api-cursos/              ← Fastify (puerto 3001) ✅ COMPLETO
│   │   └── src/
│   │       ├── middleware/
│   │       │   └── plan-guard.ts    ← requirePlan, requireEnrollment
│   │       ├── routes/
│   │       │   ├── health.ts
│   │       │   ├── courses.ts       ← GET/POST/PUT /api/courses
│   │       │   ├── lessons.ts       ← POST/PUT /api/lessons + GET /watch + upload-url
│   │       │   ├── enrollments.ts   ← POST/PUT/GET /api/enrollments
│   │       │   ├── chat.ts          ← POST /api/chat/lesson/:id
│   │       │   ├── payments.ts      ← POST/GET /api/payments
│   │       │   └── webhooks.ts      ← POST /api/webhooks/mux
│   │       ├── services/
│   │       │   ├── mux.ts           ← createUploadUrl, getAssetStatus
│   │       │   └── wompi.ts         ← buildCheckoutUrl, verifyWebhook
│   │       └── server.ts
│   │
│   └── api-mentor/              ← En construcción (puerto 3002)
│
└── packages/
    ├── database/                ← Prisma + Turso libSQL
    ├── ui/
    └── config/
```

---

## Endpoints de API — api-cursos (:3001)

### Cursos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/courses` | Lista pública de cursos publicados (filtros: category, ageMin, ageMax, search, page, limit) |
| `GET` | `/api/courses/:id` | Detalle del curso con lecciones ordenadas |
| `POST` | `/api/courses` | Crear curso (solo instructor, header x-user-role) |
| `PUT` | `/api/courses/:id` | Editar curso |
| `POST` | `/api/courses/:id/publish` | Toggle isPublished (requiere ≥1 lección) |
| `GET` | `/api/courses/instructor/:userId` | Cursos del instructor |

### Lecciones
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/lessons/courses/:courseId` | Crear lección |
| `PUT` | `/api/lessons/:id` | Editar lección (título, transcript, isFree, order) |
| `GET` | `/api/lessons/:id/watch` | Video URL (verifica isFree o enrollment) |
| `POST` | `/api/lessons/:id/upload-url` | Genera URL de subida Mux |

### Inscripciones
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/enrollments` | Inscribir niño a curso (body: childId, courseId) |
| `PUT` | `/api/enrollments/:id/progress` | Actualizar progressPct (100 → setea completedAt) |
| `GET` | `/api/enrollments/child/:childId` | Lista de cursos del niño con progreso |

### Chat IA
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/chat/lesson/:lessonId` | Pregunta al chatbot (GPT-4o-mini, rate limit 20/día con Redis) |

### Pagos Wompi
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/payments/checkout` | Genera checkout Wompi (plan premium/pro) |
| `POST` | `/api/payments/webhook` | Webhook Wompi (APPROVED/DECLINED) |
| `GET` | `/api/payments/verify/:reference` | Consulta estado (fallback si webhook tardó) |

### Webhooks
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/webhooks/mux` | Procesa video.asset.ready (actualiza videoUrl) y video.asset.errored |

### Auth de API
Los headers requeridos por la API (auth simplificada):
- `x-user-id` — ID del usuario autenticado
- `x-user-role` — `parent | child | instructor | admin`
- `x-user-plan` — `free | premium | pro`
- `x-child-id` — ID del perfil del niño (para operaciones del niño)

---

## Páginas del Frontend

### Públicas
| Ruta | Tipo | Descripción |
|------|------|-------------|
| `/cursos` | Client | Catálogo público con filtros (categoría, edad, búsqueda con debounce) |
| `/cursos/:id` | Server | Detalle del curso, lista de lecciones con 🔒 |
| `/cursos/:id/leccion/:lessonId` | Client | Reproductor video + sidebar lecciones + chatbot IA |
| `/planes` | Client | 3 planes con precios COP + checkout Wompi |
| `/checkout/resultado` | Client | Estado del pago + polling cada 30s (máx 5 veces) |
| `/instructor` | Client | Panel del instructor (crear/publicar cursos + lecciones) |

### Dashboard del Padre (`/dashboard/padre/*`)
| Ruta | Descripción |
|------|-------------|
| `/dashboard/padre` | Hub selector de hijos — "¿Quién va a aprender hoy?" |
| `/dashboard/padre/pagos` | Historial de pagos Wompi con badges de estado |
| `/dashboard/padre/plan` | Plan activo + comparativa + upgrade a Wompi |
| `/dashboard/padre/feedback` | Feedback de sesiones MentorAI (completo solo Plan Pro) |
| `/dashboard/padre/cuenta` | Información de la cuenta + cerrar sesión |

### Dashboard del Niño (`/dashboard/nino/*`)
| Ruta | Descripción |
|------|-------------|
| `/dashboard/nino/inicio` | Bienvenida + resumen (cursos activos, sesiones, score) |
| `/dashboard/nino/cursos` | Cursos inscritos con barra de progreso real |
| `/dashboard/nino/mentores` | 6 mentores IA + sesiones disponibles (EE-M08) |
| `/dashboard/nino/progreso` | Cursos completados + historial sesiones + logros |

### Flujo de navegación
```
Login → /dashboard → /dashboard/padre (hub de hijos)
  → Clic "Entrar como Sofía" → guarda cookie activeChildId (8h) → /dashboard/nino/inicio
  → Botón "Salir del perfil" → borra cookie → /dashboard/padre
```

---

## Servicios Externos Integrados

### Mux (video)
- `createUploadUrl()` — genera URL de subida directa
- `getAssetStatus()` — consulta estado del asset
- `buildStreamUrl()` — construye URL HLS: `https://stream.mux.com/{playbackId}.m3u8`
- Webhook: `video.asset.ready` → actualiza `lesson.videoUrl`

### Wompi (pagos COP — Sandbox)
- `buildCheckoutUrl()` — genera URL de checkout con integrity hash SHA256
- `verifyWebhookSignature()` — valida firma del webhook
- `getTransactionByReference()` — consulta estado de pago
- `copToCents()` — convierte COP a centavos (Wompi usa centavos)
- Variables: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_KEY`, `WOMPI_EVENTS_SECRET`

### OpenAI GPT-4o-mini (chat)
- Respuestas en máximo 3 oraciones simples para niños
- RAG sin pgvector: chunks de 500 chars + `includes()` para encontrar contexto relevante
- Rate limit: 20 consultas/día por niño vía Redis
- Fallback si OpenAI falla: respuesta predefinida amigable

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
9. **Rate limiting** en API: 100 req/min por IP. Chat: 20 preguntas/día por niño.
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
- `AUTH_SECRET` — NextAuth
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` — Google OAuth
- `RESEND_API_KEY` — Emails
- `OPENAI_API_KEY` — GPT-4o-mini (chat) + Whisper
- `ELEVENLABS_API_KEY` — TTS
- `WOMPI_PUBLIC_KEY` + `WOMPI_PRIVATE_KEY` + `WOMPI_INTEGRITY_KEY` + `WOMPI_EVENTS_SECRET` — Pagos
- `MUX_TOKEN_ID` + `MUX_TOKEN_SECRET` — Videos
- `REDIS_URL` — Cache (default: redis://localhost:6379)

---

## Convenciones de Código

- **Componentes**: PascalCase, `.tsx`
- **Utilities/hooks**: camelCase, `.ts`
- **Server Actions**: sufijo `Action` (ej: `loginAction`)
- **API routes Fastify**: sufijo `Routes` (ej: `coursesRoutes`)
- **Imports**: siempre `@/*` para `apps/web/src`, nunca rutas relativas largas
- **Errores**: nunca usar `throw` sin capturar en Server Actions — siempre retornar `{ success: false, error: string }`

---

## Pendiente / Por construir

- **Pipeline MentorAI completo**: Whisper → GPT-4 → ElevenLabs → D-ID (api-mentor en :3002)
- **auth real en api-cursos**: actualmente usa headers x-user-id en lugar de JWT verificado
- **Subida de video en el instructor**: el upload-url está listo, falta el componente de drag & drop
- **Panel de progreso** (`/dashboard/progreso`): datos reales de sesiones y horas
- **Notificaciones de email**: feedback de sesión MentorAI al padre (Plan Pro)
- **Certificados**: generación de PDF al completar curso
