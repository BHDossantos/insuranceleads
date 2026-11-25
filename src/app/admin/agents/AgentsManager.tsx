"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AgentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  agencyId: string;
  agencyName: string;
  licenseStates: string[];
  productsEnabled: string[];
  capacityPerDay: number;
  routingWeight: number;
  status: string;
  leadCount: number;
}

interface Props {
  initialAgents: AgentRow[];
  agencies: { id: string; name: string }[];
  products: { slug: string; label: string }[];
  states: string[];
}

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  agencyId: "",
  licenseStates: [] as string[],
  productsEnabled: [] as string[],
  capacityPerDay: 25,
  routingWeight: 1,
  status: "active",
};

export default function AgentsManager({ initialAgents, agencies, products, states }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, agencyId: agencies[0]?.id ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, agencyId: agencies[0]?.id ?? "" });
    setError(null);
  }

  function startEdit(a: AgentRow) {
    setEditingId(a.id);
    setForm({
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phone: a.phone,
      agencyId: a.agencyId,
      licenseStates: a.licenseStates,
      productsEnabled: a.productsEnabled,
      capacityPerDay: a.capacityPerDay,
      routingWeight: a.routingWeight,
      status: a.status,
    });
    setError(null);
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const url = editingId ? `/api/agents/${editingId}` : "/api/agents";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save agent");
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
      {/* Form */}
      <div className="card space-y-3 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editingId ? "Edit agent" : "New agent"}</h2>
          {editingId && (
            <button onClick={startCreate} className="text-xs text-brand-700 hover:underline">
              + New instead
            </button>
          )}
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Email {editingId && <span className="text-xs text-slate-400">(fixed)</span>}</label>
          <input className="input" type="email" value={form.email} disabled={!!editingId} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">Agency</label>
          <select className="input" value={form.agencyId} onChange={(e) => setForm({ ...form, agencyId: e.target.value })}>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Products enabled</label>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setForm({ ...form, productsEnabled: toggle(form.productsEnabled, p.slug) })}
                className={`badge cursor-pointer ${form.productsEnabled.includes(p.slug) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Licensed states</label>
          <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {states.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, licenseStates: toggle(form.licenseStates, s) })}
                className={`badge cursor-pointer ${form.licenseStates.includes(s) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Capacity/day</label>
            <input className="input" type="number" min={0} value={form.capacityPerDay} onChange={(e) => setForm({ ...form, capacityPerDay: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Weight</label>
            <input className="input" type="number" min={1} value={form.routingWeight} onChange={(e) => setForm({ ...form, routingWeight: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </div>
        </div>

        <button className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? "Saving…" : editingId ? "Save changes" : "Create agent"}
        </button>
      </div>

      {/* List */}
      <div className="card overflow-x-auto p-0 lg:col-span-2">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">States</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Cap/Wt</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialAgents.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{a.firstName} {a.lastName}</div>
                  <div className="text-xs text-slate-400">{a.email} · {a.leadCount} leads</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.agencyName}</td>
                <td className="px-4 py-3 text-xs">{a.licenseStates.join(", ") || "—"}</td>
                <td className="px-4 py-3 text-xs">{a.productsEnabled.join(", ") || "—"}</td>
                <td className="px-4 py-3 text-xs">{a.capacityPerDay}/{a.routingWeight}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${a.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => startEdit(a)} className="text-xs text-brand-700 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
            {initialAgents.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No agents yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
