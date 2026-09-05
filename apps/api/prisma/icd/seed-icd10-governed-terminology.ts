/**
 * Import the current 89 governed FR/ES clinician labels into Icd10DiagnosisTerminology.
 * Source of truth: @medora/shared GOVERNED_ICD10_CLINICIAN_LABELS.
 * Does not rewrite Diagnosis rows. Rejects codes missing from the target release.
 *
 *   pnpm --filter @medora/api run icd:seed-governed-terminology
 *   pnpm --filter @medora/api run icd:seed-governed-terminology -- --dry-run
 *   pnpm --filter @medora/api run icd:seed-governed-terminology -- --release=FY2026
 */
import { PrismaClient } from "@prisma/client";
import {
  buildGovernedIcd10TerminologySeedPlan,
  GOVERNED_ICD10_CLINICIAN_LABELS,
  ICD10_CM_CODE_SYSTEM,
  inspectGovernedIcd10ClinicianLabels,
} from "@medora/shared";
import { recomputeIcd10EffectiveClinicianLabels } from "../../src/diagnoses/icd10-terminology-effective";

const DEFAULT_RELEASE = "FY2026";

function parseArgs(argv: string[]) {
  let releaseVersion = DEFAULT_RELEASE;
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--release=")) releaseVersion = arg.slice("--release=".length).trim() || DEFAULT_RELEASE;
  }
  return { releaseVersion, dryRun };
}

export async function seedGovernedIcd10Terminology(
  prisma: PrismaClient,
  options: { releaseVersion: string; dryRun: boolean },
) {
  const inspection = inspectGovernedIcd10ClinicianLabels(GOVERNED_ICD10_CLINICIAN_LABELS);
  console.log(`SEED_SOURCE=packages/shared/src/icd10/governedIcd10ClinicianLabels.ts`);
  console.log(`FR_COUNT=${inspection.frCount}`);
  console.log(`ES_COUNT=${inspection.esCount}`);
  console.log(`DUPLICATE_CODES=${inspection.duplicateCodes.length}`);
  console.log(`MISSING_PAIR_CODES=${inspection.missingPairCodes.length}`);
  console.log(`EMPTY_LABELS=${inspection.emptyLabels.length}`);
  console.log(`INVALID_LOCALE=${inspection.invalidLocale.length}`);

  const catalogRows = await prisma.icd10DiagnosisCode.findMany({
    where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: options.releaseVersion },
    select: {
      id: true,
      code: true,
      normalizedCode: true,
      codeSystem: true,
      releaseVersion: true,
    },
  });
  const catalogByNormalizedCode = new Map(catalogRows.map((row) => [row.normalizedCode, row]));
  const plan = buildGovernedIcd10TerminologySeedPlan({
    catalogByNormalizedCode,
    expectedReleaseVersion: options.releaseVersion,
  });

  console.log(`RELEASE=${options.releaseVersion}`);
  console.log(`DETECTED_FR=${plan.detectedFr}`);
  console.log(`DETECTED_ES=${plan.detectedEs}`);
  console.log(`ACCEPTED_TERMINOLOGY=${plan.acceptedTerminology.length}`);
  console.log(`ACCEPTED_ALIASES=${plan.acceptedAliases.length}`);
  console.log(`REJECTED=${plan.rejected.length}`);
  console.log(`TERMINOLOGY_VERSION=${plan.terminologyVersion}`);
  for (const row of plan.rejected) {
    console.log(`REJECT ${row.locale} ${row.normalizedCode} ${row.reason}`);
  }

  if (options.dryRun) {
    console.log("DRY_RUN=YES");
    return plan;
  }

  await prisma.$transaction(async (tx) => {
    for (const row of plan.acceptedTerminology) {
      await tx.icd10DiagnosisTerminology.upsert({
        where: {
          codeSystem_releaseVersion_code_locale_labelRegister_provenance_sourceId_terminologyVersion: {
            codeSystem: row.codeSystem,
            releaseVersion: row.releaseVersion,
            code: row.code,
            locale: row.locale,
            labelRegister: row.labelRegister,
            provenance: row.provenance,
            sourceId: row.sourceId,
            terminologyVersion: row.terminologyVersion,
          },
        },
        create: {
          icd10CatalogId: row.icd10CatalogId,
          codeSystem: row.codeSystem,
          releaseVersion: row.releaseVersion,
          code: row.code,
          normalizedCode: row.normalizedCode,
          locale: row.locale,
          preferredLabel: row.preferredLabel,
          labelRegister: row.labelRegister,
          provenance: row.provenance,
          exactness: row.exactness,
          sourceId: row.sourceId,
          terminologyVersion: row.terminologyVersion,
          sourcePriority: row.sourcePriority,
          status: row.status,
          isEffective: false,
          reviewedAt: new Date(),
        },
        update: {
          preferredLabel: row.preferredLabel,
          exactness: row.exactness,
          terminologyVersion: row.terminologyVersion,
          sourcePriority: row.sourcePriority,
          status: row.status,
          reviewedAt: new Date(),
        },
      });
    }
    await recomputeIcd10EffectiveClinicianLabels(
      tx,
      plan.acceptedTerminology.map((row) => ({
        codeSystem: row.codeSystem,
        releaseVersion: row.releaseVersion,
        code: row.code,
        locale: row.locale,
      })),
    );
    for (const row of plan.acceptedAliases) {
      await tx.icd10DiagnosisSearchAlias.upsert({
        where: {
          codeSystem_releaseVersion_code_locale_aliasText: {
            codeSystem: row.codeSystem,
            releaseVersion: row.releaseVersion,
            code: row.code,
            locale: row.locale,
            aliasText: row.aliasText,
          },
        },
        create: row,
        update: {
          provenance: row.provenance,
          sourceId: row.sourceId,
          terminologyVersion: row.terminologyVersion,
          status: row.status,
        },
      });
    }
  });

  return plan;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    const plan = await seedGovernedIcd10Terminology(prisma, options);
    if (plan.rejected.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
