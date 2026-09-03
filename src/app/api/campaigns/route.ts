import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createCampaign } from "@/lib/adminService";

export const dynamic = "force-dynamic";

// GET /api/campaigns — list campaigns with lead counts.
export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ count: campaigns.length, campaigns });
}

// POST /api/campaigns — create a campaign.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  try {
    const campaign = await createCampaign(body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}
