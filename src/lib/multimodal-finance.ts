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
  fields: ExtractedFinancialField[];
};

export type MultimodalExtractionRequest = {
  documentId: string;
  contentType: string;
  content: Uint8Array;
};

export interface MultimodalExtractionProvider {
  extract(request: MultimodalExtractionRequest): Promise<ExtractedFinancialData>;
}

export interface MultimodalExtractionService {
  extract(request: MultimodalExtractionRequest): Promise<ValidatedExtractedFinancialData>;
}

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
    if (!Number.isFinite(value) || value < 0) return null;
    const rounded = Math.round(value * 100);
    return Math.abs(value - rounded / 100) < Number.EPSILON * Math.max(1, Math.abs(value)) ? value : null;
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

    if (field.type !== "amount") return { ...field };

    const value = parseAmount(field.value);
    if (value === null) {
      throw new Error("Extracted amount must be a non-negative number with at most two decimal places");
    }

    return { ...field, value };
  });

  return { sourceId: input.sourceId.trim(), fields };
}

export function createMultimodalExtractionService(
  provider: MultimodalExtractionProvider,
): MultimodalExtractionService {
  return {
    async extract(request) {
      if (!request.documentId.trim()) throw new Error("documentId is required");
      if (!request.contentType.trim()) throw new Error("contentType is required");
      if (!(request.content instanceof Uint8Array) || request.content.byteLength === 0) {
        throw new Error("Document content is required");
      }

      const extracted = await provider.extract(request);
      return validateExtractedFinancialData(extracted);
    },
  };
}

function toMinorUnits(value: number): number {
  const minor = Math.round(value * 100);
  if (!Number.isSafeInteger(minor)) throw new Error("Extracted amount exceeds supported precision/range");
  return minor;
}

export function calculateExtractedAmounts(amounts: ExtractedAmount[]): DeterministicAmountResult {
  if (amounts.length === 0) throw new Error("At least one extracted amount is required");

  const currency = amounts[0].currency.trim();
  if (!currency) throw new Error("Extracted amounts require a currency");

  let totalMinorUnits = 0;
  for (const amount of amounts) {
    if (amount.currency.trim() !== currency) {
      throw new Error("All extracted amounts must use the same currency");
    }
    if (!Number.isFinite(amount.value) || amount.value < 0) {
      throw new Error("Extracted amounts must be finite and non-negative");
    }

    totalMinorUnits += toMinorUnits(amount.value);
    if (!Number.isSafeInteger(totalMinorUnits)) {
      throw new Error("Extracted amount total is outside supported numeric range");
    }
  }

  return { total: totalMinorUnits / 100, currency };
}
