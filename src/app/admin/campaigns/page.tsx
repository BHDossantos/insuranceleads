import Link from "next/link";
import { prisma } from "@/lib/db";
import CampaignsManager from "./CampaignsManager";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });

  const initial = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel ?? "",
    source: c.source ?? "",
    utmSource: c.utmSource ?? "",
    utmMedium: c.utmMedium ?? "",
    utmCampaign: c.utmCampaign ?? "",
    budget: c.budget ?? undefined,
    costPerLead: c.costPerLead ?? undefined,
    status: c.status,
    leadCount: c._count.leads,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/admin" className="text-brand-700 hover:underline">Dashboard</Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium">Campaigns</span>
        <Link href="/admin/agents" className="ml-auto text-brand-700 hover:underline">← Agents</Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-sm text-slate-600">Lead sources and their cost-per-lead, used for ROI reporting.</p>
      </div>
      <CampaignsManager initialCampaigns={initial} />
    </div>
  );
}
