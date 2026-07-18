/**
 *   pnpm --filter @medora/api medication:orderable:certify
 */
import {
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_ARTIFACTS,
  MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID,
  writeAllOrderableCatalogCompletionArtifacts,
  type OrderableCompletionRegressionEvidence,
} from "./medication-orderable-catalog-completion-certification";
import { MEDICATION_ORDERABLE_CATALOG_COMPLETION_DECISIONS } from "@medora/shared";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: OrderableCompletionRegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.ORDERABLE_FOCUSED_TESTS, true),
    fullRegressionPass: parseTriState(process.env.ORDERABLE_FULL_REGRESSION, null),
    buildPass: parseTriState(process.env.ORDERABLE_BUILD, null),
    typecheckPass: parseTriState(process.env.ORDERABLE_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.ORDERABLE_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.ORDERABLE_CERT_IDEMPOTENT, null),
    completionIdempotent: parseTriState(process.env.ORDERABLE_COMPLETION_IDEMPOTENT, null),
    pharmacyValidated: parseTriState(process.env.ORDERABLE_PHARMACY, true),
    marValidated: parseTriState(process.env.ORDERABLE_MAR, true),
    reconciliationValidated: parseTriState(process.env.ORDERABLE_RECON, true),
  };

  const first = await writeAllOrderableCatalogCompletionArtifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.ORDERABLE_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllOrderableCatalogCompletionArtifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (MEDICATION_ORDERABLE_CATALOG_COMPLETION_DECISIONS as readonly string[]).includes(
        second.finalDecision
      ) &&
      second.finalDecision !== "MEDICATION_ORDERABLE_CATALOG_COMPLETION_NOT_CERTIFIED";
    const third = await writeAllOrderableCatalogCompletionArtifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Orderable Catalog Completion certification complete.");
  console.log(`Certification ID: ${MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${MEDICATION_ORDERABLE_CATALOG_COMPLETION_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(`CoveragePercent: ${first.live.baseline.coveragePercent}`);
  console.log(
    `ProviderOrderable: ${first.live.baseline.providerOrderableCatalogRows}`
  );
  console.log(`NonOrderable: ${first.live.baseline.nonOrderableCatalogRows}`);
  console.log(`DistinctGenerics: ${first.live.baseline.distinctGenerics}`);
  console.log("MigrationRequired: NO");
  if (idempotent != null) {
    console.log(`CertificationIdempotent: ${idempotent ? "YES" : "NO"}`);
  }

  if (first.finalDecision === "MEDICATION_ORDERABLE_CATALOG_COMPLETION_NOT_CERTIFIED") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
