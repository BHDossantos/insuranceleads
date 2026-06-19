// Presentational badges for lead temperature and pipeline status.

export function TemperatureBadge({ temperature }: { temperature: string }) {
  const styles: Record<string, string> = {
    hot: "bg-red-100 text-red-700",
    warm: "bg-amber-100 text-amber-700",
    cold: "bg-sky-100 text-sky-700",
  };
  const label = temperature.charAt(0).toUpperCase() + temperature.slice(1);
  return <span className={`badge ${styles[temperature] ?? "bg-slate-100 text-slate-600"}`}>{label}</span>;
}

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-100 text-red-700" : score >= 50 ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700";
  return <span className={`badge ${color}`}>{score}</span>;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  follow_up: "Follow-up",
  bound: "Bound",
  lost: "Lost",
  invalid: "Invalid",
  do_not_contact: "Do not contact",
};

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-brand-100 text-brand-700",
    contacted: "bg-indigo-100 text-indigo-700",
    quoted: "bg-purple-100 text-purple-700",
    follow_up: "bg-amber-100 text-amber-700",
    bound: "bg-green-100 text-green-700",
    lost: "bg-slate-200 text-slate-600",
    invalid: "bg-slate-200 text-slate-600",
    do_not_contact: "bg-red-100 text-red-700",
  };
  return (
    <span className={`badge ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export const STATUSES = Object.keys(STATUS_LABELS);
export { STATUS_LABELS };
