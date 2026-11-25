import Link from "next/link";
import { prisma } from "@/lib/db";
import { csvToList } from "@/lib/util";
import { PRODUCTS } from "@/lib/products";
import { US_STATES } from "@/lib/constants";
import AgentsManager from "./AgentsManager";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  const [agents, agencies] = await Promise.all([
    prisma.agent.findMany({
      include: { user: true, agency: true, _count: { select: { leads: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agency.findMany({ orderBy: { name: "asc" } }),
  ]);

  const initial = agents.map((a) => ({
    id: a.id,
    firstName: a.user.firstName,
    lastName: a.user.lastName,
    email: a.user.email,
    phone: a.user.phone ?? "",
    agencyId: a.agencyId,
    agencyName: a.agency?.name ?? "",
    licenseStates: csvToList(a.licenseStates),
    productsEnabled: csvToList(a.productsEnabled),
    capacityPerDay: a.capacityPerDay,
    routingWeight: a.routingWeight,
    status: a.status,
    leadCount: a._count.leads,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/admin" className="text-brand-700 hover:underline">Dashboard</Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium">Agents &amp; routing</span>
        <Link href="/admin/campaigns" className="ml-auto text-brand-700 hover:underline">Campaigns →</Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Agents &amp; routing rules</h1>
        <p className="text-sm text-slate-600">
          An agent&apos;s licensed states and enabled products <em>are</em> the routing rules — leads are
          matched to eligible agents by state, product, and daily capacity.
        </p>
      </div>
      <AgentsManager
        initialAgents={initial}
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        products={PRODUCTS.map((p) => ({ slug: p.slug, label: p.label }))}
        states={US_STATES}
      />
    </div>
  );
}
