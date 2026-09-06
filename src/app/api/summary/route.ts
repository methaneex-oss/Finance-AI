import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID = process.env.FINANCE_AI_ORGANIZATION_ID ?? "demo-org";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromValue = searchParams.get("from");
  const toValue = searchParams.get("to");
  const from = fromValue ? new Date(fromValue) : null;
  const to = toValue ? new Date(toValue) : null;

  if (fromValue && Number.isNaN(from?.getTime())) return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  if (toValue && Number.isNaN(to?.getTime())) return NextResponse.json({ error: "Invalid to date" }, { status: 400 });

  try {
    const entries = await prisma.financialEntry.findMany({
      where: {
        organizationId: ORGANIZATION_ID,
        status: "POSTED",
        ...(from || to ? { entryDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      select: { lines: { select: { amount: true, category: { select: { id: true, name: true, classification: true } } } } },
    });

    const totals = { INCOME: 0, EXPENSE: 0, FUND: 0 };
    const byCategory: Record<string, { categoryId: string; name: string; classification: string; total: number }> = {};

    for (const entry of entries) {
      for (const line of entry.lines) {
        const amount = Number(line.amount);
        totals[line.category.classification] += amount;
        const existing = byCategory[line.category.id] ?? { categoryId: line.category.id, name: line.category.name, classification: line.category.classification, total: 0 };
        existing.total += amount;
        byCategory[line.category.id] = existing;
      }
    }

    return NextResponse.json({
      organizationId: ORGANIZATION_ID,
      period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
      totals,
      netIncome: totals.INCOME - totals.EXPENSE,
      entryCount: entries.length,
      categories: Object.values(byCategory).sort((a, b) => b.total - a.total),
    });
  } catch (error) {
    console.error("Financial summary failed", error);
    return NextResponse.json({ error: "Unable to calculate financial summary" }, { status: 500 });
  }
}
