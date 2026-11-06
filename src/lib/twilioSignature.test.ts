import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { validTwilioSignature } from "./twilioSignature";
const db = vi.hoisted(() => ({ upsert: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { suppression: db } }));
import { POST } from "../app/api/webhooks/twilio/sms/route";
const url = "https://insurance.example.test/api/webhooks/twilio/sms?source=inbound";
const token = "test-token-not-a-live-credential";
function request(body = "STOP", overrides: Record<string, string> = {}, target = url) {
  const fields = new URLSearchParams({ From: "+12025550123", Body: body, MessageSid: "SMtest", NewProviderField: " retained " });
  const payload = url + Array.from(fields.keys()).sort().map(k => k + fields.get(k)).join("");
  const signature = createHmac("sha1", token).update(payload).digest("base64");
  return new Request(target, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": signature, ...overrides }, body: fields.toString() });
}
beforeEach(() => {
  vi.stubEnv("TWILIO_AUTH_TOKEN", token);
  vi.stubEnv("TWILIO_SMS_WEBHOOK_URL", url);
  vi.clearAllMocks();
  db.upsert.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());
it("matches Twilio's published independent signature vector", () => {
  const fields = new URLSearchParams({ CallSid: "CA1234567890ABCDE", Caller: "+14158675310", Digits: "1234", From: "+14158675310", To: "+18005551212" });
  expect(validTwilioSignature("12345", "https://example.com/myapp.php?foo=1&bar=2", fields, "L/OH5YylLD5NRKLltdqwSvS0BnU=")).toBe(true);
  fields.append("From", "+18005550000");
  expect(validTwilioSignature("12345", "https://example.com/myapp.php?foo=1&bar=2", fields, "L/OH5YylLD5NRKLltdqwSvS0BnU=")).toBe(false);
});
it.each(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"])("persists signed %s before acknowledging", async body => {
  const response = await POST(request(body));
  expect(response.status).toBe(200);
  expect(db.upsert).toHaveBeenCalledWith({ where: { channel_value: { channel: "sms", value: "2025550123" } }, update: {}, create: { channel: "sms", value: "2025550123", reason: "sms_stop" } });
  expect(await response.text()).not.toContain("<Message>");
});
it("allows retries through a unique-key upsert without removing suppression", async () => {
  await POST(request()); await POST(request());
  expect(db.upsert).toHaveBeenCalledTimes(2);
  expect(db.delete).not.toHaveBeenCalled();
});
it.each(["START", "YES", "UNSTOP", "HELP", "hello"])("never removes suppression or sends SMS for %s", async body => {
  expect((await POST(request(body))).status).toBe(200);
  expect(db.upsert).not.toHaveBeenCalled(); expect(db.delete).not.toHaveBeenCalled();
});
it("returns retryable failure when STOP storage fails", async () => {
  db.upsert.mockRejectedValueOnce(new Error("offline"));
  expect((await POST(request())).status).toBe(503);
});
it.each(["", "forged", "AAAAAAAAAAAAAAAAAAAAAAAAAAA="])("rejects invalid signature %s before DB", async signature => {
  expect((await POST(request("STOP", { "x-twilio-signature": signature }))).status).toBe(403);
  expect(db.upsert).not.toHaveBeenCalled();
});
it("rejects tampered content, URL, and JSON", async () => {
  const signed = request();
  const body = (await signed.text()).replace("STOP", "START");
  expect((await POST(new Request(url, { method: "POST", headers: signed.headers, body }))).status).toBe(403);
  expect((await POST(request("STOP", {}, url + "x"))).status).toBe(403);
  expect((await POST(request("STOP", { "content-type": "application/json" }))).status).toBe(415);
  expect(db.upsert).not.toHaveBeenCalled();
});
it("uses configured public URL behind a proxy, ignoring forwarded host", async () => {
  expect((await POST(request("STOP", { "x-forwarded-host": "attacker.test" }, "http://localhost:3000/api/webhooks/twilio/sms?source=inbound"))).status).toBe(200);
});
it.each(["", "http://insurance.example.test/api/webhooks/twilio/sms", url + "#fragment", "https://insurance.example.test/other"])("fails closed for invalid configuration %s", async value => {
  vi.stubEnv("TWILIO_SMS_WEBHOOK_URL", value);
  expect((await POST(request())).status).toBe(503);
  expect(db.upsert).not.toHaveBeenCalled();
});
it("fails closed without token and bounds body size", async () => {
  vi.stubEnv("TWILIO_AUTH_TOKEN", "");
  expect((await POST(request())).status).toBe(503);
  vi.stubEnv("TWILIO_AUTH_TOKEN", token);
  expect((await POST(request("x".repeat(65536)))).status).toBe(413);
  expect(db.upsert).not.toHaveBeenCalled();
});
