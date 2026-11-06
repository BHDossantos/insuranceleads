import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ db: vi.fn(() => { throw new Error("Private data queried"); }) }));
vi.mock("@/lib/db", () => {
  const proxy: any = new Proxy(() => {}, { get: () => proxy, apply: () => state.db() });
  return { prisma: proxy };
});
vi.mock("next/headers", () => ({ headers: () => new Headers({ "x-user-role": "admin" }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
beforeEach(() => {
  state.db.mockClear();
  vi.stubEnv("INSURANCE_OPERATOR_PASSWORD", "test-password-for-operator-at-least-32-chars");
  vi.stubEnv("INSURANCE_APP_ORIGIN", "https://insurance.example.test");
});
afterEach(() => vi.unstubAllEnvs());

it("denies direct rendering of every private page before reading data", async () => {
  const modules = await Promise.all([
    import("../app/admin/page"), import("../app/admin/agents/page"),
    import("../app/admin/campaigns/page"), import("../app/agent/page"),
    import("../app/agent/leads/[id]/page"),
  ]);
  for (const module of modules) {
    await expect((module.default as Function)({ params: { id: "private" }, searchParams: {} })).rejects.toThrow("NOT_FOUND");
  }
  expect(state.db).not.toHaveBeenCalled();
});
