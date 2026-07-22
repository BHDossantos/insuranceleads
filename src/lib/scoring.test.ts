import { describe, it, expect } from "vitest";
import { scoreLead, type ScoreInput } from "./scoring";

const base: ScoreInput = {
  productType: "auto",
  email: "a@b.com",
  phone: "6175551234",
  state: "MA",
  zip: "02118",
  details: {},
  servedStates: ["MA", "NH"],
};

describe("scoreLead", () => {
  it("returns a score between 0 and 100 that equals the sum of factors", () => {
    const r = scoreLead(base);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    const sum = Object.values(r.breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.score);
  });

  it("scores a complete, urgent, insured bundle lead as hot", () => {
    const r = scoreLead({
      ...base,
      details: {
        currentlyInsured: true,
        currentCarrier: "Geico",
        vehiclesCount: 2,
        vehicleYear: 2021,
        vehicleMake: "Toyota",
        vehicleModel: "RAV4",
        accidentsTickets: false,
        desiredStartDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
        bundleHome: true,
      },
    });
    expect(r.temperature).toBe("hot");
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it("scores a sparse, researching lead below hot", () => {
    const r = scoreLead({
      ...base,
      email: "not-an-email",
      phone: "123",
      details: { urgency: "Just researching" },
    });
    expect(r.score).toBeLessThan(80);
    expect(r.temperature).not.toBe("hot");
  });

  it("penalizes duplicates via the fraud-risk factor", () => {
    const clean = scoreLead(base);
    const dup = scoreLead({ ...base, isDuplicate: true });
    expect(dup.breakdown.fraudRisk).toBeLessThan(clean.breakdown.fraudRisk);
    expect(dup.score).toBeLessThan(clean.score);
  });

  it("gives zero geo fit when state is not served", () => {
    const r = scoreLead({ ...base, state: "TX" });
    expect(r.breakdown.geoFit).toBe(0);
  });

  it("rewards higher intent for sooner desired start dates", () => {
    const soon = scoreLead({
      ...base,
      details: { desiredStartDate: new Date(Date.now() + 5 * 86_400_000).toISOString() },
    });
    const later = scoreLead({
      ...base,
      details: { desiredStartDate: new Date(Date.now() + 200 * 86_400_000).toISOString() },
    });
    expect(soon.breakdown.intent).toBeGreaterThan(later.breakdown.intent);
  });
});
