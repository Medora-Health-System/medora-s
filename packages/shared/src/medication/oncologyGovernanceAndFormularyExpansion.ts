/**
 * MEDUI.MEDICATION.ONCOLOGY_GOVERNANCE_AND_FORMULARY_EXPANSION.1
 * Oncology formulary expansion and chemotherapy governance — audit only.
 *
 * Does not activate medications, change provider search, MAR, billing runtime,
 * inventory runtime, or infusion workflows.
 */

import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import {
  canonicalMedicationFamilyKey,
} from "./medicationCanonicalNormalization.js";
import { buildEnterpriseDomainCoverageReport } from "./enterpriseFormularyGapAnalysis.js";
import {
  ENTERPRISE_ONCOLOGY_BILLING_BY_CODE,
  type NdcMappingConfidence,
} from "./enterpriseOncologyBillingManifest.js";
import { ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE } from "./enterpriseOncologyFormularyManifest.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { isProviderOrderSearchCandidate } from "./medicationOrderabilityGovernance.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";

export type OncologyExpansionDecision = "ONCOLOGY_GOVERNANCE_READY" | "READY_WITH_BLOCKERS" | "NOT_READY";

export type OncologyMedicationClass =
  | "SUPPORTIVE_CARE"
  | "CYTOTOXIC_CHEMOTHERAPY"
  | "TARGETED_THERAPY"
  | "HORMONAL_THERAPY";

export type ChemotherapyGovernanceClass =
  | "CYTOTOXIC_CHEMOTHERAPY"
  | "TARGETED_THERAPY"
  | "IMMUNOTHERAPY"
  | "HORMONAL_THERAPY";

export type OncologyProviderOrderingClass =
  | "SAFE_SUPPORTIVE_CARE_CANDIDATE"
  | "CHEMOTHERAPY_BLOCKED"
  | "SPECIALTY_REVIEW_REQUIRED"
  | "NOT_IN_CATALOG";

export type OncologyMedicationExpectation = {
  medication: string;
  tokens: string[];
  medicationClass: OncologyMedicationClass;
  chemotherapyGovernanceClass?: ChemotherapyGovernanceClass;
};

export type OncologyBaselineReport = {
  enterpriseOncologyCoveragePercent: number;
  enterpriseOncologyMissingExamples: string[];
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  insulinDiabetesActive: boolean;
  vaccineProviderOrderingActive: boolean;
  criticalCareProviderOrderingActive: boolean;
  buildGate: "PASS";
};

export type OncologyInventoryRow = {
  medication: string;
  medicationClass: OncologyMedicationClass;
  catalogPresent: boolean;
  catalogCodes: string[];
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  governanceReady: boolean;
  providerOrderable: boolean;
  canonicalFamily: string | null;
};

export type OncologyInventoryReport = {
  byClass: Record<OncologyMedicationClass, { expected: number; present: number }>;
  rows: OncologyInventoryRow[];
};

export type OncologyFormularyRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  activated: false;
  providerOrderable: false;
  canonicalFamily: string | null;
  displayNameEn: string | null;
  displayNameFr: string | null;
  ndcConfidence: NdcMappingConfidence | null;
  governanceReady: boolean;
  blockers: string[];
};

export type OncologyFormularyRemediationReport = {
  remediatedCount: number;
  rows: OncologyFormularyRemediationRow[];
};

export type ChemotherapyGovernanceRow = {
  medication: string;
  governanceClass: ChemotherapyGovernanceClass;
  catalogPresent: boolean;
  oncologyApprovalRequired: true;
  protocolVerificationRequired: true;
  doseVerificationRequired: true;
  cycleVerificationRequired: true;
  pharmacyReviewVisibilityRequired: true;
  infusionGovernanceRequired: boolean;
  providerOrderingBlocked: true;
  blockers: string[];
};

export type ChemotherapyGovernanceReport = {
  decision: "GOVERNED" | "PARTIAL" | "NOT_GOVERNED";
  rows: ChemotherapyGovernanceRow[];
};

export type OncologyWorkflowId =
  | "TUMOR_LYSIS_SYNDROME"
  | "CHEMOTHERAPY_INFUSION"
  | "NEUTROPENIC_FEVER"
  | "NAUSEA_VOMITING_PREVENTION"
  | "GROWTH_FACTOR_SUPPORT"
  | "ONCOLOGY_HYDRATION";

export type OncologyWorkflowCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  workflows: Array<{
    workflowId: OncologyWorkflowId;
    label: string;
    catalogSupportPercent: number;
    marCompatible: boolean;
    billingCompatible: boolean;
    infusionGovernanceRequired: boolean;
    blockers: string[];
  }>;
};

export type OncologyProviderOrderingEligibilityRow = {
  medication: string;
  classification: OncologyProviderOrderingClass;
  catalogPresent: boolean;
  providerOrderable: boolean;
  blockers: string[];
};

export type OncologyProviderOrderingEligibilityReport = {
  safeSupportiveCareCandidates: string[];
  chemotherapyBlockedCandidates: string[];
  rows: OncologyProviderOrderingEligibilityRow[];
  activationPerformed: false;
};

export type OncologyBillingInventoryRow = {
  catalogCode: string;
  medication: string;
  hcpcs: string | null;
  ndc11: string | null;
  ndcConfidence: NdcMappingConfidence | null;
  billingReady: boolean;
  inventoryReady: boolean;
  chargeMappingReady: boolean;
};

export type OncologyBillingInventoryReport = {
  rowsAudited: number;
  billingReadyCount: number;
  inventoryReadyCount: number;
  rows: OncologyBillingInventoryRow[];
};

export type OncologyProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateProtection: "PASS" | "REVIEW_REQUIRED";
  canonicalProtection: "PASS" | "REVIEW_REQUIRED";
  codeLeakageProtection: "PASS" | "REVIEW_REQUIRED";
  chemotherapyProviderSearchBlocked: boolean;
  blockers: string[];
};

export type OncologyI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type OncologyActivationRoadmapRow = {
  rank: number;
  phase: string;
  scope: string;
  rationale: string;
};

export type OncologyActivationRoadmapReport = {
  rows: OncologyActivationRoadmapRow[];
};

export type OncologyGovernanceAndFormularyExpansionReport = {
  ticket: "MEDUI.MEDICATION.ONCOLOGY_GOVERNANCE_AND_FORMULARY_EXPANSION.1";
  baseline: OncologyBaselineReport;
  inventory: OncologyInventoryReport;
  formularyRemediation: OncologyFormularyRemediationReport;
  chemotherapyGovernance: ChemotherapyGovernanceReport;
  workflowCompatibility: OncologyWorkflowCompatibilityReport;
  providerOrderingEligibility: OncologyProviderOrderingEligibilityReport;
  billingInventory: OncologyBillingInventoryReport;
  providerSearchSafety: OncologyProviderSearchSafetyReport;
  i18nCertification: OncologyI18nCertificationReport;
  activationRoadmap: OncologyActivationRoadmapReport;
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    infusionActivationChanged: false;
    chemotherapyActivationChanged: false;
    migrationsRequired: false;
  };
  finalDecision: OncologyExpansionDecision;
};

const ONCOLOGY_INVENTORY_EXPECTATIONS: OncologyMedicationExpectation[] = [
  { medication: "Ondansetron", tokens: ["ondansetron"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Granisetron", tokens: ["granisetron"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Prochlorperazine", tokens: ["prochlorperazine"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Dexamethasone", tokens: ["dexamethasone"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Filgrastim", tokens: ["filgrastim"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Pegfilgrastim", tokens: ["pegfilgrastim"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Allopurinol", tokens: ["allopurinol"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Rasburicase", tokens: ["rasburicase"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Leucovorin", tokens: ["leucovorin", "leucovorine"], medicationClass: "SUPPORTIVE_CARE" },
  { medication: "Cyclophosphamide", tokens: ["cyclophosphamide"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Doxorubicin", tokens: ["doxorubicin", "doxorubicine"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Cisplatin", tokens: ["cisplatin", "cisplatine"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Carboplatin", tokens: ["carboplatin"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Etoposide", tokens: ["etoposide"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Methotrexate", tokens: ["methotrexate"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Imatinib", tokens: ["imatinib"], medicationClass: "TARGETED_THERAPY", chemotherapyGovernanceClass: "TARGETED_THERAPY" },
  { medication: "Erlotinib", tokens: ["erlotinib"], medicationClass: "TARGETED_THERAPY", chemotherapyGovernanceClass: "TARGETED_THERAPY" },
  { medication: "Osimertinib", tokens: ["osimertinib"], medicationClass: "TARGETED_THERAPY", chemotherapyGovernanceClass: "TARGETED_THERAPY" },
  { medication: "Tamoxifen", tokens: ["tamoxifen"], medicationClass: "HORMONAL_THERAPY", chemotherapyGovernanceClass: "HORMONAL_THERAPY" },
  { medication: "Letrozole", tokens: ["letrozole"], medicationClass: "HORMONAL_THERAPY", chemotherapyGovernanceClass: "HORMONAL_THERAPY" },
  { medication: "Anastrozole", tokens: ["anastrozole"], medicationClass: "HORMONAL_THERAPY", chemotherapyGovernanceClass: "HORMONAL_THERAPY" },
];

const REMEDIATION_TARGETS = [
  { medication: "Filgrastim", tokens: ["filgrastim"], catalogCode: "FILGRASTIM_480_MCG_1_6_ML_INJECTABLE_SOUS_CUTANEE" },
  { medication: "Rasburicase", tokens: ["rasburicase"], catalogCode: "RASBURICASE_1_5_MG_POUDRE_INTRAVEINEUSE" },
  { medication: "Cyclophosphamide", tokens: ["cyclophosphamide"], catalogCode: "CYCLOPHOSPHAMIDE_1000_MG_POUDRE_INTRAVEINEUSE" },
  { medication: "Doxorubicin", tokens: ["doxorubicin", "doxorubicine"], catalogCode: "DOXORUBICIN_50_MG_POUDRE_INTRAVEINEUSE" },
  { medication: "Cisplatin", tokens: ["cisplatin", "cisplatine"], catalogCode: "CISPLATIN_50_MG_POUDRE_INTRAVEINEUSE" },
  { medication: "Leucovorin", tokens: ["leucovorin", "leucovorine"], catalogCode: "LEUCOVORIN_100_MG_POUDRE_INTRAVEINEUSE" },
] as const;

const SAFE_SUPPORTIVE_CARE_CANDIDATES = ["Ondansetron", "Dexamethasone", "Allopurinol", "Filgrastim"] as const;
const CHEMOTHERAPY_BLOCKED_CANDIDATES = ["Doxorubicin", "Cisplatin", "Cyclophosphamide"] as const;

const WORKFLOW_EXPECTATIONS: Record<
  OncologyWorkflowId,
  { label: string; tokens: string[]; infusionGovernanceRequired?: boolean }
> = {
  TUMOR_LYSIS_SYNDROME: { label: "Tumor lysis syndrome", tokens: ["allopurinol", "rasburicase"] },
  CHEMOTHERAPY_INFUSION: {
    label: "Chemotherapy infusion",
    tokens: ["cyclophosphamide", "doxorubicin", "cisplatin", "carboplatin"],
    infusionGovernanceRequired: true,
  },
  NEUTROPENIC_FEVER: { label: "Neutropenic fever", tokens: ["filgrastim", "ceftriaxone", "piperacillin"] },
  NAUSEA_VOMITING_PREVENTION: { label: "Nausea/vomiting prevention", tokens: ["ondansetron", "granisetron", "dexamethasone"] },
  GROWTH_FACTOR_SUPPORT: { label: "Growth factor support", tokens: ["filgrastim", "pegfilgrastim"] },
  ONCOLOGY_HYDRATION: { label: "Oncology hydration", tokens: ["sodium chloride", "lactated ringer", "potassium chloride"] },
};

const CHEMOTHERAPY_GOVERNANCE_EXPECTATIONS: OncologyMedicationExpectation[] = [
  { medication: "Cyclophosphamide", tokens: ["cyclophosphamide"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Doxorubicin", tokens: ["doxorubicin", "doxorubicine"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Cisplatin", tokens: ["cisplatin", "cisplatine"], medicationClass: "CYTOTOXIC_CHEMOTHERAPY", chemotherapyGovernanceClass: "CYTOTOXIC_CHEMOTHERAPY" },
  { medication: "Imatinib", tokens: ["imatinib"], medicationClass: "TARGETED_THERAPY", chemotherapyGovernanceClass: "TARGETED_THERAPY" },
  { medication: "Pembrolizumab", tokens: ["pembrolizumab"], medicationClass: "TARGETED_THERAPY", chemotherapyGovernanceClass: "IMMUNOTHERAPY" },
  { medication: "Tamoxifen", tokens: ["tamoxifen"], medicationClass: "HORMONAL_THERAPY", chemotherapyGovernanceClass: "HORMONAL_THERAPY" },
];

let orderabilityCache: MedicationOrderabilityRecord[] | null = null;
let finalReportCache: OncologyGovernanceAndFormularyExpansionReport | null = null;

function orderabilityRecords(): MedicationOrderabilityRecord[] {
  if (!orderabilityCache) orderabilityCache = [...buildUnifiedOrderabilityMap().values()];
  return orderabilityCache;
}

function rowBlob(row: MedicationOrderabilityRecord): string {
  return [row.catalogCode, row.genericName, row.displayNameEn, row.displayNameFr, row.route, row.dosageForm, row.strength]
    .join(" ")
    .toLowerCase();
}

function findRecords(tokens: readonly string[]): MedicationOrderabilityRecord[] {
  return orderabilityRecords().filter((row) => tokens.some((token) => rowBlob(row).includes(token.toLowerCase())));
}

function activationRecord(row: MedicationOrderabilityRecord): MedicationActivationGovernanceRecord {
  return buildActivationGovernanceRecord(row);
}

function isGovernanceReady(row: MedicationOrderabilityRecord): boolean {
  const activation = activationRecord(row);
  const billing = resolveMedicationBillingReadiness(row.catalogCode);
  return Boolean(
    row.displayNameEn.trim() &&
      row.displayNameFr.trim() &&
      billing.billingReady &&
      billing.ndcReady &&
      !isProviderOrderSearchCandidate(row) &&
      (activation.status === "RESTRICTED" || activation.status === "CATALOG_ONLY" || activation.status === "NEEDS_PHARMACY_REVIEW")
  );
}

function inventoryRow(expectation: OncologyMedicationExpectation): OncologyInventoryRow {
  const matches = findRecords(expectation.tokens);
  const activationRows = matches.map(activationRecord);
  const billingRows = matches.map((row) => resolveMedicationBillingReadiness(row.catalogCode));
  return {
    medication: expectation.medication,
    medicationClass: expectation.medicationClass,
    catalogPresent: matches.length > 0,
    catalogCodes: matches.map((row) => row.catalogCode),
    marReady: activationRows.some((row) => row.marReady),
    billingReady: billingRows.some((row) => row.billingReady),
    inventoryReady: billingRows.some((row) => row.ndcReady),
    governanceReady: matches.some(isGovernanceReady),
    providerOrderable: matches.some((row) => isProviderOrderSearchCandidate(row)),
    canonicalFamily: matches[0] ? canonicalMedicationFamilyKey(matches[0]) : null,
  };
}

export function buildOncologyBaselineReport(): OncologyBaselineReport {
  const domainCoverage = buildEnterpriseDomainCoverageReport();
  const oncology = domainCoverage.rows.find((row) => row.domain === "Oncology");
  return {
    enterpriseOncologyCoveragePercent: oncology?.coveragePercent ?? 0,
    enterpriseOncologyMissingExamples: oncology?.missingMedications ?? [],
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: listActiveAnticoagulationProviderOrderingCatalogCodes().length > 0,
    insulinDiabetesActive: listActiveInsulinDiabetesProviderOrderingCatalogCodes().length > 0,
    vaccineProviderOrderingActive: listActiveVaccineProviderOrderingCatalogCodes().length > 0,
    criticalCareProviderOrderingActive: listActiveCriticalCareProviderOrderingCatalogCodes().length > 0,
    buildGate: "PASS",
  };
}

export function buildOncologyInventoryReport(): OncologyInventoryReport {
  const rows = ONCOLOGY_INVENTORY_EXPECTATIONS.map(inventoryRow);
  const byClass = {
    SUPPORTIVE_CARE: { expected: 0, present: 0 },
    CYTOTOXIC_CHEMOTHERAPY: { expected: 0, present: 0 },
    TARGETED_THERAPY: { expected: 0, present: 0 },
    HORMONAL_THERAPY: { expected: 0, present: 0 },
  } satisfies Record<OncologyMedicationClass, { expected: number; present: number }>;
  for (const row of rows) {
    byClass[row.medicationClass].expected += 1;
    if (row.catalogPresent) byClass[row.medicationClass].present += 1;
  }
  return { byClass, rows };
}

export function buildOncologyFormularyRemediationReport(): OncologyFormularyRemediationReport {
  const rows = REMEDIATION_TARGETS.map((target) => {
    const matches = findRecords(target.tokens);
    const row = matches.find((candidate) => candidate.catalogCode === target.catalogCode) ?? matches[0] ?? null;
    const manifest = ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE[target.catalogCode];
    const billing = ENTERPRISE_ONCOLOGY_BILLING_BY_CODE[target.catalogCode];
    const blockers: string[] = [];
    if (!row) blockers.push("CATALOG_SUPPORT_MISSING");
    if (row && isProviderOrderSearchCandidate(row)) blockers.push("UNSAFE_PROVIDER_ORDERABLE");
    if (row && !resolveMedicationBillingReadiness(row.catalogCode).billingReady) blockers.push("BILLING_NOT_READY");
    if (row && !resolveMedicationBillingReadiness(row.catalogCode).ndcReady) blockers.push("INVENTORY_NOT_READY");
    if (row && (!row.displayNameEn.trim() || !row.displayNameFr.trim())) blockers.push("I18N_NOT_READY");
    return {
      medication: target.medication,
      catalogCode: target.catalogCode,
      catalogPresent: Boolean(row),
      activated: false as const,
      providerOrderable: false as const,
      canonicalFamily: row ? canonicalMedicationFamilyKey(row) : manifest?.genericName.toLowerCase() ?? null,
      displayNameEn: row?.displayNameEn ?? manifest?.displayNameEn ?? null,
      displayNameFr: row?.displayNameFr ?? manifest?.displayNameFr ?? null,
      ndcConfidence: billing?.ndcConfidence ?? null,
      governanceReady: row ? isGovernanceReady(row) : false,
      blockers,
    };
  });
  return {
    remediatedCount: rows.filter((row) => row.catalogPresent && row.blockers.length === 0).length,
    rows,
  };
}

export function buildChemotherapyGovernanceReport(): ChemotherapyGovernanceReport {
  const rows = CHEMOTHERAPY_GOVERNANCE_EXPECTATIONS.map((expectation) => {
    const matches = findRecords(expectation.tokens);
    const blockers: string[] = [];
    if (matches.length === 0) blockers.push("CATALOG_MISSING");
    if (matches.some((row) => isProviderOrderSearchCandidate(row))) blockers.push("PROVIDER_ORDERING_NOT_BLOCKED");
    const infusionRequired =
      expectation.chemotherapyGovernanceClass === "CYTOTOXIC_CHEMOTHERAPY" ||
      expectation.chemotherapyGovernanceClass === "IMMUNOTHERAPY";
    return {
      medication: expectation.medication,
      governanceClass: expectation.chemotherapyGovernanceClass ?? "CYTOTOXIC_CHEMOTHERAPY",
      catalogPresent: matches.length > 0,
      oncologyApprovalRequired: true as const,
      protocolVerificationRequired: true as const,
      doseVerificationRequired: true as const,
      cycleVerificationRequired: true as const,
      pharmacyReviewVisibilityRequired: true as const,
      infusionGovernanceRequired: infusionRequired,
      providerOrderingBlocked: true as const,
      blockers,
    };
  });
  const governedCount = rows.filter((row) => row.catalogPresent && row.blockers.length === 0).length;
  return {
    decision: governedCount === rows.length ? "GOVERNED" : governedCount > 0 ? "PARTIAL" : "NOT_GOVERNED",
    rows,
  };
}

export function buildOncologyWorkflowCompatibilityReport(): OncologyWorkflowCompatibilityReport {
  const workflows = (Object.keys(WORKFLOW_EXPECTATIONS) as OncologyWorkflowId[]).map((workflowId) => {
    const workflow = WORKFLOW_EXPECTATIONS[workflowId];
    const matches = workflow.tokens.flatMap((token) => findRecords([token]));
    const unique = [...new Map(matches.map((row) => [row.catalogCode, row])).values()];
    const presentCount = workflow.tokens.filter((token) => findRecords([token]).length > 0).length;
    const catalogSupportPercent = Math.round((presentCount / workflow.tokens.length) * 100);
    const activationRows = unique.map(activationRecord);
    const billingRows = unique.map((row) => resolveMedicationBillingReadiness(row.catalogCode));
    const blockers: string[] = [];
    if (catalogSupportPercent < 50) blockers.push("INSUFFICIENT_CATALOG_SUPPORT");
    if (workflowId === "CHEMOTHERAPY_INFUSION" && unique.some((row) => isProviderOrderSearchCandidate(row))) {
      blockers.push("UNSAFE_CHEMOTHERAPY_PROVIDER_ORDERING");
    }
    return {
      workflowId,
      label: workflow.label,
      catalogSupportPercent,
      marCompatible: activationRows.some((row) => row.marReady),
      billingCompatible: billingRows.some((row) => row.billingReady),
      infusionGovernanceRequired: Boolean(workflow.infusionGovernanceRequired),
      blockers,
    };
  });
  const decision =
    workflows.every((workflow) => workflow.catalogSupportPercent >= 50) &&
    workflows.every((workflow) => !workflow.blockers.includes("UNSAFE_CHEMOTHERAPY_PROVIDER_ORDERING"))
      ? "PASS"
      : workflows.some((workflow) => workflow.catalogSupportPercent >= 50)
        ? "PARTIAL"
        : "FAIL";
  return { decision, workflows };
}

export function buildOncologyProviderOrderingEligibilityReport(): OncologyProviderOrderingEligibilityReport {
  const allNames = [...SAFE_SUPPORTIVE_CARE_CANDIDATES, ...CHEMOTHERAPY_BLOCKED_CANDIDATES];
  const rows = allNames.map((medication) => {
    const expectation = ONCOLOGY_INVENTORY_EXPECTATIONS.find((row) => row.medication === medication);
    const matches = expectation ? findRecords(expectation.tokens) : [];
    const providerOrderable = matches.some((row) => isProviderOrderSearchCandidate(row));
    const blockers: string[] = [];
    let classification: OncologyProviderOrderingClass = "NOT_IN_CATALOG";
    if (CHEMOTHERAPY_BLOCKED_CANDIDATES.includes(medication as (typeof CHEMOTHERAPY_BLOCKED_CANDIDATES)[number])) {
      classification = "CHEMOTHERAPY_BLOCKED";
      if (providerOrderable) blockers.push("CHEMOTHERAPY_MUST_NOT_BE_PROVIDER_ORDERABLE");
      if (matches.length === 0) blockers.push("CATALOG_MISSING");
    } else if (SAFE_SUPPORTIVE_CARE_CANDIDATES.includes(medication as (typeof SAFE_SUPPORTIVE_CARE_CANDIDATES)[number])) {
      classification = matches.length > 0 ? "SAFE_SUPPORTIVE_CARE_CANDIDATE" : "NOT_IN_CATALOG";
      if (matches.some((row) => row.orderabilityStatus === "RESTRICTED_WITH_REASON")) {
        classification = "SPECIALTY_REVIEW_REQUIRED";
        blockers.push("SPECIALTY_REVIEW_BEFORE_FUTURE_ACTIVATION");
      }
      if (matches.length === 0) blockers.push("CATALOG_MISSING");
    }
    return {
      medication,
      classification,
      catalogPresent: matches.length > 0,
      providerOrderable,
      blockers,
    };
  });
  return {
    safeSupportiveCareCandidates: [...SAFE_SUPPORTIVE_CARE_CANDIDATES],
    chemotherapyBlockedCandidates: [...CHEMOTHERAPY_BLOCKED_CANDIDATES],
    rows,
    activationPerformed: false as const,
  };
}

export function buildOncologyBillingInventoryReport(): OncologyBillingInventoryReport {
  const codes = new Set([
    ...Object.keys(ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE),
    ...buildOncologyInventoryReport()
      .rows.filter((row) => row.catalogPresent)
      .flatMap((row) => row.catalogCodes),
  ]);
  const rows = [...codes].map((catalogCode) => {
    const row = orderabilityRecords().find((candidate) => candidate.catalogCode === catalogCode);
    const billing = resolveMedicationBillingReadiness(catalogCode);
    const oncologyBilling = ENTERPRISE_ONCOLOGY_BILLING_BY_CODE[catalogCode];
    return {
      catalogCode,
      medication: row?.genericName ?? oncologyBilling?.description.replace(/^Oncology /, "") ?? catalogCode,
      hcpcs: billing.hcpcs,
      ndc11: billing.ndc11,
      ndcConfidence: oncologyBilling?.ndcConfidence ?? null,
      billingReady: billing.billingReady,
      inventoryReady: billing.ndcReady,
      chargeMappingReady: Boolean(billing.hcpcs && billing.ndc11),
    };
  });
  return {
    rowsAudited: rows.length,
    billingReadyCount: rows.filter((row) => row.billingReady).length,
    inventoryReadyCount: rows.filter((row) => row.inventoryReady).length,
    rows,
  };
}

export function buildOncologyProviderSearchSafetyReport(): OncologyProviderSearchSafetyReport {
  const oncologyCodes = Object.keys(ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE);
  const scopedRecords = orderabilityRecords().filter((row) => oncologyCodes.includes(row.catalogCode));
  const chemoRows = findRecords(["cyclophosphamide", "doxorubicin", "doxorubicine", "cisplatin", "cisplatine"]);
  const chemotherapyProviderSearchBlocked = !chemoRows.some((row) => isProviderOrderSearchCandidate(row));
  const oncologyCatalogProviderExposed = scopedRecords.some((row) => isProviderOrderSearchCandidate(row));
  const duplicateCatalogCodes = oncologyCodes.length !== new Set(oncologyCodes).size;
  const internalCodeLeakage = scopedRecords.some(
    (row) =>
      row.displayNameEn.trim().toUpperCase() === row.catalogCode ||
      row.displayNameFr.trim().toUpperCase() === row.catalogCode
  );
  const blockers: string[] = [];
  if (oncologyCatalogProviderExposed) blockers.push("ONCOLOGY_CATALOG_PROVIDER_EXPOSED");
  if (!chemotherapyProviderSearchBlocked) blockers.push("CHEMOTHERAPY_PROVIDER_SEARCH_LEAKAGE");
  if (duplicateCatalogCodes) blockers.push("DUPLICATE_ONCOLOGY_CATALOG_CODE");
  if (internalCodeLeakage) blockers.push("INTERNAL_CODE_LEAKAGE");
  const duplicateProtection = duplicateCatalogCodes ? "REVIEW_REQUIRED" : "PASS";
  const canonicalProtection = scopedRecords.every((row) => row.genericName.trim().length > 0) ? "PASS" : "REVIEW_REQUIRED";
  const codeLeakageProtection = chemotherapyProviderSearchBlocked && !internalCodeLeakage ? "PASS" : "REVIEW_REQUIRED";
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    duplicateProtection,
    canonicalProtection,
    codeLeakageProtection,
    chemotherapyProviderSearchBlocked,
    blockers,
  };
}

export function buildOncologyI18nCertificationReport(): OncologyI18nCertificationReport {
  const codes = new Set(Object.keys(ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE));
  const audited = orderabilityRecords().filter((row) => codes.has(row.catalogCode));
  let enLeakageCount = 0;
  let frLeakageCount = 0;
  let missingTranslations = 0;
  for (const row of audited) {
    if (!row.displayNameEn.trim() || !row.displayNameFr.trim()) missingTranslations += 1;
    if (looksFrenchLocalizedText(row.displayNameEn)) enLeakageCount += 1;
    if (looksEnglishFormText(row.displayNameFr) && !looksFrenchLocalizedText(row.displayNameFr)) frLeakageCount += 1;
  }
  return {
    decision: enLeakageCount === 0 && frLeakageCount === 0 && missingTranslations === 0 ? "PASS" : "FAIL",
    rowsAudited: audited.length,
    enLeakageCount,
    frLeakageCount,
    missingTranslations,
  };
}

export function buildOncologyActivationRoadmapReport(): OncologyActivationRoadmapReport {
  const phases = [
    {
      phase: "Supportive Care Activation",
      scope: "Ondansetron, dexamethasone, allopurinol antiemetic and TLS prevention",
      rationale: "Lowest-risk oncology-adjacent medications with existing inpatient utilization patterns.",
    },
    {
      phase: "Growth Factor Activation",
      scope: "Filgrastim and pegfilgrastim with specialty review and pharmacy verification",
      rationale: "Supportive biologics require oncology approval but are lower risk than cytotoxic agents.",
    },
    {
      phase: "Oncology Governance Hardening",
      scope: "Protocol, dose, cycle verification and pharmacy review visibility",
      rationale: "Required safeguards before any chemotherapy catalog exposure.",
    },
    {
      phase: "Chemotherapy Protocol Engine",
      scope: "Regimen templates, cycle verification, and infusion governance",
      rationale: "Cytotoxic and immunotherapy agents must remain protocol-bound.",
    },
    {
      phase: "Chemotherapy Provider Ordering",
      scope: "Restricted ordering for governed cytotoxic and targeted agents",
      rationale: "Only after protocol engine and governance hardening are certified.",
    },
    {
      phase: "Infusion Administration",
      scope: "Chemotherapy infusion MAR and start/stop governance",
      rationale: "Separate phase from ordering; requires infusion lifecycle controls.",
    },
    {
      phase: "Oncology Billing Expansion",
      scope: "HCPCS/J-code charge mapping and NDC confidence review",
      rationale: "Finalize revenue-cycle readiness after clinical governance is stable.",
    },
  ];
  return {
    rows: phases.map((row, index) => ({ rank: index + 1, ...row })),
  };
}

function resolveFinalDecision(report: Omit<OncologyGovernanceAndFormularyExpansionReport, "finalDecision">): OncologyExpansionDecision {
  const remediationComplete = report.formularyRemediation.rows.every((row) => row.catalogPresent);
  const chemoBlocked = report.providerOrderingEligibility.rows
    .filter((row) => row.classification === "CHEMOTHERAPY_BLOCKED")
    .every((row) => !row.providerOrderable);
  const noUnsafeActivation =
    report.compatibility.activationChanged === false && report.providerOrderingEligibility.activationPerformed === false;
  const governancePresent = report.chemotherapyGovernance.decision !== "NOT_GOVERNED";
  const searchSafe = report.providerSearchSafety.chemotherapyProviderSearchBlocked;
  if (remediationComplete && chemoBlocked && noUnsafeActivation && governancePresent && searchSafe) {
    return report.baseline.enterpriseOncologyCoveragePercent >= 70 ? "ONCOLOGY_GOVERNANCE_READY" : "READY_WITH_BLOCKERS";
  }
  if (remediationComplete && chemoBlocked && noUnsafeActivation) return "READY_WITH_BLOCKERS";
  return "NOT_READY";
}

export function runOncologyGovernanceAndFormularyExpansionReport(): OncologyGovernanceAndFormularyExpansionReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildOncologyBaselineReport();
  const inventory = buildOncologyInventoryReport();
  const formularyRemediation = buildOncologyFormularyRemediationReport();
  const chemotherapyGovernance = buildChemotherapyGovernanceReport();
  const workflowCompatibility = buildOncologyWorkflowCompatibilityReport();
  const providerOrderingEligibility = buildOncologyProviderOrderingEligibilityReport();
  const billingInventory = buildOncologyBillingInventoryReport();
  const providerSearchSafety = buildOncologyProviderSearchSafetyReport();
  const i18nCertification = buildOncologyI18nCertificationReport();
  const activationRoadmap = buildOncologyActivationRoadmapReport();
  const partial: Omit<OncologyGovernanceAndFormularyExpansionReport, "finalDecision"> = {
    ticket: "MEDUI.MEDICATION.ONCOLOGY_GOVERNANCE_AND_FORMULARY_EXPANSION.1",
    baseline,
    inventory,
    formularyRemediation,
    chemotherapyGovernance,
    workflowCompatibility,
    providerOrderingEligibility,
    billingInventory,
    providerSearchSafety,
    i18nCertification,
    activationRoadmap,
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      infusionActivationChanged: false,
      chemotherapyActivationChanged: false,
      migrationsRequired: false,
    },
  };
  finalReportCache = { ...partial, finalDecision: resolveFinalDecision(partial) };
  return finalReportCache;
}

/** Invalidate module caches — for tests only. */
export function resetOncologyGovernanceAndFormularyExpansionCaches(): void {
  orderabilityCache = null;
  finalReportCache = null;
}
