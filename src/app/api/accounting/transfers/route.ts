import { NextRequest, NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/organization";
import { createFinancialTransfer } from "@/lib/financial-transfer-service";
import { financialErrorResponse } from "@/lib/financial-errors";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const entryDate = typeof body.entryDate === "string" ? new Date(body.entryDate) : new Date(Number.NaN);
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const fromCategoryId = typeof body.fromCategoryId === "string" ? body.fromCategoryId.trim() : "";
    const toCategoryId = typeof body.toCategoryId === "string" ? body.toCategoryId.trim() : "";
    const amount = typeof body.amount === "string" ? body.amount.trim() : typeof body.amount === "number" ? String(body.amount) : "";

    if (Number.isNaN(entryDate.getTime()) || !description || !fromCategoryId || !toCategoryId || !amount) {
      return NextResponse.json({ error: "entryDate, description, source category, destination category, and amount are required" }, { status: 400 });
    }
    if (fromCategoryId === toCategoryId) return NextResponse.json({ error: "Source and destination categories must differ" }, { status: 400 });
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return NextResponse.json({ error: "Amount must be a positive value with at most two decimal places" }, { status: 400 });

    const entry = await createFinancialTransfer({
      organizationId: getOrganizationId(), entryDate, description, reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
      branchId: typeof body.branchId === "string" && body.branchId.trim() ? body.branchId.trim() : null, fromCategoryId, toCategoryId, amount,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const failure = financialErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
