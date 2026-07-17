/**
 * Certify psychiatric/behavioral ICD coverage (Phase 18) against official FY2026.
 *
 *   pnpm --filter @medora/api icd:coverage:psychiatric-behavioral -- \
 *     --file=/path/to/official-release.zip --release=2026 --write-reports
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  selectDeliriumCognitiveScopedCodes,
  selectEatingDisorderScopedCodes,
  selectNeurodevelopmentalScopedCodes,
  selectPsychiatricBehavioralScopedCodes,
  selectPsychoticMoodAnxietyScopedCodes,
  selectPuerperalMentalScopedCodes,
  selectRefusalLegalScopedCodes,
  selectSuicideSelfHarmScopedCodes,
} from "./icd10-psychiatric-behavioral-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const file = arg("file");
  const release = arg("release") ?? "2026";
  if (!file) throw new Error("Missing --file=/path/to/official-release.zip");
  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: flag("allow-dev-sample"),
    skipChecksum: flag("skip-checksum"),
  });
  if (!validation.ok || !validation.parse) {
    throw new Error(`Official release validation failed: ${validation.errors.join("; ")}`);
  }

  const rows = validation.parse.rows;
  const scoped = selectPsychiatricBehavioralScopedCodes(rows, { billableOnly: true });
  const suicideSelfHarm = selectSuicideSelfHarmScopedCodes(rows, { billableOnly: true });
  const psychoticMoodAnxiety = selectPsychoticMoodAnxietyScopedCodes(rows, { billableOnly: true });
  const deliriumCognitive = selectDeliriumCognitiveScopedCodes(rows, { billableOnly: true });
  const neurodevelopmental = selectNeurodevelopmentalScopedCodes(rows, { billableOnly: true });
  const eatingDisorder = selectEatingDisorderScopedCodes(rows, { billableOnly: true });
  const puerperalMental = selectPuerperalMentalScopedCodes(rows, { billableOnly: true });
  const refusalLegal = selectRefusalLegalScopedCodes(rows, { billableOnly: true });

  const ownershipGaps = (
    [
      ["suicide_self_harm", suicideSelfHarm],
      ["psychotic_mood_anxiety", psychoticMoodAnxiety],
      ["delirium_cognitive", deliriumCognitive],
      ["neurodevelopmental", neurodevelopmental],
      ["eating_disorder", eatingDisorder],
      ["puerperal_mental", puerperalMental],
      ["refusal_legal", refusalLegal],
    ] as const
  )
    .filter(([, bucket]) => bucket.length === 0)
    .map(([id]) => id);

  const prisma = new PrismaClient();
  try {
    const dbRows = await prisma.icd10DiagnosisCode.findMany({
      where: {
        codeSystem: validation.manifest.codeSystem,
        releaseVersion: validation.manifest.releaseVersion,
      },
      select: { code: true, shortDescription: true, isActive: true, isBillable: true },
    });
    const byCode = new Map(dbRows.map((row) => [row.code, row]));
    const missingCodes = scoped.filter((row) => !byCode.get(row.code)?.isActive).map((row) => row.code);
    const descriptionMismatches = scoped
      .filter((row) => byCode.get(row.code)?.shortDescription.trim() !== row.shortDescription.trim())
      .map((row) => row.code);

    const activeScoped = dbRows.filter((row) => row.isActive && scoped.some((s) => s.code === row.code));
    const codeCounts = new Map<string, number>();
    for (const row of activeScoped) codeCounts.set(row.code, (codeCounts.get(row.code) ?? 0) + 1);
    const duplicateActiveCodes = [...codeCounts.entries()].filter(([, count]) => count > 1).map(([code]) => code);

    const invalidSelectableHeaders = scoped
      .filter((row) => {
        const medora = byCode.get(row.code);
        return medora?.isActive && medora.isBillable === false;
      })
      .map((row) => row.code);

    const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
    const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));

    // Must never reclaim cross-phase exclusive steals as Phase 18 ownership.
    const crossPhaseOwnershipSteals = scoped
      .filter(
        (row) =>
          starts(row.code, "T67") ||
          starts(row.code, "T68") ||
          starts(row.code, "W54") ||
          starts(row.code, "W55") ||
          starts(row.code, "W50") ||
          starts(row.code, "T58") ||
          starts(row.code, "N49.3") ||
          // T36–T50 medication poisoning remains Phase 16 exclusive mechanism ownership.
          /^T(3[6-9]|4[0-9]|50)/.test(norm(row.code)),
      )
      .map((row) => row.code);

    // R45.851 suicidal ideation is intentionally in scope; not a cross-phase steal from tox.
    const suicidalIdeationCoveragePresent = scoped.some((row) => starts(row.code, "R45.851"));
    const suicideAttemptCoveragePresent = scoped.some((row) => starts(row.code, "T14.91"));
    const intentionalSelfHarmExternalCausePresent = scoped.some((row) =>
      ["X71", "X72", "X73", "X74", "X75", "X76", "X77", "X78", "X80", "X81", "X82", "X83"].some((prefix) =>
        starts(row.code, prefix),
      ),
    );
    const nssiHistoryPresent = scoped.some((row) => starts(row.code, "Z91.51") || starts(row.code, "Z91.52"));

    const report = {
      psychiatricBehavioral: {
        scopedOfficialBillable: scoped.length,
        presentInMedora: scoped.length - missingCodes.length,
        missingCodes,
        descriptionMismatches,
        duplicateActiveCodes,
        invalidSelectableHeaders,
      },
      buckets: {
        suicideSelfHarm: suicideSelfHarm.length,
        psychoticMoodAnxiety: psychoticMoodAnxiety.length,
        deliriumCognitive: deliriumCognitive.length,
        neurodevelopmental: neurodevelopmental.length,
        eatingDisorder: eatingDisorder.length,
        puerperalMental: puerperalMental.length,
        refusalLegal: refusalLegal.length,
      },
      ownershipGaps,
      crossPhaseOwnershipSteals,
      coveragePresence: {
        suicidalIdeationCoveragePresent,
        suicideAttemptCoveragePresent,
        intentionalSelfHarmExternalCausePresent,
        nssiHistoryPresent,
      },
      ownershipNotes: {
        intentionalPoisoningMechanism: "T36–T50 and T40.x2 intentional poisoning remain Phase 16 tox ownership",
        substancePrimaryRouting: "F10.1/F10.2 intoxication/withdrawal primary routing stays Phase 16",
        forensicAbuse: "T74/T76/Y07 are coverage presence; forensic exclusive ownership preserved",
      },
      certification: {
        pass:
          missingCodes.length === 0 &&
          descriptionMismatches.length === 0 &&
          duplicateActiveCodes.length === 0 &&
          invalidSelectableHeaders.length === 0 &&
          ownershipGaps.length === 0 &&
          crossPhaseOwnershipSteals.length === 0,
      },
    };

    const summary = JSON.stringify(report, null, 2);
    const dir = resolve(__dirname, "certification-summaries");
    mkdirSync(join(dir, release), { recursive: true });
    writeFileSync(join(dir, "fy2026-psychiatric-behavioral-coverage-summary.json"), summary);
    writeFileSync(join(dir, release, "fy2026-psychiatric-behavioral-coverage-summary.json"), summary);
    console.log(summary);
    process.exit(report.certification.pass ? 0 : 2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
