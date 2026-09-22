export type ExtractionEvidence = {
  page?: number;
  region?: { x?: number; y?: number; width?: number; height?: number };
  text?: string;
};

export type ExtractedFinancialField = {
  type: string;
  value: string | number;
  currency?: string | null;
  confidence: number;
  evidence: ExtractionEvidence;
};

export type ExtractedFinancialData = {
  sourceId: string;
  fields: ExtractedFinancialField[];
};

export type ValidatedExtractedFinancialData = {
  sourceId: string;
  fields: Array<ExtractedFinancialField & { value: number }>;
};

export type ExtractedAmount = {
  value: number;
  currency: string;
};

export type DeterministicAmountResult = {
  total: number;
  currency: string;
};

function parseAmount(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function validateConfidence(confidence: number): void {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Extraction confidence must be between 0 and 1");
  }
}

export function validateExtractedFinancialData(
  input: ExtractedFinancialData,
): ValidatedExtractedFinancialData {
  if (!input.sourceId.trim()) throw new Error("Extraction sourceId is required");
  if (!Array.isArray(input.fields)) throw new Error("Extraction fields must be an array");

  const fields = input.fields.map((field) => {
    if (!field.type.trim()) throw new Error("Extraction field type is required");
    validateConfidence(field.confidence);

    const value = field.type === "amount" ? parseAmount(field.value) : field.value;
    if (field.type === "amount" && value === null) {
      throw new Error("Extracted amount must be a non-negative number with at most two decimal places");
    }

    return { ...field, value: value as number };
  });

  return { sourceId: input.sourceId.trim(), fields };
}

export function calculateExtractedAmounts(amounts: ExtractedAmount[]): DeterministicAmountResult {
  if (amounts.length === 0) throw new Error("At least one extracted amount is required");

  const currency = amounts[0].currency.trim();
  if (!currency) throw new Error("Extracted amounts require a currency");

  for (const amount of amounts) {
    if (amount.currency.trim() !== currency) {
      throw new Error("All extracted amounts must use the same currency");
    }
    if (!Number.isFinite(amount.value) || amount.value < 0) {
      throw new Error("Extracted amounts must be finite and non-negative");
    }
  }

  const total = amounts.reduce((sum, amount) => sum + amount.value, 0);
  if (!Number.isFinite(total)) throw new Error("Extracted amount total is outside supported numeric range");

  return { total, currency };
}
