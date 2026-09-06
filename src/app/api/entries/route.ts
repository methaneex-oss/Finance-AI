import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID = process.env.FINANCE_AI_ORGANIZATION_ID ?? "demo-org";

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  if (searchParams.get("from") && !from) return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  if (searchParams.get("to") && !to) return NextResponse.json({ error: "Invalid to date" }, { status: 400 });

  try {
    const entries = await prisma.financialEntry.findMany({
      where: {
        organizationId: ORGANIZATION_ID,
        ...(from || to ? { entryDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { lines: { include: { category: true } }, branch: true },
      orderBy: { entryDate: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Entry lookup failed", error);
    return NextResponse.json({ error: "Unable to load financial entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const entryDate = parseDate(body.entryDate);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (!entryDate || !description || lines.length === 0) {
    return NextResponse.json({ error: "entryDate, description, and at least one line are required" }, { status: 400 });
  }

  const normalizedLines = lines.map((line: { categoryId?: unknown; amount?: unknown }) => ({
    categoryId: typeof line.categoryId === "string" ? line.categoryId : "",
    amount: typeof line.amount === "number" || typeof line.amount === "string" ? Number(line.amount) : NaN,
  }));

  if (normalizedLines.some((line) => !line.categoryId || !Number.isFinite(line.amount) || line.amount <= 0)) {
    return NextResponse.json({ error: "Every line requires a valid category and positive amount" }, { status: 400 });
  }

  try {
    const organization = await prisma.organization.findUnique({ where: { id: ORGANIZATION_ID }, select: { id: true } });
    if (!organization) return NextResponse.json({ error: "Organization is not configured" }, { status: 500 });

    const categoryIds = [...new Set(normalizedLines.map((line) => line.categoryId))];
    const categories = await prisma.financialCategory.findMany({
      where: { organizationId: ORGANIZATION_ID, id: { in: categoryIds }, active: true },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      return NextResponse.json({ error: "One or more categories are invalid or inactive for this organization" }, { status: 400 });
    }

    if (body.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: body.branchId, organizationId: ORGANIZATION_ID, active: true }, select: { id: true } });
      if (!branch) return NextResponse.json({ error: "Branch is invalid for this organization" }, { status: 400 });
    }

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.financialEntry.create({
        data: {
          organizationId: ORGANIZATION_ID,
          entryDate,
          description,
          reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
          branchId: body.branchId || null,
          lines: { create: normalizedLines.map((line) => ({ categoryId: line.categoryId, amount: String(line.amount) })) },
        },
        include: { lines: { include: { category: true } }, branch: true },
      });

      await tx.auditLog.create({
        data: {
          organizationId: ORGANIZATION_ID,
          action: "CREATE",
          entityType: "FinancialEntry",
          entityId: created.id,
          metadata: { description, lineCount: normalizedLines.length },
        },
      });

      return created;
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Financial entry creation failed", error);
    return NextResponse.json({ error: "Unable to record financial entry" }, { status: 500 });
  }
}
