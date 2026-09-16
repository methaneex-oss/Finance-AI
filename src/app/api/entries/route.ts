import { NextRequest, NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/organization";
import { createFinancialEntry, listFinancialEntries } from "@/lib/financial-entry-service";
import { validateEntryBody } from "@/lib/financial-entry-validation";

function parseDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = parseDate(searchParams.get("from"));
    const toDate = parseDate(searchParams.get("to"));
    if (fromDate === null) return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    if (toDate === null) return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    if (fromDate && toDate && fromDate > toDate) return NextResponse.json({ error: "from must be before to" }, { status: 400 });
    return NextResponse.json(await listFinancialEntries(getOrganizationId(), fromDate, toDate));
  } catch (error) {
    console.error("Entry lookup failed", error);
    return NextResponse.json({ error: "Unable to load financial entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validated = validateEntryBody(body);
    if (!validated) return NextResponse.json({ error: "Invalid financial entry" }, { status: 400 });
    const entry = await createFinancialEntry({ organizationId: getOrganizationId(), ...validated });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Financial entry creation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record financial entry" }, { status: 400 });
  }
}
