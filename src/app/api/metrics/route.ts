import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";

const allowedOperators = new Set(["+", "-"]);

type MetricInput = { alias: string; categoryId: string };

function parseFormula(formula: string, aliases: Set<string>) {
  const tokens = formula.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens.length % 2 === 0) throw new Error("Formula must alternate aliases and + or - operators");
  for (let i = 0; i < tokens.length; i += 2) {
    if (!aliases.has(tokens[i])) throw new Error(`Unknown formula alias: ${tokens[i]}`);
    if (i + 1 < tokens.length && !allowedOperators.has(tokens[i + 1])) throw new Error(`Unsupported operator: ${tokens[i + 1]}`);
  }
}

export async function GET() {
  try {
    const organizationId = getOrganizationId();
    const metrics = await prisma.financialMetric.findMany({
      where: { organizationId, active: true },
      include: { inputs: { include: { category: true }, orderBy: { alias: "asc" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Metric lookup failed", error);
    return NextResponse.json({ error: "Unable to load financial metrics" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const organizationId = getOrganizationId();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() || null : null;
    const formula = typeof body.formula === "string" ? body.formula.trim() : "";
    const inputs = Array.isArray(body.inputs) ? body.inputs : [];

    if (!name || !formula || !inputs.length) return NextResponse.json({ error: "Name, formula, and at least one input are required" }, { status: 400 });

    const normalizedInputs: MetricInput[] = inputs.map((input: unknown) => {
      if (!input || typeof input !== "object") throw new Error("Invalid metric input");
      const value = input as Record<string, unknown>;
      const alias = typeof value.alias === "string" ? value.alias.trim() : "";
      const categoryId = typeof value.categoryId === "string" ? value.categoryId : "";
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(alias) || !categoryId) throw new Error("Each input needs a valid alias and categoryId");
      return { alias, categoryId };
    });

    const aliases = new Set<string>(normalizedInputs.map((input) => input.alias));
    if (aliases.size !== normalizedInputs.length) throw new Error("Metric input aliases must be unique");
    parseFormula(formula, aliases);

    const categoryIds: string[] = [...new Set(normalizedInputs.map((input) => input.categoryId))];
    const categories = await prisma.financialCategory.findMany({ where: { organizationId, id: { in: categoryIds }, active: true }, select: { id: true } });
    if (categories.length !== categoryIds.length) return NextResponse.json({ error: "One or more metric inputs are not valid active categories for this organization" }, { status: 400 });

    const metric = await prisma.$transaction(async (tx) => {
      const created = await tx.financialMetric.create({ data: { organizationId, name, description, formula, inputs: { create: normalizedInputs } }, include: { inputs: { include: { category: true } } } });
      await tx.auditLog.create({ data: { organizationId, action: "CREATE", entityType: "FinancialMetric", entityId: created.id, metadata: { name, formula } } });
      return created;
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    console.error("Metric creation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create financial metric" }, { status: 400 });
  }
}
