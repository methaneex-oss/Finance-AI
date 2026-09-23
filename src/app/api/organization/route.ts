import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedOrganizationId } from "@/lib/auth-context";

export async function GET() {
  try {
    const organizationId = await getAuthenticatedOrganizationId();
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { branches: { where: { active: true }, orderBy: { name: "asc" } } },
    });

    if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    return NextResponse.json(organization);
  } catch (error) {
    console.error("Organization lookup failed", error);
    return NextResponse.json({ error: "Unable to load organization" }, { status: 500 });
  }
}
