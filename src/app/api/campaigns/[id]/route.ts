import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateCampaign } from "@/lib/adminService";

export const dynamic = "force-dynamic";

// GET /api/campaigns/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { _count: { select: { leads: true } } },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

// PUT /api/campaigns/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  try {
    const campaign = await updateCampaign(params.id, body);
    return NextResponse.json(campaign);
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("not found") ? 404 : 422;
    return NextResponse.json({ error: msg }, { status });
  }
}
