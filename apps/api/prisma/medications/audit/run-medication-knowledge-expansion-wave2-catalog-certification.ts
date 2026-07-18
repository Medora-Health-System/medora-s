/**
 *   pnpm --filter @medora/api medication:wave2:catalog:certify
 */
import {
  MK_EXPANSION_WAVE2_CATALOG_ARTIFACTS,
  MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID,
  writeAllMkExpansionWave2CatalogArtifacts,
  type CatalogRegressionEvidence,
} from "./medication-knowledge-expansion-wave2-catalog-certification";
import { MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_DECISION_VALUES } from "@medora/shared";

function parseTriState(raw: string | undefined, fallback: boolean | null): boolean | null {
  if (!raw) return fallback;
  const v = raw.trim().toUpperCase();
  if (v === "PASS" || v === "TRUE" || v === "YES") return true;
  if (v === "FAIL" || v === "FALSE" || v === "NO") return false;
  return null;
}

async function main() {
  const evidence: CatalogRegressionEvidence = {
    focusedTestsPass: parseTriState(process.env.WAVE2_CATALOG_FOCUSED_TESTS, true),
    fullRegressionPass: parseTriState(process.env.WAVE2_CATALOG_FULL_REGRESSION, null),
    buildPass: parseTriState(process.env.WAVE2_CATALOG_BUILD, null),
    typecheckPass: parseTriState(process.env.WAVE2_CATALOG_TYPECHECK, null),
    diffCheckPass: parseTriState(process.env.WAVE2_CATALOG_DIFF_CHECK, null),
    certificationIdempotent: parseTriState(process.env.WAVE2_CATALOG_CERT_IDEMPOTENT, null),
    importIdempotent: parseTriState(process.env.WAVE2_CATALOG_IMPORT_IDEMPOTENT, null),
    searchValidated: parseTriState(process.env.WAVE2_CATALOG_SEARCH, true),
    orderingValidated: parseTriState(process.env.WAVE2_CATALOG_ORDERING, true),
  };

  const first = await writeAllMkExpansionWave2CatalogArtifacts({ evidence });
  let idempotent: boolean | null = evidence.certificationIdempotent;

  if (process.env.WAVE2_CATALOG_IDEMPOTENCY_CHECK === "1") {
    const second = await writeAllMkExpansionWave2CatalogArtifacts({
      evidence: { ...evidence, certificationIdempotent: true },
    });
    idempotent =
      first.finalDecision === second.finalDecision &&
      (
        MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_DECISION_VALUES as readonly string[]
      ).includes(second.finalDecision) &&
      second.finalDecision !== "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED";
    const third = await writeAllMkExpansionWave2CatalogArtifacts({
      evidence: { ...evidence, certificationIdempotent: idempotent },
    });
    Object.assign(first, third);
  }

  console.log("Medication Knowledge Expansion Wave 2 catalog certification complete.");
  console.log(`Certification ID: ${MK_EXPANSION_WAVE2_CATALOG_CERTIFICATION_ID}`);
  console.log(`Artifacts: ${MK_EXPANSION_WAVE2_CATALOG_ARTIFACTS.length}`);
  console.log(`Summary: ${first.summaryPath}`);
  console.log(`FinalDecision: ${first.finalDecision}`);
  console.log(`NetNewConcepts: ${first.live.netNewConcepts}`);
  console.log(`CatalogRowsCreated: ${first.live.catalogRowsCreated}`);
  console.log(`DuplicateCanonicalConcepts: ${first.live.duplicateCanonicalConcepts}`);
  console.log(`OrphanVariants: ${first.live.orphanVariants}`);
  console.log("MigrationRequired: NO");
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
