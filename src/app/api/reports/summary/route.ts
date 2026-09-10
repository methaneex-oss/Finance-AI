import { NextRequest, NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/organization";
import { getFinancialSummary } from "@/lib/accounting-engine-v2";

function dateOrNull(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = dateOrNull(searchParams.get("from"));
    const to = dateOrNull(searchParams.get("to"));
    if (from === null || to === null) return NextResponse.json({ error: "Invalid report date range" }, { status: 400 });
    if (from && to && from > to) return NextResponse.json({ error: "Report start date must be before end date" }, { status: 400 });

    const summary = await getFinancialSummary(getOrganizationId(), { from, to });
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Financial summary failed", error);
    return NextResponse.json({ error: "Unable to generate financial summary" }, { status: 500 });
  }
}
