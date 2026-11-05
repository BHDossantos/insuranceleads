import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { operatorAccess, requireOperator } from "./operatorAccess";

const password = "test-only-operator-password-32-characters";
const authorization = `Basic ${Buffer.from(`operator:${password}`).toString("base64")}`;
const origin = "https://insurance.example.test";

beforeEach(() => {
  vi.stubEnv("INSURANCE_OPERATOR_PASSWORD", password);
  vi.stubEnv("INSURANCE_APP_ORIGIN", origin);
});
afterEach(() => vi.unstubAllEnvs());

describe("operator boundary", () => {
  it.each(["", "short"])("fails closed for missing/weak configuration %s", (value) => {
    vi.stubEnv("INSURANCE_OPERATOR_PASSWORD", value);
    expect(operatorAccess(new Headers({ authorization }), "GET")).toBe(503);
  });
  it.each(["", "http://untrusted.test", "https://insurance.example.test/", "https://user:pass@insurance.example.test"])("rejects invalid configured origin %s", (value) => {
    vi.stubEnv("INSURANCE_APP_ORIGIN", value);
    expect(operatorAccess(new Headers({ authorization }), "GET")).toBe(503);
  });
  it("rejects loopback HTTP in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INSURANCE_APP_ORIGIN", "http://localhost:3000");
    expect(operatorAccess(new Headers({ authorization }), "GET")).toBe(503);
  });
  it.each(["", "Bearer anything", "Basic !!!", `Basic ${Buffer.from("agent:wrong").toString("base64")}`])("rejects absent/invalid credentials", (value) => {
    expect(operatorAccess(new Headers({ authorization: value, "x-user-role": "admin", "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware" }), "GET")).toBe(401);
  });
  it("allows the configured operator to read", () => {
    expect(operatorAccess(new Headers({ authorization }), "GET")).toBeNull();
  });
  it.each(["POST", "PUT", "PATCH", "DELETE"])("requires exact origin for %s", (method) => {
    for (const value of ["", "null", "https://attacker.test", `${origin}.attacker.test`]) {
      expect(operatorAccess(new Headers({ authorization, origin: value }), method)).toBe(403);
    }
    expect(operatorAccess(new Headers({ authorization, origin }), method)).toBeNull();
  });
  it("challenges without leaking credentials and disallows caching denial", async () => {
    const denied = requireOperator(new Request(`${origin}/api/leads`))!;
    expect(denied.status).toBe(401);
    expect(denied.headers.get("www-authenticate")).toContain("Basic");
    expect(denied.headers.get("cache-control")).toBe("no-store");
    expect(await denied.text()).not.toContain(password);
  });
});
