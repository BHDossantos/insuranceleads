// Lead routing engine (blueprint section 7).
//
// Matches a lead to an eligible agent by:
//   - state license
//   - product enablement
//   - agent availability (status + daily capacity)
//   - routing weight (performance/priority bias)
// Tie-break with weighted round-robin: prefer agents with the most remaining
// capacity relative to their weight, so higher-weight agents get more leads.

import { prisma } from "./db";
import { csvToList } from "./util";

export interface RoutingResult {
  agentId: string | null;
  agencyId: string | null;
  reason: string;
  candidatesConsidered: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function routeLead(params: {
  productType: string;
  state: string;
}): Promise<RoutingResult> {
  const { productType, state } = params;

  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    include: { agency: true },
  });

  // Count today's assignments per agent for capacity enforcement.
  const since = startOfToday();
  const todaysLeads = await prisma.lead.groupBy({
    by: ["assignedAgentId"],
    where: { createdAt: { gte: since }, assignedAgentId: { not: null } },
    _count: { _all: true },
  });
  const assignedToday = new Map<string, number>();
  for (const row of todaysLeads) {
    if (row.assignedAgentId) assignedToday.set(row.assignedAgentId, row._count._all);
  }

  const eligible = agents.filter((a) => {
    const states = csvToList(a.licenseStates).map((s) => s.toUpperCase());
    const products = csvToList(a.productsEnabled);
    const licensed = states.length === 0 || states.includes(state.toUpperCase());
    const enabled = products.length === 0 || products.includes(productType);
    const used = assignedToday.get(a.id) ?? 0;
    const hasCapacity = used < a.capacityPerDay;
    return licensed && enabled && hasCapacity && a.agency?.status === "active";
  });

  if (eligible.length === 0) {
    return {
      agentId: null,
      agencyId: null,
      reason: `No eligible agent for ${productType} in ${state} (license/product/capacity).`,
      candidatesConsidered: agents.length,
    };
  }

  // Weighted least-loaded: load = usedToday / routingWeight. Lowest wins.
  eligible.sort((a, b) => {
    const la = (assignedToday.get(a.id) ?? 0) / Math.max(1, a.routingWeight);
    const lb = (assignedToday.get(b.id) ?? 0) / Math.max(1, b.routingWeight);
    if (la !== lb) return la - lb;
    return b.routingWeight - a.routingWeight; // higher weight breaks ties
  });

  const chosen = eligible[0];
  return {
    agentId: chosen.id,
    agencyId: chosen.agencyId,
    reason: `Routed to ${chosen.agency?.name ?? "agency"} — licensed in ${state}, ${productType} enabled.`,
    candidatesConsidered: eligible.length,
  };
}
