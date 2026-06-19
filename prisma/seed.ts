// Demo seed data. Leads are created through the real intake pipeline so they get
// scored, deduped, and routed exactly as production leads would.

import { PrismaClient } from "@prisma/client";
import { createLead, type LeadInput } from "../src/lib/leadService";
import {
  buildConsentText,
  DEFAULT_AGENCY_NAME,
  TCPA_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from "../src/lib/constants";

const prisma = new PrismaClient();

async function reset() {
  // Order matters due to FKs.
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.quoteOutcome.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.suppression.deleteMany();
  await prisma.agency.deleteMany();
}

function consentFor(agencyName: string) {
  return {
    agencyName,
    consentText: buildConsentText(agencyName),
    tcpaConsent: true,
    smsConsent: true,
    emailConsent: true,
    phoneConsent: true,
    tcpaVersion: TCPA_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    termsVersion: TERMS_VERSION,
    landingPageUrl: "https://example.com/lp/quote",
    campaignSource: "google",
  };
}

async function main() {
  await reset();

  // --- Agencies ---
  const beacon = await prisma.agency.create({
    data: {
      name: DEFAULT_AGENCY_NAME,
      licenseStates: "MA,NH,RI,CT,ME",
      productsEnabled: "auto,home,renters,life,commercial",
      phone: "617-555-0100",
      email: "hello@beaconins.example",
      status: "active",
    },
  });
  const summit = await prisma.agency.create({
    data: {
      name: "Summit Coverage Partners",
      licenseStates: "NY,NJ,PA",
      productsEnabled: "auto,home,life",
      phone: "212-555-0150",
      email: "hello@summit.example",
      status: "active",
    },
  });

  // --- Agents ---
  async function makeAgent(opts: {
    first: string;
    last: string;
    email: string;
    agencyId: string;
    states: string;
    products: string;
    weight?: number;
  }) {
    const user = await prisma.user.create({
      data: { role: "agent", firstName: opts.first, lastName: opts.last, email: opts.email },
    });
    return prisma.agent.create({
      data: {
        userId: user.id,
        agencyId: opts.agencyId,
        licenseStates: opts.states,
        productsEnabled: opts.products,
        routingWeight: opts.weight ?? 1,
        capacityPerDay: 50,
      },
    });
  }

  await makeAgent({ first: "Maria", last: "Lopez", email: "maria@beaconins.example", agencyId: beacon.id, states: "MA,NH,RI", products: "auto,home,renters", weight: 2 });
  await makeAgent({ first: "Dev", last: "Patel", email: "dev@beaconins.example", agencyId: beacon.id, states: "MA,CT,ME", products: "life,commercial", weight: 1 });
  await makeAgent({ first: "Sara", last: "Kim", email: "sara@summit.example", agencyId: summit.id, states: "NY,NJ,PA", products: "auto,home,life", weight: 1 });

  // --- Campaigns ---
  const google = await prisma.campaign.create({
    data: { name: "Google Search – Auto", channel: "search", source: "google", utmSource: "google", utmMedium: "cpc", budget: 5000, costPerLead: 22, status: "active" },
  });
  const meta = await prisma.campaign.create({
    data: { name: "Meta – Life Insurance", channel: "social", source: "facebook", utmSource: "facebook", utmMedium: "paid_social", budget: 3000, costPerLead: 31, status: "active" },
  });
  const commercial = await prisma.campaign.create({
    data: { name: "LinkedIn – Commercial", channel: "social", source: "linkedin", utmSource: "linkedin", utmMedium: "paid_social", budget: 4000, costPerLead: 85, status: "active" },
  });

  // --- Leads (created via real pipeline) ---
  const leads: (LeadInput & { _campaign?: string })[] = [
    {
      productType: "home", firstName: "Jordan", lastName: "Avery", email: "jordan.avery@example.com", phone: "617-555-2210", state: "MA", zip: "02118",
      details: { propertyType: "Single family", ownership: "Own", yearBuilt: "2008", squareFeet: "2200", roofAge: "6", currentlyInsured: true, currentCarrier: "Liberty Mutual", claimsHistory: false, bundleAuto: true, desiredStartDate: "2026-07-01" },
      consent: consentFor(DEFAULT_AGENCY_NAME), _campaign: google.id,
    },
    {
      productType: "auto", firstName: "Priya", lastName: "Shah", email: "priya.shah@example.com", phone: "603-555-3120", state: "NH", zip: "03060",
      details: { currentlyInsured: true, currentCarrier: "Geico", vehiclesCount: "2", vehicleYear: "2021", vehicleMake: "Toyota", vehicleModel: "RAV4", accidentsTickets: false, desiredStartDate: "2026-06-25", bundleHome: true },
      consent: consentFor(DEFAULT_AGENCY_NAME), _campaign: google.id,
    },
    {
      productType: "commercial", firstName: "Marco", lastName: "Ferreira", email: "marco@bellatrattoria.example", phone: "617-555-9900", state: "MA", zip: "02139",
      details: { businessName: "Bella Trattoria", industry: "Restaurant", yearsInBusiness: "8", annualRevenue: "850000", payroll: "320000", employeesCount: "12", vehiclesCount: "1", coverageNeeded: "Workers comp", currentCarrier: "Travelers", claimsHistory: false, renewalDate: "2026-07-05", urgency: "Within 30 days" },
      consent: consentFor(DEFAULT_AGENCY_NAME), _campaign: commercial.id,
    },
    {
      productType: "life", firstName: "Aisha", lastName: "Bello", email: "aisha.bello@example.com", phone: "212-555-7788", state: "NY", zip: "10001",
      details: { age: "34", gender: "Female", coverageAmount: "500000", termLength: "20 years", tobacco: false, healthRating: "Excellent", majorConditions: false, purpose: "Family protection" },
      consent: consentFor("Summit Coverage Partners"), _campaign: meta.id,
    },
    {
      productType: "auto", firstName: "Tom", lastName: "Nguyen", email: "tom.nguyen@example.com", phone: "201-555-4412", state: "NJ", zip: "07030",
      details: { currentlyInsured: false, vehiclesCount: "1", vehicleYear: "2016", vehicleMake: "Honda", vehicleModel: "Civic", accidentsTickets: true, urgency: "Just researching" },
      consent: consentFor("Summit Coverage Partners"), _campaign: google.id,
    },
    {
      productType: "renters", firstName: "Ella", lastName: "Brooks", email: "ella.brooks@example.com", phone: "401-555-6655", state: "RI", zip: "02903",
      details: { propertyType: "Apartment", personalPropertyValue: "25000", currentlyInsured: false, desiredStartDate: "2026-08-01" },
      consent: consentFor(DEFAULT_AGENCY_NAME), _campaign: google.id,
    },
    // Texas auto -> no licensed agent -> remains unassigned (demonstrates routing gap)
    {
      productType: "auto", firstName: "Cody", lastName: "Reyes", email: "cody.reyes@example.com", phone: "512-555-1234", state: "TX", zip: "78701",
      details: { currentlyInsured: true, currentCarrier: "State Farm", vehiclesCount: "3", accidentsTickets: false, urgency: "Immediately" },
      consent: consentFor(DEFAULT_AGENCY_NAME), _campaign: google.id,
    },
  ];

  const created: string[] = [];
  for (const { _campaign, ...input } of leads) {
    const res = await createLead(input);
    if (res.ok && res.leadId) {
      created.push(res.leadId);
      if (_campaign) await prisma.lead.update({ where: { id: res.leadId }, data: { campaignId: _campaign } });
    } else {
      console.warn("Failed to create lead:", res.errors);
    }
  }

  // Duplicate submission to demonstrate dedup (same Priya, auto).
  await createLead({
    productType: "auto", firstName: "Priya", lastName: "Shah", email: "priya.shah@example.com", phone: "603-555-3120", state: "NH",
    details: { currentlyInsured: true, vehiclesCount: "2" }, consent: consentFor(DEFAULT_AGENCY_NAME),
  });

  // Outcomes for ROI: bind the home lead, mark one lost.
  if (created[0]) {
    await prisma.quoteOutcome.create({
      data: { leadId: created[0], quotedPremium: 1850, carrier: "Safeco", policyType: "Homeowners", bound: true, boundDate: new Date(), estimatedCommission: 277 },
    });
    await prisma.lead.update({ where: { id: created[0] }, data: { leadStatus: "bound" } });
  }
  if (created[4]) {
    await prisma.quoteOutcome.create({
      data: { leadId: created[4], bound: false, lostReason: "Price too high" },
    });
    await prisma.lead.update({ where: { id: created[4] }, data: { leadStatus: "lost" } });
  }

  const counts = await prisma.lead.count();
  console.log(`Seed complete: ${counts} leads, 2 agencies, 3 agents, 3 campaigns.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
