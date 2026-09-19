import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const organizationName = typeof body.organizationName === "string" ? body.organizationName.trim() : "";

    if (!name || !email || !organizationName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Name, organizationName, and a valid email are required" }, { status: 400 });
    }
    if (password.length < 12) return NextResponse.json({ error: "Password must contain at least 12 characters" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });

    const passwordHash = hashPassword(password);
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: organizationName } });
      const user = await tx.user.create({
        data: { organizationId: organization.id, name, email, passwordHash, role: "OWNER" },
        select: { id: true, name: true, email: true, organizationId: true, role: true },
      });
      return { organization, user };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Unable to create account" }, { status: 500 });
  }
}
