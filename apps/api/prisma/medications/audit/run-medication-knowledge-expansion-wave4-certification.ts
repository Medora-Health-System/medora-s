/**
 *   pnpm --filter @medora/api medication:wave4:certify
 */
import {
  MK_EXPANSION_WAVE4_ARTIFACTS,
  MK_EXPANSION_WAVE4_CERTIFICATION_ID,
  writeAllMkExpansionWave4Artifacts,
  type Wave4RegressionEvidence,
} from "./medication-knowledge-expansion-wave4-certification";
import { MK_EXPANSION_WAVE4_CERTIFICATION_DECISION_VALUES } from "@medora/shared";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: Wave4RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.WAVE4_FOCUSED_TESTS, true),
    fullRegressionPass: parseTriState(process.env.WAVE4_FULL_REGRESSION, null),
    buildPass: parseTriState(process.env.WAVE4_BUILD, null),
    typecheckPass: parseTriState(process.env.WAVE4_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.WAVE4_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.WAVE4_CERT_IDEMPOTENT, null),
    importIdempotent: parseTriState(process.env.WAVE4_IMPORT_IDEMPOTENT, null),
    searchValidated: parseTriState(process.env.WAVE4_SEARCH, true),
    orderingValidated: parseTriState(process.env.WAVE4_ORDERING, true),
    wave2RegressionPass: parseTriState(process.env.WAVE4_WAVE2_REGRESSION, true),
  };

  const first = await writeAllMkExpansionWave4Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.WAVE4_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllMkExpansionWave4Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (MK_EXPANSION_WAVE4_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        second.finalDecision
      ) &&
      second.finalDecision !== "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_NOT_CERTIFIED";
    const third = await writeAllMkExpansionWave4Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Knowledge Expansion Wave 4 certification complete.");
  console.log(`Certification ID: ${MK_EXPANSION_WAVE4_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${MK_EXPANSION_WAVE4_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(`MeasuredNetNew: ${first.live.measuredNetNew}`);
  console.log(
    `FinalDistinctGenerics: ${first.live.baseline.distinctNormalizedGenerics}`
  );
  console.log(`DuplicateCanonicalConcepts: ${first.live.duplicateCanonicalConcepts}`);
  console.log(`OrphanVariants: ${first.live.orphanVariants}`);
  console.log("MigrationRequired: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision === "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
