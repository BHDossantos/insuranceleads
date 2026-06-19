"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PRODUCTS, getProduct, type FormField } from "@/lib/products";
import {
  DEFAULT_AGENCY_NAME,
  buildConsentText,
  US_STATES,
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
  TCPA_VERSION,
} from "@/lib/constants";

type Details = Record<string, string | boolean>;

const STEP_LABELS = ["Product", "About you", "Details", "Consent"];

export default function QuoteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialProduct = params.get("product") ?? "";

  const [step, setStep] = useState(initialProduct ? 1 : 0);
  const [product, setProduct] = useState(initialProduct);
  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    state: "",
    zip: "",
  });
  const [details, setDetails] = useState<Details>({});
  const [consent, setConsent] = useState({ tcpa: false, sms: false, email: false, phone: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const def = useMemo(() => getProduct(product), [product]);
  const consentText = buildConsentText(DEFAULT_AGENCY_NAME);

  function renderField(f: FormField) {
    const value = details[f.name];
    const set = (v: string | boolean) => setDetails((d) => ({ ...d, [f.name]: v }));

    if (f.type === "boolean") {
      return (
        <label key={f.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
          <span className="text-sm text-slate-700">{f.label}</span>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => set(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
        </label>
      );
    }
    if (f.type === "select") {
      return (
        <div key={f.name}>
          <label className="label">{f.label}{f.required && " *"}</label>
          <select className="input" value={String(value ?? "")} onChange={(e) => set(e.target.value)}>
            <option value="">Select…</option>
            {f.options?.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div key={f.name}>
        <label className="label">{f.label}{f.required && " *"}</label>
        <input
          className="input"
          type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
          value={String(value ?? "")}
          placeholder={f.placeholder}
          onChange={(e) => set(e.target.value)}
        />
        {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
      </div>
    );
  }

  function validateContact(): string | null {
    if (!contact.firstName.trim() || !contact.lastName.trim()) return "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return "Please enter a valid email.";
    if (contact.phone.replace(/\D/g, "").length < 10) return "Please enter a valid phone number.";
    if (!contact.state) return "Please select your state.";
    return null;
  }

  function validateDetails(): string | null {
    if (!def) return "Please select a product.";
    for (const f of def.fields) {
      if (f.required && !details[f.name] && details[f.name] !== false) {
        return `Please complete: ${f.label}`;
      }
    }
    return null;
  }

  async function submit() {
    setError(null);
    if (!consent.tcpa) {
      setError("You must provide consent to be contacted.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: product,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          state: contact.state,
          zip: contact.zip || undefined,
          details,
          consent: {
            agencyName: DEFAULT_AGENCY_NAME,
            consentText,
            tcpaConsent: consent.tcpa,
            smsConsent: consent.sms,
            emailConsent: consent.email,
            phoneConsent: consent.phone,
            tcpaVersion: TCPA_VERSION,
            privacyPolicyVersion: PRIVACY_POLICY_VERSION,
            termsVersion: TERMS_VERSION,
            landingPageUrl: typeof window !== "undefined" ? window.location.href : undefined,
            campaignSource: params.get("utm_source") ?? undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError((data.errors ?? ["Something went wrong."]).join(" "));
        setSubmitting(false);
        return;
      }
      const q = new URLSearchParams({
        agency: DEFAULT_AGENCY_NAME,
        temp: data.temperature ?? "",
      });
      router.push(`/quote/thank-you?${q.toString()}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div
              className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                i <= step ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </div>
            <span className={`ml-2 text-sm ${i <= step ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="mx-2 h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {/* Step 0: product */}
      {step === 0 && (
        <div className="card space-y-4">
          <h2 className="text-xl font-bold">What do you want to insure?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.slug}
                onClick={() => {
                  setProduct(p.slug);
                  setDetails({});
                  setStep(1);
                }}
                className={`rounded-lg border p-4 text-left transition hover:border-brand-400 ${
                  product === p.slug ? "border-brand-500 bg-brand-50" : "border-slate-200"
                }`}
              >
                <div className="font-semibold">{p.label}</div>
                <div className="text-sm text-slate-600">{p.tagline}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: contact */}
      {step === 1 && (
        <div className="card space-y-4">
          <h2 className="text-xl font-bold">Tell us about you</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First name *</label>
              <input className="input" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
            </div>
            <div>
              <label className="label">Last name *</label>
              <input className="input" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input className="input" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
            <div>
              <label className="label">State *</label>
              <select className="input" value={contact.state} onChange={(e) => setContact({ ...contact, state: e.target.value })}>
                <option value="">Select…</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ZIP</label>
              <input className="input" value={contact.zip} onChange={(e) => setContact({ ...contact, zip: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(0)}>Back</button>
            <button
              className="btn-primary"
              onClick={() => {
                const err = validateContact();
                if (err) return setError(err);
                setError(null);
                setStep(2);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: details */}
      {step === 2 && def && (
        <div className="card space-y-4">
          <h2 className="text-xl font-bold">{def.label} details</h2>
          <p className="text-sm text-slate-600">The more you share, the better we can match you.</p>
          <div className="grid gap-4 sm:grid-cols-2">{def.fields.map(renderField)}</div>
          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button
              className="btn-primary"
              onClick={() => {
                const err = validateDetails();
                if (err) return setError(err);
                setError(null);
                setStep(3);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: consent */}
      {step === 3 && (
        <div className="card space-y-4">
          <h2 className="text-xl font-bold">Consent to be contacted</h2>
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            {consentText}
          </div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600"
              checked={consent.tcpa}
              onChange={(e) => setConsent({ ...consent, tcpa: e.target.checked, sms: e.target.checked, email: e.target.checked, phone: e.target.checked })}
            />
            <span className="text-sm text-slate-700">
              I agree to the above and consent for <strong>{DEFAULT_AGENCY_NAME}</strong> to contact me. *
            </span>
          </label>

          <fieldset className="grid gap-2 sm:grid-cols-3">
            <legend className="label">Channels I allow:</legend>
            {(["sms", "email", "phone"] as const).map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  checked={consent[c]}
                  onChange={(e) => setConsent({ ...consent, [c]: e.target.checked })}
                />
                {c.toUpperCase()}
              </label>
            ))}
          </fieldset>

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
