import { cookies } from "next/headers";

const COOKIE_NAME = "activeChildId";
const MAX_AGE = 60 * 60 * 8; // 8 horas

/** Lee el activeChildId de la cookie (Server Component) */
export function getActiveChildId(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/** Establece la cookie activeChildId (Server Action o Route Handler) */
export function setActiveChildIdCookie(childId: string): void {
  cookies().set(COOKIE_NAME, childId, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** Borra la cookie activeChildId */
export function clearActiveChildIdCookie(): void {
  cookies().delete(COOKIE_NAME);
}
