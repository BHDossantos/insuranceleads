import { NextResponse } from "next/server";
import { buildDashboardReport } from "@/lib/reports";

// GET /api/reports/dashboard
export async function GET() {
  const report = await buildDashboardReport();
  return NextResponse.json(report);
}
