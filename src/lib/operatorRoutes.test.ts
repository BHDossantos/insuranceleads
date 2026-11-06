import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const db = vi.hoisted(() => ({ call: vi.fn(() => { throw new Error("Unexpected database access"); }) }));
vi.mock("@/lib/db", () => {
  const proxy: any = new Proxy(() => {}, { get: () => proxy, apply: () => db.call() });
  return { prisma: proxy };
});
const routes = {
  'campaigns': () => import('../app/api/campaigns/route'),
  'leads': () => import('../app/api/leads/route'),
  'agencies': () => import('../app/api/agencies/route'),
  'agents': () => import('../app/api/agents/route'),
  'campaigns/[id]': () => import('../app/api/campaigns/[id]/route'),
  'consents/[leadId]': () => import('../app/api/consents/[leadId]/route'),
  'leads/export': () => import('../app/api/leads/export/route'),
  'leads/[id]': () => import('../app/api/leads/[id]/route'),
  'leads/[id]/activity': () => import('../app/api/leads/[id]/activity/route'),
  'leads/[id]/assign': () => import('../app/api/leads/[id]/assign/route'),
  'leads/[id]/status': () => import('../app/api/leads/[id]/status/route'),
  'leads/[id]/outcome': () => import('../app/api/leads/[id]/outcome/route'),
  'leads/[id]/tasks': () => import('../app/api/leads/[id]/tasks/route'),
  'reports/dashboard': () => import('../app/api/reports/dashboard/route'),
  'agents/[id]': () => import('../app/api/agents/[id]/route'),
};
beforeEach(() => {
  db.call.mockClear();
  vi.stubEnv("INSURANCE_OPERATOR_PASSWORD", "test-password-for-operator-at-least-32-chars");
  vi.stubEnv("INSURANCE_APP_ORIGIN", "https://insurance.example.test");
});
afterEach(() => vi.unstubAllEnvs());
for (const [path, load] of Object.entries(routes)) {
  it(`protects every private handler in ${path} before database access`, async () => {
    const module = await load();
    for (const [method, handler] of Object.entries(module)) {
      if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method)) continue;
      if (path === 'leads' && method === 'POST') continue;
      for (const configured of [true, false]) {
        if (!configured) vi.stubEnv("INSURANCE_OPERATOR_PASSWORD", "");
        const req = new NextRequest(`https://insurance.example.test/api/${path}`, {
          method, headers: { "x-user-role": "admin", "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware" },
        });
        const response = await (handler as Function)(req, { params: { id: 'other-agent-lead', leadId: 'other-agent-lead' } });
        expect(response.status).toBe(configured ? 401 : 503);
        expect(db.call).not.toHaveBeenCalled();
      }
      vi.stubEnv("INSURANCE_OPERATOR_PASSWORD", "test-password-for-operator-at-least-32-chars");
    }
  });
}
it("retains public intake validation without operator credentials", async () => {
  const { POST } = await import("../app/api/leads/route");
  const response = await POST(new NextRequest("https://insurance.example.test/api/leads", { method: "POST", body: "{}" }));
  expect(response.status).toBe(422);
  expect(db.call).not.toHaveBeenCalled();
});
it("lets the configured operator reach the lead read handler", async () => {
  db.call.mockImplementationOnce(() => [] as never);
  const { GET } = await import("../app/api/leads/route");
  const authorization = `Basic ${Buffer.from("operator:test-password-for-operator-at-least-32-chars").toString("base64")}`;
  const response = await GET(new NextRequest("https://insurance.example.test/api/leads", { headers: { authorization } }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ count: 0, leads: [] });
  expect(db.call).toHaveBeenCalledTimes(1);
});
it("rejects forged SMS events without changing suppression", async () => {
  const { POST } = await import("../app/api/webhooks/twilio/sms/route");
  const request = new NextRequest("https://insurance.example.test/api/webhooks/twilio/sms", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ From: "+12025550123", Body: "START" }),
  });
  expect((await POST(request)).status).toBe(503);
  expect(db.call).not.toHaveBeenCalled();
});
