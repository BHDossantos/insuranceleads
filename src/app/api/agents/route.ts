import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAgent } from "@/lib/adminService";

// Querying the DB at request time — never prerender at build.
export const dynamic = "force-dynamic";

// GET /api/agents — list agents with their agency + lead counts.
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

// POST /api/agents — create an agent (and its backing user).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  try {
    const agent = await createAgent(body);
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
