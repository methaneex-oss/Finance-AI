import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "daily";
  const requestedDate = parseDate(searchParams.get("date"));

  if (searchParams.get("date") && !requestedDate) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (!["daily", "weekly", "monthly", "annual"].includes(period)) {
    return NextResponse.json({ error: "period must be daily, weekly, monthly, or annual" }, { status: 400 });
  }

  const anchor = startOfDay(requestedDate ?? new Date());
  let from = new Date(anchor);
  let to = addDays(anchor, 1);

  if (period === "weekly") {
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    from = addDays(anchor, -mondayOffset);
    to = addDays(from, 7);
  } else if (period === "monthly") {
    from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  } else if (period === "annual") {
    from = new Date(anchor.getFullYear(), 0, 1);
    to = new Date(anchor.getFullYear() + 1, 0, 1);
  }

  try {
    const organizationId = getOrganizationId();
    const entries = await prisma.financialEntry.findMany({
      where: {
        organizationId,
        status: "POSTED",
        entryDate: { gte: from, lt: to },
      },
      select: {
        id: true,
        entryDate: true,
        lines: {
          select: {
            amount: true,
            category: { select: { id: true, name: true, classification: true } },
          },
        },
      },
      orderBy: { entryDate: "asc" },
    });

    const totals = { INCOME: 0, EXPENSE: 0, FUND: 0 };
    const categories = new Map<string, { categoryId: string; name: string; classification: string; total: number }>();

    for (const entry of entries) {
      for (const line of entry.lines) {
        const amount = Number(line.amount);
        const classification = line.category.classification;
        totals[classification] += amount;
        const existing = categories.get(line.category.id) ?? {
          categoryId: line.category.id,
          name: line.category.name,
          classification,
          total: 0,
        };
        existing.total += amount;
        categories.set(line.category.id, existing);
      }
    }

    return NextResponse.json({
      organizationId,
      period,
      range: { from: from.toISOString(), to: to.toISOString() },
      entryCount: entries.length,
      totals,
      netIncome: totals.INCOME - totals.EXPENSE,
      categories: [...categories.values()].sort((a, b) => b.total - a.total),
    });
  } catch (error) {
    console.error("Report generation failed", error);
    return NextResponse.json({ error: "Unable to generate financial report" }, { status: 500 });
  }
}
