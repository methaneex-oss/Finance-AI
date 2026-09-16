import { prisma } from "@/lib/prisma";
import { FinancialNotFoundError, FinancialValidationError } from "@/lib/financial-errors";

export type TransferInput = {
  organizationId: string;
  entryDate: Date;
  description: string;
  reference: string | null;
  branchId: string | null;
  fromCategoryId: string;
  toCategoryId: string;
  amount: string;
};

export async function createFinancialTransfer(input: TransferInput) {
  const description = input.description.trim();
  if (!description) throw new FinancialValidationError("Transfer description is required");
  if (input.fromCategoryId === input.toCategoryId) throw new FinancialValidationError("Transfer source and destination must be different categories");
  if (!/^\d+(\.\d{1,2})?$/.test(input.amount) || Number(input.amount) <= 0) throw new FinancialValidationError("Transfer amount must be a positive value with at most two decimal places");

  const categories = await prisma.financialCategory.findMany({
    where: { organizationId: input.organizationId, active: true, id: { in: [input.fromCategoryId, input.toCategoryId] } },
    select: { id: true },
  });
  if (categories.length !== 2) throw new FinancialNotFoundError("Transfer categories must both exist and be active for this organization");

  if (input.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, organizationId: input.organizationId, active: true }, select: { id: true } });
    if (!branch) throw new FinancialNotFoundError("Transfer branch is invalid for this organization");
  }

  return prisma.$transaction(async (tx) => {
    const entry = await tx.financialEntry.create({
      data: {
        organizationId: input.organizationId,
        branchId: input.branchId,
        entryDate: input.entryDate,
        description,
        reference: input.reference?.trim() || null,
        lines: {
          create: [
            { categoryId: input.fromCategoryId, amount: input.amount, direction: "DECREASE" },
            { categoryId: input.toCategoryId, amount: input.amount, direction: "INCREASE" },
          ],
        },
      },
      include: { lines: { include: { category: true } }, branch: true },
    });

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        action: "TRANSFER",
        entityType: "FinancialEntry",
        entityId: entry.id,
        metadata: { fromCategoryId: input.fromCategoryId, toCategoryId: input.toCategoryId, amount: input.amount },
      },
    });

    return entry;
  });
}
