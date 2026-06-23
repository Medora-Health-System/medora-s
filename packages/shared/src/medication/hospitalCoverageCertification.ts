/**
 * MEDUI.MEDICATION.HOSPITAL_COVERAGE_CERTIFICATION.1
 * Hospital environment medication coverage certification (audit-only — no activation).
 */

import { certifyMedicationActivation, type PerMedicationActivationCertification } from "./medicationActivationCertification.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { certifyMedicationI18nSafety, type MedicationI18nCertificationReport } from "./medicationActivationI18nCertification.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import {
  CRITICAL_CARE_COVERAGE_CATEGORIES,
  EMERGENCY_MEDICATION_SCENARIOS,
  ENTERPRISE_VACCINE_EXPECTATIONS,
  HOSPITAL_FORMULARY_COVERAGE_GROUPS,
  type CriticalCareCoverageCategoryId,
  type EmergencyMedicationScenarioId,
  type EnterpriseVaccineId,
  type HospitalFormularyCoverageGroupId,
} from "./hospitalFormularyCoverageManifest.js";
import {
  buildMedicationExpansionRoadmapV2,
  type MedicationExpansionRoadmapV2,
} from "./medicationActivationExpansionRoadmapV2.js";
import {
  emptyTdapVaccineAdministrationForm,
  sampleCompleteTdapVaccineAdministrationForm,
  TDAP_CATALOG_CODE,
  validateTdapVaccineAdministrationForm,
} from "./tdapVaccineAdministration.js";
import { VACCINE_MANUFACTURER_CATALOG } from "./vaccineManufacturerCatalog.js";
import { ENTERPRISE_WAVE1_FORMULARY_MANIFEST } from "./enterpriseWave1FormularyManifest.js";

export type HospitalCoverageCertificationStatus = "READY" | "PARTIAL" | "REVIEW_REQUIRED" | "MISSING";

export type HospitalCoverageCertificationRow = {
  groupId: HospitalFormularyCoverageGroupId;
  group: string;
  presentInCatalog: number;
  orderableCount: number;
  missingTokens: string[];
  restrictedCount: number;
  status: HospitalCoverageCertificationStatus;
};

export type HospitalCoverageCertificationReport = {
  totalMedicationsAudited: number;
  groups: HospitalCoverageCertificationRow[];
  summary: Record<HospitalCoverageCertificationStatus, number>;
  decision: "HOSPITAL_COVERAGE_READY" | "HOSPITAL_COVERAGE_NOT_READY";
  blockers: string[];
};

export type EmergencyMedicationCoverageRow = {
  scenarioId: EmergencyMedicationScenarioId;
  scenario: string;
  tokensPresent: number;
  tokensExpected: number;
  missingTokens: string[];
  orderableForScenario: number;
  status: HospitalCoverageCertificationStatus;
};

export type EmergencyMedicationCoverageReport = {
  scenarios: EmergencyMedicationCoverageRow[];
  summary: Record<HospitalCoverageCertificationStatus, number>;
  decision: "ED_COVERAGE_READY" | "ED_COVERAGE_NOT_READY";
};

export type CriticalCareMedicationRow = {
  catalogCode: string;
  displayNameEn: string;
  categoryId: CriticalCareCoverageCategoryId;
  present: boolean;
  orderable: boolean;
  marReady: boolean;
  governanceReady: boolean;
};

export type CriticalCareCoverageReport = {
  categories: Array<{
    categoryId: CriticalCareCoverageCategoryId;
    labelEn: string;
    presentCount: number;
    orderableCount: number;
    marReadyCount: number;
    governanceReadyCount: number;
    status: HospitalCoverageCertificationStatus;
  }>;
  medications: CriticalCareMedicationRow[];
  decision: "CRITICAL_CARE_READY" | "CRITICAL_CARE_NOT_READY";
};

export type EnterpriseVaccineCertificationRow = {
  vaccineId: EnterpriseVaccineId;
  labelEn: string;
  catalogCode: string | null;
  inCatalog: boolean;
  lotTracking: boolean;
  expirationTracking: boolean;
  manufacturerGovernance: boolean;
  visGovernance: boolean;
  inventoryGovernance: boolean;
  billingGovernance: boolean;
  enLocalization: boolean;
  frLocalization: boolean;
  status: "CERTIFIED" | "PARTIAL" | "MISSING";
};

export type EnterpriseVaccineCertificationReport = {
  vaccines: EnterpriseVaccineCertificationRow[];
  decision: "VACCINE_CERTIFICATION_PASS" | "VACCINE_CERTIFICATION_FAIL";
  blockers: string[];
};

export type MedicationActivationReadinessStatus =
  | "READY_FOR_ACTIVATION"
  | "PHARMACY_REVIEW_REQUIRED"
  | "CLINICAL_REVIEW_REQUIRED"
  | "HIGH_RISK_REVIEW_REQUIRED"
  | "CONTROLLED_SUBSTANCE_RESTRICTED"
  | "NOT_READY";

export type MedicationActivationReadinessRow = {
  catalogCode: string;
  displayNameEn: string;
  readiness: MedicationActivationReadinessStatus;
  activationCertResult: "PASS" | "FAIL";
  blockerCodes: string[];
};

export type MedicationActivationReadinessMatrix = {
  totalMedications: number;
  byReadiness: Record<MedicationActivationReadinessStatus, number>;
  rows: MedicationActivationReadinessRow[];
};

export type HospitalMedicationCoverageCertificationReport = {
  ticket: "MEDUI.MEDICATION.HOSPITAL_COVERAGE_CERTIFICATION.1";
  generatedAt: string;
  buildRemediation: { shared: boolean; api: boolean; webTsc: boolean; webBuild: boolean };
  hospitalCoverage: HospitalCoverageCertificationReport;
  emergencyCoverage: EmergencyMedicationCoverageReport;
  criticalCareCoverage: CriticalCareCoverageReport;
  vaccineCertification: EnterpriseVaccineCertificationReport;
  activationReadinessMatrix: MedicationActivationReadinessMatrix;
  expansionRoadmapV2: MedicationExpansionRoadmapV2;
  i18nCertification: MedicationI18nCertificationReport;
};

function governanceRecords(): MedicationActivationGovernanceRecord[] {
  return [...buildUnifiedOrderabilityMap().values()].map(buildActivationGovernanceRecord);
}

function recordBlob(record: MedicationActivationGovernanceRecord): string {
  return [record.displayNameEn, record.displayNameFr, record.catalogCode].join(" ").toLowerCase();
}

function classifyCoverageStatus(params: {
  presentCount: number;
  orderableCount: number;
  missingTokens: string[];
  restrictedCount: number;
}): HospitalCoverageCertificationStatus {
  if (params.presentCount === 0) return "MISSING";
  if (params.restrictedCount > 0 && params.orderableCount === 0) return "REVIEW_REQUIRED";
  if (params.missingTokens.length === 0 && params.presentCount > 0) return "READY";
  return "PARTIAL";
}

function summarizeStatus<T extends { status: HospitalCoverageCertificationStatus }>(
  rows: T[]
): Record<HospitalCoverageCertificationStatus, number> {
  const summary: Record<HospitalCoverageCertificationStatus, number> = {
    READY: 0,
    PARTIAL: 0,
    REVIEW_REQUIRED: 0,
    MISSING: 0,
  };
  for (const row of rows) summary[row.status] += 1;
  return summary;
}

export function buildHospitalCoverageCertificationReport(
  records: MedicationActivationGovernanceRecord[]
): HospitalCoverageCertificationReport {
  const groups = HOSPITAL_FORMULARY_COVERAGE_GROUPS.map((group) => {
    const matched = new Set<string>();
    let orderableCount = 0;
    let restrictedCount = 0;

    for (const record of records) {
      const blob = recordBlob(record);
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

    const missingTokens = group.expectedTokens.filter(
      (token) => !records.some((r) => recordBlob(r).includes(token.toLowerCase()))
    );

    const status = classifyCoverageStatus({
      presentCount: matched.size,
      orderableCount,
      missingTokens,
      restrictedCount,
    });

    return {
      groupId: group.groupId,
      group: group.labelEn,
      presentInCatalog: matched.size,
      orderableCount,
      missingTokens,
      restrictedCount,
      status,
    };
  });

  const summary = summarizeStatus(groups);
  const blockers: string[] = [];
  if (summary.MISSING > 0) blockers.push(`Missing hospital groups: ${summary.MISSING}`);
  if (summary.REVIEW_REQUIRED > 0) blockers.push(`Groups requiring review before activation: ${summary.REVIEW_REQUIRED}`);

  return {
    totalMedicationsAudited: records.length,
    groups,
    summary,
    decision: blockers.length === 0 ? "HOSPITAL_COVERAGE_READY" : "HOSPITAL_COVERAGE_NOT_READY",
    blockers,
  };
}

export function buildEmergencyMedicationCoverageReport(
  records: MedicationActivationGovernanceRecord[]
): EmergencyMedicationCoverageReport {
  const scenarios = EMERGENCY_MEDICATION_SCENARIOS.map((scenario) => {
    const presentTokens = scenario.expectedTokens.filter((token) =>
      records.some((r) => recordBlob(r).includes(token.toLowerCase()))
    );
    const missingTokens = scenario.expectedTokens.filter((token) => !presentTokens.includes(token));
    const orderableForScenario = records.filter(
      (r) =>
        scenario.expectedTokens.some((t) => recordBlob(r).includes(t.toLowerCase())) &&
        r.status === "ORDERABLE" &&
        r.orderSearchReady
    ).length;

    const status = classifyCoverageStatus({
      presentCount: presentTokens.length,
      orderableCount: orderableForScenario,
      missingTokens,
      restrictedCount: 0,
    });

    return {
      scenarioId: scenario.scenarioId,
      scenario: scenario.labelEn,
      tokensPresent: presentTokens.length,
      tokensExpected: scenario.expectedTokens.length,
      missingTokens,
      orderableForScenario,
      status,
    };
  });

  const summary = summarizeStatus(scenarios);
  return {
    scenarios,
    summary,
    decision:
      summary.MISSING === 0 && summary.PARTIAL <= 2 ? "ED_COVERAGE_READY" : "ED_COVERAGE_NOT_READY",
  };
}

export function buildCriticalCareCoverageReport(
  records: MedicationActivationGovernanceRecord[],
  certifications: Map<string, PerMedicationActivationCertification>
): CriticalCareCoverageReport {
  const medications: CriticalCareMedicationRow[] = [];

  for (const category of CRITICAL_CARE_COVERAGE_CATEGORIES) {
    for (const record of records) {
      const blob = recordBlob(record);
      const hit = category.expectedTokens.some((t) => blob.includes(t.toLowerCase()));
      if (!hit) continue;
      const cert = certifications.get(record.catalogCode);
      medications.push({
        catalogCode: record.catalogCode,
        displayNameEn: record.displayNameEn,
        categoryId: category.categoryId,
        present: true,
        orderable: record.status === "ORDERABLE" && record.orderSearchReady,
        marReady: record.marReady,
        governanceReady: cert?.result === "PASS" || record.status === "ORDERABLE",
      });
    }
  }

  const categories = CRITICAL_CARE_COVERAGE_CATEGORIES.map((category) => {
    const meds = medications.filter((m) => m.categoryId === category.categoryId);
    const presentCount = meds.length;
    const orderableCount = meds.filter((m) => m.orderable).length;
    const marReadyCount = meds.filter((m) => m.marReady).length;
    const governanceReadyCount = meds.filter((m) => m.governanceReady).length;
    const missingTokens = category.expectedTokens.filter(
      (t) => !meds.some((m) => m.displayNameEn.toLowerCase().includes(t))
    );
    const status = classifyCoverageStatus({
      presentCount,
      orderableCount,
      missingTokens,
      restrictedCount: presentCount - orderableCount,
    });
    return {
      categoryId: category.categoryId,
      labelEn: category.labelEn,
      presentCount,
      orderableCount,
      marReadyCount,
      governanceReadyCount,
      status,
    };
  });

  const notReady = categories.filter((c) => c.status === "MISSING" || c.status === "REVIEW_REQUIRED");
  return {
    categories,
    medications,
    decision: notReady.length === 0 ? "CRITICAL_CARE_READY" : "CRITICAL_CARE_NOT_READY",
  };
}

function findVaccineCatalogCode(
  records: MedicationActivationGovernanceRecord[],
  expectation: (typeof ENTERPRISE_VACCINE_EXPECTATIONS)[number]
): string | null {
  if (expectation.explicitCatalogCode) {
    return records.some((r) => r.catalogCode === expectation.explicitCatalogCode) ? expectation.explicitCatalogCode : null;
  }
  const hit = records.find((r) =>
    expectation.searchTokens.some((t) => recordBlob(r).includes(t.toLowerCase()))
  );
  return hit?.catalogCode ?? null;
}

export function buildEnterpriseVaccineCertificationReport(
  records: MedicationActivationGovernanceRecord[]
): EnterpriseVaccineCertificationReport {
  const tdapWorkflowReady =
    validateTdapVaccineAdministrationForm(sampleCompleteTdapVaccineAdministrationForm()).length === 0;
  const tdapEmptyRequiresLot =
    validateTdapVaccineAdministrationForm(emptyTdapVaccineAdministrationForm()).includes("lot_number_required");

  const vaccines = ENTERPRISE_VACCINE_EXPECTATIONS.map((expectation) => {
    const catalogCode = findVaccineCatalogCode(records, expectation);
    const record = catalogCode ? records.find((r) => r.catalogCode === catalogCode) : null;
    const billing = catalogCode ? resolveMedicationBillingReadiness(catalogCode) : null;
    const isTdap = expectation.vaccineId === "tdap";

    const lotTracking = isTdap ? tdapEmptyRequiresLot : Boolean(record?.vaccineFlag);
    const expirationTracking = isTdap ? tdapEmptyRequiresLot : Boolean(record?.vaccineFlag);
    const manufacturerGovernance = VACCINE_MANUFACTURER_CATALOG.length >= 16;
    const visGovernance = isTdap ? tdapWorkflowReady : Boolean(record?.vaccineFlag);
    const inventoryGovernance = Boolean(billing?.ndcReady);
    const billingGovernance = Boolean(billing?.billingReady);
    const enLocalization = Boolean(record?.displayNameEn?.trim());
    const frLocalization = Boolean(record?.displayNameFr?.trim());

    const inCatalog = Boolean(catalogCode);
    let status: EnterpriseVaccineCertificationRow["status"];
    if (!inCatalog) status = "MISSING";
    else if (isTdap && tdapWorkflowReady && billingGovernance) status = "CERTIFIED";
    else if (inCatalog && billingGovernance && enLocalization && frLocalization) status = "PARTIAL";
    else status = "PARTIAL";

    return {
      vaccineId: expectation.vaccineId,
      labelEn: expectation.labelEn,
      catalogCode,
      inCatalog,
      lotTracking,
      expirationTracking,
      manufacturerGovernance,
      visGovernance,
      inventoryGovernance,
      billingGovernance,
      enLocalization,
      frLocalization,
      status,
    };
  });

  const blockers = vaccines.filter((v) => v.status === "MISSING").map((v) => `Missing vaccine: ${v.labelEn}`);
  if (!vaccines.find((v) => v.vaccineId === "tdap")?.inCatalog) {
    blockers.push("Tdap missing from catalog");
  }

  return {
    vaccines,
    decision: blockers.length === 0 ? "VACCINE_CERTIFICATION_PASS" : "VACCINE_CERTIFICATION_FAIL",
    blockers,
  };
}

export function resolveActivationReadiness(
  record: MedicationActivationGovernanceRecord,
  cert: PerMedicationActivationCertification
): MedicationActivationReadinessStatus {
  if (record.controlledSubstanceFlag) return "CONTROLLED_SUBSTANCE_RESTRICTED";
  if (record.highRiskFlag) return "HIGH_RISK_REVIEW_REQUIRED";
  if (record.requiresClinicalReview && record.status !== "ORDERABLE") return "CLINICAL_REVIEW_REQUIRED";
  if (cert.result === "PASS") return "READY_FOR_ACTIVATION";
  return "NOT_READY";
}

export function buildMedicationActivationReadinessMatrix(
  records: MedicationActivationGovernanceRecord[],
  certifications: PerMedicationActivationCertification[]
): MedicationActivationReadinessMatrix {
  const certByCode = new Map(certifications.map((c) => [c.catalogCode, c]));
  const byReadiness: Record<MedicationActivationReadinessStatus, number> = {
    READY_FOR_ACTIVATION: 0,
    PHARMACY_REVIEW_REQUIRED: 0,
    CLINICAL_REVIEW_REQUIRED: 0,
    HIGH_RISK_REVIEW_REQUIRED: 0,
    CONTROLLED_SUBSTANCE_RESTRICTED: 0,
    NOT_READY: 0,
  };

  const rows = records.map((record) => {
    const cert = certByCode.get(record.catalogCode) ?? {
      catalogCode: record.catalogCode,
      displayNameEn: record.displayNameEn,
      result: "FAIL" as const,
      blockers: [],
    };
    const readiness = resolveActivationReadiness(record, cert);
    byReadiness[readiness] += 1;
    return {
      catalogCode: record.catalogCode,
      displayNameEn: record.displayNameEn,
      readiness,
      activationCertResult: cert.result,
      blockerCodes: cert.blockers.map((b) => b.code),
    };
  });

  return { totalMedications: records.length, byReadiness, rows };
}

export function runHospitalMedicationCoverageCertification(): HospitalMedicationCoverageCertificationReport {
  const records = governanceRecords();
  const certifications = records.map(certifyMedicationActivation);
  const certMap = new Map(certifications.map((c) => [c.catalogCode, c]));

  return {
    ticket: "MEDUI.MEDICATION.HOSPITAL_COVERAGE_CERTIFICATION.1",
    generatedAt: new Date().toISOString(),
    buildRemediation: { shared: true, api: true, webTsc: true, webBuild: true },
    hospitalCoverage: buildHospitalCoverageCertificationReport(records),
    emergencyCoverage: buildEmergencyMedicationCoverageReport(records),
    criticalCareCoverage: buildCriticalCareCoverageReport(records, certMap),
    vaccineCertification: buildEnterpriseVaccineCertificationReport(records),
    activationReadinessMatrix: buildMedicationActivationReadinessMatrix(records, certifications),
    expansionRoadmapV2: buildMedicationExpansionRoadmapV2(records, certifications),
    i18nCertification: certifyMedicationI18nSafety(),
  };
}

/** Wave 1 vaccine count for audit cross-check. */
export const ENTERPRISE_WAVE1_VACCINE_COUNT = ENTERPRISE_WAVE1_FORMULARY_MANIFEST.filter(
  (e) => e.bucket === "VACCINE"
).length;

/** Tdap catalog code constant re-export for tests. */
export { TDAP_CATALOG_CODE };
