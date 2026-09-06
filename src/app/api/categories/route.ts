import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID = process.env.FINANCE_AI_ORGANIZATION_ID ?? "demo-org";

export async function GET() {
  try {
    const categories = await prisma.financialCategory.findMany({
      where: { organizationId: ORGANIZATION_ID },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Category lookup failed", error);
    return NextResponse.json({ error: "Unable to load categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const classification = body.classification;

  if (!name || !["INCOME", "EXPENSE", "FUND"].includes(classification)) {
    return NextResponse.json({ error: "name and a valid classification are required" }, { status: 400 });
  }

  try {
    const organization = await prisma.organization.findUnique({ where: { id: ORGANIZATION_ID }, select: { id: true } });
    if (!organization) return NextResponse.json({ error: "Organization is not configured" }, { status: 500 });

    const category = await prisma.financialCategory.create({
      data: {
        organizationId: ORGANIZATION_ID,
        name,
        description: typeof body.description === "string" ? body.description.trim() || null : null,
        classification,
        active: body.active !== false,
        isTemporary: body.isTemporary === true,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Category creation failed", error);
    return NextResponse.json({ error: "Unable to create category" }, { status: 409 });
  }
}
