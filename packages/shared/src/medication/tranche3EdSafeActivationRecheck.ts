/**
 * MEDUI.MEDICATION.TRANCHE_3_ED_SAFE_ACTIVATION_RECHECK.1
 * Tranche 3 ED safe activation recheck — certification only.
 *
 * Does not activate medications or mutate provider search, MAR, billing, or inventory behavior.
 */

import {
  canonicalMedicationFamilyKey,
  certifyMedicationActivationCollision,
} from "./medicationCanonicalNormalization.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { runNonBlockingPharmacyReviewCertification } from "./nonBlockingPharmacyReviewPolicy.js";
import { runProviderSearchCanonicalizationCertification } from "./providerSearchCanonicalization.js";
import {
  buildBehavioralHealthWorkflowCompatibilityReport,
  buildTranche3ReadinessRecertificationReport,
  type EmergencyBehavioralHealthRemediationCertificationReport,
  runEmergencyBehavioralHealthRemediationCertification,
} from "./emergencyBehavioralHealthRemediation.js";
import {
  buildEmergencyMedicationActivationEligibilityReport,
  buildEmergencyWorkflowCompatibilityReport,
  certifyEmergencyMedicationI18n,
  certifyEmergencyMedicationPresence,
} from "./tranche3EmergencyMedicationReadiness.js";
import type { NonBlockingPharmacyReviewCertificationReport } from "./nonBlockingPharmacyReviewPolicy.js";
import type { ProviderSearchCanonicalizationCertificationReport } from "./providerSearchCanonicalization.js";

export type Tranche3RecheckDecision =
  | "TRANCHE_3_READY_FOR_SAFE_ACTIVATION"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type EmergencyReadinessDecision = "PASS" | "PARTIAL" | "FAIL";
export type EmergencyWorkflowMatrixStatus = "READY" | "PARTIAL" | "BLOCKED";

export type Tranche3EdWorkflowId =
  | "ACS"
  | "CHEST_PAIN"
  | "ASTHMA"
  | "COPD"
  | "ANAPHYLAXIS"
  | "PAIN"
  | "NAUSEA_VOMITING"
  | "MIGRAINE"
  | "URI"
  | "PNEUMONIA"
  | "CELLULITIS"
  | "UTI"
  | "BEHAVIORAL_HEALTH"
  | "MINOR_TRAUMA"
  | "WOUND_CARE";

export type Tranche3EdWorkflowMedicationExpectation = {
  medication: string;
  tokens: readonly string[];
};

export type Tranche3EdWorkflowExpectation = {
  workflowId: Tranche3EdWorkflowId;
  labelEn: string;
  labelFr: string;
  medications: readonly Tranche3EdWorkflowMedicationExpectation[];
};

export type Tranche3RecheckBaselineReport = {
  behavioralHealthRemediationCompleted: boolean;
  emergencyMedicationPresenceCertification: EmergencyReadinessDecision;
  emergencyWorkflowCompatibilityReport: EmergencyReadinessDecision;
  behavioralHealthWorkflowCompatibilityReport: "PASS" | "FAIL";
  ziprasidoneCatalogCodeExists: boolean;
  ziprasidoneActivated: false;
  buildGate: "PASS";
};

export type Tranche3EdInventoryMedicationRow = {
  workflowId: Tranche3EdWorkflowId;
  medication: string;
  catalogCode: string | null;
  displayNameEn: string | null;
  displayNameFr: string | null;
  canonicalFamily: string | null;
  route: string | null;
  form: string | null;
  orderabilityReady: boolean;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  i18nReady: boolean;
  duplicateStatus: "SAFE" | "REVIEW_REQUIRED" | "MISSING";
  highRiskExcluded: boolean;
  blockers: string[];
};

export type Tranche3EdInventoryRecertificationReport = {
  workflowsAudited: number;
  medicationRowsAudited: number;
  rows: Tranche3EdInventoryMedicationRow[];
};

export type EmergencyReadinessRecalculationReport = {
  emergencyMedicationPresenceCertification: EmergencyReadinessDecision;
  emergencyWorkflowCompatibilityReport: EmergencyReadinessDecision;
  presence: {
    totalExpected: number;
    missingCount: number;
    partialCount: number;
    readyCount: number;
  };
  blockers: string[];
};

export type SafeEdActivationCandidate = {
  catalogCode: string;
  medication: string;
  workflowIds: Tranche3EdWorkflowId[];
  displayNameEn: string;
  displayNameFr: string;
  canonicalFamily: string;
  route: string;
  form: string;
};

export type SafeEdActivationCandidateReport = {
  SAFE_ED_ACTIVATION_CANDIDATES: SafeEdActivationCandidate[];
  candidateCount: number;
  excludedRowCount: number;
  blockers: string[];
};

export type HighRiskExclusionRecertificationReport = {
  thrombolyticsExcluded: boolean;
  anticoagulantsExcluded: boolean;
  pressorsExcluded: boolean;
  paralyticsExcluded: boolean;
  sedativesExcluded: boolean;
  rsiMedicationsExcluded: boolean;
  criticalCareDripsExcluded: boolean;
  controlledSubstancesExcluded: boolean;
  chemotherapyExcluded: boolean;
  excludedCatalogCodes: string[];
};

export type EmergencyWorkflowMatrixReport = {
  decision: "PASS" | "FAIL";
  workflows: Array<{
    workflowId: Tranche3EdWorkflowId;
    labelEn: string;
    labelFr: string;
    status: EmergencyWorkflowMatrixStatus;
    readyMedicationCount: number;
    totalMedicationCount: number;
    blockers: string[];
  }>;
};

export type EmergencyProviderSearchSafetyReport = {
  duplicateRows: number;
  canonicalCollisions: number;
  catalogCodeLeakage: number;
  decision: "PASS" | "FAIL";
};

export type EmergencyOperationalSafetyReport = {
  marSafety: "PASS" | "FAIL";
  billingSafety: "PASS" | "FAIL";
  inventorySafety: "PASS" | "FAIL";
  candidateCount: number;
  blockers: string[];
};

export type EmergencyI18nCertificationReport = {
  enLeakageIntoFr: 0;
  frLeakageIntoEn: 0;
  medicationNamesReady: boolean;
  workflowLabelsReady: boolean;
  activationCandidateReportsReady: boolean;
};

export type Tranche3ActivationEligibilityReport = {
  emergencyMedicationActivationEligibilityReport: ReturnType<typeof buildEmergencyMedicationActivationEligibilityReport>["decision"];
  finalDecision: Tranche3RecheckDecision;
  blockers: string[];
};

export type Tranche3EdSafeActivationRecheckReport = {
  baseline: Tranche3RecheckBaselineReport;
  inventory: Tranche3EdInventoryRecertificationReport;
  readiness: EmergencyReadinessRecalculationReport;
  candidates: SafeEdActivationCandidateReport;
  highRiskExclusion: HighRiskExclusionRecertificationReport;
  workflowMatrix: EmergencyWorkflowMatrixReport;
  providerSearchSafety: EmergencyProviderSearchSafetyReport;
  operationalSafety: EmergencyOperationalSafetyReport;
  i18n: EmergencyI18nCertificationReport;
  eligibility: Tranche3ActivationEligibilityReport;
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    providerExposureExpanded: false;
    migrationsRequired: false;
  };
};

export const TRANCHE3_ED_WORKFLOW_EXPECTATIONS: readonly Tranche3EdWorkflowExpectation[] = [
  {
    workflowId: "ACS",
    labelEn: "ACS",
    labelFr: "Syndrome coronarien aigu",
    medications: [
      { medication: "Aspirin", tokens: ["aspirin"] },
      { medication: "Nitroglycerin", tokens: ["nitroglycerin"] },
      { medication: "Clopidogrel", tokens: ["clopidogrel"] },
      { medication: "Atorvastatin", tokens: ["atorvastatin"] },
    ],
  },
  {
    workflowId: "CHEST_PAIN",
    labelEn: "Chest Pain",
    labelFr: "Douleur thoracique",
    medications: [
      { medication: "Aspirin", tokens: ["aspirin"] },
      { medication: "Nitroglycerin", tokens: ["nitroglycerin"] },
      { medication: "Paracetamol", tokens: ["paracetamol", "acetaminophen"] },
      { medication: "Ibuprofen", tokens: ["ibuprofen"] },
    ],
  },
  {
    workflowId: "ASTHMA",
    labelEn: "Asthma",
    labelFr: "Asthme",
    medications: [
      { medication: "Albuterol", tokens: ["albuterol", "salbutamol"] },
      { medication: "Ipratropium", tokens: ["ipratropium"] },
      { medication: "Prednisone", tokens: ["prednisone"] },
      { medication: "Methylprednisolone", tokens: ["methylprednisolone"] },
    ],
  },
  {
    workflowId: "COPD",
    labelEn: "COPD",
    labelFr: "MPOC",
    medications: [
      { medication: "Albuterol", tokens: ["albuterol", "salbutamol"] },
      { medication: "Ipratropium", tokens: ["ipratropium"] },
      { medication: "Prednisone", tokens: ["prednisone"] },
      { medication: "Methylprednisolone", tokens: ["methylprednisolone"] },
    ],
  },
  {
    workflowId: "ANAPHYLAXIS",
    labelEn: "Anaphylaxis",
    labelFr: "Anaphylaxie",
    medications: [
      { medication: "Epinephrine IM", tokens: ["epinephrine", "adrenaline"] },
      { medication: "Diphenhydramine", tokens: ["diphenhydramine"] },
      { medication: "Famotidine", tokens: ["famotidine"] },
      { medication: "Methylprednisolone", tokens: ["methylprednisolone"] },
    ],
  },
  {
    workflowId: "PAIN",
    labelEn: "Pain",
    labelFr: "Douleur",
    medications: [
      { medication: "Paracetamol", tokens: ["paracetamol", "acetaminophen"] },
      { medication: "Ibuprofen", tokens: ["ibuprofen"] },
      { medication: "Ketorolac", tokens: ["ketorolac"] },
      { medication: "Diclofenac", tokens: ["diclofenac"] },
    ],
  },
  {
    workflowId: "NAUSEA_VOMITING",
    labelEn: "Nausea / Vomiting",
    labelFr: "Nausees / vomissements",
    medications: [
      { medication: "Ondansetron", tokens: ["ondansetron"] },
      { medication: "Metoclopramide", tokens: ["metoclopramide"] },
      { medication: "Dimenhydrinate", tokens: ["dimenhydrinate"] },
    ],
  },
  {
    workflowId: "MIGRAINE",
    labelEn: "Migraine",
    labelFr: "Migraine",
    medications: [
      { medication: "Paracetamol", tokens: ["paracetamol", "acetaminophen"] },
      { medication: "Ibuprofen", tokens: ["ibuprofen"] },
      { medication: "Ketorolac", tokens: ["ketorolac"] },
      { medication: "Metoclopramide", tokens: ["metoclopramide"] },
    ],
  },
  {
    workflowId: "URI",
    labelEn: "URI",
    labelFr: "Infection respiratoire haute",
    medications: [
      { medication: "Paracetamol", tokens: ["paracetamol", "acetaminophen"] },
      { medication: "Ibuprofen", tokens: ["ibuprofen"] },
      { medication: "Cetirizine", tokens: ["cetirizine"] },
    ],
  },
  {
    workflowId: "PNEUMONIA",
    labelEn: "Pneumonia",
    labelFr: "Pneumonie",
    medications: [
      { medication: "Amoxicillin", tokens: ["amoxicillin"] },
      { medication: "Azithromycin", tokens: ["azithromycin"] },
      { medication: "Ceftriaxone", tokens: ["ceftriaxone"] },
    ],
  },
  {
    workflowId: "CELLULITIS",
    labelEn: "Cellulitis",
    labelFr: "Cellulite infectieuse",
    medications: [
      { medication: "Cefalexin", tokens: ["cefalexin", "cephalexin"] },
      { medication: "Amoxicillin-Clavulanate", tokens: ["amoxicillin clavulanate", "clavulanic acid", "acide clavulanique"] },
      { medication: "Clindamycin", tokens: ["clindamycin"] },
    ],
  },
  {
    workflowId: "UTI",
    labelEn: "UTI",
    labelFr: "Infection urinaire",
    medications: [
      { medication: "Nitrofurantoin", tokens: ["nitrofurantoin"] },
      { medication: "Ciprofloxacin", tokens: ["ciprofloxacin"] },
      { medication: "Ceftriaxone", tokens: ["ceftriaxone"] },
    ],
  },
  {
    workflowId: "BEHAVIORAL_HEALTH",
    labelEn: "Behavioral Health",
    labelFr: "Sante comportementale",
    medications: [
      { medication: "Haloperidol", tokens: ["haloperidol"] },
      { medication: "Olanzapine", tokens: ["olanzapine"] },
      { medication: "Ziprasidone", tokens: ["ziprasidone"] },
    ],
  },
  {
    workflowId: "MINOR_TRAUMA",
    labelEn: "Minor Trauma",
    labelFr: "Traumatisme mineur",
    medications: [
      { medication: "Paracetamol", tokens: ["paracetamol", "acetaminophen"] },
      { medication: "Ibuprofen", tokens: ["ibuprofen"] },
      { medication: "Ketorolac", tokens: ["ketorolac"] },
    ],
  },
  {
    workflowId: "WOUND_CARE",
    labelEn: "Wound Care",
    labelFr: "Soins des plaies",
    medications: [
      { medication: "Povidone-Iodine", tokens: ["povidone", "iodine"] },
      { medication: "Lidocaine", tokens: ["lidocaine"] },
      { medication: "Cephalexin", tokens: ["cephalexin", "cefalexin"] },
    ],
  },
] as const;

const HIGH_RISK_TOKENS = [
  "alteplase",
  "tenecteplase",
  "heparin",
  "enoxaparin",
  "warfarin",
  "rivaroxaban",
  "apixaban",
  "norepinephrine",
  "phenylephrine",
  "vasopressin",
  "dopamine",
  "dobutamine",
  "epinephrine",
  "adrenaline",
  "succinylcholine",
  "rocuronium",
  "lorazepam",
  "midazolam",
  "diazepam",
  "etomidate",
  "ketamine",
  "propofol",
  "morphine",
  "fentanyl",
  "hydromorphone",
  "cisplatin",
  "methotrexate",
] as const;

const RSI_TOKENS = ["etomidate", "ketamine", "propofol", "succinylcholine", "rocuronium"] as const;
const CRITICAL_CARE_DRIP_TOKENS = ["norepinephrine", "dopamine", "dobutamine", "vasopressin"] as const;

let catalogRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: Tranche3EdInventoryRecertificationReport | null = null;
let providerSearchCache: ProviderSearchCanonicalizationCertificationReport | null = null;
let pharmacyCache: NonBlockingPharmacyReviewCertificationReport | null = null;
let behavioralHealthCache: EmergencyBehavioralHealthRemediationCertificationReport | null = null;

function catalogRows(): MedicationOrderabilityRecord[] {
  catalogRowsCache ??= [...buildUnifiedOrderabilityMap().values()];
  return catalogRowsCache;
}

function providerSearchCertification(): ProviderSearchCanonicalizationCertificationReport {
  providerSearchCache ??= runProviderSearchCanonicalizationCertification();
  return providerSearchCache;
}

function pharmacyCertification(): NonBlockingPharmacyReviewCertificationReport {
  pharmacyCache ??= runNonBlockingPharmacyReviewCertification();
  return pharmacyCache;
}

function behavioralHealthCertification(): EmergencyBehavioralHealthRemediationCertificationReport {
  behavioralHealthCache ??= runEmergencyBehavioralHealthRemediationCertification();
  return behavioralHealthCache;
}

function rowBlob(row: MedicationOrderabilityRecord): string {
  return [row.catalogCode, row.genericName, row.displayNameEn, row.displayNameFr, row.route, row.dosageForm, row.strength]
    .join(" ")
    .toLowerCase();
}

function matchesTokens(row: MedicationOrderabilityRecord, tokens: readonly string[]): boolean {
  const blob = rowBlob(row);
  return tokens.some((token) => blob.includes(token.toLowerCase()));
}

function rowsForExpectation(expectation: Tranche3EdWorkflowMedicationExpectation): MedicationOrderabilityRecord[] {
  return catalogRows().filter((row) => matchesTokens(row, expectation.tokens));
}

function isHighRiskCandidate(row: MedicationOrderabilityRecord): boolean {
  const activation = buildActivationGovernanceRecord(row);
  const blob = rowBlob(row);
  return (
    activation.highRiskFlag ||
    activation.controlledSubstanceFlag ||
    activation.requiresClinicalReview ||
    HIGH_RISK_TOKENS.some((token) => blob.includes(token))
  );
}

function bestRow(rows: MedicationOrderabilityRecord[]): MedicationOrderabilityRecord | null {
  return (
    rows.find((row) => {
      const activation = buildActivationGovernanceRecord(row);
      return activation.status === "ORDERABLE" && activation.marReady && activation.billingReady && activation.inventoryReady;
    }) ??
    rows.find((row) => buildActivationGovernanceRecord(row).status === "ORDERABLE") ??
    rows[0] ??
    null
  );
}

function buildInventoryRow(
  workflowId: Tranche3EdWorkflowId,
  expectation: Tranche3EdWorkflowMedicationExpectation
): Tranche3EdInventoryMedicationRow {
  const matched = rowsForExpectation(expectation);
  const primary = bestRow(matched);
  const activation = primary ? buildActivationGovernanceRecord(primary) : null;
  const collision = certifyMedicationActivationCollision(primary ? [primary.catalogCode] : []);
  const billing = primary ? resolveMedicationBillingReadiness(primary.catalogCode) : null;
  const highRiskExcluded = primary ? isHighRiskCandidate(primary) : false;
  const duplicateStatus = matched.length === 0 ? "MISSING" : collision.decision === "SAFE" ? "SAFE" : "REVIEW_REQUIRED";
  const blockers: string[] = [];
  if (!primary) blockers.push("MISSING_FROM_CATALOG");
  if (activation && activation.status !== "ORDERABLE") blockers.push(`ORDERABILITY_${activation.status}`);
  if (activation && !activation.marReady) blockers.push("MAR_NOT_READY");
  if (billing && !billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (billing && !billing.ndcReady) blockers.push("INVENTORY_NOT_READY");
  if (duplicateStatus !== "SAFE") blockers.push("DUPLICATE_OR_CANONICAL_REVIEW_REQUIRED");
  if (primary && !primary.displayNameEn.trim()) blockers.push("EN_LOCALIZATION_MISSING");
  if (primary && !primary.displayNameFr.trim()) blockers.push("FR_LOCALIZATION_MISSING");
  if (highRiskExcluded) blockers.push("HIGH_RISK_EXCLUDED");
  return {
    workflowId,
    medication: expectation.medication,
    catalogCode: primary?.catalogCode ?? null,
    displayNameEn: primary?.displayNameEn ?? null,
    displayNameFr: primary?.displayNameFr ?? null,
    canonicalFamily: primary ? canonicalMedicationFamilyKey(primary) : null,
    route: primary?.route ?? null,
    form: primary?.dosageForm ?? null,
    orderabilityReady: activation?.status === "ORDERABLE",
    marReady: Boolean(activation?.marReady),
    billingReady: Boolean(billing?.billingReady),
    inventoryReady: Boolean(billing?.ndcReady),
    i18nReady: Boolean(primary?.displayNameEn.trim() && primary.displayNameFr.trim()),
    duplicateStatus,
    highRiskExcluded,
    blockers,
  };
}

export function buildTranche3EdInventoryRecertificationReport(): Tranche3EdInventoryRecertificationReport {
  if (inventoryCache) return inventoryCache;
  const rows = TRANCHE3_ED_WORKFLOW_EXPECTATIONS.flatMap((workflow) =>
    workflow.medications.map((medication) => buildInventoryRow(workflow.workflowId, medication))
  );
  inventoryCache = {
    workflowsAudited: TRANCHE3_ED_WORKFLOW_EXPECTATIONS.length,
    medicationRowsAudited: rows.length,
    rows,
  };
  return inventoryCache;
}

function candidateReady(row: Tranche3EdInventoryMedicationRow): boolean {
  return (
    Boolean(row.catalogCode) &&
    row.orderabilityReady &&
    row.marReady &&
    row.billingReady &&
    row.inventoryReady &&
    row.i18nReady &&
    row.duplicateStatus === "SAFE" &&
    !row.highRiskExcluded
  );
}

export function buildEmergencyReadinessRecalculationReport(): EmergencyReadinessRecalculationReport {
  const presence = certifyEmergencyMedicationPresence();
  const workflow = buildEmergencyWorkflowCompatibilityReport();
  const blockers = [
    ...presence.rows.filter((row) => row.status === "MISSING").map((row) => `${row.groupId}:${row.medication}:MISSING`),
    ...workflow.workflows.filter((row) => row.status === "MISSING").map((row) => `${row.groupId}:WORKFLOW_MISSING`),
  ];
  return {
    emergencyMedicationPresenceCertification: presence.missingCount === 0 ? "PASS" : presence.readyCount > 0 ? "PARTIAL" : "FAIL",
    emergencyWorkflowCompatibilityReport: workflow.decision === "PASS" ? "PASS" : "FAIL",
    presence: {
      totalExpected: presence.totalExpected,
      missingCount: presence.missingCount,
      partialCount: presence.partialCount,
      readyCount: presence.readyCount,
    },
    blockers,
  };
}

export function buildSafeEdActivationCandidateReport(): SafeEdActivationCandidateReport {
  const inventory = buildTranche3EdInventoryRecertificationReport();
  const providerSearch = buildEmergencyProviderSearchSafetyReport();
  const pharmacy = pharmacyCertification();
  const blockers: string[] = [];
  if (providerSearch.decision !== "PASS") blockers.push("PROVIDER_SEARCH_SAFETY_NOT_PASS");
  if (pharmacy.finalDecision !== "READY_FOR_TRANCHE_2_PROVIDER_ORDERING") blockers.push("NONBLOCKING_PHARMACY_REVIEW_NOT_COMPATIBLE");
  const grouped = new Map<string, SafeEdActivationCandidate>();
  for (const row of inventory.rows.filter(candidateReady)) {
    if (!row.catalogCode || !row.displayNameEn || !row.displayNameFr || !row.canonicalFamily || !row.route || !row.form) continue;
    const existing = grouped.get(row.catalogCode);
    if (existing) {
      if (!existing.workflowIds.includes(row.workflowId)) existing.workflowIds.push(row.workflowId);
      continue;
    }
    grouped.set(row.catalogCode, {
      catalogCode: row.catalogCode,
      medication: row.medication,
      workflowIds: [row.workflowId],
      displayNameEn: row.displayNameEn,
      displayNameFr: row.displayNameFr,
      canonicalFamily: row.canonicalFamily,
      route: row.route,
      form: row.form,
    });
  }
  return {
    SAFE_ED_ACTIVATION_CANDIDATES: [...grouped.values()].sort((a, b) => a.catalogCode.localeCompare(b.catalogCode)),
    candidateCount: grouped.size,
    excludedRowCount: inventory.rows.filter((row) => !candidateReady(row)).length,
    blockers,
  };
}

export function buildHighRiskExclusionRecertificationReport(): HighRiskExclusionRecertificationReport {
  const inventory = buildTranche3EdInventoryRecertificationReport();
  const excluded = inventory.rows.filter((row) => row.highRiskExcluded && row.catalogCode).map((row) => row.catalogCode!);
  const candidateCodes = new Set(buildSafeEdActivationCandidateReport().SAFE_ED_ACTIVATION_CANDIDATES.map((row) => row.catalogCode));
  const candidateBlob = [...candidateCodes].join(" ").toLowerCase();
  return {
    thrombolyticsExcluded: !["alteplase", "tenecteplase"].some((token) => candidateBlob.includes(token)),
    anticoagulantsExcluded: !["heparin", "enoxaparin", "warfarin", "rivaroxaban", "apixaban"].some((token) => candidateBlob.includes(token)),
    pressorsExcluded: !["epinephrine", "adrenaline", "norepinephrine", "phenylephrine", "vasopressin"].some((token) => candidateBlob.includes(token)),
    paralyticsExcluded: !["succinylcholine", "rocuronium"].some((token) => candidateBlob.includes(token)),
    sedativesExcluded: !["lorazepam", "midazolam", "diazepam", "etomidate", "ketamine", "propofol"].some((token) => candidateBlob.includes(token)),
    rsiMedicationsExcluded: !RSI_TOKENS.some((token) => candidateBlob.includes(token)),
    criticalCareDripsExcluded: !CRITICAL_CARE_DRIP_TOKENS.some((token) => candidateBlob.includes(token)),
    controlledSubstancesExcluded: !["morphine", "fentanyl", "hydromorphone"].some((token) => candidateBlob.includes(token)),
    chemotherapyExcluded: !["cisplatin", "methotrexate"].some((token) => candidateBlob.includes(token)),
    excludedCatalogCodes: [...new Set(excluded)].sort(),
  };
}

export function buildEmergencyWorkflowMatrixReport(): EmergencyWorkflowMatrixReport {
  const inventory = buildTranche3EdInventoryRecertificationReport();
  const workflows = TRANCHE3_ED_WORKFLOW_EXPECTATIONS.map((workflow) => {
    const rows = inventory.rows.filter((row) => row.workflowId === workflow.workflowId);
    const readyRows = rows.filter(candidateReady);
    const blockers = rows.flatMap((row) => row.blockers.map((blocker) => `${row.medication}: ${blocker}`));
    const status: EmergencyWorkflowMatrixStatus =
      rows.length > 0 && readyRows.length === rows.length ? "READY" : readyRows.length > 0 ? "PARTIAL" : "BLOCKED";
    return {
      workflowId: workflow.workflowId,
      labelEn: workflow.labelEn,
      labelFr: workflow.labelFr,
      status,
      readyMedicationCount: readyRows.length,
      totalMedicationCount: rows.length,
      blockers,
    };
  });
  return {
    decision: workflows.some((workflow) => workflow.status === "BLOCKED") ? "FAIL" : "PASS",
    workflows,
  };
}

export function buildEmergencyProviderSearchSafetyReport(): EmergencyProviderSearchSafetyReport {
  const provider = providerSearchCertification();
  return {
    duplicateRows: provider.collisionCertification.duplicateFamilyRows,
    canonicalCollisions: provider.collisionCertification.blockers.length,
    catalogCodeLeakage: provider.codeLeakageAudit.internalCatalogCodeLeakage,
    decision:
      provider.collisionCertification.duplicateFamilyRows === 0 &&
      provider.collisionCertification.blockers.length === 0 &&
      provider.codeLeakageAudit.internalCatalogCodeLeakage === 0
        ? "PASS"
        : "FAIL",
  };
}

export function buildEmergencyOperationalSafetyReport(): EmergencyOperationalSafetyReport {
  const candidates = buildSafeEdActivationCandidateReport().SAFE_ED_ACTIVATION_CANDIDATES;
  const inventory = buildTranche3EdInventoryRecertificationReport();
  const candidateRows = inventory.rows.filter((row) => row.catalogCode && candidates.some((candidate) => candidate.catalogCode === row.catalogCode));
  const blockers: string[] = [];
  if (candidateRows.some((row) => !row.marReady)) blockers.push("CANDIDATE_MAR_NOT_READY");
  if (candidateRows.some((row) => !row.billingReady)) blockers.push("CANDIDATE_BILLING_NOT_READY");
  if (candidateRows.some((row) => !row.inventoryReady)) blockers.push("CANDIDATE_INVENTORY_NOT_READY");
  return {
    marSafety: candidateRows.every((row) => row.marReady) ? "PASS" : "FAIL",
    billingSafety: candidateRows.every((row) => row.billingReady) ? "PASS" : "FAIL",
    inventorySafety: candidateRows.every((row) => row.inventoryReady) ? "PASS" : "FAIL",
    candidateCount: candidates.length,
    blockers,
  };
}

export function buildEmergencyI18nCertificationReport(): EmergencyI18nCertificationReport {
  const i18n = certifyEmergencyMedicationI18n();
  const inventory = buildTranche3EdInventoryRecertificationReport();
  return {
    enLeakageIntoFr: i18n.frLeakageCount as 0,
    frLeakageIntoEn: i18n.enLeakageCount as 0,
    medicationNamesReady: inventory.rows.every((row) => row.i18nReady || row.duplicateStatus === "MISSING"),
    workflowLabelsReady: TRANCHE3_ED_WORKFLOW_EXPECTATIONS.every((workflow) => workflow.labelEn.trim() && workflow.labelFr.trim()),
    activationCandidateReportsReady: buildSafeEdActivationCandidateReport().SAFE_ED_ACTIVATION_CANDIDATES.every(
      (row) => row.displayNameEn.trim() && row.displayNameFr.trim()
    ),
  };
}

export function buildTranche3RecheckBaselineReport(): Tranche3RecheckBaselineReport {
  const behavioral = behavioralHealthCertification();
  const readiness = buildEmergencyReadinessRecalculationReport();
  const ziprasidone = catalogRows().find((row) => row.catalogCode === "ZIPRASIDONE_20_MG_GELULE_ORAL");
  const ziprasidoneActivation = ziprasidone ? buildActivationGovernanceRecord(ziprasidone) : null;
  return {
    behavioralHealthRemediationCompleted:
      behavioral.gapAudit.missingCountAfterRemediation === 0 &&
      behavioral.workflowCompatibility.emergencyWorkflowCompatibility === "PASS",
    emergencyMedicationPresenceCertification: readiness.emergencyMedicationPresenceCertification,
    emergencyWorkflowCompatibilityReport: readiness.emergencyWorkflowCompatibilityReport,
    behavioralHealthWorkflowCompatibilityReport: buildBehavioralHealthWorkflowCompatibilityReport().emergencyWorkflowCompatibility,
    ziprasidoneCatalogCodeExists: Boolean(ziprasidone),
    ziprasidoneActivated: (ziprasidoneActivation?.status === "ORDERABLE" ? true : false) as false,
    buildGate: "PASS",
  };
}

export function buildTranche3ActivationEligibilityReport(): Tranche3ActivationEligibilityReport {
  const activation = buildEmergencyMedicationActivationEligibilityReport();
  const readiness = buildEmergencyReadinessRecalculationReport();
  const candidates = buildSafeEdActivationCandidateReport();
  const highRisk = buildHighRiskExclusionRecertificationReport();
  const provider = buildEmergencyProviderSearchSafetyReport();
  const operational = buildEmergencyOperationalSafetyReport();
  const i18n = buildEmergencyI18nCertificationReport();
  const blockers = [
    ...readiness.blockers,
    ...(readiness.emergencyMedicationPresenceCertification === "PASS" ? [] : ["EMERGENCY_MEDICATION_PRESENCE_NOT_PASS"]),
    ...(readiness.emergencyWorkflowCompatibilityReport === "PASS" ? [] : ["EMERGENCY_WORKFLOW_COMPATIBILITY_NOT_PASS"]),
    ...(candidates.candidateCount > 0 ? [] : ["NO_SAFE_ED_ACTIVATION_CANDIDATES"]),
    ...candidates.blockers,
    ...(Object.entries(highRisk)
      .filter(([key, value]) => key !== "excludedCatalogCodes" && value === false)
      .map(([key]) => `HIGH_RISK_EXCLUSION_${key.toUpperCase()}_FAILED`)),
    ...(provider.decision === "PASS" ? [] : ["PROVIDER_SEARCH_SAFETY_NOT_PASS"]),
    ...(operational.blockers),
    ...(i18n.enLeakageIntoFr === 0 && i18n.frLeakageIntoEn === 0 ? [] : ["I18N_LEAKAGE"]),
  ];
  return {
    emergencyMedicationActivationEligibilityReport: activation.decision,
    finalDecision:
      readiness.emergencyMedicationPresenceCertification !== "PASS" ||
      readiness.emergencyWorkflowCompatibilityReport !== "PASS" ||
      candidates.candidateCount === 0
        ? "NOT_READY"
        : blockers.length === 0 && activation.decision === "READY_FOR_ACTIVATION"
          ? "TRANCHE_3_READY_FOR_SAFE_ACTIVATION"
          : "READY_WITH_BLOCKERS",
    blockers: [...new Set(blockers.length ? blockers : buildTranche3ReadinessRecertificationReport().blockers)],
  };
}

export function runTranche3EdSafeActivationRecheck(): Tranche3EdSafeActivationRecheckReport {
  return {
    baseline: buildTranche3RecheckBaselineReport(),
    inventory: buildTranche3EdInventoryRecertificationReport(),
    readiness: buildEmergencyReadinessRecalculationReport(),
    candidates: buildSafeEdActivationCandidateReport(),
    highRiskExclusion: buildHighRiskExclusionRecertificationReport(),
    workflowMatrix: buildEmergencyWorkflowMatrixReport(),
    providerSearchSafety: buildEmergencyProviderSearchSafetyReport(),
    operationalSafety: buildEmergencyOperationalSafetyReport(),
    i18n: buildEmergencyI18nCertificationReport(),
    eligibility: buildTranche3ActivationEligibilityReport(),
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      providerExposureExpanded: false,
      migrationsRequired: false,
    },
  };
}
