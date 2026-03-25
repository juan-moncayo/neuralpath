"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@neuralpath/database";
import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe tener al menos una mayúscula")
    .regex(/[0-9]/, "Debe tener al menos un número"),
});

const onboardingSchema = z.object({
  childName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  childAge: z
    .number()
    .int()
    .min(6, "La edad mínima es 6 años")
    .max(14, "La edad máxima es 14 años"),
  avatarEmoji: z.string().min(1),
  interests: z.array(z.string()).min(1, "Selecciona al menos un área"),
});

// ─── Tipos de respuesta ───────────────────────────────────────────────────────

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Registro ─────────────────────────────────────────────────────────────────

export async function registerAction(
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError ?? "Datos inválidos" };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      success: false,
      error: "Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "parent", plan: "free" },
    select: { id: true },
  });

  return { success: true, data: { userId: user.id } };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Email o contraseña incorrectos" };
        case "CallbackRouteError":
          return { success: false, error: "Email o contraseña incorrectos" };
        default:
          return { success: false, error: "Error al iniciar sesión" };
      }
    }
    throw error;
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export async function onboardingAction(
  parentId: string,
  formData: FormData
): Promise<ActionResult<{ childId: string }>> {
  const raw = {
    childName: formData.get("childName"),
    childAge: Number(formData.get("childAge")),
    avatarEmoji: formData.get("avatarEmoji"),
    interests: formData.getAll("interests") as string[],
  };

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError ?? "Datos inválidos" };
  }

  const { childName, childAge, avatarEmoji, interests } = parsed.data;

  const child = await prisma.childProfile.create({
    data: {
      parentId,
      name: childName,
      age: childAge,
      avatarEmoji,
      interests: JSON.stringify(interests),
    },
    select: { id: true },
  });

  return { success: true, data: { childId: child.id } };
}

// ─── Recuperar contraseña ─────────────────────────────────────────────────────

export async function forgotPasswordAction(
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { success: false, error: "Email inválido" };
  }

  // Verificar si el usuario existe (sin revelar si no existe por seguridad)
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // TODO: enviar email con Resend cuando la API key esté configurada
    console.info(`📧 Enviando link de recuperación a ${email}`);
  }

  // Siempre responder con éxito para no revelar emails registrados
  return { success: true };
}
