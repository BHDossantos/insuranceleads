import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/leads/:id/outcome — upsert quote/bind outcome for ROI tracking.
// Body: { quotedPremium?, carrier?, policyType?, bound?, estimatedCommission?, lostReason? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const bound = Boolean(body.bound);
  const data = {
    quotedPremium: body.quotedPremium != null ? Number(body.quotedPremium) : null,
    carrier: body.carrier ?? null,
    policyType: body.policyType ?? null,
    bound,
    boundDate: bound ? new Date() : null,
    estimatedCommission: body.estimatedCommission != null ? Number(body.estimatedCommission) : null,
    lostReason: body.lostReason ?? null,
  };

  const outcome = await prisma.quoteOutcome.upsert({
    where: { leadId: lead.id },
    update: data,
    create: { leadId: lead.id, ...data },
  });

  // Reflect terminal outcomes in the pipeline stage.
  if (bound) {
    await prisma.lead.update({ where: { id: lead.id }, data: { leadStatus: "bound" } });
  } else if (body.lostReason) {
    await prisma.lead.update({ where: { id: lead.id }, data: { leadStatus: "lost" } });
  }

  return NextResponse.json(outcome, { status: 201 });
}
