import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

function dateRange(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new Error("Invalid date range");
  return { start, end };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const organizationId = getOrganizationId();
    const { id } = await context.params;
    const metric = await prisma.financialMetric.findFirst({
      where: { id, organizationId, active: true },
      include: { inputs: { include: { category: true } } },
    });
    if (!metric) return NextResponse.json({ error: "Metric not found" }, { status: 404 });

    const { start, end } = dateRange(request);
    const entries = await prisma.financialEntry.findMany({
      where: { organizationId, status: "POSTED", entryDate: { gte: start, lte: end } },
      include: { lines: { where: { categoryId: { in: metric.inputs.map((input) => input.categoryId) } }, select: { categoryId: true, amount: true } } },
    });

    const values = new Map(metric.inputs.map((input) => [input.alias, 0]));
    for (const entry of entries) {
      for (const line of entry.lines) {
        const input = metric.inputs.find((candidate) => candidate.categoryId === line.categoryId);
        if (input) values.set(input.alias, (values.get(input.alias) ?? 0) + Number(line.amount));
      }
    }

    const tokens = metric.formula.split(/\s+/).filter(Boolean);
    let result = values.get(tokens[0]) ?? 0;
    for (let i = 1; i < tokens.length; i += 2) {
      const operator = tokens[i];
      const operand = values.get(tokens[i + 1]);
      if (operand === undefined) throw new Error(`Metric formula references unknown alias: ${tokens[i + 1]}`);
      if (operator === "+") result += operand;
      else if (operator === "-") result -= operand;
      else throw new Error(`Unsupported metric operator: ${operator}`);
    }

    return NextResponse.json({ metric: { id: metric.id, name: metric.name, formula: metric.formula }, range: { from: start, to: end }, inputs: Object.fromEntries(values), result });
  } catch (error) {
    console.error("Metric evaluation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to evaluate financial metric" }, { status: 400 });
  }
}
