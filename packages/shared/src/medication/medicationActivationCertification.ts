/**
 * MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1
 * Governed medication activation certification engine (audit-only — does NOT activate medications).
 */

import {
  HOSPITAL_ACTIVATION_COVERAGE_GROUPS,
  type HospitalCoverageGapRow,
  type HospitalCoverageGapStatus,
} from "./hospitalActivationCoverageManifest.js";
import {
  buildActivationGovernanceRecord,
  type MedicationActivationGovernanceRecord,
  type MedicationActivationGovernanceStatus,
} from "./medicationActivationGovernance.js";
import { buildMedicationExpansionRoadmap, type MedicationExpansionTranchePlan } from "./medicationActivationExpansionRoadmap.js";
import { certifyMedicationI18nSafety, type MedicationI18nCertificationReport } from "./medicationActivationI18nCertification.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { buildMedicationEngineMaturityReport } from "./providerMedicationCatalogMaturityAudit.js";
import { certifyTdapGovernance, type TdapGovernanceCertificationReport } from "./tdapGovernanceCertification.js";
import { TDAP_CATALOG_CODE } from "./tdapVaccineAdministration.js";

export type MedicationActivationCertificationResult = "PASS" | "FAIL";

export type MedicationActivationCertificationBlocker = {
  code: string;
  message: string;
};

export type PerMedicationActivationCertification = {
  catalogCode: string;
  displayNameEn: string;
  result: MedicationActivationCertificationResult;
  blockers: MedicationActivationCertificationBlocker[];
};

export type MedicationActivationInventoryRow = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  strength: string;
  doseForm: string;
  route: string;
  orderabilityStatus: MedicationActivationGovernanceStatus;
  restrictionStatus: string | null;
  requiresPharmacyReview: boolean;
  requiresClinicalReview: boolean;
  marReady: boolean;
  inventoryReady: boolean;
  billingReady: boolean;
  ndcReady: boolean;
  careSettingEligibility: string[];
  catalogSource: string;
};

export type MedicationActivationInventoryReport = {
  totalRows: number;
  byStatus: Record<MedicationActivationGovernanceStatus, number>;
  rows: MedicationActivationInventoryRow[];
};

export type MedicationActivationCertificationReport = {
  ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1";
  generatedAt: string;
  totalEvaluated: number;
  passCount: number;
  failCount: number;
  perMedication: PerMedicationActivationCertification[];
  aggregateDecision: MedicationActivationCertificationResult;
  aggregateBlockers: string[];
};

export type MedicationActivationGovernanceReport = {
  totalMedications: number;
  orderable: number;
  restricted: number;
  needsPharmacyReview: number;
  needsClinicalReview: number;
  catalogOnly: number;
  notOrderable: number;
  undocumentedGaps: number;
};

export type GovernedActivationFrameworkReport = {
  ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1";
  generatedAt: string;
  inventoryReport: MedicationActivationInventoryReport;
  engineMaturityScore: number;
  governanceReport: MedicationActivationGovernanceReport;
  activationCertification: MedicationActivationCertificationReport;
  hospitalCoverageGap: HospitalCoverageGapRow[];
  tdapGovernance: TdapGovernanceCertificationReport;
  i18nCertification: MedicationI18nCertificationReport;
  expansionRoadmap: MedicationExpansionTranchePlan[];
};

function catalogBlob(record: MedicationActivationGovernanceRecord): string {
  return [record.displayNameEn, record.displayNameFr, record.catalogCode].join(" ").toLowerCase();
}

export function certifyMedicationActivation(
  record: MedicationActivationGovernanceRecord
): PerMedicationActivationCertification {
  const blockers: MedicationActivationCertificationBlocker[] = [];

  if (!record.catalogCode.trim()) blockers.push({ code: "CATALOG_CODE_MISSING", message: "Catalog code required" });
  if (!record.displayNameEn.trim()) blockers.push({ code: "DISPLAY_NAME_EN_MISSING", message: "English display name required" });
  if (!record.displayNameFr.trim()) blockers.push({ code: "DISPLAY_NAME_FR_MISSING", message: "French display name required" });
  if (!record.strength.trim()) blockers.push({ code: "STRENGTH_MISSING", message: "Strength required" });
  if (!record.doseForm.trim()) blockers.push({ code: "DOSE_FORM_MISSING", message: "Dose form required" });
  if (!record.route.trim()) blockers.push({ code: "ROUTE_MISSING", message: "Route required" });
  if (!record.marReady) blockers.push({ code: "MAR_PATHWAY_MISSING", message: "MAR administration pathway not defined" });

  if (record.status !== "ORDERABLE") {
    if (record.controlledSubstanceFlag) {
      blockers.push({
        code: "CONTROLLED_SUBSTANCE_RESTRICTED",
        message: record.restrictedReason ?? "Controlled substance — activation blocked",
      });
    }
    if (record.vaccineFlag) {
      blockers.push({
        code: "VACCINE_GOVERNANCE_REQUIRED",
        message: record.restrictedReason ?? "Vaccine requires governance activation",
      });
    }
    if (record.highRiskFlag) {
      blockers.push({
        code: "HIGH_RISK_REVIEW_REQUIRED",
        message: "High-alert medication requires clinical review before order search",
      });
    }
    if (record.requiresPharmacyReview && record.status === "NEEDS_PHARMACY_REVIEW") {
      blockers.push({
        code: "PHARMACY_REVIEW_INCOMPLETE",
        message: record.reviewReason ?? "Pharmacy review required",
      });
    }
    if (record.requiresClinicalReview && record.status === "NEEDS_CLINICAL_REVIEW") {
      blockers.push({
        code: "CLINICAL_REVIEW_INCOMPLETE",
        message: record.reviewReason ?? "Clinical review required",
      });
    }
    if (!record.orderSearchReady) {
      blockers.push({
        code: "ORDER_SEARCH_NOT_ENABLED",
        message: record.reviewReason ?? record.restrictedReason ?? "Order search not enabled",
      });
    }
  }

  if (record.status === "ORDERABLE") {
    if (record.enterpriseWave && !record.billingReady) {
      blockers.push({ code: "BILLING_VALIDATION_FAILED", message: "Billing manifest linkage required for enterprise activation" });
    }
    if (record.requiresPharmacyReview && record.enterpriseWave) {
      blockers.push({
        code: "PHARMACY_REVIEW_STILL_REQUIRED",
        message: "Pharmacy review must be completed for enterprise activation",
      });
    }
    if (record.requiresClinicalReview) {
      blockers.push({
        code: "CLINICAL_REVIEW_STILL_REQUIRED",
        message: "Clinical review must be completed even for catalog-ready medications",
      });
    }
    if (!record.inventoryReady && record.enterpriseWave) {
      blockers.push({ code: "INVENTORY_NDC_NOT_READY", message: "NDC / inventory evidence required for enterprise activation" });
    }
  }

  const result: MedicationActivationCertificationResult = blockers.length === 0 ? "PASS" : "FAIL";

  return {
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    result,
    blockers,
  };
}

function inventoryRowFromGovernance(record: MedicationActivationGovernanceRecord): MedicationActivationInventoryRow {
  return {
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    displayNameFr: record.displayNameFr,
    strength: record.strength,
    doseForm: record.doseForm,
    route: record.route,
    orderabilityStatus: record.status,
    restrictionStatus: record.restrictedReason ?? record.reviewReason,
    requiresPharmacyReview: record.requiresPharmacyReview,
    requiresClinicalReview: record.requiresClinicalReview,
    marReady: record.marReady,
    inventoryReady: record.inventoryReady,
    billingReady: record.billingReady,
    ndcReady: record.ndcReady,
    careSettingEligibility: record.allowedCareSettings,
    catalogSource: record.catalogSource,
  };
}

export function buildMedicationActivationInventoryReport(
  records: MedicationActivationGovernanceRecord[]
): MedicationActivationInventoryReport {
  const byStatus: Record<MedicationActivationGovernanceStatus, number> = {
    ORDERABLE: 0,
    RESTRICTED: 0,
    NEEDS_PHARMACY_REVIEW: 0,
    NEEDS_CLINICAL_REVIEW: 0,
    CATALOG_ONLY: 0,
    NOT_ORDERABLE: 0,
  };
  for (const r of records) {
    byStatus[r.status] += 1;
  }
  return {
    totalRows: records.length,
    byStatus,
    rows: records.map(inventoryRowFromGovernance),
  };
}

export function buildHospitalCoverageGapReport(
  records: MedicationActivationGovernanceRecord[]
): HospitalCoverageGapRow[] {
  return HOSPITAL_ACTIVATION_COVERAGE_GROUPS.map((group) => {
    const matched = new Set<string>();
    let orderableCount = 0;
    let restrictedCount = 0;

    for (const record of records) {
      const blob = catalogBlob(record);
      const tokenHit = group.expectedTokens.some((t) => blob.includes(t.toLowerCase()));
      const explicitHit = group.explicitCatalogCodes?.includes(record.catalogCode) ?? false;
      if (tokenHit || explicitHit) {
        matched.add(record.catalogCode);
        if (record.status === "ORDERABLE" && record.orderSearchReady) orderableCount += 1;
        if (
          record.status === "RESTRICTED" ||
          record.status === "NEEDS_PHARMACY_REVIEW" ||
          record.status === "NEEDS_CLINICAL_REVIEW"
        ) {
          restrictedCount += 1;
        }
      }
    }

    const missing = group.expectedTokens.filter((token) => {
      return !records.some((r) => catalogBlob(r).includes(token.toLowerCase()));
    });

    const presentInCatalog = matched.size;
    let status: HospitalCoverageGapStatus;
    if (presentInCatalog === 0) {
      status = "MISSING";
    } else if (restrictedCount > 0 && orderableCount === 0) {
      status = "REVIEW_REQUIRED";
    } else if (missing.length === 0 && presentInCatalog > 0) {
      status = "READY";
    } else {
      status = "PARTIAL";
    }

    return {
      groupId: group.groupId,
      group: group.labelEn,
      expectedExamples: [...group.expectedTokens],
      presentInCatalog,
      orderableCount,
      missing,
      restrictedCount,
      status,
    };
  });
}

function buildGovernanceSummary(records: MedicationActivationGovernanceRecord[]): MedicationActivationGovernanceReport {
  const undocumented = records.filter(
    (r) =>
      r.status !== "ORDERABLE" &&
      !r.restrictedReason?.trim() &&
      !r.reviewReason?.trim() &&
      r.status !== "NOT_ORDERABLE"
  );
  return {
    totalMedications: records.length,
    orderable: records.filter((r) => r.status === "ORDERABLE").length,
    restricted: records.filter((r) => r.status === "RESTRICTED").length,
    needsPharmacyReview: records.filter((r) => r.status === "NEEDS_PHARMACY_REVIEW").length,
    needsClinicalReview: records.filter((r) => r.status === "NEEDS_CLINICAL_REVIEW").length,
    catalogOnly: records.filter((r) => r.status === "CATALOG_ONLY").length,
    notOrderable: records.filter((r) => r.status === "NOT_ORDERABLE").length,
    undocumentedGaps: undocumented.length,
  };
}

export function runGovernedActivationFramework(): GovernedActivationFrameworkReport {
  const legacyMap = buildUnifiedOrderabilityMap();
  const governanceRecords = [...legacyMap.values()].map(buildActivationGovernanceRecord);

  const perMedication = governanceRecords.map(certifyMedicationActivation);
  const passCount = perMedication.filter((p) => p.result === "PASS").length;
  const failCount = perMedication.length - passCount;

  const maturityRows = buildMedicationEngineMaturityReport();
  const maturityScore =
    Math.round((maturityRows.reduce((s, r) => s + r.maturityScore, 0) / maturityRows.length) * 10) / 10;

  const tdapRecord = governanceRecords.find((r) => r.catalogCode === TDAP_CATALOG_CODE) ?? null;

  return {
    ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1",
    generatedAt: new Date().toISOString(),
    inventoryReport: buildMedicationActivationInventoryReport(governanceRecords),
    engineMaturityScore: maturityScore,
    governanceReport: buildGovernanceSummary(governanceRecords),
    activationCertification: {
      ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1",
      generatedAt: new Date().toISOString(),
      totalEvaluated: perMedication.length,
      passCount,
      failCount,
      perMedication,
      aggregateDecision: failCount === 0 ? "PASS" : "FAIL",
      aggregateBlockers:
        failCount > 0
          ? [`${failCount} medications fail activation certification (governed expansion required)`]
          : [],
    },
    hospitalCoverageGap: buildHospitalCoverageGapReport(governanceRecords),
    tdapGovernance: certifyTdapGovernance(tdapRecord),
    i18nCertification: certifyMedicationI18nSafety(),
    expansionRoadmap: buildMedicationExpansionRoadmap(governanceRecords),
  };
}

export function medicationsPassingActivationCertification(
  report: MedicationActivationCertificationReport
): PerMedicationActivationCertification[] {
  return report.perMedication.filter((p) => p.result === "PASS");
}

export function medicationsFailingActivationCertification(
  report: MedicationActivationCertificationReport
): PerMedicationActivationCertification[] {
  return report.perMedication.filter((p) => p.result === "FAIL");
}
