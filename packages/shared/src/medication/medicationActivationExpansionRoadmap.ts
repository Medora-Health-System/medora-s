/**
 * MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1
 * Medication expansion roadmap — tranche planning only (no activation).
 */

import type { MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";

export type MedicationExpansionTrancheId =
  | "TRANCHE_1_LOW_RISK"
  | "TRANCHE_2_CHRONIC_DISEASE"
  | "TRANCHE_3_ED_MEDICATIONS"
  | "TRANCHE_4_INPATIENT_CORE"
  | "TRANCHE_5_HIGH_RISK"
  | "TRANCHE_6_CONTROLLED_SUBSTANCES";

export type MedicationExpansionTranchePlan = {
  trancheId: MedicationExpansionTrancheId;
  labelEn: string;
  medicationCount: number;
  clinicalReviewRequired: number;
  pharmacyReviewRequired: number;
  expectedImplementationEffort: "LOW" | "MEDIUM" | "HIGH";
  expectedTestingEffort: "LOW" | "MEDIUM" | "HIGH";
  exampleCatalogCodes: string[];
};

const ED_TOKEN_HINTS = [
  "epinephrine",
  "norepinephrine",
  "adenosine",
  "amiodarone",
  "ketamine",
  "propofol",
  "naloxone",
  "morphine",
  "fentanyl",
];

const INPATIENT_IV_HINTS = ["injectable", "intravenous", "infusion", "perfusion"];

function classifyTranche(record: MedicationActivationGovernanceRecord): MedicationExpansionTrancheId {
  if (record.controlledSubstanceFlag) return "TRANCHE_6_CONTROLLED_SUBSTANCES";
  if (record.highRiskFlag || record.status === "NEEDS_CLINICAL_REVIEW") return "TRANCHE_5_HIGH_RISK";
  const routeLower = record.route.toLowerCase();
  const nameBlob = record.displayNameEn.toLowerCase();
  if (ED_TOKEN_HINTS.some((t) => nameBlob.includes(t))) return "TRANCHE_3_ED_MEDICATIONS";
  if (
    INPATIENT_IV_HINTS.some((h) => routeLower.includes(h)) ||
    record.doseForm.toLowerCase().includes("injectable")
  ) {
    return "TRANCHE_4_INPATIENT_CORE";
  }
  if (record.enterpriseWave === "wave1" && !record.vaccineFlag) return "TRANCHE_2_CHRONIC_DISEASE";
  return "TRANCHE_1_LOW_RISK";
}

function effortForTranche(tranche: MedicationExpansionTrancheId): {
  impl: MedicationExpansionTranchePlan["expectedImplementationEffort"];
  test: MedicationExpansionTranchePlan["expectedTestingEffort"];
} {
  switch (tranche) {
    case "TRANCHE_1_LOW_RISK":
      return { impl: "LOW", test: "LOW" };
    case "TRANCHE_2_CHRONIC_DISEASE":
      return { impl: "LOW", test: "MEDIUM" };
    case "TRANCHE_3_ED_MEDICATIONS":
      return { impl: "MEDIUM", test: "MEDIUM" };
    case "TRANCHE_4_INPATIENT_CORE":
      return { impl: "MEDIUM", test: "HIGH" };
    case "TRANCHE_5_HIGH_RISK":
      return { impl: "HIGH", test: "HIGH" };
    case "TRANCHE_6_CONTROLLED_SUBSTANCES":
      return { impl: "HIGH", test: "HIGH" };
  }
}

const TRANCHE_LABELS: Record<MedicationExpansionTrancheId, string> = {
  TRANCHE_1_LOW_RISK: "Tranche 1 — Low-risk oral / routine outpatient",
  TRANCHE_2_CHRONIC_DISEASE: "Tranche 2 — Chronic disease management",
  TRANCHE_3_ED_MEDICATIONS: "Tranche 3 — ED / emergency medications",
  TRANCHE_4_INPATIENT_CORE: "Tranche 4 — Inpatient IV / infusion core",
  TRANCHE_5_HIGH_RISK: "Tranche 5 — High-alert medications",
  TRANCHE_6_CONTROLLED_SUBSTANCES: "Tranche 6 — Controlled substances",
};

export function buildMedicationExpansionRoadmap(
  records: MedicationActivationGovernanceRecord[]
): MedicationExpansionTranchePlan[] {
  const buckets = new Map<MedicationExpansionTrancheId, MedicationActivationGovernanceRecord[]>();

  for (const id of Object.keys(TRANCHE_LABELS) as MedicationExpansionTrancheId[]) {
    buckets.set(id, []);
  }

  for (const record of records) {
    if (record.status === "ORDERABLE") continue;
    const tranche = classifyTranche(record);
    buckets.get(tranche)!.push(record);
  }

  return (Object.keys(TRANCHE_LABELS) as MedicationExpansionTrancheId[]).map((trancheId) => {
    const meds = buckets.get(trancheId) ?? [];
    const effort = effortForTranche(trancheId);
    return {
      trancheId,
      labelEn: TRANCHE_LABELS[trancheId],
      medicationCount: meds.length,
      clinicalReviewRequired: meds.filter((m) => m.requiresClinicalReview).length,
      pharmacyReviewRequired: meds.filter((m) => m.requiresPharmacyReview).length,
      expectedImplementationEffort: effort.impl,
      expectedTestingEffort: effort.test,
      exampleCatalogCodes: meds.slice(0, 5).map((m) => m.catalogCode),
    };
  });
}
