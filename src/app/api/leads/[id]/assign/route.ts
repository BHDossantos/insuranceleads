import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { routeLead } from "@/lib/routing";

// POST /api/leads/:id/assign  { agentId? }
// With agentId -> manual assignment. Without -> run the routing engine.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  let agentId: string | null = body.agentId ?? null;
  let agencyId: string | null = null;
  let reason = "";

  if (agentId) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    agencyId = agent.agencyId;
    reason = "Manual assignment.";
  } else {
    const routing = await routeLead({ productType: lead.productType, state: lead.state });
    agentId = routing.agentId;
    agencyId = routing.agencyId;
    reason = routing.reason;
  }

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { assignedAgentId: agentId, agencyId },
  });

  await prisma.activityLog.create({
    data: { leadId: lead.id, agentId, type: "assignment", notes: reason },
  });

  return NextResponse.json({ lead: updated, agentId, agencyId, reason });
}
