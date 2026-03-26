"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@neuralpath/database";
import {
  setActiveChildIdCookie,
  clearActiveChildIdCookie,
} from "@/lib/active-child";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

const createChildSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  age: z
    .number()
    .int()
    .min(6, "La edad mínima es 6 años")
    .max(14, "La edad máxima es 14 años"),
  avatarEmoji: z.string().min(1),
  interests: z.array(z.string()).min(1, "Selecciona al menos una área"),
});

/** Crea un nuevo perfil de hijo vinculado al padre autenticado */
export async function createChildAction(
  formData: FormData
): Promise<ActionResult<{ childId: string }>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "No autorizado" };
  if (session.user.role !== "parent" && session.user.role !== "admin") {
    return { success: false, error: "Solo los padres pueden crear perfiles de niños" };
  }

  const raw = {
    name: formData.get("name"),
    age: Number(formData.get("age")),
    avatarEmoji: formData.get("avatarEmoji"),
    interests: formData.getAll("interests") as string[],
  };

  const parsed = createChildSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError ?? "Datos inválidos" };
  }

  const { name, age, avatarEmoji, interests } = parsed.data;

  const child = await prisma.childProfile.create({
    data: {
      parentId: session.user.id,
      name,
      age,
      avatarEmoji,
      interests: JSON.stringify(interests),
    },
    select: { id: true },
  });

  return { success: true, data: { childId: child.id } };
}

/** Establece el hijo activo en la cookie y redirige al dashboard del niño */
export async function enterChildProfileAction(childId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Verificar que el hijo pertenece al padre
  const child = await prisma.childProfile.findFirst({
    where: {
      id: childId,
      parentId: session.user.id,
    },
    select: { id: true },
  });

  if (!child) redirect("/dashboard/padre");

  setActiveChildIdCookie(childId);
  redirect("/dashboard/nino/inicio");
}

/** Limpia la cookie del hijo activo y vuelve al dashboard del padre */
export async function exitChildProfileAction(): Promise<void> {
  clearActiveChildIdCookie();
  redirect("/dashboard/padre");
}
