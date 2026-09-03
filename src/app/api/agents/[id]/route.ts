import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateAgent } from "@/lib/adminService";

export const dynamic = "force-dynamic";

// GET /api/agents/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    include: { user: true, agency: true, _count: { select: { leads: true } } },
  });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json(agent);
}

// PUT /api/agents/:id — update agent + backing user fields.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  try {
    const agent = await updateAgent(params.id, body);
    return NextResponse.json(agent);
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("not found") ? 404 : 422;
    return NextResponse.json({ error: msg }, { status });
  }
}
