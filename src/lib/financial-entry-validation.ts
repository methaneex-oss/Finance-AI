export type RawEntryLine = { categoryId?: unknown; amount?: unknown };

export type ValidatedEntryLine = { categoryId: string; amount: number };

export type ValidatedFinancialEntry = {
  entryDate: Date;
  description: string;
  reference: string | null;
  branchId: string | null;
  lines: ValidatedEntryLine[];
};

export function parseEntryDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateEntryBody(body: Record<string, unknown>): ValidatedFinancialEntry | null {
  const entryDate = parseEntryDate(body.entryDate);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const rawLines = Array.isArray(body.lines) ? body.lines as RawEntryLine[] : [];

  if (!entryDate || !description || rawLines.length === 0) return null;

  const lines = rawLines.map((line) => ({
    categoryId: typeof line.categoryId === "string" ? line.categoryId.trim() : "",
    amount: typeof line.amount === "number" || typeof line.amount === "string" ? Number(line.amount) : Number.NaN,
  }));

  if (lines.some((line) => !line.categoryId || !Number.isFinite(line.amount) || line.amount <= 0)) return null;

  return {
    entryDate,
    description,
    reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
    branchId: typeof body.branchId === "string" && body.branchId.trim() ? body.branchId.trim() : null,
    lines,
  };
}
