import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSmsKeyword, SMS_REPLIES } from "@/lib/sms";
import { normalizePhone } from "@/lib/util";

export const dynamic = "force-dynamic";

// POST /api/webhooks/twilio/sms
// Twilio posts inbound SMS as application/x-www-form-urlencoded (From, Body).
// We honor STOP/START/HELP against the suppression list (TCPA/CTIA) and reply
// with TwiML. JSON bodies are also accepted for easy testing.
export async function POST(req: NextRequest) {
  let from = "";
  let body = "";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    from = String(json.From ?? json.from ?? "");
    body = String(json.Body ?? json.body ?? "");
  } else {
    const form = await req.formData().catch(() => null);
    if (form) {
      from = String(form.get("From") ?? "");
      body = String(form.get("Body") ?? "");
    }
  }

  const action = parseSmsKeyword(body);
  const phone = normalizePhone(from);

  if (phone && action === "opt_out") {
    await prisma.suppression.upsert({
      where: { channel_value: { channel: "sms", value: phone } },
      update: { reason: "sms_stop" },
      create: { channel: "sms", value: phone, reason: "sms_stop" },
    });
  } else if (phone && action === "opt_in") {
    await prisma.suppression
      .delete({ where: { channel_value: { channel: "sms", value: phone } } })
      .catch(() => undefined); // ignore if not present
  }

  const reply = action === "none" ? "" : SMS_REPLIES[action];
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>${
    reply ? `<Message>${reply}</Message>` : ""
  }</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
