// Validation schemas + service helpers for admin management of agents and
// campaigns. Kept separate from route handlers so the logic is unit-testable.

import { z } from "zod";
import { prisma } from "./db";
import { listToCsv, normalizeEmail, isValidEmail } from "./util";
import { PRODUCTS } from "./products";
import { US_STATES } from "./constants";

const PRODUCT_SLUGS = PRODUCTS.map((p) => p.slug);

// Accept states/products as arrays (from the UI) or CSV strings (from the API).
const stateList = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(",")))
  .transform((arr) => arr.map((s) => s.trim().toUpperCase()).filter(Boolean));

const productList = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(",")))
  .transform((arr) => arr.map((s) => s.trim().toLowerCase()).filter(Boolean));

export const agentCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(3),
  phone: z.string().optional(),
  agencyId: z.string().min(1),
  licenseStates: stateList.default([]),
  productsEnabled: productList.default([]),
  languages: z
    .union([z.array(z.string()), z.string()])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .transform((arr) => arr.map((s) => s.trim().toLowerCase()).filter(Boolean))
    .default(["en"]),
  capacityPerDay: z.coerce.number().int().min(0).default(25),
  routingWeight: z.coerce.number().int().min(1).default(1),
  status: z.enum(["active", "paused"]).default("active"),
});

export const agentUpdateSchema = agentCreateSchema.partial().omit({ email: true });

export type AgentCreateInput = z.input<typeof agentCreateSchema>;

// Validate cross-field business rules that zod can't express alone.
export function validateAgentDomain(input: {
  licenseStates: string[];
  productsEnabled: string[];
}): string[] {
  const errors: string[] = [];
  const badStates = input.licenseStates.filter((s) => !US_STATES.includes(s));
  if (badStates.length) errors.push(`Unknown state code(s): ${badStates.join(", ")}`);
  const badProducts = input.productsEnabled.filter((p) => !PRODUCT_SLUGS.includes(p));
  if (badProducts.length) errors.push(`Unknown product(s): ${badProducts.join(", ")}`);
  return errors;
}

export async function createAgent(input: AgentCreateInput) {
  const parsed = agentCreateSchema.parse(input);
  if (!isValidEmail(parsed.email)) throw new Error("Invalid email address");

  const domainErrors = validateAgentDomain(parsed);
  if (domainErrors.length) throw new Error(domainErrors.join(" "));

  const agency = await prisma.agency.findUnique({ where: { id: parsed.agencyId } });
  if (!agency) throw new Error("Agency not found");

  const email = normalizeEmail(parsed.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with that email already exists");

  const user = await prisma.user.create({
    data: {
      role: "agent",
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      email,
      phone: parsed.phone,
    },
  });

  return prisma.agent.create({
    data: {
      userId: user.id,
      agencyId: parsed.agencyId,
      licenseStates: listToCsv(parsed.licenseStates),
      productsEnabled: listToCsv(parsed.productsEnabled),
      languages: listToCsv(parsed.languages),
      capacityPerDay: parsed.capacityPerDay,
      routingWeight: parsed.routingWeight,
      status: parsed.status,
    },
    include: { user: true, agency: true },
  });
}

export async function updateAgent(id: string, input: unknown) {
  const parsed = agentUpdateSchema.parse(input);

  const domainErrors = validateAgentDomain({
    licenseStates: parsed.licenseStates ?? [],
    productsEnabled: parsed.productsEnabled ?? [],
  });
  if (domainErrors.length) throw new Error(domainErrors.join(" "));

  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) throw new Error("Agent not found");

  const data: Record<string, unknown> = {};
  if (parsed.agencyId !== undefined) data.agencyId = parsed.agencyId;
  if (parsed.licenseStates !== undefined) data.licenseStates = listToCsv(parsed.licenseStates);
  if (parsed.productsEnabled !== undefined) data.productsEnabled = listToCsv(parsed.productsEnabled);
  if (parsed.languages !== undefined) data.languages = listToCsv(parsed.languages);
  if (parsed.capacityPerDay !== undefined) data.capacityPerDay = parsed.capacityPerDay;
  if (parsed.routingWeight !== undefined) data.routingWeight = parsed.routingWeight;
  if (parsed.status !== undefined) data.status = parsed.status;

  const updated = await prisma.agent.update({ where: { id }, data, include: { user: true, agency: true } });

  // Name/phone live on the User; update if provided.
  const userData: Record<string, unknown> = {};
  if (parsed.firstName !== undefined) userData.firstName = parsed.firstName.trim();
  if (parsed.lastName !== undefined) userData.lastName = parsed.lastName.trim();
  if (parsed.phone !== undefined) userData.phone = parsed.phone;
  if (Object.keys(userData).length) {
    await prisma.user.update({ where: { id: agent.userId }, data: userData });
  }

  return updated;
}

// -------------------------------------------------------------------------
// Campaigns
// -------------------------------------------------------------------------

export const campaignCreateSchema = z.object({
  name: z.string().min(1),
  channel: z.string().optional(),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  costPerLead: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "paused", "archived"]).default("active"),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export async function createCampaign(input: unknown) {
  const parsed = campaignCreateSchema.parse(input);
  return prisma.campaign.create({ data: parsed });
}

export async function updateCampaign(id: string, input: unknown) {
  const parsed = campaignUpdateSchema.parse(input);
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) throw new Error("Campaign not found");
  return prisma.campaign.update({ where: { id }, data: parsed });
}
