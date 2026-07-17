/**
 * Medication Intelligence Phase 1 — master readiness audit (orchestrates all artifacts).
 *   pnpm --filter @medora/api medication:audit:readiness
 */
import { writeAuditArtifact } from "./medication-audit-types";
import { loadMedicationAuditContext } from "./medication-audit-context";
import { buildCatalogInventoryArtifact } from "./medication-catalog-metrics";
import {
  buildDataModelInventory,
  buildEngineArchitectureInventory,
  buildExternalIntegrationReadiness,
  buildFormularyInventoryBillingAudit,
  buildMarAudit,
  buildOrderingAudit,
  buildPrescriptionAudit,
  buildReconciliationAudit,
  buildSafetyEngineAudit,
  buildSecurityDataIntegrityAudit,
} from "./medication-architecture-inventory";
import {
  buildHcpcsAuditArtifact,
  buildIdentifierCoverageArtifact,
  buildNdcReadinessArtifact,
  buildRxNormReadinessArtifact,
} from "./medication-identifier-audit";
import { buildLicensingAssessmentArtifact } from "./medication-licensing-assessment";
import { buildMaturityScoreArtifact } from "./medication-maturity-score";
import { buildRoadmapArtifact } from "./medication-roadmap";
import { buildLocalizationAuditArtifact, buildSearchAuditArtifact } from "./medication-search-probes";

const ARTIFACTS = [
  "medication-engine-architecture-inventory.json",
  "medication-data-model-inventory.json",
  "medication-catalog-inventory.json",
  "medication-identifier-coverage.json",
  "medication-hcpcs-audit.json",
  "medication-rxnorm-readiness.json",
  "medication-ndc-readiness.json",
  "medication-search-audit.json",
  "medication-localization-audit.json",
  "medication-ordering-audit.json",
  "medication-prescription-audit.json",
  "medication-mar-audit.json",
  "medication-reconciliation-audit.json",
  "medication-safety-engine-audit.json",
  "medication-formulary-inventory-billing-audit.json",
  "medication-external-integration-readiness.json",
  "medication-security-data-integrity-audit.json",
  "medication-maturity-score.json",
  "medication-implementation-roadmap.json",
  "medication-data-source-licensing-assessment.json",
] as const;

async function main() {
  const ctx = await loadMedicationAuditContext();
  const { dataSource, confidence, metrics, duplicateGroups, searchProbes } = ctx;

  writeAuditArtifact(
    "medication-engine-architecture-inventory.json",
    buildEngineArchitectureInventory(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-data-model-inventory.json",
    buildDataModelInventory(dataSource, confidence, metrics)
  );
  writeAuditArtifact("medication-catalog-inventory.json", {
    ...buildCatalogInventoryArtifact(metrics),
    duplicateDetection: duplicateGroups,
  });
  writeAuditArtifact("medication-identifier-coverage.json", {
    ...buildIdentifierCoverageArtifact(dataSource, confidence, metrics),
    duplicateDetection: duplicateGroups,
  });
  writeAuditArtifact("medication-hcpcs-audit.json", buildHcpcsAuditArtifact(dataSource, confidence, metrics));
  writeAuditArtifact(
    "medication-rxnorm-readiness.json",
    buildRxNormReadinessArtifact(dataSource, confidence, metrics)
  );
  writeAuditArtifact("medication-ndc-readiness.json", buildNdcReadinessArtifact(dataSource, confidence, metrics));
  writeAuditArtifact(
    "medication-search-audit.json",
    buildSearchAuditArtifact(dataSource, confidence, searchProbes)
  );
  writeAuditArtifact(
    "medication-localization-audit.json",
    buildLocalizationAuditArtifact(dataSource, confidence, metrics.liveCounts)
  );
  writeAuditArtifact("medication-ordering-audit.json", buildOrderingAudit(dataSource, confidence, metrics));
  writeAuditArtifact("medication-prescription-audit.json", buildPrescriptionAudit(dataSource, confidence));
  writeAuditArtifact("medication-mar-audit.json", buildMarAudit(dataSource, confidence, metrics));
  writeAuditArtifact("medication-reconciliation-audit.json", buildReconciliationAudit(dataSource, confidence));
  writeAuditArtifact("medication-safety-engine-audit.json", buildSafetyEngineAudit(dataSource, confidence));
  writeAuditArtifact(
    "medication-formulary-inventory-billing-audit.json",
    buildFormularyInventoryBillingAudit(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-external-integration-readiness.json",
    buildExternalIntegrationReadiness(dataSource, confidence)
  );
  writeAuditArtifact(
    "medication-security-data-integrity-audit.json",
    buildSecurityDataIntegrityAudit(dataSource, confidence, metrics)
  );
  writeAuditArtifact(
    "medication-maturity-score.json",
    buildMaturityScoreArtifact(dataSource, confidence, metrics)
  );
  writeAuditArtifact("medication-implementation-roadmap.json", buildRoadmapArtifact(dataSource, confidence));
  writeAuditArtifact(
    "medication-data-source-licensing-assessment.json",
    buildLicensingAssessmentArtifact(dataSource, confidence)
  );

  const maturity = buildMaturityScoreArtifact(dataSource, confidence, metrics);
  console.log("Medication Intelligence Phase 1 readiness audit complete.");
  console.log(`Artifacts written: ${ARTIFACTS.length}`);
  console.log(`Data source: ${dataSource} (${confidence})`);
  console.log(`Catalog medications: ${metrics.liveCounts.catalogMedication} (active ${metrics.liveCounts.catalogMedicationActive})`);
  console.log(`Maturity: ${maturity.summary.percentage}% — ${maturity.finalDecision}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
