// The old unsigned handler allowed forged START events to remove suppression.
// Re-enable only with provider verification, URL binding, durable deduplication
// and reviewed opt-in semantics. No live provider settings are changed here.
export const dynamic = "force-dynamic";
export async function POST(_request: Request) {
  return Response.json({ error: "Authenticated SMS webhook is not configured" }, {
    status: 503, headers: { "Cache-Control": "no-store" },
  });
}
