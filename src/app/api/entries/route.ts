import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_ORGANIZATION_ID = "demo-org";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const entries = await prisma.financialEntry.findMany({
    where: {
      organizationId: DEMO_ORGANIZATION_ID,
      ...(from || to ? { entryDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    },
    include: { lines: { include: { category: true } }, branch: true },
    orderBy: { entryDate: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const entryDate = new Date(body.entryDate);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (Number.isNaN(entryDate.getTime()) || !description || lines.length === 0) {
    return NextResponse.json({ error: "entryDate, description, and at least one line are required" }, { status: 400 });
  }

  try {
    const categoryIds = lines.map((line: { categoryId?: string }) => line.categoryId).filter(Boolean);
    const categories = await prisma.financialCategory.findMany({
      where: { organizationId: DEMO_ORGANIZATION_ID, id: { in: categoryIds } },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      return NextResponse.json({ error: "One or more categories are invalid for this organization" }, { status: 400 });
    }

    const entry = await prisma.$transaction(async tx => {
      const created = await tx.financialEntry.create({
        data: {
          organizationId: DEMO_ORGANIZATION_ID,
          entryDate,
          description,
          reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
          branchId: body.branchId || null,
          lines: {
            create: lines.map((line: { categoryId: string; amount: number | string }) => ({
              categoryId: line.categoryId,
              amount: String(line.amount),
            })),
          },
        },
        include: { lines: { include: { category: true } }, branch: true },
      });

      await tx.auditLog.create({
        data: {
          organizationId: DEMO_ORGANIZATION_ID,
          action: "CREATE",
          entityType: "FinancialEntry",
          entityId: created.id,
          metadata: { description, lineCount: lines.length },
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
