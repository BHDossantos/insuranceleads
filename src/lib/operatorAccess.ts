import { createHash, timingSafeEqual } from "node:crypto";

// A single trusted operator boundary, not agent/agency authentication. There is
// deliberately no default password or development bypass. Multi-agent access
// must wait for individual identities and assignment-scoped authorization.
export function operatorOrigin(): string | null {
  const value = process.env.INSURANCE_APP_ORIGIN;
  try {
    const url = new URL(value || "");
    if (url.origin !== value || url.username || url.password) return null;
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}

export function operatorAccess(headers: Pick<Headers, "get">, method: string): 401 | 403 | 503 | null {
  const password = process.env.INSURANCE_OPERATOR_PASSWORD;
  const origin = operatorOrigin();
  if (!password || password.length < 32 || !origin) return 503;
  const authorization = headers.get("authorization") || "";
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
  if (!match || match[1].length > 4096) return 401;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const expected = createHash("sha256").update(`operator:${password}`).digest();
  const supplied = createHash("sha256").update(decoded).digest();
  if (!timingSafeEqual(expected, supplied)) return 401;
  // Browsers cache Basic credentials. Require an exact configured origin for
  // writes so an unrelated website cannot submit an authenticated mutation.
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase()) && headers.get("origin") !== origin) return 403;
  return null;
}

export function requireOperator(request: Request): Response | null {
  const status = operatorAccess(request.headers, request.method);
  if (!status) return null;
  return Response.json({ error: status === 503 ? "Operator access is not configured" : "Operator access required" }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(status === 401 ? { "WWW-Authenticate": 'Basic realm="Insurance operator", charset="UTF-8"' } : {}),
    },
  });
}
