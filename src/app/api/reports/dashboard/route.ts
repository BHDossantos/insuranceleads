import { requireOperator } from "@/lib/operatorAccess";
import { NextResponse } from "next/server";
import { buildDashboardReport } from "@/lib/reports";

// Querying the DB at request time — never prerender at build.
export const dynamic = "force-dynamic";

// GET /api/reports/dashboard
export async function GET(req: Request) {
  const denied = requireOperator(req);
  if (denied) return denied;
  const report = await buildDashboardReport();
  return NextResponse.json(report);
}
