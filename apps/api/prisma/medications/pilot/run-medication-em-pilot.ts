/**
 * Phase 6.5 — controlled Emergency Medicine pilot CLI.
 *
 *   pnpm --filter @medora/api medication:pilot:manifest
 *   pnpm --filter @medora/api medication:pilot:validate
 *   pnpm --filter @medora/api medication:pilot:dedupe
 *   pnpm --filter @medora/api medication:pilot:preview
 *   pnpm --filter @medora/api medication:pilot:stage -- --confirm-stage
 *   pnpm --filter @medora/api medication:pilot:candidates
 *   pnpm --filter @medora/api medication:pilot:report
 *   pnpm --filter @medora/api medication:pilot:rollback -- --confirm-rollback
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import {
  approvePilotManifest,
  buildEmPilotManifestPayload,
  dedupePilot,
  generatePilotCandidates,
  getPilotReport,
  previewPilot,
  registerOrLoadPilotManifest,
  rollbackPilot,
  stagePilot,
  validatePilot,
  type PilotActor,
} from "../../../src/medications/pilot/medication-em-pilot.service";

type PilotMode =
  | "MANIFEST"
  | "VALIDATE"
  | "DEDUPE"
  | "PREVIEW"
  | "STAGE"
  | "CANDIDATES"
  | "REPORT"
  | "ROLLBACK";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function resolveMode(): PilotMode {
  const explicit = getArg("mode")?.toUpperCase();
  const allowed: PilotMode[] = [
    "MANIFEST",
    "VALIDATE",
    "DEDUPE",
    "PREVIEW",
    "STAGE",
    "CANDIDATES",
    "REPORT",
    "ROLLBACK",
  ];
  if (explicit && (allowed as string[]).includes(explicit)) {
    return explicit as PilotMode;
  }

  const lifecycle = process.env.npm_lifecycle_event ?? "";
  const byScript: Record<string, PilotMode> = {
    "medication:pilot:manifest": "MANIFEST",
    "medication:pilot:validate": "VALIDATE",
    "medication:pilot:dedupe": "DEDUPE",
    "medication:pilot:preview": "PREVIEW",
    "medication:pilot:stage": "STAGE",
    "medication:pilot:candidates": "CANDIDATES",
    "medication:pilot:report": "REPORT",
    "medication:pilot:rollback": "ROLLBACK",
  };
  const mapped = byScript[lifecycle];
  if (mapped) return mapped;

  console.error(`Missing --mode= (${allowed.join("|")})`);
  process.exit(1);
}

function resolveActor(): PilotActor {
  const userId =
    getArg("actor-user-id") ??
    process.env.MEDICATION_PILOT_ACTOR_USER_ID ??
    "medication-pilot-cli";
  const rolesRaw =
    getArg("actor-roles") ??
    process.env.MEDICATION_PILOT_ACTOR_ROLES ??
    "MEDICATION_ADMIN";
  return {
    userId,
    roles: rolesRaw
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean),
  };
}

async function main() {
  const mode = resolveMode();
  const actor = resolveActor();
  const payload = buildEmPilotManifestPayload();

  console.log("=== Medication Intelligence Phase 6.5 — EM controlled pilot ===");
  console.log(`Mode:                        ${mode}`);
  console.log(`PilotId:                     ${payload.pilotId}`);
  console.log(`Expected medications:        ${payload.medicationCountExpected}`);
  console.log(`ClinicalActivationAllowed:   ${payload.clinicalActivationAllowed}`);
  console.log(`Actor:                       ${actor.userId} [${actor.roles.join(",")}]`);

  const prisma = new PrismaClient();
  try {
    switch (mode) {
      case "MANIFEST": {
        const registered = await registerOrLoadPilotManifest(prisma, actor);
        if (hasFlag("approve")) {
          const approved = await approvePilotManifest(prisma, actor);
          console.log(JSON.stringify({ ...registered, ...approved }, null, 2));
        } else {
          console.log(
            JSON.stringify(
              {
                ...registered,
                sourceManifestHash: payload.sourceManifestHash,
                clinicalDomain: payload.clinicalDomain,
                dataClassification: payload.dataClassification,
                note: "Manifest validated/registered; no medication records written.",
              },
              null,
              2
            )
          );
        }
        break;
      }
      case "VALIDATE": {
        console.log(JSON.stringify(await validatePilot(prisma, actor), null, 2));
        break;
      }
      case "DEDUPE": {
        const { preview, assessments } = await dedupePilot(prisma, actor);
        console.log(
          JSON.stringify(
            {
              persistedAssessments: assessments.length,
              preview,
              clinicalActivations: 0,
              note: "Duplicate assessments only — no canonical medication records created.",
            },
            null,
            2
          )
        );
        break;
      }
      case "PREVIEW": {
        console.log(JSON.stringify(await previewPilot(prisma, actor), null, 2));
        break;
      }
      case "STAGE": {
        console.log(
          JSON.stringify(
            await stagePilot(prisma, actor, { confirmStage: hasFlag("confirm-stage") }),
            null,
            2
          )
        );
        break;
      }
      case "CANDIDATES": {
        console.log(JSON.stringify(await generatePilotCandidates(prisma, actor), null, 2));
        break;
      }
      case "REPORT": {
        console.log(JSON.stringify(await getPilotReport(prisma, actor), null, 2));
        break;
      }
      case "ROLLBACK": {
        console.log(
          JSON.stringify(
            await rollbackPilot(prisma, actor, {
              confirmRollback: hasFlag("confirm-rollback"),
            }),
            null,
            2
          )
        );
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
