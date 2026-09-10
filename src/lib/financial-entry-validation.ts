export type RawEntryLine = { categoryId?: unknown; amount?: unknown; direction?: unknown };
export type ValidatedEntryLine = { categoryId: string; amount: number; direction: "INCREASE" | "DECREASE" };
export type ValidatedFinancialEntry = { entryDate: Date; description: string; reference: string | null; branchId: string | null; lines: ValidatedEntryLine[] };

export function parseEntryDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(value: unknown): number | null {
  if (!(typeof value === "number" || typeof value === "string")) return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function validateEntryBody(body: Record<string, unknown>): ValidatedFinancialEntry | null {
  const entryDate = parseEntryDate(body.entryDate);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const rawLines = Array.isArray(body.lines) ? body.lines as RawEntryLine[] : [];
  if (!entryDate || !description || rawLines.length === 0) return null;

  const lines = rawLines.map((line) => ({
    categoryId: typeof line.categoryId === "string" ? line.categoryId.trim() : "",
    amount: parseAmount(line.amount),
    direction: line.direction === "DECREASE" ? "DECREASE" as const : "INCREASE" as const,
  }));

  if (lines.some((line) => !line.categoryId || line.amount === null)) return null;
  return {
    entryDate,
    description,
    reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
    branchId: typeof body.branchId === "string" && body.branchId.trim() ? body.branchId.trim() : null,
    lines: lines as ValidatedEntryLine[],
  };
}
