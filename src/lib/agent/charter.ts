// Ported from Jennifer (src/company/businessAgents.ts). Generated; edit in Jennifer and re-port.
import type { BusinessAgent } from './core';

export const BUSINESS_AGENTS: BusinessAgent[] = [
  {
    "companyId": "insurance",
    "name": "Insurance agent",
    "mission": "Win and keep small trades businesses in Massachusetts and New Hampshire as business insurance clients.",
    "routine": {
      "name": "insurance Business",
      "does": "Daily commercial-auto renewal campaign pack and up to five new qualified prospects, all in draft."
    },
    "guardrails": [
      "Lines: general liability, workers’ comp, commercial auto. Territories: MA and NH only.",
      "Never promise savings or quote a price; quotes come from carriers through Bruno.",
      "Keep everything in draft while the sending hold is in place; the brand name and domain wait for Bruno’s confirmation.",
      "Outreach batches: at most 12 a day, one recipient per message, never CC or BCC."
    ],
    "measures": [
      "qualified prospects (first touch and follow-up counted apart)",
      "renewal-review requests",
      "qualified quote requests"
    ],
    "tasks": [
      {
        "id": "prospects",
        "name": "Qualify trades prospects",
        "department": "sales",
        "cadence": "daily",
        "does": "Qualify painting, cleaning and construction businesses in MA and NH. The daily Claude routine finds and drafts; this task qualifies what it logged, drops duplicates and anyone on the do-not-contact list, and proposes the next step for each.",
        "inputs": [
          "icp",
          "offer",
          "CRM accounts and contacts",
          "suppression list"
        ],
        "outputs": [
          "CRM tasks per prospect",
          "first-touch drafts in EN, ES or PT"
        ],
        "approval": "Each draft and each CRM change waits for Bruno."
      },
      {
        "id": "renewals",
        "name": "Commercial auto renewal campaign",
        "department": "marketing",
        "cadence": "weekly",
        "does": "Plan the week of the commercial-auto renewal campaign for the eligible first-party audience: offer, call to action and follow-ups. Lead with certificate-of-insurance turnaround.",
        "inputs": [
          "offer",
          "claims",
          "brand",
          "audience"
        ],
        "outputs": [
          "weekly campaign draft",
          "follow-up drafts"
        ],
        "approval": "The campaign stays in draft; Bruno approves each send."
      },
      {
        "id": "replies",
        "name": "Answer quote and certificate requests",
        "department": "customer",
        "cadence": "on_reply",
        "does": "Triage replies: certificate requests, quote questions, renewals and opt-outs. Draft the answer and the next step; opt-outs are suppressed first.",
        "inputs": [
          "procedures",
          "faq",
          "connected inbox"
        ],
        "outputs": [
          "reply drafts",
          "CRM tasks"
        ],
        "approval": "Replies wait for Bruno; anything about price or coverage escalates."
      },
      {
        "id": "compliance",
        "name": "Licensing and opt-out check",
        "department": "back_office",
        "cadence": "weekly",
        "does": "Check outreach copy and lists against the licensing wording, broker-referral wording and opt-out requirements on file, and list anything that is missing.",
        "inputs": [
          "compliance",
          "policies"
        ],
        "outputs": [
          "compliance report",
          "questions for Bruno"
        ],
        "approval": "Report only; Bruno decides on any change."
      }
    ]
  }
];

export const BUSINESS_AGENT: BusinessAgent = BUSINESS_AGENTS[0];
