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
      if (user) {
        token.userId = user.id;
        token.organizationId = user.organizationId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId && token.organizationId && token.role) {
        session.user.id = token.userId;
        session.user.organizationId = token.organizationId;
        session.user.role = token.role;
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

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    role?: string;
  }
}
