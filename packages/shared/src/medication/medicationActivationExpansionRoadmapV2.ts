/**
 * MEDUI.MEDICATION.HOSPITAL_COVERAGE_CERTIFICATION.1
 * Expansion roadmap V2 — estimates medications safe to activate without additional engineering.
 */

import type { PerMedicationActivationCertification } from "./medicationActivationCertification.js";
import type { MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";

export type MedicationExpansionTrancheV2Id =
  | "TRANCHE_1_LOW_RISK"
  | "TRANCHE_2_CHRONIC_DISEASE"
  | "TRANCHE_3_ED"
  | "TRANCHE_4_INPATIENT_CORE";

export type MedicationExpansionTrancheV2Plan = {
  trancheId: MedicationExpansionTrancheV2Id;
  labelEn: string;
  totalInTranche: number;
  safeWithoutAdditionalEngineering: number;
  requiresEngineering: number;
  clinicalReviewRequired: number;
  pharmacyReviewRequired: number;
  exampleSafeCatalogCodes: string[];
  notes: string;
};

export type MedicationExpansionRoadmapV2 = {
  tranches: MedicationExpansionTrancheV2Plan[];
  totalSafeWithoutEngineering: number;
  totalRequiringEngineering: number;
};

const ED_TOKEN_HINTS = [
  "epinephrine",
  "norepinephrine",
  "adenosine",
  "amiodarone",
  "ketamine",
  "naloxone",
  "morphine",
  "fentanyl",
  "ondansetron",
];

export function classifyTrancheV2(record: MedicationActivationGovernanceRecord): MedicationExpansionTrancheV2Id {
  const nameBlob = record.displayNameEn.toLowerCase();
  const routeLower = record.route.toLowerCase();
  if (ED_TOKEN_HINTS.some((t) => nameBlob.includes(t))) return "TRANCHE_3_ED";
  if (
    routeLower.includes("injectable") ||
    routeLower.includes("intravenous") ||
    record.doseForm.toLowerCase().includes("injectable")
  ) {
    return "TRANCHE_4_INPATIENT_CORE";
  }
  if (record.enterpriseWave === "wave1" && !record.vaccineFlag) return "TRANCHE_2_CHRONIC_DISEASE";
  return "TRANCHE_1_LOW_RISK";
}

/** Safe = catalog complete, billing/NDC ready (enterprise), MAR path exists, not controlled/high-risk/vaccine; only governance activation needed. */
export function isSafeForActivationWithoutEngineering(
  record: MedicationActivationGovernanceRecord,
  cert: PerMedicationActivationCertification
): boolean {
  if (record.status === "ORDERABLE") return false;
  if (record.controlledSubstanceFlag || record.highRiskFlag || record.vaccineFlag) return false;
  if (!record.displayNameEn.trim() || !record.displayNameFr.trim()) return false;
  if (!record.strength.trim() || !record.doseForm.trim() || !record.route.trim()) return false;
  if (!record.marReady) return false;
  if (record.enterpriseWave && (!record.billingReady || !record.ndcReady)) return false;

  const engineeringBlockers = new Set([
    "VACCINE_GOVERNANCE_REQUIRED",
    "MAR_PATHWAY_MISSING",
    "BILLING_VALIDATION_FAILED",
    "INVENTORY_NDC_NOT_READY",
    "CONTROLLED_SUBSTANCE_RESTRICTED",
    "HIGH_RISK_REVIEW_REQUIRED",
  ]);

  const onlyGovernanceBlockers = cert.blockers.every(
    (b) =>
      b.code === "ORDER_SEARCH_NOT_ENABLED" ||
      b.code === "CLINICAL_REVIEW_INCOMPLETE"
  );

  return cert.blockers.length === 0 || (onlyGovernanceBlockers && !cert.blockers.some((b) => engineeringBlockers.has(b.code)));
}

const TRANCHE_V2_LABELS: Record<MedicationExpansionTrancheV2Id, string> = {
  TRANCHE_1_LOW_RISK: "Tranche 1 — Low-risk oral / routine",
  TRANCHE_2_CHRONIC_DISEASE: "Tranche 2 — Chronic disease (Wave 1 oral)",
  TRANCHE_3_ED: "Tranche 3 — ED medications",
  TRANCHE_4_INPATIENT_CORE: "Tranche 4 — Inpatient IV / infusion core",
};

export function buildMedicationExpansionRoadmapV2(
  records: MedicationActivationGovernanceRecord[],
  certifications: PerMedicationActivationCertification[]
): MedicationExpansionRoadmapV2 {
  const certByCode = new Map(certifications.map((c) => [c.catalogCode, c]));
  const buckets = new Map<MedicationExpansionTrancheV2Id, MedicationActivationGovernanceRecord[]>();

  for (const id of Object.keys(TRANCHE_V2_LABELS) as MedicationExpansionTrancheV2Id[]) {
    buckets.set(id, []);
  }

  for (const record of records) {
    if (record.status === "ORDERABLE") continue;
    buckets.get(classifyTrancheV2(record))!.push(record);
  }

  let totalSafe = 0;
  let totalEngineering = 0;

  const tranches = (Object.keys(TRANCHE_V2_LABELS) as MedicationExpansionTrancheV2Id[]).map((trancheId) => {
    const meds = buckets.get(trancheId) ?? [];
    const safe = meds.filter((m) => {
      const cert = certByCode.get(m.catalogCode);
      return cert && isSafeForActivationWithoutEngineering(m, cert);
    });
    totalSafe += safe.length;
    totalEngineering += meds.length - safe.length;

    return {
      trancheId,
      labelEn: TRANCHE_V2_LABELS[trancheId],
      totalInTranche: meds.length,
      safeWithoutAdditionalEngineering: safe.length,
      requiresEngineering: meds.length - safe.length,
      clinicalReviewRequired: meds.filter((m) => m.requiresClinicalReview).length,
      pharmacyReviewRequired: meds.filter((m) => m.requiresPharmacyReview).length,
      exampleSafeCatalogCodes: safe.slice(0, 5).map((m) => m.catalogCode),
      notes:
        trancheId === "TRANCHE_3_ED"
          ? "Many ED meds are high-alert — expect clinical review before activation"
          : "Safe = governance activation only; no vaccine/MAR engineering gaps",
    };
  });

  return {
    tranches,
    totalSafeWithoutEngineering: totalSafe,
    totalRequiringEngineering: totalEngineering,
  };
}
