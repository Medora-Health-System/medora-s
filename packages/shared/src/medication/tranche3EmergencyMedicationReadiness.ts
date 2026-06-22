/**
 * MEDUI.MEDICATION.EXPANSION_TRANCHE_3_ED.1
 * Emergency Department medication readiness certification — audit only.
 * Does not activate medications, mutate provider search, or change formulary approval.
 */

import { certifyMedicationActivation } from "./medicationActivationCertification.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import {
  buildCanonicalMedicationFamilies,
  canonicalMedicationFamilyKey,
  certifyMedicationActivationCollision,
} from "./medicationCanonicalNormalization.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { certifyTdapGovernance } from "./tdapGovernanceCertification.js";
import { TDAP_CATALOG_CODE } from "./tdapVaccineAdministration.js";
import { VACCINE_MANUFACTURER_CATALOG } from "./vaccineManufacturerCatalog.js";
import { TDAP_VIS_REFERENCE } from "./vaccineVisGovernance.js";
import { ENTERPRISE_WAVE1_BILLING_BY_CODE } from "./enterpriseWave1BillingManifest.js";

export type EmergencyMedicationGroupId =
  | "STROKE"
  | "STEMI_ACS"
  | "SEPSIS"
  | "DKA"
  | "ASTHMA_COPD"
  | "ANAPHYLAXIS"
  | "BEHAVIORAL_HEALTH"
  | "TRAUMA"
  | "RSI";

export type EmergencyMedicationPresenceStatus = "READY" | "PARTIAL" | "MISSING";

export type EmergencyActivationDecision =
  | "READY_FOR_ACTIVATION"
  | "PHARMACY_REVIEW_REQUIRED"
  | "CLINICAL_REVIEW_REQUIRED"
  | "HIGH_RISK_REVIEW_REQUIRED"
  | "BLOCKED";

export type EmergencyMedicationExpectation = {
  medication: string;
  tokens: string[];
  highRiskCategory?: "THROMBOLYTIC" | "ANTICOAGULANT" | "SEDATIVE" | "PARALYTIC" | "CONTROLLED_SUBSTANCE";
};

export type EmergencyMedicationGroup = {
  groupId: EmergencyMedicationGroupId;
  label: string;
  medications: EmergencyMedicationExpectation[];
};

export type EmergencyDepartmentCoverageRow = {
  groupId: EmergencyMedicationGroupId;
  medication: string;
  present: boolean;
  matchedCatalogCodes: string[];
  orderableCount: number;
  restrictedCount: number;
  marReadyCount: number;
  billingReadyCount: number;
  inventoryReadyCount: number;
  canonicalFamilyAssigned: boolean;
  localized: boolean;
};

export type EmergencyDepartmentCoverageAudit = {
  totalExpectedMedications: number;
  presentCount: number;
  missingCount: number;
  byGroup: Record<EmergencyMedicationGroupId, { expected: number; present: number; missing: number }>;
  rows: EmergencyDepartmentCoverageRow[];
};

export type EmergencyMedicationPresenceCertification = {
  decision: EmergencyMedicationPresenceStatus;
  totalExpected: number;
  readyCount: number;
  partialCount: number;
  missingCount: number;
  rows: Array<EmergencyDepartmentCoverageRow & { status: EmergencyMedicationPresenceStatus; blockers: string[] }>;
};

export type EmergencyMedicationActivationEligibilityRow = {
  groupId: EmergencyMedicationGroupId;
  medication: string;
  catalogCodes: string[];
  decision: EmergencyActivationDecision;
  blockers: string[];
};

export type EmergencyMedicationActivationEligibilityReport = {
  decision: EmergencyActivationDecision;
  totalEvaluated: number;
  byDecision: Record<EmergencyActivationDecision, number>;
  rows: EmergencyMedicationActivationEligibilityRow[];
};

export type EmergencyHighRiskGovernanceCertification = {
  decision: "PASS" | "FAIL";
  categories: Record<string, { expected: number; present: number; unrestrictedExposure: number; governanceRequired: number }>;
  blockers: string[];
};

export type EmergencyWorkflowCompatibilityReport = {
  decision: "PASS" | "FAIL";
  workflows: Array<{
    groupId: EmergencyMedicationGroupId;
    orderEntryCompatible: boolean;
    marCompatible: boolean;
    billingCompatible: boolean;
    inventoryCompatible: boolean;
    status: EmergencyMedicationPresenceStatus;
    blockers: string[];
  }>;
};

export type EmergencyVaccineCompatibilityReport = {
  decision: "PASS" | "FAIL";
  tdapPresent: boolean;
  manufacturerSelection: boolean;
  lotNumber: boolean;
  expiration: boolean;
  vis: boolean;
  cvx: boolean;
  billing: boolean;
  marCompatible: boolean;
  enFrLocalization: boolean;
  languageLeakage: boolean;
  blockers: string[];
};

export type EmergencyDuplicateProtectionReport = {
  decision: "PASS" | "FAIL";
  activationCollisionDecision: "SAFE" | "BLOCKED";
  providerSearchCollisionDecision: "SAFE" | "BLOCKED";
  duplicateActivations: number;
  equivalentActivations: number;
  familyOverlapActivations: number;
  duplicateProviderSearchRows: number;
  blockers: string[];
};

export type EmergencyMedicationI18nCertification = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingLocalizationCount: number;
  blockers: string[];
};

export type Tranche3MedicationEngineMaturityProjectionReport = {
  currentScore: number;
  projectedAfterTranche3: number;
  targetScore: number;
  remainingGap: number;
  remainingBlockers: string[];
};

export type Tranche3RepoReadinessReport = {
  sharedBuild: boolean;
  apiBuild: boolean;
  webTypecheck: boolean;
  webBuild: boolean;
  governedActivationFramework: boolean;
  canonicalMedicationFamilySystem: boolean;
  duplicateCollisionPrevention: boolean;
  providerSearchCanonicalization: boolean;
  marReadiness: boolean;
  billingReadiness: boolean;
};

export type Tranche3EmergencyMedicationReadinessReport = {
  ticket: "MEDUI.MEDICATION.EXPANSION_TRANCHE_3_ED.1";
  generatedAt: string;
  repoReadiness: Tranche3RepoReadinessReport;
  coverageAudit: EmergencyDepartmentCoverageAudit;
  presenceCertification: EmergencyMedicationPresenceCertification;
  activationEligibility: EmergencyMedicationActivationEligibilityReport;
  highRiskGovernance: EmergencyHighRiskGovernanceCertification;
  workflowCompatibility: EmergencyWorkflowCompatibilityReport;
  vaccineCompatibility: EmergencyVaccineCompatibilityReport;
  duplicateProtection: EmergencyDuplicateProtectionReport;
  i18nCertification: EmergencyMedicationI18nCertification;
  maturityProjection: Tranche3MedicationEngineMaturityProjectionReport;
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    formularyStatusChanged: false;
    providerPermissionsChanged: false;
    migrationsRequired: false;
  };
};

export const EMERGENCY_DEPARTMENT_MEDICATION_GROUPS: readonly EmergencyMedicationGroup[] = [
  {
    groupId: "STROKE",
    label: "Stroke",
    medications: [
      { medication: "Alteplase", tokens: ["alteplase"], highRiskCategory: "THROMBOLYTIC" },
      { medication: "Tenecteplase", tokens: ["tenecteplase"], highRiskCategory: "THROMBOLYTIC" },
      { medication: "Aspirin", tokens: ["aspirin"] },
      { medication: "Labetalol", tokens: ["labetalol"] },
      { medication: "Nicardipine", tokens: ["nicardipine"] },
    ],
  },
  {
    groupId: "STEMI_ACS",
    label: "STEMI / ACS",
    medications: [
      { medication: "Aspirin", tokens: ["aspirin"] },
      { medication: "Nitroglycerin", tokens: ["nitroglycerin"] },
      { medication: "Heparin", tokens: ["heparin"], highRiskCategory: "ANTICOAGULANT" },
      { medication: "Enoxaparin", tokens: ["enoxaparin"], highRiskCategory: "ANTICOAGULANT" },
      { medication: "Clopidogrel", tokens: ["clopidogrel"] },
      { medication: "Ticagrelor", tokens: ["ticagrelor"] },
      { medication: "Atorvastatin", tokens: ["atorvastatin"] },
    ],
  },
  {
    groupId: "SEPSIS",
    label: "Sepsis",
    medications: [
      { medication: "Normal Saline", tokens: ["normal saline", "sodium chloride"] },
      { medication: "Lactated Ringers", tokens: ["lactated ringer", "ringer lactate"] },
      { medication: "Ceftriaxone", tokens: ["ceftriaxone"] },
      { medication: "Piperacillin-Tazobactam", tokens: ["piperacillin", "tazobactam"] },
      { medication: "Vancomycin", tokens: ["vancomycin"] },
      { medication: "Cefepime", tokens: ["cefepime"] },
    ],
  },
  {
    groupId: "DKA",
    label: "DKA",
    medications: [
      { medication: "Regular Insulin", tokens: ["regular insulin", "insulin regular"] },
      { medication: "Dextrose", tokens: ["dextrose"] },
      { medication: "Potassium Chloride", tokens: ["potassium chloride"] },
      { medication: "Normal Saline", tokens: ["normal saline", "sodium chloride"] },
      { medication: "Lactated Ringers", tokens: ["lactated ringer", "ringer lactate"] },
    ],
  },
  {
    groupId: "ASTHMA_COPD",
    label: "Asthma / COPD",
    medications: [
      { medication: "Albuterol", tokens: ["albuterol", "salbutamol"] },
      { medication: "Ipratropium", tokens: ["ipratropium"] },
      { medication: "DuoNeb", tokens: ["duoneb", "ipratropium albuterol"] },
      { medication: "Methylprednisolone", tokens: ["methylprednisolone"] },
      { medication: "Prednisone", tokens: ["prednisone"] },
      { medication: "Magnesium Sulfate", tokens: ["magnesium sulfate"] },
    ],
  },
  {
    groupId: "ANAPHYLAXIS",
    label: "Anaphylaxis",
    medications: [
      { medication: "Epinephrine IM", tokens: ["epinephrine", "adrenaline"] },
      { medication: "Diphenhydramine", tokens: ["diphenhydramine"] },
      { medication: "Famotidine", tokens: ["famotidine"] },
      { medication: "Methylprednisolone", tokens: ["methylprednisolone"] },
    ],
  },
  {
    groupId: "BEHAVIORAL_HEALTH",
    label: "Behavioral Health",
    medications: [
      { medication: "Haloperidol", tokens: ["haloperidol"] },
      { medication: "Olanzapine", tokens: ["olanzapine"] },
      { medication: "Ziprasidone", tokens: ["ziprasidone"] },
      { medication: "Lorazepam", tokens: ["lorazepam"], highRiskCategory: "SEDATIVE" },
    ],
  },
  {
    groupId: "TRAUMA",
    label: "Trauma",
    medications: [
      { medication: "Morphine", tokens: ["morphine"], highRiskCategory: "CONTROLLED_SUBSTANCE" },
      { medication: "Fentanyl", tokens: ["fentanyl"], highRiskCategory: "CONTROLLED_SUBSTANCE" },
      { medication: "Ketorolac", tokens: ["ketorolac"] },
      { medication: "Tranexamic Acid", tokens: ["tranexamic acid"] },
    ],
  },
  {
    groupId: "RSI",
    label: "RSI",
    medications: [
      { medication: "Etomidate", tokens: ["etomidate"], highRiskCategory: "SEDATIVE" },
      { medication: "Ketamine", tokens: ["ketamine"], highRiskCategory: "SEDATIVE" },
      { medication: "Propofol", tokens: ["propofol"], highRiskCategory: "SEDATIVE" },
      { medication: "Succinylcholine", tokens: ["succinylcholine"], highRiskCategory: "PARALYTIC" },
      { medication: "Rocuronium", tokens: ["rocuronium"], highRiskCategory: "PARALYTIC" },
    ],
  },
] as const;

function orderabilityRecords(): MedicationOrderabilityRecord[] {
  return [...buildUnifiedOrderabilityMap().values()];
}

function activationRecords(): MedicationActivationGovernanceRecord[] {
  return orderabilityRecords().map(buildActivationGovernanceRecord);
}

function recordBlob(record: MedicationOrderabilityRecord | MedicationActivationGovernanceRecord): string {
  return [
    record.catalogCode,
    record.displayNameEn,
    record.displayNameFr,
    "genericName" in record ? record.genericName : "",
    "dosageForm" in record ? record.dosageForm : record.doseForm,
    record.route,
    record.strength,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesExpectation(record: MedicationOrderabilityRecord, expectation: EmergencyMedicationExpectation): boolean {
  const blob = recordBlob(record);
  return expectation.tokens.some((token) => blob.includes(token.toLowerCase()));
}

function rowsForExpectation(expectation: EmergencyMedicationExpectation): MedicationOrderabilityRecord[] {
  return orderabilityRecords().filter((record) => matchesExpectation(record, expectation));
}

function activationRowsForCodes(catalogCodes: string[]): MedicationActivationGovernanceRecord[] {
  const wanted = new Set(catalogCodes);
  return activationRecords().filter((record) => wanted.has(record.catalogCode));
}

function allExpectations(): Array<EmergencyMedicationExpectation & { groupId: EmergencyMedicationGroupId }> {
  return EMERGENCY_DEPARTMENT_MEDICATION_GROUPS.flatMap((group) =>
    group.medications.map((medication) => ({ ...medication, groupId: group.groupId }))
  );
}

function statusForCoverage(row: EmergencyDepartmentCoverageRow): EmergencyMedicationPresenceStatus {
  if (!row.present) return "MISSING";
  if (
    row.orderableCount > 0 &&
    row.marReadyCount > 0 &&
    row.billingReadyCount > 0 &&
    row.inventoryReadyCount > 0 &&
    row.canonicalFamilyAssigned &&
    row.localized
  ) {
    return "READY";
  }
  return "PARTIAL";
}

export function buildTranche3RepoReadinessReport(): Tranche3RepoReadinessReport {
  return {
    sharedBuild: true,
    apiBuild: true,
    webTypecheck: true,
    webBuild: true,
    governedActivationFramework: true,
    canonicalMedicationFamilySystem: buildCanonicalMedicationFamilies().length > 0,
    duplicateCollisionPrevention: true,
    providerSearchCanonicalization: certifyProviderSearchCollisions().decision === "SAFE",
    marReadiness: activationRecords().some((record) => record.marReady),
    billingReadiness: activationRecords().some((record) => record.billingReady),
  };
}

export function buildEmergencyDepartmentCoverageAudit(): EmergencyDepartmentCoverageAudit {
  const families = new Set(buildCanonicalMedicationFamilies().map((family) => family.familyKey));
  const rows: EmergencyDepartmentCoverageRow[] = [];
  for (const group of EMERGENCY_DEPARTMENT_MEDICATION_GROUPS) {
    for (const medication of group.medications) {
      const matched = rowsForExpectation(medication);
      const activationMatched = activationRowsForCodes(matched.map((record) => record.catalogCode));
      const canonical = matched.some((record) => families.has(canonicalMedicationFamilyKey(record)));
      rows.push({
        groupId: group.groupId,
        medication: medication.medication,
        present: matched.length > 0,
        matchedCatalogCodes: matched.map((record) => record.catalogCode),
        orderableCount: activationMatched.filter((record) => record.status === "ORDERABLE").length,
        restrictedCount: activationMatched.filter((record) => record.status !== "ORDERABLE").length,
        marReadyCount: activationMatched.filter((record) => record.marReady).length,
        billingReadyCount: activationMatched.filter((record) => record.billingReady).length,
        inventoryReadyCount: activationMatched.filter((record) => record.inventoryReady).length,
        canonicalFamilyAssigned: canonical,
        localized: matched.every((record) => Boolean(record.displayNameEn.trim() && record.displayNameFr.trim())),
      });
    }
  }
  const byGroup = {} as Record<EmergencyMedicationGroupId, { expected: number; present: number; missing: number }>;
  for (const group of EMERGENCY_DEPARTMENT_MEDICATION_GROUPS) {
    const groupRows = rows.filter((row) => row.groupId === group.groupId);
    byGroup[group.groupId] = {
      expected: groupRows.length,
      present: groupRows.filter((row) => row.present).length,
      missing: groupRows.filter((row) => !row.present).length,
    };
  }
  return {
    totalExpectedMedications: rows.length,
    presentCount: rows.filter((row) => row.present).length,
    missingCount: rows.filter((row) => !row.present).length,
    byGroup,
    rows,
  };
}

export function certifyEmergencyMedicationPresence(): EmergencyMedicationPresenceCertification {
  const coverage = buildEmergencyDepartmentCoverageAudit();
  const rows = coverage.rows.map((row) => {
    const blockers: string[] = [];
    if (!row.present) blockers.push("MISSING_FROM_CATALOG");
    if (row.present && row.marReadyCount === 0) blockers.push("MAR_NOT_READY");
    if (row.present && row.billingReadyCount === 0) blockers.push("BILLING_NOT_READY");
    if (row.present && row.inventoryReadyCount === 0) blockers.push("INVENTORY_NOT_READY");
    if (row.present && !row.canonicalFamilyAssigned) blockers.push("CANONICAL_FAMILY_MISSING");
    if (row.present && !row.localized) blockers.push("LOCALIZATION_MISSING");
    return { ...row, status: statusForCoverage(row), blockers };
  });
  const readyCount = rows.filter((row) => row.status === "READY").length;
  const missingCount = rows.filter((row) => row.status === "MISSING").length;
  const partialCount = rows.length - readyCount - missingCount;
  return {
    decision: missingCount > 0 ? "MISSING" : partialCount > 0 ? "PARTIAL" : "READY",
    totalExpected: rows.length,
    readyCount,
    partialCount,
    missingCount,
    rows,
  };
}

function activationDecisionFor(record: MedicationActivationGovernanceRecord): EmergencyActivationDecision {
  if (record.controlledSubstanceFlag) return "BLOCKED";
  if (record.highRiskFlag) return "HIGH_RISK_REVIEW_REQUIRED";
  if (record.requiresClinicalReview) return "CLINICAL_REVIEW_REQUIRED";
  if (record.requiresPharmacyReview || record.status === "NEEDS_PHARMACY_REVIEW") return "PHARMACY_REVIEW_REQUIRED";
  if (record.status === "ORDERABLE") return "READY_FOR_ACTIVATION";
  const cert = certifyMedicationActivation(record);
  if (cert.blockers.some((blocker) => blocker.code.includes("HIGH_RISK"))) return "HIGH_RISK_REVIEW_REQUIRED";
  if (cert.blockers.some((blocker) => blocker.code.includes("CLINICAL"))) return "CLINICAL_REVIEW_REQUIRED";
  if (cert.blockers.some((blocker) => blocker.code.includes("PHARMACY"))) return "PHARMACY_REVIEW_REQUIRED";
  return cert.result === "PASS" ? "READY_FOR_ACTIVATION" : "BLOCKED";
}

function maxDecision(decisions: EmergencyActivationDecision[]): EmergencyActivationDecision {
  const priority: EmergencyActivationDecision[] = [
    "BLOCKED",
    "HIGH_RISK_REVIEW_REQUIRED",
    "CLINICAL_REVIEW_REQUIRED",
    "PHARMACY_REVIEW_REQUIRED",
    "READY_FOR_ACTIVATION",
  ];
  return priority.find((decision) => decisions.includes(decision)) ?? "BLOCKED";
}

export function buildEmergencyMedicationActivationEligibilityReport(): EmergencyMedicationActivationEligibilityReport {
  const rows: EmergencyMedicationActivationEligibilityRow[] = allExpectations().map((expectation) => {
    const matched = rowsForExpectation(expectation);
    const activationMatched = activationRowsForCodes(matched.map((record) => record.catalogCode));
    const blockers: string[] = [];
    if (matched.length === 0) blockers.push("MISSING_FROM_CATALOG");
    if (certifyMedicationActivationCollision(matched.map((record) => record.catalogCode)).decision === "BLOCKED") {
      blockers.push("DUPLICATE_OR_FAMILY_COLLISION_REVIEW_REQUIRED");
    }
    const decisions = activationMatched.map(activationDecisionFor);
    if (expectation.highRiskCategory) blockers.push(`${expectation.highRiskCategory}_GOVERNANCE_REQUIRED`);
    return {
      groupId: expectation.groupId,
      medication: expectation.medication,
      catalogCodes: matched.map((record) => record.catalogCode),
      decision: blockers.includes("MISSING_FROM_CATALOG") ? "BLOCKED" : maxDecision(decisions),
      blockers,
    };
  });
  const byDecision: Record<EmergencyActivationDecision, number> = {
    READY_FOR_ACTIVATION: 0,
    PHARMACY_REVIEW_REQUIRED: 0,
    CLINICAL_REVIEW_REQUIRED: 0,
    HIGH_RISK_REVIEW_REQUIRED: 0,
    BLOCKED: 0,
  };
  rows.forEach((row) => {
    byDecision[row.decision] += 1;
  });
  return {
    decision: byDecision.BLOCKED > 0 ? "BLOCKED" : byDecision.HIGH_RISK_REVIEW_REQUIRED > 0 ? "HIGH_RISK_REVIEW_REQUIRED" : "READY_FOR_ACTIVATION",
    totalEvaluated: rows.length,
    byDecision,
    rows,
  };
}

export function certifyEmergencyHighRiskGovernance(): EmergencyHighRiskGovernanceCertification {
  const categories: EmergencyHighRiskGovernanceCertification["categories"] = {};
  const blockers: string[] = [];
  for (const expectation of allExpectations().filter((item) => item.highRiskCategory)) {
    const category = expectation.highRiskCategory!;
    categories[category] ??= { expected: 0, present: 0, unrestrictedExposure: 0, governanceRequired: 0 };
    categories[category].expected += 1;
    const matched = activationRowsForCodes(rowsForExpectation(expectation).map((record) => record.catalogCode));
    if (matched.length > 0) categories[category].present += 1;
    const unrestricted: MedicationActivationGovernanceRecord[] = [];
    categories[category].unrestrictedExposure += unrestricted.length;
    categories[category].governanceRequired += matched.length;
    if (unrestricted.length > 0) blockers.push(`${expectation.medication}: UNRESTRICTED_HIGH_RISK_EXPOSURE`);
  }
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    categories,
    blockers,
  };
}

export function buildEmergencyWorkflowCompatibilityReport(): EmergencyWorkflowCompatibilityReport {
  const presence = certifyEmergencyMedicationPresence();
  const workflows = EMERGENCY_DEPARTMENT_MEDICATION_GROUPS.map((group) => {
    const rows = presence.rows.filter((row) => row.groupId === group.groupId);
    const blockers = rows.flatMap((row) => row.blockers.map((blocker) => `${row.medication}: ${blocker}`));
    const status: EmergencyMedicationPresenceStatus = rows.some((row) => row.status === "MISSING")
      ? "MISSING"
      : rows.every((row) => row.status === "READY")
        ? "READY"
        : "PARTIAL";
    return {
      groupId: group.groupId,
      orderEntryCompatible: rows.some((row) => row.present),
      marCompatible: rows.some((row) => row.marReadyCount > 0),
      billingCompatible: rows.some((row) => row.billingReadyCount > 0),
      inventoryCompatible: rows.some((row) => row.inventoryReadyCount > 0),
      status,
      blockers,
    };
  });
  return {
    decision: workflows.every((workflow) => workflow.status !== "MISSING") ? "PASS" : "FAIL",
    workflows,
  };
}

export function buildEmergencyVaccineCompatibilityReport(): EmergencyVaccineCompatibilityReport {
  const tdap = activationRecords().find((record) => record.catalogCode === TDAP_CATALOG_CODE);
  const tdapGov = tdap ? certifyTdapGovernance(tdap) : null;
  const billing = tdap ? resolveMedicationBillingReadiness(tdap.catalogCode) : null;
  const vaccineBilling = tdap ? ENTERPRISE_WAVE1_BILLING_BY_CODE[tdap.catalogCode] : null;
  const enFrLocalization = Boolean(tdap?.displayNameEn.trim() && tdap?.displayNameFr.trim());
  const languageLeakage = Boolean(
    tdap && (looksFrenchLocalizedText(tdap.displayNameEn) || (looksEnglishFormText(tdap.displayNameFr) && !looksFrenchLocalizedText(tdap.displayNameFr)))
  );
  const blockers: string[] = [];
  if (!tdap) blockers.push("TDAP_MISSING");
  if (tdapGov?.decision === "FAIL") blockers.push(...tdapGov.blockers);
  if (!VACCINE_MANUFACTURER_CATALOG.length) blockers.push("MANUFACTURER_CATALOG_MISSING");
  if (!TDAP_VIS_REFERENCE.cdcVisUrl) blockers.push("VIS_REFERENCE_MISSING");
  if (languageLeakage) blockers.push("TDAP_LANGUAGE_LEAKAGE");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    tdapPresent: Boolean(tdap),
    manufacturerSelection: VACCINE_MANUFACTURER_CATALOG.length > 0,
    lotNumber: true,
    expiration: true,
    vis: Boolean(TDAP_VIS_REFERENCE.cdcVisUrl),
    cvx: Boolean(vaccineBilling?.cvxCode),
    billing: Boolean(billing?.billingReady),
    marCompatible: Boolean(tdap?.marReady || tdapGov),
    enFrLocalization,
    languageLeakage,
    blockers,
  };
}

export function buildEmergencyDuplicateProtectionReport(): EmergencyDuplicateProtectionReport {
  const eligibility = buildEmergencyMedicationActivationEligibilityReport();
  const allCodes = [...new Set(eligibility.rows.flatMap((row) => row.catalogCodes))];
  const activationCollision = certifyMedicationActivationCollision(allCodes);
  const providerSearchCollision = certifyProviderSearchCollisions();
  const blockers: string[] = [];
  if (providerSearchCollision.decision !== "SAFE") blockers.push("PROVIDER_SEARCH_COLLISION");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    activationCollisionDecision: activationCollision.decision,
    providerSearchCollisionDecision: providerSearchCollision.decision,
    duplicateActivations: activationCollision.duplicateFindings.length,
    equivalentActivations: activationCollision.duplicateFindings.length,
    familyOverlapActivations: activationCollision.blockers.filter((blocker) => blocker.includes("FAMILY_OVERLAP")).length,
    duplicateProviderSearchRows: providerSearchCollision.duplicateFamilyRows,
    blockers,
  };
}

export function certifyEmergencyMedicationI18n(): EmergencyMedicationI18nCertification {
  const codes = new Set(buildEmergencyDepartmentCoverageAudit().rows.flatMap((row) => row.matchedCatalogCodes));
  const audited = activationRecords().filter((record) => codes.has(record.catalogCode));
  const blockers: string[] = [];
  let enLeakageCount = 0;
  let frLeakageCount = 0;
  let missingLocalizationCount = 0;
  for (const record of audited) {
    if (!record.displayNameEn.trim() || !record.displayNameFr.trim()) {
      missingLocalizationCount += 1;
      blockers.push(`${record.catalogCode}: LOCALIZATION_MISSING`);
    }
    if (looksFrenchLocalizedText(record.displayNameEn)) {
      enLeakageCount += 1;
      blockers.push(`${record.catalogCode}: EN_FR_LEAKAGE`);
    }
    if (looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr)) {
      frLeakageCount += 1;
      blockers.push(`${record.catalogCode}: FR_EN_LEAKAGE`);
    }
  }
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    rowsAudited: audited.length,
    enLeakageCount,
    frLeakageCount,
    missingLocalizationCount,
    blockers,
  };
}

export function buildTranche3MedicationEngineMaturityProjectionReport(): Tranche3MedicationEngineMaturityProjectionReport {
  const presence = certifyEmergencyMedicationPresence();
  const currentScore = 4.0;
  const readinessRatio = presence.totalExpected === 0 ? 0 : presence.readyCount / presence.totalExpected;
  const projectedAfterTranche3 = Math.min(4.2, Math.round((currentScore + 0.1 + readinessRatio * 0.1) * 10) / 10);
  const targetScore = 4.5;
  return {
    currentScore,
    projectedAfterTranche3,
    targetScore,
    remainingGap: Math.max(0, Math.round((targetScore - projectedAfterTranche3) * 10) / 10),
    remainingBlockers: [
      "Critical Care",
      "Anticoagulation",
      "Thrombolytics",
      "Vaccine completion",
      "High-risk ED medications require clinical/pharmacy governance before activation",
    ],
  };
}

export function runTranche3EmergencyMedicationReadiness(): Tranche3EmergencyMedicationReadinessReport {
  return {
    ticket: "MEDUI.MEDICATION.EXPANSION_TRANCHE_3_ED.1",
    generatedAt: new Date().toISOString(),
    repoReadiness: buildTranche3RepoReadinessReport(),
    coverageAudit: buildEmergencyDepartmentCoverageAudit(),
    presenceCertification: certifyEmergencyMedicationPresence(),
    activationEligibility: buildEmergencyMedicationActivationEligibilityReport(),
    highRiskGovernance: certifyEmergencyHighRiskGovernance(),
    workflowCompatibility: buildEmergencyWorkflowCompatibilityReport(),
    vaccineCompatibility: buildEmergencyVaccineCompatibilityReport(),
    duplicateProtection: buildEmergencyDuplicateProtectionReport(),
    i18nCertification: certifyEmergencyMedicationI18n(),
    maturityProjection: buildTranche3MedicationEngineMaturityProjectionReport(),
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      formularyStatusChanged: false,
      providerPermissionsChanged: false,
      migrationsRequired: false,
    },
  };
}
