import { NextRequest, NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/organization";
import { reverseFinancialEntry } from "@/lib/accounting-engine-v2";
import { financialErrorResponse } from "@/lib/financial-errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : "";
    const result = await reverseFinancialEntry(getOrganizationId(), id, reason);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const failure = financialErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
