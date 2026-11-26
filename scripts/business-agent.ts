// Run the insurance business agent (ported from Jennifer) from your own computer:
//
//   BUSINESS_AGENT_ENABLED=true ANTHROPIC_API_KEY=... npm run agent -- prospects [notes.txt]
//
// It reads lead counts from the database (never names or contact details),
// adds the notes file if you give one (treated as untrusted), and prints the
// agent's proposals. It is not exposed on the web, and nothing is sent, stored
// or changed: every proposal waits for Bruno.

import fs from "node:fs";
import { prisma } from "../src/lib/db";
import { BUSINESS_AGENT } from "../src/lib/agent/charter";
import { runBusinessTask, type Evidence } from "../src/lib/agent/core";
import { agentOffReason, providerFromEnv } from "../src/lib/agent/provider";

async function leadCounts(): Promise<Evidence[]> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [total, recent, byProduct, byState, byStatus] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.lead.groupBy({ by: ["productType"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["state"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["leadStatus"], _count: { _all: true } }),
  ]);
  const list = (rows: Array<Record<string, unknown> & { _count: { _all: number } }>, key: string) =>
    rows.map((r) => `${String(r[key])}: ${r._count._all}`).join(", ") || "none";
  return [{
    sourceId: "crm:leads",
    title: "Lead counts",
    trusted: true,
    text: `Leads in total: ${total}. New in the last 30 days: ${recent}. By product: ${list(byProduct, "productType")}. By state: ${list(byState, "state")}. By stage: ${list(byStatus, "leadStatus")}.`,
  }];
}

async function main() {
  const [taskId, notesFile] = process.argv.slice(2);
  if (!taskId) {
    console.log(`Usage: npm run agent -- <task> [notes.txt]\nTasks: ${BUSINESS_AGENT.tasks.map((t) => t.id).join(", ")}`);
    return;
  }
  const off = agentOffReason();
  if (off) {
    console.error(off);
    process.exitCode = 1;
    return;
  }
  const evidence = await leadCounts();
  if (notesFile) evidence.push({ sourceId: "admin:notes", title: "Notes from Bruno", text: fs.readFileSync(notesFile, "utf8").slice(0, 8000) });
  const result = await runBusinessTask({ agent: BUSINESS_AGENT, taskId, evidence, model: providerFromEnv() });
  console.log(JSON.stringify(result, null, 2));
}

main().finally(() => prisma.$disconnect());
