import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID = process.env.FINANCE_AI_ORGANIZATION_ID ?? "demo-org";

export async function GET() {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: ORGANIZATION_ID },
      include: { branches: { where: { active: true }, orderBy: { name: "asc" } } },
    });

    if (!organization) return NextResponse.json({ error: "Organization is not configured" }, { status: 404 });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Organization lookup failed", error);
    return NextResponse.json({ error: "Unable to load organization" }, { status: 500 });
  }
}
