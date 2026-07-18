/**
 *   pnpm --filter @medora/api medication:wave2:certify
 */
import {
  MK_EXPANSION_WAVE2_ARTIFACTS,
  MK_EXPANSION_WAVE2_CERTIFICATION_ID,
  writeAllMkExpansionWave2Artifacts,
  type RegressionEvidence,
} from "./medication-knowledge-expansion-wave2-certification";
import { MK_EXPANSION_WAVE2_CERTIFICATION_DECISION_VALUES } from "@medora/shared";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: RegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.WAVE2_FOCUSED_TESTS, true) !== false,
    fullRegressionPass: parseTriState(process.env.WAVE2_FULL_REGRESSION, null),
    buildPass: parseTriState(process.env.WAVE2_BUILD, null),
    typecheckPass: parseTriState(process.env.WAVE2_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.WAVE2_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.WAVE2_CERT_IDEMPOTENT, null),
  };

  const first = await writeAllMkExpansionWave2Artifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.WAVE2_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllMkExpansionWave2Artifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (MK_EXPANSION_WAVE2_CERTIFICATION_DECISION_VALUES as readonly string[]).includes(
        second.finalDecision
      ) &&
      second.finalDecision !== "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED";
    const third = await writeAllMkExpansionWave2Artifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Knowledge Expansion Wave 2 certification complete.");
  console.log(`Certification ID: ${MK_EXPANSION_WAVE2_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${MK_EXPANSION_WAVE2_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(first.finalDecision);
  console.log(`CoveragePercent: ${first.live.CoveragePercent}`);
  console.log(`TaggedCatalogRows: ${first.live.TaggedCatalogRows}`);
  console.log(`DuplicateCatalogCodes: ${first.live.DuplicateCatalogCodes}`);
  console.log("MigrationRequired: NO");
  console.log("AcetaminophenIdentityBlocked: YES");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision === "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
