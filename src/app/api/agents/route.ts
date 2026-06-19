import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/agents — list agents with their agency + open lead counts.
export async function GET() {
  const agents = await prisma.agent.findMany({
    include: {
      user: true,
      agency: true,
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ count: agents.length, agents });
}
