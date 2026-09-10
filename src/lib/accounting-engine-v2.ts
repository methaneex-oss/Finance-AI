import { prisma } from "@/lib/prisma";
import { FinancialConflictError, FinancialNotFoundError } from "@/lib/financial-errors";

function toCents(value: unknown): bigint {
  const text = String(value).trim();
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole || "0") * 100n + BigInt(`${fraction}00`.slice(0, 2));
  return negative ? -cents : cents;
}

function fromCents(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export type Period = { from?: Date; to?: Date };
export type CategoryBalance = { id: string; name: string; classification: string; balance: string };

export function calculateSummaryFromCategories(categories: CategoryBalance[]) {
  let income = 0n;
  let expenses = 0n;
  let funds = 0n;
  for (const category of categories) {
    const cents = toCents(category.balance);
    if (category.classification === "INCOME") income += cents;
    if (category.classification === "EXPENSE") expenses += cents;
    if (category.classification === "FUND") funds += cents;
  }
  return { income: fromCents(income), expenses: fromCents(expenses), funds: fromCents(funds), netOperatingResult: fromCents(income - expenses) };
}

export async function getCategoryBalances(organizationId: string, period: Period = {}) {
  const entries = await prisma.financialEntry.findMany({
    where: { organizationId, status: "POSTED", ...(period.from || period.to ? { entryDate: { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) } } : {}) },
    select: { lines: { select: { amount: true, direction: true, category: { select: { id: true, name: true, classification: true } } } } },
  });

  const balances = new Map<string, { id: string; name: string; classification: string; cents: bigint }>();
  for (const entry of entries) {
    for (const line of entry.lines) {
      const current = balances.get(line.category.id) ?? { id: line.category.id, name: line.category.name, classification: line.category.classification, cents: 0n };
      const amount = toCents(line.amount);
      current.cents += line.direction === "DECREASE" ? -amount : amount;
      balances.set(line.category.id, current);
    }
  }

  return [...balances.values()].map(({ cents, ...balance }) => ({ ...balance, balance: fromCents(cents) }));
}

export async function getFinancialSummary(organizationId: string, period: Period = {}) {
  const categories = await getCategoryBalances(organizationId, period);
  return { ...calculateSummaryFromCategories(categories), categories };
}

export async function voidFinancialEntry(organizationId: string, entryId: string, reason: string) {
  const cleanReason = reason.trim();
  if (!cleanReason) throw new FinancialConflictError("A reason is required to void a financial entry");
  return prisma.$transaction(async (tx) => {
    const entry = await tx.financialEntry.findFirst({ where: { id: entryId, organizationId }, select: { id: true, status: true } });
    if (!entry) throw new FinancialNotFoundError("Financial entry not found");
    if (entry.status === "VOIDED") throw new FinancialConflictError("Financial entry is already voided");
    const updated = await tx.financialEntry.update({ where: { id: entryId }, data: { status: "VOIDED", voidReason: cleanReason, voidedAt: new Date() }, include: { lines: { include: { category: true } } } });
    await tx.auditLog.create({ data: { organizationId, action: "VOID", entityType: "FinancialEntry", entityId: entryId, metadata: { reason: cleanReason } } });
    return updated;
  });
}
