// Lead intake orchestration: validate -> dedupe -> score -> persist lead +
// consent -> route -> log activity. Shared by the public form and POST /leads.

import { z } from "zod";
import { prisma } from "./db";
import { scoreLead } from "./scoring";
import { routeLead } from "./routing";
import { getProduct } from "./products";
import { notifyOnNewLead } from "./notifications";
import { normalizeEmail, normalizePhone, isValidEmail, isValidPhone } from "./util";

export const consentSchema = z.object({
  agencyName: z.string().min(1, "Agency name is required for one-to-one consent"),
  consentText: z.string().min(1),
  tcpaConsent: z.boolean().default(false),
  smsConsent: z.boolean().default(false),
  emailConsent: z.boolean().default(false),
  phoneConsent: z.boolean().default(false),
  tcpaVersion: z.string().default("v1"),
  privacyPolicyVersion: z.string().default("v1"),
  termsVersion: z.string().default("v1"),
  landingPageUrl: z.string().optional(),
  campaignSource: z.string().optional(),
});

export const leadInputSchema = z.object({
  productType: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(3),
  phone: z.string().min(7),
  state: z.string().min(2).max(2),
  zip: z.string().optional(),
  details: z.record(z.any()).default({}),
  campaignId: z.string().optional(),
  sourceId: z.string().optional(),
  consent: consentSchema,
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export interface IntakeContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface IntakeResult {
  ok: boolean;
  leadId?: string;
  score?: number;
  temperature?: string;
  assignedAgentId?: string | null;
  routingReason?: string;
  duplicate?: boolean;
  errors?: string[];
}

export async function createLead(input: LeadInput, ctx: IntakeContext = {}): Promise<IntakeResult> {
  const errors: string[] = [];

  if (!getProduct(input.productType)) errors.push(`Unknown product type: ${input.productType}`);
  if (!isValidEmail(input.email)) errors.push("Invalid email address");
  if (!isValidPhone(input.phone)) errors.push("Invalid US phone number");
  if (!input.consent.tcpaConsent) errors.push("TCPA one-to-one consent is required");
  if (errors.length) return { ok: false, errors };

  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  // Duplicate detection: same email or phone for same product in last 30 days.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const existing = await prisma.lead.findFirst({
    where: {
      productType: input.productType,
      createdAt: { gte: thirtyDaysAgo },
      OR: [{ email }, { phone }],
    },
    orderBy: { createdAt: "desc" },
  });
  const isDuplicate = Boolean(existing);

  // Determine states this platform can serve (union of active agencies).
  const agencies = await prisma.agency.findMany({ where: { status: "active" } });
  const servedStates = Array.from(
    new Set(
      agencies.flatMap((a) =>
        a.licenseStates.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
      ),
    ),
  );

  const scored = scoreLead({
    productType: input.productType,
    email,
    phone,
    state: input.state,
    zip: input.zip,
    details: input.details,
    servedStates,
    isDuplicate,
  });

  // Route before/independent of creation so we can store assignment atomically.
  const routing = await routeLead({ productType: input.productType, state: input.state });

  const lead = await prisma.lead.create({
    data: {
      productType: input.productType,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      phone,
      state: input.state.toUpperCase(),
      zip: input.zip,
      details: JSON.stringify(input.details ?? {}),
      leadScore: scored.score,
      scoreBreakdown: JSON.stringify(scored.breakdown),
      temperature: scored.temperature,
      leadStatus: "new",
      duplicateOf: existing?.id ?? null,
      assignedAgentId: routing.agentId,
      agencyId: routing.agencyId,
      campaignId: input.campaignId,
      sourceId: input.sourceId,
      consent: {
        create: {
          agencyName: input.consent.agencyName,
          agencyId: routing.agencyId,
          consentText: input.consent.consentText,
          tcpaConsent: input.consent.tcpaConsent,
          smsConsent: input.consent.smsConsent,
          emailConsent: input.consent.emailConsent,
          phoneConsent: input.consent.phoneConsent,
          tcpaVersion: input.consent.tcpaVersion,
          privacyPolicyVersion: input.consent.privacyPolicyVersion,
          termsVersion: input.consent.termsVersion,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          landingPageUrl: input.consent.landingPageUrl,
          campaignSource: input.consent.campaignSource,
        },
      },
    },
  });

  // Activity trail.
  await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      agentId: routing.agentId,
      type: "system",
      notes: `Lead created. Score ${scored.score} (${scored.temperature}). ${routing.reason}${
        isDuplicate ? " Flagged as possible duplicate." : ""
      }`,
    },
  });

  // Consumer confirmation + agent alert (suppression- and consent-aware).
  const assignedAgent = routing.agentId
    ? await prisma.agent.findUnique({ where: { id: routing.agentId }, select: { userId: true } })
    : null;
  await notifyOnNewLead({
    leadId: lead.id,
    firstName: lead.firstName,
    email: lead.email,
    phone: lead.phone,
    productType: lead.productType,
    agencyName: input.consent.agencyName,
    emailConsent: input.consent.emailConsent,
    smsConsent: input.consent.smsConsent,
    agentUserId: assignedAgent?.userId ?? null,
  });

  return {
    ok: true,
    leadId: lead.id,
    score: scored.score,
    temperature: scored.temperature,
    assignedAgentId: routing.agentId,
    routingReason: routing.reason,
    duplicate: isDuplicate,
  };
}
