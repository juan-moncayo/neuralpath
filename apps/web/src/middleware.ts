import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/registro",
  "/recuperar",
  "/nueva-clave",
];

const authRoutes = ["/login", "/registro"];

export default auth((req: NextRequest & { auth?: { user?: { id?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;

  // Si está en ruta de auth y ya está logueado, redirigir al dashboard
  if (authRoutes.some((r) => pathname.startsWith(r)) && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Si la ruta es privada y no está logueado, redirigir al login
  const isPublic = publicRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (!isPublic && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
