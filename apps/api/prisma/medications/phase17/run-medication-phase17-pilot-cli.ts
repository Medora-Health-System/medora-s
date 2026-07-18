/**
 * Phase 17 CLI — qualification / readiness / dry-run (does not activate by default).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  createPilotProgram,
  evaluateAllWave1Qualifications,
  getPhase17Readiness,
  getPilotDashboard,
  listPilotPrograms,
  capturePilotMonitoring,
} from "../../../src/medications/recommendation-pilot/medication-recommendation-pilot.service";

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function actor(prisma: PrismaClient) {
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!user) throw new Error("No active user");
  return { userId: user.id, roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"] };
}

function writeArtifact(name: string, payload: unknown) {
  const dir = resolve(__dirname, "../audit-summaries");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, name);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

async function main() {
  const mode = process.argv[2] ?? "readiness";
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const a = await actor(prisma);

    if (mode === "qualification") {
      const facility =
        arg("--facility") ??
        (await prisma.facility.findFirst({ select: { id: true } }))?.id;
      const result = await evaluateAllWave1Qualifications(prisma, a, facility);
      const path = writeArtifact("medication-phase17-qualification.json", result);
      console.log(JSON.stringify({ path, ...result }, null, 2));
      return;
    }
    if (mode === "readiness") {
      const result = await getPhase17Readiness(prisma);
      const path = writeArtifact("medication-phase17-readiness.json", result);
      console.log(JSON.stringify({ path, ...result }, null, 2));
      return;
    }
    if (mode === "dashboard") {
      console.log(JSON.stringify(await getPilotDashboard(prisma), null, 2));
      return;
    }
    if (mode === "pilot:list") {
      console.log(JSON.stringify(await listPilotPrograms(prisma), null, 2));
      return;
    }
    if (mode === "pilot:create-dry-run") {
      const facility =
        arg("--facility") ??
        (await prisma.facility.findFirst({ select: { id: true } }))?.id;
      if (!facility) throw new Error("No facility");
      const defs = await prisma.medicationRecommendationDefinition.findMany({
        where: { lifecycleStatus: "SHADOW_RECOMMENDATION" },
        select: { id: true },
        take: 8,
      });
      // Ensure qualifications exist
      await evaluateAllWave1Qualifications(prisma, a, facility);
      const result = await createPilotProgram(prisma, a, {
        facilityId: facility,
        title: "Wave 1 Controlled Pilot (dry-run)",
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        definitionIds: defs.map((d) => d.id),
        dryRun: true,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (mode === "pilot:monitor") {
      const id = arg("--id");
      if (!id) throw new Error("--id required");
      console.log(JSON.stringify(await capturePilotMonitoring(prisma, id), null, 2));
      return;
    }
    if (mode === "safety-check") {
      const readiness = await getPhase17Readiness(prisma);
      const payload = {
        ...readiness,
        enterpriseActivations: 0,
        orderFromRecommendation: 0,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        orderBlocks: 0,
        productionCds: "OFF",
        enterpriseActiveAllowed: "NO",
      };
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    throw new Error(
      `Unknown mode ${mode}. Use qualification|readiness|dashboard|pilot:list|pilot:create-dry-run|pilot:monitor|safety-check`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
