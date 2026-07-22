"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, STATUS_LABELS } from "@/components/badges";

export default function LeadActions({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [activityType, setActivityType] = useState("call");
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(url: string, body: unknown, method = "POST") {
    setBusy(true);
    try {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Actions</h2>

      <div>
        <label className="label">Pipeline status</label>
        <div className="flex gap-2">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            className="btn-primary"
            disabled={busy || status === currentStatus}
            onClick={() => call(`/api/leads/${leadId}/status`, { status }, "PUT")}
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="label">Log activity</label>
        <select className="input" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
          {["call", "sms", "email", "note"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <textarea
          className="input"
          rows={2}
          placeholder="Notes…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          className="btn-secondary w-full"
          disabled={busy || !note.trim()}
          onClick={async () => {
            await call(`/api/leads/${leadId}/activity`, { type: activityType, notes: note });
            setNote("");
          }}
        >
          Add activity
        </button>
      </div>

      <div className="space-y-2">
        <label className="label">Add task</label>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="e.g. Send quote"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <button
            className="btn-secondary"
            disabled={busy || !taskTitle.trim()}
            onClick={async () => {
              await call(`/api/leads/${leadId}/tasks`, { title: taskTitle });
              setTaskTitle("");
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
