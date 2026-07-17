/**
 * Medication data source licensing assessment (read-only audit).
 */
import { auditBase, type AuditConfidence, type AuditDataSource } from "./medication-audit-types";

export function buildLicensingAssessmentArtifact(dataSource: AuditDataSource, confidence: AuditConfidence) {
  return {
    ...auditBase(dataSource, confidence),
    sources: [
      {
        source: "Haiti curated formulary seed",
        path: "apps/api/prisma/data/haiti-medications.ts",
        license: "Medora internal curated catalog",
        productionUse: "Permitted for Haiti clinic MVP pilot",
        phi: false,
      },
      {
        source: "Enterprise formulary manifests",
        path: "packages/shared/src/medication/*FormularyManifest.ts",
        license: "Medora internal curated catalog",
        productionUse: "Staged activation only; not bulk auto-enable",
        phi: false,
      },
      {
        source: "RxNorm",
        path: "Not imported",
        license: "NLM RxNorm — license required before production import",
        productionUse: "NOT READY — rxNormConceptId unpopulated",
        phi: false,
      },
      {
        source: "NDC Directory",
        path: "Partial CSV loader (development)",
        license: "FDA NDC — verify terms before production bulk import",
        productionUse: "Partial; package linkage incomplete",
        phi: false,
      },
      {
        source: "HCPCS billing mappings",
        path: "BillingCatalog + MedicationBillingProfile",
        license: "CMS HCPCS — billing reference only",
        productionUse: "Billing suggestions; not clinical identity",
        phi: false,
      },
      {
        source: "Drug interaction knowledge",
        path: "MedicationSafetyProfile.interactionGroupIds JSON",
        license: "No licensed interaction vendor integrated",
        productionUse: "NOT READY for automated interaction checking",
        phi: false,
      },
    ],
    recommendations: [
      "Execute RxNorm license review before Phase 3 import",
      "Keep billing codes (HCPCS/NDC) separate from clinical search identity",
      "Do not treat DEV-SAMPLE or MST_ fixture codes as production catalog rows",
      "Use MedicationFormularyImportStaging for all bulk catalog updates",
    ],
    phiPolicy: "Audit artifacts contain aggregate counts and catalog codes only — no PHI",
  };
}
