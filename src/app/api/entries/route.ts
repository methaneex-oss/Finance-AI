import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { createFinancialEntry, listFinancialEntries } from "@/lib/financial-entry-service";
import { validateEntryBody } from "@/lib/financial-entry-validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const parse = (value: string | null) => {
      if (!value) return undefined;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const fromDate = parse(from);
    const toDate = parse(to);
    if (fromDate === null) return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    if (toDate === null) return NextResponse.json({ error: "Invalid to date" }, { status: 400 });

    const entries = await listFinancialEntries(getOrganizationId(), fromDate, toDate);
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Entry lookup failed", error);
    return NextResponse.json({ error: "Unable to load financial entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validated = validateEntryBody(body);
    if (!validated) {
      return NextResponse.json({ error: "Invalid financial entry. Date, description, and at least one positive line are required." }, { status: 400 });
    }

    const organizationId = getOrganizationId();
    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!organization) return NextResponse.json({ error: "Organization is not configured" }, { status: 500 });

    const entry = await createFinancialEntry({ organizationId, ...validated });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Financial entry creation failed", error);
    return NextResponse.json({ error: "Unable to record financial entry" }, { status: 500 });
  }
}
