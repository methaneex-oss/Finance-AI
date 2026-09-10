import { prisma } from "@/lib/prisma";

export type CreateFinancialEntryInput = {
  organizationId: string;
  entryDate: Date;
  description: string;
  reference: string | null;
  branchId: string | null;
  lines: Array<{ categoryId: string; amount: number; direction: "INCREASE" | "DECREASE" }>;
};

export async function createFinancialEntry(input: CreateFinancialEntryInput) {
  const categoryIds = [...new Set(input.lines.map((line) => line.categoryId))];
  const categories = await prisma.financialCategory.findMany({ where: { organizationId: input.organizationId, id: { in: categoryIds }, active: true }, select: { id: true } });
  if (categories.length !== categoryIds.length) throw new Error("One or more categories are invalid or inactive for this organization");

  if (input.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, organizationId: input.organizationId, active: true }, select: { id: true } });
    if (!branch) throw new Error("Branch is invalid for this organization");
  }

  return prisma.$transaction(async (tx) => {
    const entry = await tx.financialEntry.create({
      data: { organizationId: input.organizationId, entryDate: input.entryDate, description: input.description, reference: input.reference, branchId: input.branchId, lines: { create: input.lines.map((line) => ({ categoryId: line.categoryId, amount: String(line.amount), direction: line.direction })) } },
      include: { lines: { include: { category: true } }, branch: true },
    });
    await tx.auditLog.create({ data: { organizationId: input.organizationId, action: "CREATE", entityType: "FinancialEntry", entityId: entry.id, metadata: { description: input.description, lineCount: input.lines.length } } });
    return entry;
  });
}

export async function listFinancialEntries(organizationId: string, from?: Date, to?: Date) {
  return prisma.financialEntry.findMany({ where: { organizationId, ...(from || to ? { entryDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }, include: { lines: { include: { category: true } }, branch: true }, orderBy: { entryDate: "desc" } });
}
