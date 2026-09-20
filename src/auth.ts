import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.active || !user.passwordHash || !verifyPassword(password, user.passwordHash)) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const typedToken = token as typeof token & Record<string, unknown>;
      if (user) {
        typedToken.userId = user.id;
        typedToken.organizationId = user.organizationId;
        typedToken.role = user.role;
      }
      return typedToken;
    },
    async session({ session, token }) {
      const typedToken = token as Record<string, unknown>;
      const userId = typeof typedToken.userId === "string" ? typedToken.userId : undefined;
      const organizationId = typeof typedToken.organizationId === "string" ? typedToken.organizationId : undefined;
      const role = typeof typedToken.role === "string" ? typedToken.role : undefined;
      if (session.user && userId && organizationId && role) {
        session.user.id = userId;
        session.user.organizationId = organizationId;
        session.user.role = role;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId: string;
    role: string;
  }
}
