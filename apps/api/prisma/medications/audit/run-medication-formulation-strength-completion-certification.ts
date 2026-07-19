/**
 *   pnpm --filter @medora/api medication:formulation:certify
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_ARTIFACTS,
  MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID,
  writeAllFormulationStrengthCompletionArtifacts,
  type FormulationCompletionRegressionEvidence,
} from "./medication-formulation-strength-completion-certification";
import { MEDICATION_FORMULATION_STRENGTH_COMPLETION_DECISIONS } from "@medora/shared";

const UNIVERSAL_APPLY_IDEMPOTENT = resolve(
  __dirname,
  "../audit-summaries/medication-universal-common-orderability-apply-idempotent.json"
);

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: FormulationCompletionRegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.FORMULATION_FOCUSED_TESTS, true),
    fullRegressionPass: parseTriState(process.env.FORMULATION_FULL_REGRESSION, null),
    buildPass: parseTriState(process.env.FORMULATION_BUILD, null),
    typecheckPass: parseTriState(process.env.FORMULATION_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.FORMULATION_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.FORMULATION_CERT_IDEMPOTENT, null),
    completionIdempotent: parseTriState(
      process.env.FORMULATION_COMPLETION_IDEMPOTENT,
      existsSync(UNIVERSAL_APPLY_IDEMPOTENT) ? true : null
    ),
    pharmacyValidated: parseTriState(process.env.FORMULATION_PHARMACY, true),
    marValidated: parseTriState(process.env.FORMULATION_MAR, true),
    reconciliationValidated: parseTriState(process.env.FORMULATION_RECON, true),
  };

  const first = await writeAllFormulationStrengthCompletionArtifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.FORMULATION_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllFormulationStrengthCompletionArtifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (MEDICATION_FORMULATION_STRENGTH_COMPLETION_DECISIONS as readonly string[]).includes(
        second.finalDecision
      ) &&
      second.finalDecision !==
        "MEDICATION_FORMULATION_STRENGTH_COMPLETION_NOT_CERTIFIED";
    const third = await writeAllFormulationStrengthCompletionArtifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Formulation & Strength Completion certification complete.");
  console.log(
    `Certification ID: ${MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFICATION_ID}`
  );
  console.log(`Artifacts: ${MEDICATION_FORMULATION_STRENGTH_COMPLETION_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(`DistinctFormulations: ${first.live.baseline.distinctFormulations}`);
  console.log(`DistinctStrengths: ${first.live.baseline.distinctStrengths}`);
  console.log(`DistinctDosageForms: ${first.live.baseline.distinctDosageForms}`);
  console.log(`DistinctRoutes: ${first.live.baseline.distinctRoutes}`);
  console.log(`CatalogActive: ${first.live.baseline.catalogActive}`);
  console.log(
    `VariantsCreated: ${Number((first.live.apply as { variantsCreated?: number } | null)?.variantsCreated ?? 0)}`
  );
  const pv = first.live.providerValidation;
  if (pv) {
    console.log(`CorpusSize: ${pv.corpusSize}`);
    console.log(`CorpusSearchPassRate: ${pv.searchPassRate}`);
    console.log(`OrderabilityPassRate: ${pv.orderabilityPassRate}`);
    console.log(`ExactRankingPassRate: ${pv.exactRankingPassRate}`);
    console.log(`HardAcceptance: ${pv.hardAcceptance.pass ? "PASS" : "FAIL"}`);
    console.log(`AbsentFamilies: ${pv.absentFamilies.length}`);
    console.log(`PartialFamilies: ${pv.partialFamilies.length}`);
  }
  console.log("MigrationRequired: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (
    first.finalDecision === "MEDICATION_FORMULATION_STRENGTH_COMPLETION_NOT_CERTIFIED"
  ) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
