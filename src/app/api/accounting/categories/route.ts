import { NextRequest, NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/organization";
import { getCategoryBalances } from "@/lib/accounting-engine-v2";
import { financialErrorResponse } from "@/lib/financial-errors";

function date(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = date(searchParams.get("from"));
    const to = date(searchParams.get("to"));
    if (from && to && from > to) return NextResponse.json({ error: "from must be before to" }, { status: 400 });
    return NextResponse.json(await getCategoryBalances(getOrganizationId(), { from, to }));
  } catch (error) {
    const failure = financialErrorResponse(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
