import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

const VALID_CLASSIFICATIONS = ["INCOME", "EXPENSE", "FUND"] as const;

type Classification = (typeof VALID_CLASSIFICATIONS)[number];

function parseOptionalDate(value: unknown): Date | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

export async function GET() {
  try {
    const organizationId = getOrganizationId();
    const categories = await prisma.financialCategory.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Category lookup failed", error);
    return NextResponse.json({ error: "Unable to load categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const classification = body.classification;
  const startsAt = parseOptionalDate(body.startsAt);
  const endsAt = parseOptionalDate(body.endsAt);

  if (!name || !VALID_CLASSIFICATIONS.includes(classification as Classification)) {
    return NextResponse.json({ error: "name and a valid classification are required" }, { status: 400 });
  }
  if (startsAt === "invalid" || endsAt === "invalid") {
    return NextResponse.json({ error: "startsAt and endsAt must be valid dates" }, { status: 400 });
  }
  if (startsAt && endsAt && startsAt > endsAt) {
    return NextResponse.json({ error: "endsAt cannot be earlier than startsAt" }, { status: 400 });
  }

  try {
    const organizationId = getOrganizationId();
    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!organization) return NextResponse.json({ error: "Organization is not configured" }, { status: 500 });

    const category = await prisma.financialCategory.create({
      data: {
        organizationId,
        name,
        description: typeof body.description === "string" ? body.description.trim() || null : null,
        classification: classification as Classification,
        active: body.active !== false,
        isTemporary: body.isTemporary === true,
        startsAt: startsAt as Date | null,
        endsAt: endsAt as Date | null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Category creation failed", error);
    return NextResponse.json({ error: "Unable to create category" }, { status: 409 });
  }
}
