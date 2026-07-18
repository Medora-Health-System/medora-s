/**
 * Phase 7 — controlled EM batch CLI.
 *
 *   pnpm --filter @medora/api medication:batch:phase7:manifest
 *   pnpm --filter @medora/api medication:batch:phase7:validate
 *   pnpm --filter @medora/api medication:batch:phase7:extract
 *   pnpm --filter @medora/api medication:batch:phase7:preview
 *   pnpm --filter @medora/api medication:batch:phase7:dedupe
 *   pnpm --filter @medora/api medication:batch:phase7:stage -- --confirm-stage
 *   pnpm --filter @medora/api medication:batch:phase7:candidates
 *   pnpm --filter @medora/api medication:batch:phase7:report
 *   pnpm --filter @medora/api medication:batch:phase7:rollback -- --confirm-rollback
 *   pnpm --filter @medora/api medication:batch:phase7:attest -- --source-checksum-verified --rollback-tested
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import {
  approveBatchManifest,
  attestPhase7BatchExecution,
  buildPhase7BatchManifestPayload,
  dedupeApproveBatch,
  extractBatch,
  generateBatchCandidates,
  getBatchReport,
  previewBatch,
  registerOrLoadBatchManifest,
  rollbackBatch,
  stageBatch,
  validateBatchSource,
  type BatchActor,
} from "../../../src/medications/batch/medication-em-batch.service";

type Mode =
  | "MANIFEST"
  | "VALIDATE"
  | "EXTRACT"
  | "PREVIEW"
  | "DEDUPE"
  | "STAGE"
  | "CANDIDATES"
  | "REPORT"
  | "ROLLBACK"
  | "ATTEST";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function resolveMode(): Mode {
  const explicit = getArg("mode")?.toUpperCase();
  const allowed: Mode[] = [
    "MANIFEST",
    "VALIDATE",
    "EXTRACT",
    "PREVIEW",
    "DEDUPE",
    "STAGE",
    "CANDIDATES",
    "REPORT",
    "ROLLBACK",
    "ATTEST",
  ];
  if (explicit && (allowed as string[]).includes(explicit)) return explicit as Mode;

  const lifecycle = process.env.npm_lifecycle_event ?? "";
  const byScript: Record<string, Mode> = {
    "medication:batch:phase7:manifest": "MANIFEST",
    "medication:batch:phase7:validate": "VALIDATE",
    "medication:batch:phase7:extract": "EXTRACT",
    "medication:batch:phase7:preview": "PREVIEW",
    "medication:batch:phase7:dedupe": "DEDUPE",
    "medication:batch:phase7:stage": "STAGE",
    "medication:batch:phase7:candidates": "CANDIDATES",
    "medication:batch:phase7:report": "REPORT",
    "medication:batch:phase7:rollback": "ROLLBACK",
    "medication:batch:phase7:attest": "ATTEST",
  };
  const mapped = byScript[lifecycle];
  if (mapped) return mapped;
  console.error(`Missing --mode= (${allowed.join("|")})`);
  process.exit(1);
}

function resolveActor(): BatchActor {
  return {
    userId:
      getArg("actor-user-id") ??
      process.env.MEDICATION_BATCH_ACTOR_USER_ID ??
      "medication-batch-cli",
    roles: (
      getArg("actor-roles") ??
      process.env.MEDICATION_BATCH_ACTOR_ROLES ??
      "MEDICATION_ADMIN"
    )
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean),
  };
}

async function main() {
  const mode = resolveMode();
  const actor = resolveActor();
  const payload = buildPhase7BatchManifestPayload();
  const allowCi = hasFlag("allow-structural-fixture-ci");

  console.log("=== Medication Intelligence Phase 7 — EM controlled batch ===");
  console.log(`Mode:                      ${mode}`);
  console.log(`BatchId:                   ${payload.batchId}`);
  console.log(`Families:                  ${payload.expectedMedicationFamilyCount}`);
  console.log(`ClinicalActivationAllowed: ${payload.clinicalActivationAllowed}`);
  console.log(`Actor:                     ${actor.userId} [${actor.roles.join(",")}]`);
  console.log(`AllowStructuralFixtureCi:  ${allowCi}`);

  const prisma = new PrismaClient();
  try {
    switch (mode) {
      case "MANIFEST": {
        const registered = await registerOrLoadBatchManifest(prisma, actor);
        if (hasFlag("approve")) {
          console.log(JSON.stringify(await approveBatchManifest(prisma, actor), null, 2));
        } else {
          console.log(
            JSON.stringify(
              {
                id: registered.id,
                batchId: registered.batchId,
                batchVersion: registered.batchVersion,
                batchManifestHash: registered.batchManifestHash,
                approvalStatus: registered.approvalStatus,
                clinicalActivationAllowed: registered.clinicalActivationAllowed,
              },
              null,
              2
            )
          );
        }
        break;
      }
      case "VALIDATE":
        console.log(
          JSON.stringify(
            await validateBatchSource(prisma, actor, { allowStructuralFixtureForCi: allowCi }),
            null,
            2
          )
        );
        break;
      case "EXTRACT":
        console.log(
          JSON.stringify(
            await extractBatch(prisma, actor, { allowStructuralFixtureForCi: allowCi }),
            null,
            2
          )
        );
        break;
      case "PREVIEW":
        console.log(JSON.stringify(await previewBatch(prisma, actor), null, 2));
        break;
      case "DEDUPE":
        console.log(JSON.stringify(await dedupeApproveBatch(prisma, actor), null, 2));
        break;
      case "STAGE":
        console.log(
          JSON.stringify(
            await stageBatch(prisma, actor, {
              confirmStage: hasFlag("confirm-stage"),
              batchId: getArg("batch-id"),
              manifestHash: getArg("manifest-hash"),
              allowStructuralFixtureForCi: allowCi,
            }),
            null,
            2
          )
        );
        break;
      case "CANDIDATES":
        console.log(JSON.stringify(await generateBatchCandidates(prisma, actor), null, 2));
        break;
      case "REPORT":
        console.log(JSON.stringify(await getBatchReport(prisma, actor), null, 2));
        break;
      case "ROLLBACK":
        console.log(
          JSON.stringify(
            await rollbackBatch(prisma, actor, {
              confirmRollback: hasFlag("confirm-rollback"),
            }),
            null,
            2
          )
        );
        break;
      case "ATTEST": {
        const result = await attestPhase7BatchExecution(prisma, actor, {
          sourceChecksumVerified: hasFlag("source-checksum-verified"),
          rollbackTested: hasFlag("rollback-tested"),
        });
        console.log(JSON.stringify(result, null, 2));
        if (result.FinalDecision !== "MEDICATION_INTELLIGENCE_PHASE_7_BATCH_ATTESTED") {
          process.exitCode = 1;
        }
        break;
      }
      default:
        throw new Error(`Unhandled mode: ${mode satisfies never}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
