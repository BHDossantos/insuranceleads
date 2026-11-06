import { prisma } from "@/lib/db";
import { parseSmsKeyword } from "@/lib/sms";
import { normalizePhone } from "@/lib/util";
import { validTwilioSignature } from "@/lib/twilioSignature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const path = "/api/webhooks/twilio/sms";
function failure(status: number) {
  return Response.json({ error: "SMS webhook unavailable or invalid" }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const canonical = process.env.TWILIO_SMS_WEBHOOK_URL;
  if (!token || !canonical) return failure(503);
  let configured: URL;
  try {
    configured = new URL(canonical);
    if (configured.protocol !== "https:" || configured.username || configured.password ||
        configured.hash || configured.pathname !== path || configured.href !== canonical) return failure(503);
  } catch { return failure(503); }
  // Bind signatures to operator configuration, never Host or forwarded headers.
  const actual = new URL(request.url);
  if (actual.pathname !== configured.pathname || actual.search !== configured.search) return failure(403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/x-www-form-urlencoded") return failure(415);
  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!/^[A-Za-z0-9+/]{27}=$/.test(signature)) return failure(403);
  const reader = request.body?.getReader();
  if (!reader) return failure(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64 * 1024) { await reader.cancel(); return failure(413); }
      chunks.push(value);
    }
  } catch { return failure(400); }
  const fields = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  if (!validTwilioSignature(token, canonical, fields, signature)) return failure(403);
  const from = fields.get("From") ?? "";
  if (!/^\+[1-9]\d{7,14}$/.test(from) || !fields.has("Body")) return failure(400);
  if (parseSmsKeyword(fields.get("Body")!) === "opt_out") {
    try {
      // Monotonic durable upsert: retries cannot remove existing suppression.
      await prisma.suppression.upsert({
        where: { channel_value: { channel: "sms", value: normalizePhone(from) } },
        update: {},
        create: { channel: "sms", value: normalizePhone(from), reason: "sms_stop" },
      });
    } catch { return failure(503); } // Never acknowledge a lost opt-out.
  }
  // START never clears global suppression: replayable signatures cannot prove
  // fresh seller-specific consent. No outgoing SMS is generated here.
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
    headers: { "Content-Type": "text/xml", "Cache-Control": "no-store" },
  });
}
