// Aggregations for the admin dashboard (blueprint section 9).

import { prisma } from "./db";

export interface DashboardReport {
  totals: {
    leads: number;
    hot: number;
    warm: number;
    cold: number;
    duplicates: number;
    bound: number;
    avgScore: number;
    conversionRate: number; // bound / total
  };
  byProduct: { productType: string; count: number; avgScore: number }[];
  byStatus: { status: string; count: number }[];
  byTemperature: { temperature: string; count: number }[];
  bySource: { source: string; count: number; costPerLead: number | null }[];
  agentPerformance: {
    agentId: string;
    name: string;
    agency: string;
    assigned: number;
    bound: number;
    closeRate: number;
  }[];
}

export async function buildDashboardReport(): Promise<DashboardReport> {
  const leads = await prisma.lead.findMany({
    include: {
      outcome: true,
      campaign: true,
      assignedAgent: { include: { user: true, agency: true } },
    },
  });

  const total = leads.length;
  const hot = leads.filter((l) => l.temperature === "hot").length;
  const warm = leads.filter((l) => l.temperature === "warm").length;
  const cold = leads.filter((l) => l.temperature === "cold").length;
  const duplicates = leads.filter((l) => l.duplicateOf).length;
  const bound = leads.filter((l) => l.outcome?.bound).length;
  const avgScore = total ? Math.round(leads.reduce((s, l) => s + l.leadScore, 0) / total) : 0;

  const groupBy = <T>(items: T[], key: (t: T) => string) => {
    const m = new Map<string, T[]>();
    for (const it of items) {
      const k = key(it);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  };

  const byProductMap = groupBy(leads, (l) => l.productType);
  const byProduct = Array.from(byProductMap.entries())
    .map(([productType, ls]) => ({
      productType,
      count: ls.length,
      avgScore: Math.round(ls.reduce((s, l) => s + l.leadScore, 0) / ls.length),
    }))
    .sort((a, b) => b.count - a.count);

  const byStatusMap = groupBy(leads, (l) => l.leadStatus);
  const byStatus = Array.from(byStatusMap.entries())
    .map(([status, ls]) => ({ status, count: ls.length }))
    .sort((a, b) => b.count - a.count);

  const byTemperature = [
    { temperature: "hot", count: hot },
    { temperature: "warm", count: warm },
    { temperature: "cold", count: cold },
  ];

  const bySourceMap = groupBy(leads, (l) => l.campaign?.name ?? "Direct / unattributed");
  const bySource = Array.from(bySourceMap.entries())
    .map(([source, ls]) => ({
      source,
      count: ls.length,
      costPerLead: ls[0]?.campaign?.costPerLead ?? null,
    }))
    .sort((a, b) => b.count - a.count);

  const byAgentMap = groupBy(
    leads.filter((l) => l.assignedAgentId),
    (l) => l.assignedAgentId as string,
  );
  const agentPerformance = Array.from(byAgentMap.entries())
    .map(([agentId, ls]) => {
      const agent = ls[0].assignedAgent;
      const boundCount = ls.filter((l) => l.outcome?.bound).length;
      return {
        agentId,
        name: agent ? `${agent.user.firstName} ${agent.user.lastName}` : "Unknown",
        agency: agent?.agency?.name ?? "",
        assigned: ls.length,
        bound: boundCount,
        closeRate: ls.length ? Math.round((boundCount / ls.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.assigned - a.assigned);

  return {
    totals: {
      leads: total,
      hot,
      warm,
      cold,
      duplicates,
      bound,
      avgScore,
      conversionRate: total ? Math.round((bound / total) * 100) : 0,
    },
    byProduct,
    byStatus,
    byTemperature,
    bySource,
    agentPerformance,
  };
}
