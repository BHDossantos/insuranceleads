import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const TASK_TYPES = ["call", "send_quote", "follow_up", "renewal", "missing_info"];

// POST /api/leads/:id/tasks  { title, type?, dueAt?, agentId? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  if (!body.title) return NextResponse.json({ error: "title is required" }, { status: 422 });
  const type = String(body.type ?? "follow_up");
  if (!TASK_TYPES.includes(type)) {
    return NextResponse.json({ error: `Invalid type. Allowed: ${TASK_TYPES.join(", ")}` }, { status: 422 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      leadId: lead.id,
      agentId: body.agentId ?? lead.assignedAgentId,
      title: String(body.title),
      type,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
