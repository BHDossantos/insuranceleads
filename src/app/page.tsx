import Link from "next/link";
import { PRODUCTS } from "@/lib/products";

const groupLabels: Record<string, string> = {
  personal: "Personal lines",
  life: "Life",
  commercial: "Commercial",
};

export default function HomePage() {
  const groups = ["personal", "life", "commercial"] as const;

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <span className="badge bg-brand-100 text-brand-700">Exclusive · Compliant · High-intent</span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Get matched with a licensed insurance agent in seconds.
          </h1>
          <p className="text-lg text-slate-600">
            Tell us what you need to cover. We score your request, verify it, and route it instantly to
            a licensed professional in your state — no spam, no shared leads.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/quote" className="btn-primary px-6 py-3 text-base">
              Get my insurance quote
            </Link>
            <Link href="/agent" className="btn-secondary px-6 py-3 text-base">
              I&apos;m an agent
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            We collect clear, one-to-one consent before any agent contacts you.
          </p>
        </div>
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">How it works</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            {[
              "Choose what you want to insure",
              "Answer a few quick questions",
              "Give consent for an agency to contact you",
              "We score & route you to the right licensed agent",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">What do you want to insure?</h2>
        {groups.map((group) => {
          const items = PRODUCTS.filter((p) => p.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {groupLabels[group]}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/quote?product=${p.slug}`}
                    className="card transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="text-lg font-semibold text-slate-900">{p.label}</div>
                    <div className="mt-1 text-sm text-slate-600">{p.tagline}</div>
                    <div className="mt-4 text-sm font-medium text-brand-700">Start →</div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
