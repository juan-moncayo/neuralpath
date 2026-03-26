import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { SignJWT } from "jose";

/**
 * Configuración "ligera" de NextAuth — sin Prisma ni Node.js modules.
 * Se usa en el middleware (Edge Runtime).
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env["AUTH_GOOGLE_ID"] ?? "",
      clientSecret: process.env["AUTH_GOOGLE_SECRET"] ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token["id"] = user.id;
        token["role"] = (user as { role?: string }).role ?? "parent";
        token["plan"] = (user as { plan?: string }).plan ?? "free";

        // Generar accessToken para las APIs (firmado con JWT_SECRET)
        const secret = new TextEncoder().encode(
          process.env["JWT_SECRET"] ?? process.env["AUTH_SECRET"] ?? ""
        );
        token["accessToken"] = await new SignJWT({
          userId: user.id,
          role: (user as { role?: string }).role ?? "parent",
          plan: (user as { plan?: string }).plan ?? "free",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("7d")
          .setIssuedAt()
          .sign(secret);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token["id"] as string;
        (session.user as { role?: string }).role = token["role"] as string;
        (session.user as { plan?: string }).plan = token["plan"] as string;
        (session as { accessToken?: string }).accessToken =
          token["accessToken"] as string;
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
};
