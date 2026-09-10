import { NextRequest, NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/organization";
import { getFinancialSummary } from "@/lib/accounting-engine";

function parseDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    if (from && to && from > to) return NextResponse.json({ error: "from cannot be after to" }, { status: 400 });

    const summary = await getFinancialSummary(getOrganizationId(), { from, to });
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Accounting summary failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to calculate accounting summary" }, { status: 400 });
  }
}
