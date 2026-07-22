import Link from "next/link";
import { prisma } from "@/lib/db";
import { TemperatureBadge, ScoreBadge, StatusBadge, STATUS_LABELS } from "@/components/badges";
import { PRODUCT_BY_SLUG } from "@/lib/products";

export const dynamic = "force-dynamic";

const PIPELINE = ["new", "contacted", "quoted", "follow_up", "bound", "lost"];

export default async function AgentDashboard({
  searchParams,
}: {
  searchParams: { temperature?: string; status?: string; product?: string };
}) {
  const where: Record<string, unknown> = {};
  if (searchParams.temperature) where.temperature = searchParams.temperature;
  if (searchParams.status) where.leadStatus = searchParams.status;
  if (searchParams.product) where.productType = searchParams.product;

  const [leads, statusCounts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { assignedAgent: { include: { user: true } }, agency: true },
    }),
    prisma.lead.groupBy({ by: ["leadStatus"], _count: { _all: true } }),
  ]);

  const countFor = (s: string) => statusCounts.find((c) => c.leadStatus === s)?._count._all ?? 0;
  const hotCount = await prisma.lead.count({ where: { temperature: "hot" } });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agent dashboard</h1>
          <p className="text-sm text-slate-600">Your lead inbox, sorted by score. Hottest leads first.</p>
        </div>
        <a href="/api/leads/export" className="btn-secondary">Export CSV</a>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link
          href="/agent?temperature=hot"
          className="card flex flex-col items-start gap-1 transition hover:shadow-md"
        >
          <span className="text-xs font-medium uppercase text-slate-500">Hot leads</span>
          <span className="text-2xl font-bold text-red-600">{hotCount}</span>
        </Link>
        {PIPELINE.map((s) => (
          <Link key={s} href={`/agent?status=${s}`} className="card flex flex-col items-start gap-1 transition hover:shadow-md">
            <span className="text-xs font-medium uppercase text-slate-500">{STATUS_LABELS[s]}</span>
            <span className="text-2xl font-bold">{countFor(s)}</span>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/agent" className="btn-secondary">All</Link>
        <Link href="/agent?temperature=hot" className="btn-secondary">Hot</Link>
        <Link href="/agent?temperature=warm" className="btn-secondary">Warm</Link>
        <Link href="/agent?temperature=cold" className="btn-secondary">Cold</Link>
      </div>

      {/* Leads table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={l.leadScore} />
                    <TemperatureBadge temperature={l.temperature} />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/agent/leads/${l.id}`} className="text-brand-700 hover:underline">
                    {l.firstName} {l.lastName}
                  </Link>
                  {l.duplicateOf && <span className="ml-2 badge bg-amber-100 text-amber-700">dup</span>}
                </td>
                <td className="px-4 py-3">{PRODUCT_BY_SLUG[l.productType]?.label ?? l.productType}</td>
                <td className="px-4 py-3">{l.state}</td>
                <td className="px-4 py-3"><StatusBadge status={l.leadStatus} /></td>
                <td className="px-4 py-3 text-slate-600">{l.agency?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{l.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No leads found. Run <code className="rounded bg-slate-100 px-1">npm run db:seed</code> to load demo data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
