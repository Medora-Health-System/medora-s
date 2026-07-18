/**
 * Phase 16 CLI — shadow recommendation engine (no Pilot/Enterprise Active).
 * Modes: seed | promote-shadow | list | shadow-evaluate | analytics | readiness | dashboard | pipeline
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  captureRecommendationAnalytics,
  getPhase16Readiness,
  getRecommendationGovernanceDashboard,
  listRecommendations,
  promoteWave1DraftsToShadow,
  runShadowRecommendationEvaluation,
  seedRecommendationCandidatesFromShadow,
} from "../../../src/medications/recommendation/medication-recommendation.service";

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function resolveActor(prisma: PrismaClient) {
  const envId = process.env.PHASE16_ACTOR_USER_ID;
  if (envId) {
    return {
      userId: envId,
      roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
    };
  }
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!user) throw new Error("No active user for Phase 16 CLI actor.");
  return {
    userId: user.id,
    roles: ["MEDICATION_ADMIN", "MEDORA_SUPER_ADMIN"],
  };
}

function print(payload: unknown, json: boolean) {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }
}

function writeArtifact(name: string, payload: unknown) {
  const dir = resolve(__dirname, "../audit-summaries");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, name);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

async function main() {
  const mode = process.argv[2] ?? "dashboard";
  const json = hasFlag("--json");
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const actor = await resolveActor(prisma);

    if (mode === "seed") {
      print(await seedRecommendationCandidatesFromShadow(prisma, actor), json);
      return;
    }
    if (mode === "promote-shadow") {
      print(await promoteWave1DraftsToShadow(prisma, actor), json);
      return;
    }
    if (mode === "list") {
      print(
        await listRecommendations(prisma, {
          exposableOnly: hasFlag("--exposable-only"),
          familyKey: arg("--family"),
        }),
        json
      );
      return;
    }
    if (mode === "shadow-evaluate") {
      const facility =
        arg("--facility") ??
        (
          await prisma.facility.findFirst({
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        )?.id;
      if (!facility) throw new Error("No facility for shadow evaluation.");
      if (hasFlag("--dry-run")) {
        const list = await listRecommendations(prisma, { exposableOnly: true });
        print(
          {
            dryRun: true,
            wouldEvaluate: list.length,
            mutatesOrders: false,
            mutatesMar: false,
          },
          json
        );
        return;
      }
      print(
        await runShadowRecommendationEvaluation(prisma, actor, {
          facilityId: facility,
        }),
        json
      );
      return;
    }
    if (mode === "analytics") {
      print(await captureRecommendationAnalytics(prisma, actor), json);
      return;
    }
    if (mode === "readiness") {
      print(await getPhase16Readiness(prisma), json);
      return;
    }
    if (mode === "dashboard") {
      print(await getRecommendationGovernanceDashboard(prisma), json);
      return;
    }
    if (mode === "pipeline") {
      const seeded = await seedRecommendationCandidatesFromShadow(prisma, actor);
      const promoted = await promoteWave1DraftsToShadow(prisma, actor);
      const facility =
        (
          await prisma.facility.findFirst({
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        )?.id ?? "UNKNOWN";
      const shadow =
        facility === "UNKNOWN"
          ? { skipped: true }
          : await runShadowRecommendationEvaluation(prisma, actor, {
              facilityId: facility,
            });
      const analytics = await captureRecommendationAnalytics(prisma, actor);
      const readiness = await getPhase16Readiness(prisma);
      const payload = {
        seeded,
        promoted,
        shadow,
        analytics,
        readiness,
        constitutional: {
          controlledPilotAllowed: false,
          enterpriseActiveAllowed: false,
          orderFromRecommendationAllowed: false,
          clinicalActivation: false,
        },
      };
      const path = writeArtifact(
        "medication-phase16-pipeline-results.json",
        payload
      );
      print({ path, ...payload }, json);
      return;
    }

    throw new Error(
      `Unknown mode: ${mode}. Use seed|promote-shadow|list|shadow-evaluate|analytics|readiness|dashboard|pipeline`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
