import { buildDashboardReport } from "@/lib/reports";
import { PRODUCT_BY_SLUG } from "@/lib/products";
import { StatusBadge } from "@/components/badges";

export const dynamic = "force-dynamic";

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

export default async function AdminDashboard() {
  const r = await buildDashboardReport();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin dashboard</h1>
          <p className="text-sm text-slate-600">Lead quality, ROI, compliance & agent performance.</p>
        </div>
        <a href="/api/leads/export" className="btn-secondary">Export leads CSV</a>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total leads" value={r.totals.leads} />
        <Stat label="Hot leads" value={r.totals.hot} accent="text-red-600" />
        <Stat label="Avg score" value={r.totals.avgScore} />
        <Stat label="Conversion" value={`${r.totals.conversionRate}%`} accent="text-green-600" />
        <Stat label="Bound" value={r.totals.bound} accent="text-green-600" />
        <Stat label="Warm" value={r.totals.warm} accent="text-amber-600" />
        <Stat label="Cold" value={r.totals.cold} accent="text-sky-600" />
        <Stat label="Duplicates" value={r.totals.duplicates} accent="text-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Leads by product</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-1">Product</th><th>Count</th><th>Avg score</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.byProduct.map((p) => (
                <tr key={p.productType}>
                  <td className="py-2">{PRODUCT_BY_SLUG[p.productType]?.label ?? p.productType}</td>
                  <td>{p.count}</td>
                  <td>{p.avgScore}</td>
                </tr>
              ))}
              {r.byProduct.length === 0 && <tr><td className="py-3 text-slate-500" colSpan={3}>No data.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Leads by source</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-1">Source</th><th>Count</th><th>Cost/lead</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.bySource.map((s) => (
                <tr key={s.source}>
                  <td className="py-2">{s.source}</td>
                  <td>{s.count}</td>
                  <td>{s.costPerLead != null ? `$${s.costPerLead}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Pipeline</h2>
          <div className="flex flex-wrap gap-2">
            {r.byStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                <StatusBadge status={s.status} />
                <span className="text-sm font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Agent performance</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-1">Agent</th><th>Assigned</th><th>Bound</th><th>Close %</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.agentPerformance.map((a) => (
                <tr key={a.agentId}>
                  <td className="py-2">{a.name}<div className="text-xs text-slate-400">{a.agency}</div></td>
                  <td>{a.assigned}</td>
                  <td>{a.bound}</td>
                  <td>{a.closeRate}%</td>
                </tr>
              ))}
              {r.agentPerformance.length === 0 && <tr><td className="py-3 text-slate-500" colSpan={4}>No assignments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
