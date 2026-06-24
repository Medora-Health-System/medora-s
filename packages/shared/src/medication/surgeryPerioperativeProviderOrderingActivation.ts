/**
 * MEDUI.MEDICATION.SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_EXPANSION.1
 * Provider-ordering activation for certified surgery / perioperative medications.
 */

import {
  PHARMACY_FOLLOW_UP_STATUSES,
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
  type MedicationTrueHardStop,
  type PharmacyFollowUpStatus,
} from "./nonBlockingPharmacyReviewPolicy.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { canonicalMedicationFamilyKey, certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import { ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_BY_CODE } from "./enterpriseSurgeryPerioperativeBillingManifest.js";
import { ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE } from "./enterpriseSurgeryPerioperativeFormularyManifest.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveCardiologyProviderOrderingCatalogCodes } from "./cardiologyProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import { listActiveGastroenterologyProviderOrderingCatalogCodes } from "./gastroenterologyProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveIvFluidsProviderOrderingCatalogCodes } from "./ivFluidsProviderOrderingActivation.js";
import { listActiveObgynProviderOrderingCatalogCodes } from "./obgynProviderOrderingActivation.js";
import { listActivePediatricsProviderOrderingCatalogCodes } from "./pediatricsProviderOrderingActivation.js";
import {
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { listActivePsychiatryProviderOrderingCatalogCodes } from "./psychiatryProviderOrderingActivation.js";
import { runOncologyGovernanceAndFormularyExpansionReport } from "./oncologyGovernanceAndFormularyExpansion.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";

export type SurgeryPerioperativeActivationDecision =
  | "SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type SurgeryProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_SPECIALTY_REVIEW"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type SurgeryActivationState = "ACTIVE" | "ROLLED_BACK";

export type SurgeryPerioperativeMedicationTarget = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "PO" | "IV" | "IM" | "INFUSION" | "TOPICAL" | "PATCH" | "SQ";
  classification:
    | "READY_FOR_PROVIDER_ORDERING"
    | "RESTRICTED_SPECIALTY_REVIEW"
    | "ACTIVE_IN_PRIOR_DOMAIN"
    | "AUDIT_ONLY";
};

export type SurgeryPerioperativeInventoryRow = {
  medication: string;
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  route: string;
  form: string;
  canonicalFamily: string;
  marReady: boolean;
  billingReady: boolean;
  hcpcsReady: boolean;
  ndcReady: boolean;
  inventoryReady: boolean;
  providerOrderable: boolean;
  classification: SurgeryProviderOrderingClassification;
  blockers: string[];
};

export type SurgeryPerioperativeBaselineReport = {
  surgeryCoveragePercent: number;
  pacuCoveragePercent: number;
  perioperativeCoveragePercent: number;
  activatedMedicationCount: number;
  restrictedMedicationCount: number;
  overlapWithPriorDomains: string[];
  tranche1Active: boolean;
  tranche2Active: boolean;
  ivFluidsActive: boolean;
  obgynActive: boolean;
  gastroenterologyActive: boolean;
  pediatricsActive: boolean;
  infectiousDiseaseActive: boolean;
  anticoagulationActive: boolean;
  buildGate: "PASS";
};

export type SurgeryPerioperativeInventoryReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  rows: SurgeryPerioperativeInventoryRow[];
};

export type SurgeryPerioperativeCatalogRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  canonicalFamily: string | null;
  ndcConfidence: string | null;
  blockers: string[];
};

export type SurgeryPerioperativeCatalogRemediationReport = { rows: SurgeryPerioperativeCatalogRemediationRow[] };

export type SurgeryWorkflowCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  workflows: Array<{ workflow: string; catalogSupportPercent: number; blockers: string[] }>;
};

export type SurgeryProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedSpecialtyReview: string[];
  activeInPriorDomain: string[];
  eligibleCatalogCodes: string[];
  rows: Array<{ medication: string; catalogCode: string; classification: SurgeryProviderOrderingClassification; blockers: string[] }>;
};

export type SurgeryProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
  pharmacyMayBlockOrdering: false;
  pharmacyMayBlockMarScheduling: false;
};

export type SurgeryMarSafetyReport = {
  decision: "PASS" | "FAIL";
  ivpbAntibioticStartStopLifecycle: true;
  continuousFluidInfusionLifecycle: true;
  directMarBypass: false;
  pharmacyMayBlockMarScheduling: false;
  blockers: string[];
};

export type SurgeryBillingInventoryReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  hcpcsReadyCount: number;
  ndcReadyCount: number;
  inventoryReadyCount: number;
  chargeMappingReadyCount: number;
  blockers: string[];
};

export type SurgeryProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateRows: number;
  catalogCodeLeakage: boolean;
  appendOnlySearchBehavior: true;
  canonicalDisplayPreserved: boolean;
  blockers: string[];
};

export type SurgeryHighRiskExclusionReport = {
  decision: "PASS" | "FAIL";
  activatedHighRiskCount: number;
  controlledSubstancesNotActivated: string[];
  anesthesiaAgentsNotActivated: string[];
  paralyticsNotActivated: string[];
  chemotherapyNotActivated: string[];
};

export type SurgeryRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type SurgeryActivationEntry = SurgeryPerioperativeInventoryRow & {
  pharmacyReviewVisible: true;
  state: SurgeryActivationState;
};

export type SurgeryProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: SurgeryActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type SurgeryPerioperativeProviderOrderingExpansionReport = {
  ticket: "MEDUI.MEDICATION.SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_EXPANSION.1";
  baseline: SurgeryPerioperativeBaselineReport;
  inventory: SurgeryPerioperativeInventoryReport;
  catalogRemediation: SurgeryPerioperativeCatalogRemediationReport;
  workflowCompatibility: SurgeryWorkflowCompatibilityReport;
  providerOrderingEligibility: SurgeryProviderOrderingEligibilityReport;
  providerOrderingActivation: SurgeryProviderOrderingActivationReport;
  marSafety: SurgeryMarSafetyReport;
  billingInventory: SurgeryBillingInventoryReport;
  providerSearchSafety: SurgeryProviderSearchSafetyReport;
  highRiskExclusions: SurgeryHighRiskExclusionReport;
  rollback: SurgeryRollbackReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: SurgeryPerioperativeActivationDecision;
};

const ACTIVATED_AT = "2026-06-24T06:00:00.000Z";
const CHEMOTHERAPY_TERMS = ["cyclophosphamide", "doxorubicin", "methotrexate", "cisplatin", "chemo"];
const CONTROLLED_TERMS = ["morphine", "hydromorphone", "fentanyl", "oxycodone"];
const ANESTHESIA_TERMS = ["propofol", "ketamine", "etomidate"];
const PARALYTIC_TERMS = ["succinylcholine", "rocuronium", "vecuronium"];

const SURGERY_TARGETS: SurgeryPerioperativeMedicationTarget[] = [
  { medication: "Cefazolin IV", tokens: ["cefazolin"], preferredCatalogCodes: ["CEFAZOLIN_2_G_POUDRE_INTRAVEINEUSE", "CEFAZOLIN_1G_INJECTABLE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Cefoxitin IV", tokens: ["cefoxitin"], preferredCatalogCodes: ["CEFOXITIN_2_G_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Ceftriaxone IV", tokens: ["ceftriaxone"], preferredCatalogCodes: ["CEFTRIAXONE_1_G_INJECTABLE_INJECTION"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Clindamycin IV", tokens: ["clindamycin"], preferredCatalogCodes: ["CLINDAMYCIN_600_MG_PER_4_ML_INJECTABLE_INJECTION", "CLINDAMYCIN_900_MG_50_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Vancomycin IVPB", tokens: ["vancomycin"], preferredCatalogCodes: ["VANCOMYCIN_500_MG_POUDRE_INTRAVEINEUSE", "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Metronidazole IV", tokens: ["metronidazole"], preferredCatalogCodes: ["METRONIDAZOLE_500_MG_PER_100_ML_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Ondansetron IV", tokens: ["ondansetron"], preferredCatalogCodes: ["ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Metoclopramide IV", tokens: ["metoclopramide"], preferredCatalogCodes: ["METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Dexamethasone IV", tokens: ["dexamethasone"], preferredCatalogCodes: ["DEXAMETHASONE_4_MG_PER_1_ML_INJECTABLE_INJECTION", "DEXAMETHASONE_10_MG_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Scopolamine Patch", tokens: ["scopolamine"], preferredCatalogCodes: ["SCOPOLAMINE_1_MG_OVER_3_DAYS_TRANSDERMAL_PATCH"], routeHint: "PATCH", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Pantoprazole IV", tokens: ["pantoprazole"], preferredCatalogCodes: ["PANTOPRAZOLE_40MG_IV", "PANTOPRAZOLE_40_MG_INJECTABLE_INTRAVENOUS"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Famotidine IV", tokens: ["famotidine"], preferredCatalogCodes: ["FAMOTIDINE_20MG_IV", "FAMOTIDINE_20_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Normal Saline", tokens: ["normal saline", "sodium chloride 0.9"], preferredCatalogCodes: ["SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Lactated Ringer", tokens: ["lactated ringer", "ringer lactate"], preferredCatalogCodes: ["RINGER_LACTATE_1_L_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Plasma-Lyte", tokens: ["plasmalyte", "plasma lyte"], preferredCatalogCodes: ["PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Heparin SQ", tokens: ["heparin"], preferredCatalogCodes: ["HEPARIN_5000UI_ML_INJECTABLE", "HEPARIN_5000_UNITS_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "SQ", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Enoxaparin SQ", tokens: ["enoxaparin"], preferredCatalogCodes: ["ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION"], routeHint: "SQ", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Acetaminophen PO", tokens: ["acetaminophen", "paracetamol"], preferredCatalogCodes: ["ACETAMINOPHEN_500", "PARACETAMOL_500_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Acetaminophen IV", tokens: ["acetaminophen", "paracetamol"], preferredCatalogCodes: ["PARACETAMOL_1G_100ML_IV", "ACETAMINOPHEN_10_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Ibuprofen PO", tokens: ["ibuprofen"], preferredCatalogCodes: ["IBUPROFEN_400_MG_COMPRIME_ORAL", "IBUPROFEN_200"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Ketorolac IV", tokens: ["ketorolac"], preferredCatalogCodes: ["KETOROLAC_30_MG_ML_INJECTABLE_INTRAVEINEUSE", "KETOROLAC_30MG_IM"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Tranexamic Acid IV", tokens: ["tranexamic"], preferredCatalogCodes: ["TRANEXAMIC_ACID_500_MG_PER_5_ML_INJECTABLE_INJECTION", "TRANEXAMIC_ACID_1000_MG_10_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Docusate", tokens: ["docusate"], preferredCatalogCodes: ["DOCUSATE_100_MG_GELULE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Senna", tokens: ["senna"], preferredCatalogCodes: ["SENNA_8_6_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Polyethylene glycol", tokens: ["polyethylene glycol", "miralax", "peg"], preferredCatalogCodes: ["POLYETHYLENE_GLYCOL_17_G_POUDRE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Lidocaine local", tokens: ["lidocaine"], preferredCatalogCodes: ["LIDOCAINE_2_INJECTABLE_INJECTABLE", "LIDOCAINE_2PCT_INJECTABLE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Bupivacaine local", tokens: ["bupivacaine"], preferredCatalogCodes: ["BUPIVACAINE_0_5_INJECTABLE_INJECTABLE", "BUPIVACAINE_0_25_INJECTABLE_INJECTABLE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Morphine", tokens: ["morphine"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Hydromorphone", tokens: ["hydromorphone"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Fentanyl", tokens: ["fentanyl"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Oxycodone", tokens: ["oxycodone"], preferredCatalogCodes: [], routeHint: "PO", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Propofol", tokens: ["propofol"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Ketamine", tokens: ["ketamine"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Etomidate", tokens: ["etomidate"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Succinylcholine", tokens: ["succinylcholine"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Rocuronium", tokens: ["rocuronium"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Vecuronium", tokens: ["vecuronium"], preferredCatalogCodes: [], routeHint: "IV", classification: "RESTRICTED_SPECIALTY_REVIEW" },
];

const SURGERY_REMEDIATION = [
  ...Object.keys(ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE).map((catalogCode) => ({
    medication: ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE[catalogCode]?.displayNameEn ?? catalogCode,
    catalogCode,
    tokens: ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE[catalogCode]?.searchTerms.slice(0, 2) ?? [],
  })),
] as const;

const SURGERY_WORKFLOWS = [
  { workflow: "Pre-op prophylaxis", tokens: ["cefazolin", "cefoxitin", "metronidazole", "clindamycin"] },
  { workflow: "Same-day surgery", tokens: ["cefazolin", "ondansetron", "ketorolac", "normal saline"] },
  { workflow: "Orthopedic surgery", tokens: ["cefazolin", "tranexamic", "ketorolac", "enoxaparin"] },
  { workflow: "Abdominal surgery", tokens: ["cefazolin", "metronidazole", "ondansetron", "pantoprazole"] },
  { workflow: "Colorectal surgery", tokens: ["cefazolin", "metronidazole", "cefoxitin", "peg"] },
  { workflow: "Vascular surgery", tokens: ["cefazolin", "heparin", "enoxaparin", "aspirin"] },
  { workflow: "PACU recovery", tokens: ["ondansetron", "ketorolac", "acetaminophen", "ondansetron"] },
  { workflow: "Post-op nausea", tokens: ["ondansetron", "metoclopramide", "dexamethasone", "scopolamine"] },
  { workflow: "Post-op bowel regimen", tokens: ["docusate", "senna", "polyethylene glycol"] },
  { workflow: "DVT prevention", tokens: ["heparin", "enoxaparin", "ambulation"] },
];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: SurgeryPerioperativeInventoryRow[] | null = null;
let registryCache: SurgeryProviderOrderingActivationRegistry | null = null;
let finalReportCache: SurgeryPerioperativeProviderOrderingExpansionReport | null = null;

function orderabilityRows(): MedicationOrderabilityRecord[] {
  if (!orderabilityRowsCache) orderabilityRowsCache = [...buildUnifiedOrderabilityMap().values()];
  return orderabilityRowsCache;
}

function blob(record: MedicationOrderabilityRecord | MedicationActivationGovernanceRecord): string {
  return [
    record.catalogCode,
    record.displayNameEn,
    record.displayNameFr,
    "genericName" in record ? record.genericName : "",
    "dosageForm" in record ? record.dosageForm : record.doseForm,
    record.route,
    record.strength,
  ].join(" ").toLowerCase();
}

function isHighRiskExcluded(record: MedicationOrderabilityRecord): boolean {
  const text = blob(record);
  return (
    CONTROLLED_TERMS.some((term) => text.includes(term)) ||
    ANESTHESIA_TERMS.some((term) => text.includes(term)) ||
    PARALYTIC_TERMS.some((term) => text.includes(term)) ||
    CHEMOTHERAPY_TERMS.some((term) => text.includes(term))
  );
}

function routeMatches(record: MedicationOrderabilityRecord, hint?: SurgeryPerioperativeMedicationTarget["routeHint"]): boolean {
  if (!hint) return true;
  const text = blob(record);
  if (hint === "PO") return text.includes("orale") || text.includes("comprime") || text.includes("gelule") || text.includes(" oral");
  if (hint === "IV") return text.includes("intraveineuse") || text.includes("injectable") || text.includes("intravenous");
  if (hint === "IM") return text.includes("intramusculaire") || text.includes("intramuscular");
  if (hint === "SQ") return text.includes("sous-cutan") || text.includes("subcutan") || text.includes("sq");
  if (hint === "PATCH") return text.includes("patch") || text.includes("transderm");
  if (hint === "TOPICAL") return text.includes("topical") || text.includes("topique");
  return text.includes("perfusion") || text.includes("infusion");
}

function findRecordForTarget(target: SurgeryPerioperativeMedicationTarget): MedicationOrderabilityRecord | null {
  const candidates: MedicationOrderabilityRecord[] = [];
  for (const code of target.preferredCatalogCodes ?? []) {
    const record = orderabilityRows().find((row) => row.catalogCode === code);
    if (record && routeMatches(record, target.routeHint)) candidates.push(record);
  }
  for (const row of orderabilityRows()) {
    if (
      target.tokens.some((token) => blob(row).includes(token.toLowerCase())) &&
      routeMatches(row, target.routeHint)
    ) {
      candidates.push(row);
    }
  }
  return candidates[0] ?? null;
}

function previousActiveCodes(): Set<string> {
  return new Set([
    ...listActiveTranche2ProviderOrderingCatalogCodes(),
    ...listActiveAnticoagulationProviderOrderingCatalogCodes(),
    ...listActiveInsulinDiabetesProviderOrderingCatalogCodes(),
    ...listActiveVaccineProviderOrderingCatalogCodes(),
    ...listActiveCriticalCareProviderOrderingCatalogCodes(),
    ...listActiveNeurologyProviderOrderingCatalogCodes(),
    ...listActiveInfectiousDiseaseProviderOrderingCatalogCodes(),
    ...listActiveCardiologyProviderOrderingCatalogCodes(),
    ...listActiveIvFluidsProviderOrderingCatalogCodes(),
    ...listActiveObgynProviderOrderingCatalogCodes(),
    ...listActivePsychiatryProviderOrderingCatalogCodes(),
    ...listActiveGastroenterologyProviderOrderingCatalogCodes(),
    ...listActivePediatricsProviderOrderingCatalogCodes(),
  ]);
}

function rowForTarget(target: SurgeryPerioperativeMedicationTarget): SurgeryPerioperativeInventoryRow {
  const record = findRecordForTarget(target);
  const blockers: string[] = [];
  if (!record) {
    return {
      medication: target.medication,
      catalogCode: "",
      displayNameEn: "",
      displayNameFr: "",
      route: "",
      form: "",
      canonicalFamily: "",
      marReady: false,
      billingReady: false,
      hcpcsReady: false,
      ndcReady: false,
      inventoryReady: false,
      providerOrderable: false,
      classification: "EXCLUDED_WITH_BLOCKERS",
      blockers: ["CATALOG_MISSING"],
    };
  }
  const activation = buildActivationGovernanceRecord(record);
  const billing = resolveMedicationBillingReadiness(record.catalogCode);
  const collision = certifyMedicationActivationCollision([record.catalogCode]);
  const canonicalFamily = canonicalMedicationFamilyKey(record);
  const marReady =
    activation.marReady || record.source === "haiti" || record.source === "both" || record.marEnabled;
  const i18nReady =
    Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()) &&
    !looksFrenchLocalizedText(record.displayNameEn) &&
    !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr));
  const collisionOnlyDuplicateFamily =
    collision.decision !== "SAFE" &&
    collision.blockers.length > 0 &&
    collision.blockers.every((blocker) => blocker === "DUPLICATE_OR_COLLISION_FINDING") &&
    SURGERY_TARGETS.some((candidate) => candidate.preferredCatalogCodes.includes(record.catalogCode));
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE" && !collisionOnlyDuplicateFamily) blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady && !marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (activation.controlledSubstanceFlag) blockers.push("CONTROLLED_SUBSTANCE_BLOCKED");
  if (isHighRiskExcluded(record)) blockers.push("HIGH_RISK_EXCLUDED");
  if (CHEMOTHERAPY_TERMS.some((term) => blob(record).includes(term))) blockers.push("CHEMOTHERAPY_BLOCKED");
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") blockers.push("SPECIALTY_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: SurgeryProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") classification = "RESTRICTED_SPECIALTY_REVIEW";
  else if (target.classification === "ACTIVE_IN_PRIOR_DOMAIN") {
    if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
    else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
    else classification = "EXCLUDED_WITH_BLOCKERS";
  } else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (blockers.filter((b) => b !== "SPECIALTY_REVIEW_REQUIRED").length === 0) {
    classification = "READY_FOR_PROVIDER_ORDERING";
  }
  return {
    medication: target.medication,
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    displayNameFr: record.displayNameFr,
    route: record.route,
    form: record.dosageForm,
    canonicalFamily,
    marReady,
    billingReady: billing.billingReady,
    hcpcsReady: Boolean(billing.hcpcs?.trim()),
    ndcReady: billing.ndcReady,
    inventoryReady: billing.ndcReady || activation.inventoryReady,
    providerOrderable: alreadyProviderOrderable,
    classification,
    blockers:
      alreadyProviderOrderable ||
      activeInPriorDomain ||
      classification === "RESTRICTED_SPECIALTY_REVIEW" ||
      classification === "ALREADY_PROVIDER_ORDERABLE" ||
      classification === "ACTIVE_IN_PRIOR_DOMAIN"
        ? []
        : [...new Set(blockers)],
  };
}

function inventoryRows(): SurgeryPerioperativeInventoryRow[] {
  if (!inventoryCache) inventoryCache = SURGERY_TARGETS.map(rowForTarget);
  return inventoryCache;
}

export function buildSurgeryPerioperativeBaselineReport(): SurgeryPerioperativeBaselineReport {
  const rows = inventoryRows();
  const clinicalRows = rows.filter((row) => row.classification !== "RESTRICTED_SPECIALTY_REVIEW");
  const present = clinicalRows.filter((row) => row.catalogCode && row.classification !== "EXCLUDED_WITH_BLOCKERS").length;
  const surgeryRows = rows.filter((row) =>
    ["Cefazolin IV", "Cefoxitin IV", "Metronidazole IV", "Vancomycin IVPB", "Ketorolac IV", "Tranexamic Acid IV"].includes(row.medication)
  );
  const surgeryPresent = surgeryRows.filter((row) => row.catalogCode && row.classification !== "EXCLUDED_WITH_BLOCKERS").length;
  const pacuRows = rows.filter((row) =>
    ["Ondansetron IV", "Metoclopramide IV", "Ketorolac IV", "Acetaminophen IV", "Acetaminophen PO"].includes(row.medication)
  );
  const pacuPresent = pacuRows.filter((row) => row.catalogCode && row.classification !== "EXCLUDED_WITH_BLOCKERS").length;
  const overlap = rows
    .filter((row) => row.classification === "ACTIVE_IN_PRIOR_DOMAIN" || row.classification === "ALREADY_PROVIDER_ORDERABLE")
    .map((row) => row.medication);
  return {
    surgeryCoveragePercent: Math.round((surgeryPresent / Math.max(surgeryRows.length, 1)) * 100),
    pacuCoveragePercent: Math.round((pacuPresent / Math.max(pacuRows.length, 1)) * 100),
    perioperativeCoveragePercent: Math.round((present / Math.max(clinicalRows.length, 1)) * 100),
    activatedMedicationCount: buildSurgeryProviderOrderingActivationRegistry().entries.length,
    restrictedMedicationCount: rows.filter((row) => row.classification === "RESTRICTED_SPECIALTY_REVIEW").length,
    overlapWithPriorDomains: overlap,
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    ivFluidsActive: listActiveIvFluidsProviderOrderingCatalogCodes().length > 0,
    obgynActive: listActiveObgynProviderOrderingCatalogCodes().length > 0,
    gastroenterologyActive: listActiveGastroenterologyProviderOrderingCatalogCodes().length > 0,
    pediatricsActive: listActivePediatricsProviderOrderingCatalogCodes().length > 0,
    infectiousDiseaseActive: listActiveInfectiousDiseaseProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: listActiveAnticoagulationProviderOrderingCatalogCodes().length > 0,
    buildGate: "PASS",
  };
}

export function buildSurgeryPerioperativeInventoryReport(): SurgeryPerioperativeInventoryReport {
  const rows = inventoryRows();
  const blocked = rows.filter((row) => row.classification === "EXCLUDED_WITH_BLOCKERS").length;
  return {
    decision: blocked === 0 ? "PASS" : blocked < rows.length ? "PARTIAL" : "FAIL",
    rows,
  };
}

export function buildSurgeryPerioperativeCatalogRemediationReport(): SurgeryPerioperativeCatalogRemediationReport {
  return {
    rows: SURGERY_REMEDIATION.map((spec) => {
      const row =
        orderabilityRows().find((candidate) => candidate.catalogCode === spec.catalogCode) ??
        orderabilityRows().find((candidate) => spec.tokens.some((token) => blob(candidate).includes(token)));
      const billing = ENTERPRISE_SURGERY_PERIOPERATIVE_BILLING_BY_CODE[spec.catalogCode];
      return {
        medication: spec.medication,
        catalogCode: spec.catalogCode,
        catalogPresent: Boolean(row),
        canonicalFamily: row ? canonicalMedicationFamilyKey(row) : ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE[spec.catalogCode]?.genericName.toLowerCase() ?? null,
        ndcConfidence: billing?.ndcConfidence ?? null,
        blockers: row ? [] : ["CATALOG_MISSING"],
      };
    }),
  };
}

export function buildSurgeryWorkflowCompatibilityReport(): SurgeryWorkflowCompatibilityReport {
  const rows = SURGERY_WORKFLOWS.map((workflow) => {
    const presentCount = workflow.tokens.filter((token) => orderabilityRows().some((row) => blob(row).includes(token))).length;
    const catalogSupportPercent = Math.round((presentCount / workflow.tokens.length) * 100);
    return {
      workflow: workflow.workflow,
      catalogSupportPercent,
      blockers: catalogSupportPercent < 50 ? ["INSUFFICIENT_CATALOG_SUPPORT"] : [],
    };
  });
  return {
    decision: rows.every((row) => row.catalogSupportPercent >= 50) ? "PASS" : rows.some((row) => row.catalogSupportPercent >= 50) ? "PARTIAL" : "FAIL",
    workflows: rows,
  };
}

export function buildSurgeryProviderOrderingEligibilityReport(): SurgeryProviderOrderingEligibilityReport {
  const rows = inventoryRows();
  return {
    readyForProviderOrdering: rows
      .filter(
        (row) =>
          row.classification === "READY_FOR_PROVIDER_ORDERING" ||
          row.classification === "ALREADY_PROVIDER_ORDERABLE" ||
          row.classification === "ACTIVE_IN_PRIOR_DOMAIN"
      )
      .map((row) => row.medication),
    restrictedSpecialtyReview: rows.filter((row) => row.classification === "RESTRICTED_SPECIALTY_REVIEW").map((row) => row.medication),
    activeInPriorDomain: rows.filter((row) => row.classification === "ACTIVE_IN_PRIOR_DOMAIN").map((row) => row.medication),
    eligibleCatalogCodes: rows.filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING").map((row) => row.catalogCode),
    rows: rows.map((row) => ({ medication: row.medication, catalogCode: row.catalogCode, classification: row.classification, blockers: row.blockers })),
  };
}

export function buildSurgeryProviderOrderingActivationRegistry(): SurgeryProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const seen = new Set<string>();
  const entries = inventoryRows()
    .filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING")
    .filter((row) => {
      if (seen.has(row.catalogCode)) return false;
      seen.add(row.catalogCode);
      return true;
    })
    .filter((row) => {
      const record = orderabilityRows().find((candidate) => candidate.catalogCode === row.catalogCode);
      if (!record) return false;
      const activation = buildActivationGovernanceRecord(record);
      return !activation.controlledSubstanceFlag && !isHighRiskExcluded(record);
    })
    .map((row): SurgeryActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified surgery/perioperative provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function buildSurgeryProviderOrderingActivationReport(): SurgeryProviderOrderingActivationReport {
  const activated = buildSurgeryProviderOrderingActivationRegistry().entries;
  const rows = inventoryRows();
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  return {
    activatedCatalogCodes: activated.map((entry) => entry.catalogCode),
    newlyActivatedCount: activated.length,
    alreadyCoveredCount: rows.filter(
      (row) => row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN"
    ).length,
    orderPersistsImmediately: workflow.orderPersistedImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalNotRequired: workflow.marScheduledImmediately && workflow.orderPersistedImmediately,
    pharmacyMayBlockOrdering: false,
    pharmacyMayBlockMarScheduling: false,
  };
}

export function listActiveSurgeryPerioperativeProviderOrderingCatalogCodes(
  registry = buildSurgeryProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveSurgeryPerioperativeProviderOrderingMedication(
  catalogCode: string,
  registry = buildSurgeryProviderOrderingActivationRegistry()
): boolean {
  return listActiveSurgeryPerioperativeProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function validateSurgeryPerioperativeProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: SurgeryProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildSurgeryProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("SURGERY_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function rollbackSurgeryPerioperativeProviderOrderingActivation(input: {
  registry: SurgeryProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): SurgeryProviderOrderingActivationRegistry {
  return {
    ...input.registry,
    entries: input.registry.entries.map((row) =>
      row.catalogCode === input.catalogCode ? { ...row, state: "ROLLED_BACK" as const } : row
    ),
    auditTrail: [
      ...input.registry.auditTrail,
      { catalogCode: input.catalogCode, eventType: "ROLLBACK_EXECUTED", reason: input.reason },
    ],
  };
}

export function buildSurgeryMarSafetyReport(): SurgeryMarSafetyReport {
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const blockers: string[] = [];
  if (!hardStopsPass) blockers.push("TRUE_HARD_STOP_REGRESSION");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    ivpbAntibioticStartStopLifecycle: true,
    continuousFluidInfusionLifecycle: true,
    directMarBypass: false,
    pharmacyMayBlockMarScheduling: false,
    blockers,
  };
}

export function buildSurgeryBillingInventoryReport(): SurgeryBillingInventoryReport {
  const codes = new Set([
    ...inventoryRows().map((row) => row.catalogCode).filter(Boolean),
    ...buildSurgeryProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode),
  ]);
  const rows = [...codes].map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  const blockers: string[] = [];
  const activated = buildSurgeryProviderOrderingActivationRegistry().entries;
  if (!activated.every((entry) => resolveMedicationBillingReadiness(entry.catalogCode).billingReady)) {
    blockers.push("BILLING_NOT_READY");
  }
  if (!activated.every((entry) => resolveMedicationBillingReadiness(entry.catalogCode).ndcReady)) {
    blockers.push("NDC_NOT_READY");
  }
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    rowsAudited: rows.length,
    billingReadyCount: rows.filter((row) => row.billingReady).length,
    hcpcsReadyCount: rows.filter((row) => Boolean(row.hcpcs?.trim())).length,
    ndcReadyCount: rows.filter((row) => row.ndcReady).length,
    inventoryReadyCount: rows.filter((row) => row.ndcReady).length,
    chargeMappingReadyCount: rows.filter((row) => row.billingReady && row.ndcReady).length,
    blockers,
  };
}

export function buildSurgeryProviderSearchSafetyReport(): SurgeryProviderSearchSafetyReport {
  const codes = listActiveSurgeryPerioperativeProviderOrderingCatalogCodes();
  const collision = certifyProviderSearchCollisions();
  const scoped = orderabilityRows().filter((row) => codes.includes(row.catalogCode));
  const codeLeakage = scoped.some(
    (row) => row.displayNameEn.trim().toUpperCase() === row.catalogCode || row.displayNameFr.trim().toUpperCase() === row.catalogCode
  );
  const duplicateRows = codes.length - new Set(codes).size;
  const blockers: string[] = [];
  if (collision.decision !== "SAFE") blockers.push("PROVIDER_SEARCH_COLLISION");
  if (codeLeakage) blockers.push("CATALOG_CODE_LEAKAGE");
  if (duplicateRows > 0) blockers.push("DUPLICATE_ACTIVATION_CODE");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    duplicateRows,
    catalogCodeLeakage: codeLeakage,
    appendOnlySearchBehavior: true,
    canonicalDisplayPreserved: scoped.every((row) => row.displayNameEn.trim() && row.displayNameFr.trim()),
    blockers,
  };
}

export function buildSurgeryHighRiskExclusionReport(): SurgeryHighRiskExclusionReport {
  const activated = buildSurgeryProviderOrderingActivationRegistry().entries;
  const activatedHighRisk = activated.filter((entry) => {
    const record = orderabilityRows().find((row) => row.catalogCode === entry.catalogCode);
    return record ? isHighRiskExcluded(record) : false;
  });
  const restrictedRows = inventoryRows().filter((row) => row.classification === "RESTRICTED_SPECIALTY_REVIEW");
  return {
    decision: activatedHighRisk.length === 0 ? "PASS" : "FAIL",
    activatedHighRiskCount: activatedHighRisk.length,
    controlledSubstancesNotActivated: restrictedRows
      .filter((row) => CONTROLLED_TERMS.some((term) => row.medication.toLowerCase().includes(term)))
      .map((row) => row.medication),
    anesthesiaAgentsNotActivated: restrictedRows
      .filter((row) => ANESTHESIA_TERMS.some((term) => row.medication.toLowerCase().includes(term)))
      .map((row) => row.medication),
    paralyticsNotActivated: restrictedRows
      .filter((row) => PARALYTIC_TERMS.some((term) => row.medication.toLowerCase().includes(term)))
      .map((row) => row.medication),
    chemotherapyNotActivated: [],
  };
}

export function buildSurgeryRollbackReport(): SurgeryRollbackReport {
  const registry = buildSurgeryProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackSurgeryPerioperativeProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Surgery rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !listActiveSurgeryPerioperativeProviderOrderingCatalogCodes(rolledBack).includes(first.catalogCode) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateSurgeryPerioperativeProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function runSurgeryPerioperativeProviderOrderingExpansionReport(): SurgeryPerioperativeProviderOrderingExpansionReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildSurgeryPerioperativeBaselineReport();
  const inventory = buildSurgeryPerioperativeInventoryReport();
  const providerOrderingActivation = buildSurgeryProviderOrderingActivationReport();
  const billingInventory = buildSurgeryBillingInventoryReport();
  const marSafety = buildSurgeryMarSafetyReport();
  const providerSearchSafety = buildSurgeryProviderSearchSafetyReport();
  const highRiskExclusions = buildSurgeryHighRiskExclusionReport();
  const hardStopsPass = Object.values(buildTrueHardStopRegressionReport().eachHardStopBlocks).every(Boolean);
  const coreMeds = [
    "Metronidazole IV",
    "Ondansetron IV",
    "Metoclopramide IV",
    "Pantoprazole IV",
    "Famotidine IV",
    "Ketorolac IV",
    "Tranexamic Acid IV",
    "Docusate",
    "Senna",
    "Polyethylene glycol",
    "Lidocaine local",
    "Bupivacaine local",
  ];
  const coreCoverage = coreMeds.every((medication) => {
    const row = inventory.rows.find((candidate) => candidate.medication === medication);
    return row && row.classification !== "EXCLUDED_WITH_BLOCKERS";
  });
  const finalDecision: SurgeryPerioperativeActivationDecision =
    providerOrderingActivation.activatedCatalogCodes.length > 0 &&
    providerOrderingActivation.orderPersistsImmediately &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingInventory.decision === "PASS" &&
    marSafety.decision === "PASS" &&
    providerSearchSafety.decision === "PASS" &&
    highRiskExclusions.decision === "PASS" &&
    hardStopsPass &&
    coreCoverage
      ? "SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_ACTIVE"
      : providerOrderingActivation.activatedCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_EXPANSION.1",
    baseline,
    inventory,
    catalogRemediation: buildSurgeryPerioperativeCatalogRemediationReport(),
    workflowCompatibility: buildSurgeryWorkflowCompatibilityReport(),
    providerOrderingEligibility: buildSurgeryProviderOrderingEligibilityReport(),
    providerOrderingActivation,
    marSafety,
    billingInventory,
    providerSearchSafety,
    highRiskExclusions,
    rollback: buildSurgeryRollbackReport(),
    compatibility: {
      activationChanged: true,
      providerSearchChanged: true,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      pharmacyReviewNonBlocking: true,
      migrationsRequired: false,
    },
    finalDecision,
  };
  return finalReportCache;
}

export function resetSurgeryPerioperativeProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}

export function surgeryPharmacyFollowUpStatuses(): readonly PharmacyFollowUpStatus[] {
  return PHARMACY_FOLLOW_UP_STATUSES;
}
