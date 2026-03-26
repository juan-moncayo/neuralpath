import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveChildId } from "@/lib/active-child";

/** GET /api/me — retorna sesión del usuario + childId activo para Client Components */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const childId = getActiveChildId();
  const s = session as typeof session & { accessToken?: string };

  return NextResponse.json({
    userId: session.user.id,
    role: session.user.role,
    plan: session.user.plan,
    accessToken: s.accessToken ?? null,
    childId: childId ?? null,
  });
}
