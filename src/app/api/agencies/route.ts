import { requireOperator } from "@/lib/operatorAccess";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/agencies — list agencies (used by the agent form + routing config).
export async function GET(req: Request) {
  const denied = requireOperator(req);
  if (denied) return denied;
  const agencies = await prisma.agency.findMany({
    include: { _count: { select: { agents: true, leads: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ count: agencies.length, agencies });
}
