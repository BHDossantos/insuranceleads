import { describe, it, expect } from "vitest";
import {
  validateAgentDomain,
  agentCreateSchema,
  campaignCreateSchema,
} from "./adminService";

describe("validateAgentDomain", () => {
  it("accepts valid states and products", () => {
    expect(validateAgentDomain({ licenseStates: ["MA", "NH"], productsEnabled: ["auto", "home"] })).toEqual([]);
  });
  it("flags unknown state codes", () => {
    const errs = validateAgentDomain({ licenseStates: ["MA", "ZZ"], productsEnabled: [] });
    expect(errs.join(" ")).toMatch(/ZZ/);
  });
  it("flags unknown products", () => {
    const errs = validateAgentDomain({ licenseStates: [], productsEnabled: ["auto", "spaceship"] });
    expect(errs.join(" ")).toMatch(/spaceship/);
  });
});

describe("agentCreateSchema", () => {
  it("normalizes states/products from arrays (upper/lowercase, trimmed)", () => {
    const out = agentCreateSchema.parse({
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      agencyId: "ag1",
      licenseStates: [" ma ", "nh"],
      productsEnabled: [" Auto ", "HOME"],
    });
    expect(out.licenseStates).toEqual(["MA", "NH"]);
    expect(out.productsEnabled).toEqual(["auto", "home"]);
    expect(out.capacityPerDay).toBe(25); // default
    expect(out.routingWeight).toBe(1); // default
  });

  it("accepts CSV strings for states/products", () => {
    const out = agentCreateSchema.parse({
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      agencyId: "ag1",
      licenseStates: "MA, NH ,RI",
      productsEnabled: "auto,commercial",
    });
    expect(out.licenseStates).toEqual(["MA", "NH", "RI"]);
    expect(out.productsEnabled).toEqual(["auto", "commercial"]);
  });
});

describe("campaignCreateSchema", () => {
  it("coerces numeric budget/costPerLead and defaults status", () => {
    const out = campaignCreateSchema.parse({ name: "Google", budget: "5000", costPerLead: "22" });
    expect(out.budget).toBe(5000);
    expect(out.costPerLead).toBe(22);
    expect(out.status).toBe("active");
  });
  it("requires a name", () => {
    expect(() => campaignCreateSchema.parse({})).toThrow();
  });
});
