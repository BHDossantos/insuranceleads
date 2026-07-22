import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const STAGES = [
  "new",
  "contacted",
  "quoted",
  "follow_up",
  "bound",
  "lost",
  "invalid",
  "do_not_contact",
];

// PUT /api/leads/:id/status  { status, notes? }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const status = String(body.status ?? "");
  if (!STAGES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${STAGES.join(", ")}` }, { status: 422 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updated = await prisma.lead.update({
    where: { id: params.id },
    data: { leadStatus: status },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      agentId: lead.assignedAgentId,
      type: "status_change",
      notes: `Status: ${lead.leadStatus} → ${status}${body.notes ? ` — ${body.notes}` : ""}`,
    },
  });

  // Honor do-not-contact / opt-outs by adding to suppression list.
  if (status === "do_not_contact") {
    await prisma.suppression.upsert({
      where: { channel_value: { channel: "email", value: lead.email } },
      update: {},
      create: { channel: "email", value: lead.email, reason: "do_not_contact" },
    });
    await prisma.suppression.upsert({
      where: { channel_value: { channel: "sms", value: lead.phone } },
      update: {},
      create: { channel: "sms", value: lead.phone, reason: "do_not_contact" },
    });
  }

  return NextResponse.json(updated);
}
