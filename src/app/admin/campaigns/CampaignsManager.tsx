"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CampaignRow {
  id: string;
  name: string;
  channel: string;
  source: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  budget?: number;
  costPerLead?: number;
  status: string;
  leadCount: number;
}

const emptyForm = {
  name: "",
  channel: "",
  source: "",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  budget: "",
  costPerLead: "",
  status: "active",
};

export default function CampaignsManager({ initialCampaigns }: { initialCampaigns: CampaignRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError(null);
  }

  function startEdit(c: CampaignRow) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      channel: c.channel,
      source: c.source,
      utmSource: c.utmSource,
      utmMedium: c.utmMedium,
      utmCampaign: c.utmCampaign,
      budget: c.budget != null ? String(c.budget) : "",
      costPerLead: c.costPerLead != null ? String(c.costPerLead) : "",
      status: c.status,
    });
    setError(null);
  }

  async function save() {
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        budget: form.budget === "" ? undefined : Number(form.budget),
        costPerLead: form.costPerLead === "" ? undefined : Number(form.costPerLead),
      };
      const url = editingId ? `/api/campaigns/${editingId}` : "/api/campaigns";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save campaign");
        setBusy(false);
        return;
      }
      startCreate();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-3 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editingId ? "Edit campaign" : "New campaign"}</h2>
          {editingId && (
            <button onClick={startCreate} className="text-xs text-brand-700 hover:underline">+ New instead</button>
          )}
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Channel</label>
            <input className="input" placeholder="search / social" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
          </div>
          <div>
            <label className="label">Source</label>
            <input className="input" placeholder="google" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">utm_source</label>
            <input className="input" value={form.utmSource} onChange={(e) => setForm({ ...form, utmSource: e.target.value })} />
          </div>
          <div>
            <label className="label">utm_medium</label>
            <input className="input" value={form.utmMedium} onChange={(e) => setForm({ ...form, utmMedium: e.target.value })} />
          </div>
          <div>
            <label className="label">utm_campaign</label>
            <input className="input" value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Budget ($)</label>
            <input className="input" type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div>
            <label className="label">Cost/lead ($)</label>
            <input className="input" type="number" min={0} value={form.costPerLead} onChange={(e) => setForm({ ...form, costPerLead: e.target.value })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="archived">archived</option>
            </select>
          </div>
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? "Saving…" : editingId ? "Save changes" : "Create campaign"}
        </button>
      </div>

      <div className="card overflow-x-auto p-0 lg:col-span-2">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Channel/Source</th>
              <th className="px-4 py-3">Cost/lead</th>
              <th className="px-4 py-3">Leads</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialCampaigns.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{[c.channel, c.source].filter(Boolean).join(" / ") || "—"}</td>
                <td className="px-4 py-3">{c.costPerLead != null ? `$${c.costPerLead}` : "—"}</td>
                <td className="px-4 py-3">{c.leadCount}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => startEdit(c)} className="text-xs text-brand-700 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
            {initialCampaigns.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No campaigns yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
