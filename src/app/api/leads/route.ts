import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createLead, leadInputSchema } from "@/lib/leadService";

// GET /api/leads?status=&temperature=&product=&agentId=&q=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const where: Record<string, unknown> = {};
  if (sp.get("status")) where.leadStatus = sp.get("status");
  if (sp.get("temperature")) where.temperature = sp.get("temperature");
  if (sp.get("product")) where.productType = sp.get("product");
  if (sp.get("agentId")) where.assignedAgentId = sp.get("agentId");
  const q = sp.get("q");
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      assignedAgent: { include: { user: true } },
      agency: true,
    },
  });

  return NextResponse.json({ count: leads.length, leads });
}

// POST /api/leads — public intake endpoint.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, errors: ["Invalid JSON body"] }, { status: 400 });
  }

  const parsed = leadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 422 },
    );
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const result = await createLead(parsed.data, { ipAddress, userAgent });
  return NextResponse.json(result, { status: result.ok ? 201 : 422 });
}
