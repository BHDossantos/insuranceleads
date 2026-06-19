import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/leads/:id — full lead profile with related records.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      assignedAgent: { include: { user: true, agency: true } },
      agency: true,
      campaign: true,
      consent: true,
      outcome: true,
      activities: { orderBy: { createdAt: "desc" }, include: { agent: { include: { user: true } } } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json(lead);
}
