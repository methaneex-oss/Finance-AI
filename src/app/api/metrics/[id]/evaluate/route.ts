import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { evaluateMetricFormula } from "@/lib/metric-engine";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const organizationId = getOrganizationId();
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));

    if (searchParams.get("from") && !from) return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    if (searchParams.get("to") && !to) return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    if (from && to && from >= to) return NextResponse.json({ error: "from must be before to" }, { status: 400 });

    const metric = await prisma.financialMetric.findFirst({
      where: { id, organizationId, active: true },
      include: { inputs: { include: { category: true } } },
    });
    if (!metric) return NextResponse.json({ error: "Metric not found" }, { status: 404 });

    const entries = await prisma.financialEntry.findMany({
      where: {
        organizationId,
        status: "POSTED",
        ...(from || to ? { entryDate: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
      },
      select: { lines: { select: { categoryId: true, amount: true } } },
    });

    const totals = new Map<string, number>();
    for (const entry of entries) {
      for (const line of entry.lines) totals.set(line.categoryId, (totals.get(line.categoryId) ?? 0) + Number(line.amount));
    }

    const inputs = metric.inputs.map((input) => ({ alias: input.alias, value: totals.get(input.categoryId) ?? 0 }));
    const result = evaluateMetricFormula(metric.formula, inputs);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { baseCurrency: true } });

    return NextResponse.json({
      metric: { id: metric.id, name: metric.name, description: metric.description, formula: metric.formula },
      inputs,
      result,
      currency: organization.baseCurrency,
      range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    });
  } catch (error) {
    console.error("Metric evaluation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to evaluate financial metric" }, { status: 400 });
  }
}
