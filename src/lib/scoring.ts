// Lead scoring engine (blueprint section 6).
//
// Score 0-100 across weighted factors:
//   Intent / urgency ........ 25
//   Form completeness ....... 20
//   Coverage fit ............ 15
//   Contact quality ......... 15
//   Geographic fit .......... 10
//   Current insurance status. 10
//   Duplicate / fraud risk ... 5
//
// Each factor is computed as a 0..1 ratio, then multiplied by its weight.

import { getProduct } from "./products";
import { isValidEmail, isValidPhone } from "./util";

export interface ScoreInput {
  productType: string;
  email: string;
  phone: string;
  state: string;
  zip?: string | null;
  details: Record<string, unknown>;
  /** States the platform/agency can actually serve. */
  servedStates?: string[];
  /** True if a likely duplicate was detected. */
  isDuplicate?: boolean;
}

export interface ScoreResult {
  score: number;
  temperature: "hot" | "warm" | "cold";
  breakdown: Record<string, number>;
}

const WEIGHTS = {
  intent: 25,
  completeness: 20,
  coverageFit: 15,
  contactQuality: 15,
  geoFit: 10,
  insuranceStatus: 10,
  fraudRisk: 5,
} as const;

function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === "yes" || v === "Yes";
}

function present(v: unknown): boolean {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// 0..1 intent based on urgency / renewal proximity / desired start date.
function intentRatio(details: Record<string, unknown>): number {
  const urgency = String(details.urgency ?? "").toLowerCase();
  if (urgency.includes("immediate")) return 1;
  if (urgency.includes("30 day")) return 0.85;
  if (urgency.includes("1-3") || urgency.includes("1–3")) return 0.5;
  if (urgency.includes("research")) return 0.2;

  // Date-driven signals: renewal or desired start within 30/60/90 days.
  const dateStr = (details.renewalDate || details.desiredStartDate) as string | undefined;
  if (present(dateStr)) {
    const target = new Date(String(dateStr));
    if (!isNaN(target.getTime())) {
      const days = (target.getTime() - Date.now()) / 86_400_000;
      if (days <= 30) return 0.9;
      if (days <= 60) return 0.7;
      if (days <= 90) return 0.5;
      return 0.35;
    }
  }
  return 0.4; // baseline intent for anyone who completed a quote request
}

// 0..1 completeness across the product's defined fields.
function completenessRatio(productType: string, details: Record<string, unknown>): number {
  const product = getProduct(productType);
  if (!product || product.fields.length === 0) return 0.5;
  const filled = product.fields.filter((f) => present(details[f.name])).length;
  return filled / product.fields.length;
}

// 0..1 coverage fit: bundling, coverage amount, multiple vehicles, etc.
function coverageFitRatio(productType: string, details: Record<string, unknown>): number {
  let score = 0.5;
  if (truthy(details.bundleHome) || truthy(details.bundleAuto)) score += 0.3;
  if (productType === "auto" && Number(details.vehiclesCount) >= 2) score += 0.2;
  if (productType === "life" && Number(details.coverageAmount) >= 250_000) score += 0.2;
  if (productType === "commercial") {
    if (Number(details.employeesCount) >= 5) score += 0.15;
    if (Number(details.annualRevenue) >= 500_000) score += 0.15;
  }
  return clamp01(score);
}

function contactQualityRatio(email: string, phone: string): number {
  let score = 0;
  if (isValidEmail(email)) score += 0.5;
  if (isValidPhone(phone)) score += 0.5;
  return score;
}

function geoFitRatio(state: string, zip: string | null | undefined, served?: string[]): number {
  let score = 0.5;
  if (served && served.length > 0) {
    score = served.map((s) => s.toUpperCase()).includes(state.toUpperCase()) ? 1 : 0;
  } else if (state) {
    score = 1; // no constraint configured -> any state fits
  }
  if (zip && /^\d{5}$/.test(zip)) score = Math.min(1, score + 0.0); // valid zip already implied
  return clamp01(score);
}

// Currently insured consumers convert better (already shopping with intent).
function insuranceStatusRatio(details: Record<string, unknown>): number {
  if (truthy(details.currentlyInsured) || present(details.currentCarrier)) return 1;
  return 0.4;
}

// 1 = clean, 0 = high fraud risk.
function fraudCleanRatio(input: ScoreInput): number {
  let score = 1;
  if (input.isDuplicate) score -= 0.8;
  if (!isValidEmail(input.email)) score -= 0.3;
  if (!isValidPhone(input.phone)) score -= 0.3;
  return clamp01(score);
}

export function scoreLead(input: ScoreInput): ScoreResult {
  const breakdown: Record<string, number> = {
    intent: Math.round(intentRatio(input.details) * WEIGHTS.intent),
    completeness: Math.round(completenessRatio(input.productType, input.details) * WEIGHTS.completeness),
    coverageFit: Math.round(coverageFitRatio(input.productType, input.details) * WEIGHTS.coverageFit),
    contactQuality: Math.round(contactQualityRatio(input.email, input.phone) * WEIGHTS.contactQuality),
    geoFit: Math.round(geoFitRatio(input.state, input.zip, input.servedStates) * WEIGHTS.geoFit),
    insuranceStatus: Math.round(insuranceStatusRatio(input.details) * WEIGHTS.insuranceStatus),
    fraudRisk: Math.round(fraudCleanRatio(input) * WEIGHTS.fraudRisk),
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const temperature: ScoreResult["temperature"] =
    score >= 80 ? "hot" : score >= 50 ? "warm" : "cold";

  return { score, temperature, breakdown };
}
