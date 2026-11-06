import { requireOperator, operatorOrigin } from "@/lib/operatorAccess";

export const dynamic = "force-dynamic";

// Browser entry point for the internal operator console. No password is
// generated or stored in the application database by this endpoint.
// Keep the challenge at a root-level URI: Basic authentication's protection
// space must cover /admin, /agent and /api, rather than only an API subdirectory.
export async function GET(request: Request) {
  const denied = requireOperator(request);
  if (denied) return denied;
  return new Response(null, {
    status: 303,
    headers: { Location: `${operatorOrigin()}/admin`, "Cache-Control": "no-store" },
  });
}
