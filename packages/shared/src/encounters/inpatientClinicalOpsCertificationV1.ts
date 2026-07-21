/**
 * D3E.7 — Inpatient clinical operations certification contract.
 */

export const INPATIENT_CLINICAL_OPERATIONS_CERTIFICATION_ID =
  "MEDUI.INPATIENT_CLINICAL_OPERATIONS.D3E7" as const;

export type InpatientClinicalOpsCertificationDecision =
  | "YES"
  | "YES — WITH REVIEW ITEMS"
  | "NO"
  | "ARCHITECTURE REVISION REQUIRED";

export type InpatientClinicalOpsCertificationReport = {
  certificationId: typeof INPATIENT_CLINICAL_OPERATIONS_CERTIFICATION_ID;
  decision: InpatientClinicalOpsCertificationDecision;
  schemaMigrationsApplied: false;
  productionFeatureDefaultsOff: true;
  reuseEnterpriseModels: true;
  noFakeEdEncounter: true;
  observationOptional: true;
  floorBoardNotDuplicated: true;
  sharedDepartmentalEngines: true;
  reviewItems: string[];
};

export function buildInpatientClinicalOpsCertificationReport(
  overrides?: Partial<InpatientClinicalOpsCertificationReport>
): InpatientClinicalOpsCertificationReport {
  return {
    certificationId: INPATIENT_CLINICAL_OPERATIONS_CERTIFICATION_ID,
    decision: "YES — WITH REVIEW ITEMS",
    schemaMigrationsApplied: false,
    productionFeatureDefaultsOff: true,
    reuseEnterpriseModels: true,
    noFakeEdEncounter: true,
    observationOptional: true,
    floorBoardNotDuplicated: true,
    sharedDepartmentalEngines: true,
    reviewItems: [
      "Accept/bed-assign placement transitions still require ADMIN in clinic MVP role mapping.",
      "Care-team history is append-only JSON + current Encounter assignment columns (no dedicated assignment history table).",
      "Consult requests/care-plan/discharge planning/med-rec persist under admissionSummaryJson.inpatientClinicalOpsV1 until a dedicated entity is justified.",
      "Clinical medication reconciliation does not yet write Medication Intelligence orders automatically — CONTINUE requires an explicit subsequent order action.",
      "HospitalEpisode create-for-ED eligibility remains ED-centric; direct admit creates/links episode when foundation flag is ON via dedicated writer.",
      "Transfer-in admission is foundation-level (same writer, EXTERNAL_TRANSFER source) without D3F transfer engine.",
    ],
    ...overrides,
  };
}
