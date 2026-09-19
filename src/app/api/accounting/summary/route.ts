import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedOrganizationId } from "@/lib/auth-context";
import { getFinancialSummary } from "@/lib/accounting-engine-v2";
import { financialErrorResponse } from "@/lib/financial-errors";

function parseDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    if (searchParams.get("from") && !from) return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    if (searchParams.get("to") && !to) return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    if (from && to && from > to) return NextResponse.json({ error: "from cannot be after to" }, { status: 400 });
    const organizationId = await getAuthenticatedOrganizationId();
    return NextResponse.json(await getFinancialSummary(organizationId, { from: from ?? undefined, to: to ?? undefined }));
  } catch (error) {
    console.error("Accounting summary failed", error);
    const result = financialErrorResponse(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
