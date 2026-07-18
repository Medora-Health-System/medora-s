/**
 * Phase 18 CLI — defaults never increase autonomy.
 *   pnpm medication:phase18:readiness
 *   pnpm medication:phase18:seal
 *   pnpm medication:phase18:replay-all
 *   pnpm medication:phase18:drift
 *   pnpm medication:phase18:quality
 *   pnpm medication:phase18:regulatory
 *   pnpm medication:phase18:dashboard
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  captureOperationalSnapshot,
  captureQualitySnapshot,
  detectDrift,
  generateRegulatoryArtifacts,
  getOperationsCenterDashboard,
  getPhase18Readiness,
  replayRecommendation,
  sealImmutableVersions,
} from "../../../src/medications/recommendation-ops/medication-recommendation-ops.service";

const prisma = new PrismaClient();
const OUT = resolve(__dirname, "../audit-summaries");

function actor() {
  return {
    userId: process.env.PHASE18_ACTOR_USER_ID ?? "phase18-cli",
    roles: ["MEDICATION_ADMIN", "ADMIN"],
  };
}

async function resolveActorUserId() {
  const existing = await prisma.user.findFirst({ select: { id: true } });
  return existing?.id ?? actor().userId;
}

async function main() {
  const cmd = process.argv[2] ?? "readiness";
  mkdirSync(OUT, { recursive: true });
  const userId = await resolveActorUserId();
  const a = { ...actor(), userId };

  if (cmd === "readiness") {
    const r = await getPhase18Readiness(prisma);
    const path = resolve(OUT, "medication-phase18-readiness.json");
    writeFileSync(path, `${JSON.stringify(r, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ path, ...r }, null, 2));
    return;
  }

  if (cmd === "dashboard") {
    const d = await getOperationsCenterDashboard(prisma);
    const path = resolve(OUT, "medication-phase18-dashboard.json");
    writeFileSync(path, `${JSON.stringify(d, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ path, overallHealth: d.overallHealth }, null, 2));
    return;
  }

  if (cmd === "seal") {
    const r = await sealImmutableVersions(prisma, a);
    console.log(JSON.stringify(r, null, 2));
    return;
  }

  if (cmd === "quality") {
    const q = await captureQualitySnapshot(prisma);
    const path = resolve(OUT, "medication-phase18-quality.json");
    writeFileSync(path, `${JSON.stringify(q, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ path, qualityScore: q.qualityScore }, null, 2));
    return;
  }

  if (cmd === "drift") {
    const r = await detectDrift(prisma, a);
    const path = resolve(OUT, "medication-phase18-drift.json");
    writeFileSync(path, `${JSON.stringify(r, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ path, alertCount: r.alertCount }, null, 2));
    return;
  }

  if (cmd === "regulatory") {
    const r = await generateRegulatoryArtifacts(prisma, a);
    const path = resolve(OUT, "medication-phase18-regulatory.json");
    writeFileSync(path, `${JSON.stringify(r, null, 2)}\n`, "utf8");
    console.log(
      JSON.stringify({ path, count: r.artifacts.length, claimsApproval: false }, null, 2)
    );
    return;
  }

  if (cmd === "replay-all") {
    const defs = await prisma.medicationRecommendationDefinition.findMany({
      where: { lifecycleStatus: "SHADOW_RECOMMENDATION" },
      take: 50,
    });
    const results = [];
    for (const d of defs) {
      results.push(
        await replayRecommendation(prisma, a, {
          definitionId: d.id,
          recommendationVersion: d.version,
          knowledgeVersion: d.knowledgeVersion ?? undefined,
        })
      );
    }
    const matched = results.filter((r) => r.matched).length;
    const path = resolve(OUT, "medication-phase18-replay.json");
    writeFileSync(
      path,
      `${JSON.stringify({ total: results.length, matched, unmatched: results.length - matched }, null, 2)}\n`,
      "utf8"
    );
    console.log(
      JSON.stringify(
        { path, total: results.length, matched, unmatched: results.length - matched },
        null,
        2
      )
    );
    return;
  }

  if (cmd === "ops-snapshot") {
    const s = await captureOperationalSnapshot(prisma);
    console.log(JSON.stringify(s, null, 2));
    return;
  }

  throw new Error(`Unknown Phase 18 command: ${cmd}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
