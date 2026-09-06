import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID = process.env.FINANCE_AI_ORGANIZATION_ID ?? "demo-org";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitValue = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(Math.floor(limitValue), 1), 200) : 50;

  try {
    const logs = await prisma.auditLog.findMany({
      where: { organizationId: ORGANIZATION_ID },
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit lookup failed", error);
    return NextResponse.json({ error: "Unable to load audit history" }, { status: 500 });
  }
}
