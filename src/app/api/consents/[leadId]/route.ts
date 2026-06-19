import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/consents/:leadId — compliance retrieval of the stored consent record.
export async function GET(_req: NextRequest, { params }: { params: { leadId: string } }) {
  const consent = await prisma.consentRecord.findUnique({
    where: { leadId: params.leadId },
  });
  if (!consent) return NextResponse.json({ error: "Consent record not found" }, { status: 404 });
  return NextResponse.json(consent);
}
