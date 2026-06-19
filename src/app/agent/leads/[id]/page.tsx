import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TemperatureBadge, ScoreBadge, StatusBadge } from "@/components/badges";
import { PRODUCT_BY_SLUG, getProduct } from "@/lib/products";
import { safeJson } from "@/lib/util";
import LeadActions from "./LeadActions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
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

  if (!lead) notFound();

  const details = safeJson<Record<string, unknown>>(lead.details, {});
  const breakdown = safeJson<Record<string, number>>(lead.scoreBreakdown, {});
  const product = getProduct(lead.productType);

  const factorLabels: Record<string, string> = {
    intent: "Intent / urgency",
    completeness: "Form completeness",
    coverageFit: "Coverage fit",
    contactQuality: "Contact quality",
    geoFit: "Geographic fit",
    insuranceStatus: "Insurance status",
    fraudRisk: "Fraud / dup risk",
  };

  return (
    <div className="space-y-6">
      <Link href="/agent" className="text-sm text-brand-700 hover:underline">← Back to dashboard</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            {lead.firstName} {lead.lastName}
            <ScoreBadge score={lead.leadScore} />
            <TemperatureBadge temperature={lead.temperature} />
            <StatusBadge status={lead.leadStatus} />
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {PRODUCT_BY_SLUG[lead.productType]?.label ?? lead.productType} · {lead.state}
            {lead.zip ? ` ${lead.zip}` : ""} · Created {lead.createdAt.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${lead.phone}`} className="btn-primary">Call</a>
          <a href={`sms:${lead.phone}`} className="btn-secondary">Text</a>
          <a href={`mailto:${lead.email}`} className="btn-secondary">Email</a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: profile */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card space-y-3">
            <h2 className="font-semibold">Contact</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Email</dt><dd>{lead.email}</dd>
              <dt className="text-slate-500">Phone</dt><dd>{lead.phone}</dd>
              <dt className="text-slate-500">Assigned agent</dt>
              <dd>{lead.assignedAgent ? `${lead.assignedAgent.user.firstName} ${lead.assignedAgent.user.lastName}` : "Unassigned"}</dd>
              <dt className="text-slate-500">Agency</dt><dd>{lead.agency?.name ?? "—"}</dd>
              <dt className="text-slate-500">Source</dt><dd>{lead.campaign?.name ?? "Direct"}</dd>
            </dl>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Quote request details</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              {product?.fields.map((f) => {
                const v = details[f.name];
                if (v === undefined || v === null || v === "") return null;
                return (
                  <div key={f.name} className="contents">
                    <dt className="text-slate-500">{f.label}</dt>
                    <dd>{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Activity timeline */}
          <div className="card space-y-3">
            <h2 className="font-semibold">Activity timeline</h2>
            <ul className="space-y-3">
              {lead.activities.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="badge bg-slate-100 text-slate-600">{a.type}</span>
                  <div>
                    <div className="text-slate-700">{a.notes}</div>
                    <div className="text-xs text-slate-400">
                      {a.createdAt.toLocaleString()}
                      {a.agent && ` · ${a.agent.user.firstName} ${a.agent.user.lastName}`}
                    </div>
                  </div>
                </li>
              ))}
              {lead.activities.length === 0 && <li className="text-sm text-slate-500">No activity yet.</li>}
            </ul>
          </div>
        </div>

        {/* Right: actions, score, consent, tasks */}
        <div className="space-y-6">
          <LeadActions leadId={lead.id} currentStatus={lead.leadStatus} />

          <div className="card space-y-3">
            <h2 className="font-semibold">Score breakdown</h2>
            <ul className="space-y-1 text-sm">
              {Object.entries(breakdown).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-slate-600">{factorLabels[k] ?? k}</span>
                  <span className="font-medium">{v}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                <span>Total</span><span>{lead.leadScore}</span>
              </li>
            </ul>
          </div>

          <div className="card space-y-2">
            <h2 className="font-semibold">Tasks</h2>
            <ul className="space-y-2 text-sm">
              {lead.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span>{t.title}</span>
                  <span className="badge bg-slate-100 text-slate-600">{t.status}</span>
                </li>
              ))}
              {lead.tasks.length === 0 && <li className="text-slate-500">No tasks.</li>}
            </ul>
          </div>

          {/* Consent / compliance */}
          <div className="card space-y-2">
            <h2 className="font-semibold">Consent record</h2>
            {lead.consent ? (
              <dl className="grid grid-cols-2 gap-y-1 text-xs">
                <dt className="text-slate-500">Agency named</dt><dd>{lead.consent.agencyName}</dd>
                <dt className="text-slate-500">TCPA</dt><dd>{lead.consent.tcpaConsent ? "✓" : "—"}</dd>
                <dt className="text-slate-500">SMS / Email / Phone</dt>
                <dd>{[lead.consent.smsConsent && "SMS", lead.consent.emailConsent && "Email", lead.consent.phoneConsent && "Phone"].filter(Boolean).join(", ") || "—"}</dd>
                <dt className="text-slate-500">Captured</dt><dd>{lead.consent.createdAt.toLocaleString()}</dd>
                <dt className="text-slate-500">IP</dt><dd>{lead.consent.ipAddress ?? "—"}</dd>
                <dt className="text-slate-500">TCPA ver.</dt><dd>{lead.consent.tcpaVersion}</dd>
              </dl>
            ) : (
              <p className="text-xs text-slate-500">No consent record.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
