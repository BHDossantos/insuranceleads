import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Querying the DB at request time — never prerender at build.
export const dynamic = "force-dynamic";

// GET /api/leads/export — CSV export of all leads (MVP requirement).
export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignedAgent: { include: { user: true } }, agency: true },
  });

  const headers = [
    "id",
    "createdAt",
    "productType",
    "firstName",
    "lastName",
    "email",
    "phone",
    "state",
    "zip",
    "leadScore",
    "temperature",
    "leadStatus",
    "assignedAgent",
    "agency",
    "duplicate",
  ];

  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = leads.map((l) =>
    [
      l.id,
      l.createdAt.toISOString(),
      l.productType,
      l.firstName,
      l.lastName,
      l.email,
      l.phone,
      l.state,
      l.zip ?? "",
      l.leadScore,
      l.temperature,
      l.leadStatus,
      l.assignedAgent ? `${l.assignedAgent.user.firstName} ${l.assignedAgent.user.lastName}` : "",
      l.agency?.name ?? "",
      l.duplicateOf ? "yes" : "no",
    ]
      .map(escape)
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
