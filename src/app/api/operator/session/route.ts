import { requireOperator, operatorOrigin } from "@/lib/operatorAccess";

export const dynamic = "force-dynamic";

// Browser entry point for the internal operator console. No password is
// generated or stored in the application database by this endpoint.
export async function GET(request: Request) {
  const denied = requireOperator(request);
  if (denied) return denied;
  return new Response(null, {
    status: 303,
    headers: { Location: `${operatorOrigin()}/admin`, "Cache-Control": "no-store" },
  });
}
