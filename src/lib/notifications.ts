// Notification service (MVP).
//
// Sends a consumer confirmation and an agent new-lead alert when a lead is
// created. This is a pluggable stub: it respects the Suppression list and
// channel-level consent, logs the message, and records it on the lead's
// ActivityLog. Swap `deliver()` for Twilio (SMS) / SendGrid|Resend (email) in
// production — the call sites and compliance checks stay the same.

import { prisma } from "./db";
import { normalizeEmail, normalizePhone } from "./util";

export type Channel = "email" | "sms";

export interface NotificationInput {
  channel: Channel;
  to: string; // email address or phone number
  subject?: string;
  body: string;
}

export interface NotificationResult {
  sent: boolean;
  channel: Channel;
  to: string;
  reason?: string;
}

// Returns true if the recipient has opted out for this channel.
async function isSuppressed(channel: Channel, to: string): Promise<boolean> {
  const value = channel === "email" ? normalizeEmail(to) : normalizePhone(to);
  const hit = await prisma.suppression.findUnique({
    where: { channel_value: { channel, value } },
  });
  return Boolean(hit);
}

// Replace this with a real provider call.
async function deliver(input: NotificationInput): Promise<void> {
  const tag = input.channel === "email" ? "EMAIL" : "SMS";
  // eslint-disable-next-line no-console
  console.log(`[notify:${tag}] -> ${input.to} :: ${input.subject ?? ""} ${input.body}`);
}

export async function sendNotification(input: NotificationInput): Promise<NotificationResult> {
  if (await isSuppressed(input.channel, input.to)) {
    return { sent: false, channel: input.channel, to: input.to, reason: "recipient suppressed (opt-out)" };
  }
  await deliver(input);
  return { sent: true, channel: input.channel, to: input.to };
}

interface LeadNotifyContext {
  leadId: string;
  firstName: string;
  email: string;
  phone: string;
  productType: string;
  agencyName: string;
  emailConsent: boolean;
  smsConsent: boolean;
  agentUserId?: string | null;
}

// Fire the standard notifications for a freshly created lead.
export async function notifyOnNewLead(ctx: LeadNotifyContext): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  // 1. Consumer confirmation (respect channel consent).
  if (ctx.emailConsent) {
    results.push(
      await sendNotification({
        channel: "email",
        to: ctx.email,
        subject: `We received your ${ctx.productType} insurance request`,
        body: `Hi ${ctx.firstName}, a licensed professional from ${ctx.agencyName} may contact you shortly. Reply STOP to opt out of texts or unsubscribe from emails anytime.`,
      }),
    );
  } else if (ctx.smsConsent) {
    results.push(
      await sendNotification({
        channel: "sms",
        to: ctx.phone,
        body: `${ctx.agencyName}: thanks ${ctx.firstName}, we received your ${ctx.productType} request and an agent may text you. Reply STOP to opt out.`,
      }),
    );
  }

  // 2. Agent new-lead alert.
  if (ctx.agentUserId) {
    const agentUser = await prisma.user.findUnique({ where: { id: ctx.agentUserId } });
    if (agentUser?.email) {
      results.push(
        await sendNotification({
          channel: "email",
          to: agentUser.email,
          subject: `New ${ctx.productType} lead assigned`,
          body: `New lead ${ctx.firstName} (${ctx.productType}). Open the dashboard to review and contact.`,
        }),
      );
    }
  }

  // Record a single audit entry summarizing what was sent.
  const summary = results
    .map((r) => `${r.channel}->${r.to}: ${r.sent ? "sent" : `skipped (${r.reason})`}`)
    .join("; ");
  if (summary) {
    await prisma.activityLog.create({
      data: { leadId: ctx.leadId, type: "system", notes: `Notifications: ${summary}` },
    });
  }

  return results;
}
