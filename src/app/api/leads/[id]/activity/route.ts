import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const TYPES = ["call", "sms", "email", "note", "system"];

// POST /api/leads/:id/activity  { type, notes, agentId? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "note");
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: `Invalid type. Allowed: ${TYPES.join(", ")}` }, { status: 422 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const activity = await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      agentId: body.agentId ?? lead.assignedAgentId,
      type,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
