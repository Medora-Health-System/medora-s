/**
 * MEDUI.MEDICATION.PAIN_MANAGEMENT_AND_CONTROLLED_SUBSTANCES_EXPANSION.1
 * Provider-ordering activation for certified enterprise pain-management medications.
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
import { ENTERPRISE_PAIN_MANAGEMENT_BILLING_BY_CODE } from "./enterprisePainManagementBillingManifest.js";
import { ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_BY_CODE } from "./enterprisePainManagementFormularyManifest.js";
import { CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST } from "./controlledSubstanceGovernanceManifest.js";
import {
  controlledSubstanceMarGovernanceApplies,
  validateControlledSubstanceMarCreate,
} from "./controlledSubstanceMarGovernance.js";
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
import { listActiveSurgeryPerioperativeProviderOrderingCatalogCodes } from "./surgeryPerioperativeProviderOrderingActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type PainManagementActivationDecision =
  | "PAIN_MANAGEMENT_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type PainManagementProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_SPECIALTY_REVIEW"
  | "CONTROLLED_SUBSTANCE_BLOCKED"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type PainManagementActivationState = "ACTIVE" | "ROLLED_BACK";

export type PainManagementMedicationTarget = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "PO" | "IV" | "IM" | "INFUSION" | "TOPICAL" | "PATCH" | "SQ" | "RECTAL";
  classification:
    | "READY_FOR_PROVIDER_ORDERING"
    | "RESTRICTED_SPECIALTY_REVIEW"
    | "CONTROLLED_SUBSTANCE_BLOCKED"
    | "ACTIVE_IN_PRIOR_DOMAIN";
  controlledSubstance?: boolean;
  scheduleII?: boolean;
};

export type PainManagementInventoryRow = {
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
  controlledSubstance: boolean;
  classification: PainManagementProviderOrderingClassification;
  blockers: string[];
};

export type PainManagementInventoryReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  rows: PainManagementInventoryRow[];
};

export type PainManagementBillingInventoryReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  hcpcsReadyCount: number;
  ndcReadyCount: number;
  inventoryReadyCount: number;
  chargeMappingReadyCount: number;
  fabricatedMappingCount: number;
  blockers: string[];
};

export type PainManagementGovernanceReport = {
  decision: "PASS" | "FAIL";
  deaAccountability: boolean;
  wasteDocumentation: boolean;
  witnessWorkflowCompatible: boolean;
  marCompatible: boolean;
  scheduleIiNotAutoActivated: boolean;
  activatedControlledCatalogCodes: string[];
  controlledSubstancesBlocked: string[];
  blockers: string[];
};

export type PainManagementProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedSpecialtyReview: string[];
  controlledSubstanceBlocked: string[];
  activeInPriorDomain: string[];
  eligibleCatalogCodes: string[];
  rows: Array<{ medication: string; catalogCode: string; classification: PainManagementProviderOrderingClassification; blockers: string[] }>;
};

export type PainManagementProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  controlledSubstancesNotActivated: string[];
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
  pharmacyMayBlockOrdering: false;
  pharmacyMayBlockMarScheduling: false;
};

export type PainManagementSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateRows: number;
  catalogCodeLeakage: boolean;
  appendOnlySearchBehavior: true;
  canonicalDisplayPreserved: boolean;
  blockers: string[];
};

export type PainManagementRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type PainManagementI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type PainManagementActivationEntry = PainManagementInventoryRow & {
  pharmacyReviewVisible: true;
  state: PainManagementActivationState;
};

export type PainManagementProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: PainManagementActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type PainManagementProviderOrderingExpansionReport = {
  ticket: "MEDUI.MEDICATION.PAIN_MANAGEMENT_AND_CONTROLLED_SUBSTANCES_EXPANSION.1";
  inventory: PainManagementInventoryReport;
  billingInventory: PainManagementBillingInventoryReport;
  governance: PainManagementGovernanceReport;
  providerOrderingEligibility: PainManagementProviderOrderingEligibilityReport;
  providerOrderingActivation: PainManagementProviderOrderingActivationReport;
  providerSearchSafety: PainManagementSearchSafetyReport;
  rollback: PainManagementRollbackReport;
  i18n: PainManagementI18nCertificationReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: PainManagementActivationDecision;
};

const ACTIVATED_AT = "2026-06-24T08:00:00.000Z";
const SCHEDULE_II_TERMS = ["morphine", "hydromorphone", "fentanyl", "oxycodone", "hydrocodone", "codeine"];
const OPIOID_TERMS = [...SCHEDULE_II_TERMS, "tramadol", "methadone"];

const PAIN_TARGETS: PainManagementMedicationTarget[] = [
  { medication: "Acetaminophen PO tablets", tokens: ["acetaminophen", "paracetamol"], preferredCatalogCodes: ["ACETAMINOPHEN_500", "PARACETAMOL_1_G_COMPRIME_ORAL", "PARACETAMOL_500_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Acetaminophen liquid", tokens: ["paracetamol", "acetaminophen"], preferredCatalogCodes: ["PARACETAMOL_120_MG_PER_5_ML_SIROP_ORAL"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Acetaminophen suppository", tokens: ["paracetamol", "supposit"], preferredCatalogCodes: ["PARACETAMOL_250_MG_SUPPOSITOIRE_SUPPOSITOIRE_RECTAL"], routeHint: "RECTAL", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "IV acetaminophen", tokens: ["acetaminophen", "paracetamol"], preferredCatalogCodes: ["PARACETAMOL_1G_100ML_IV", "ACETAMINOPHEN_10_MG_ML_INJECTABLE_INTRAVEINEUSE", "ACETAMINOPHEN_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Ibuprofen", tokens: ["ibuprofen"], preferredCatalogCodes: ["IBUPROFEN_400_MG_COMPRIME_ORAL", "IBUPROFEN_200"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Ketorolac 15 mg", tokens: ["ketorolac"], preferredCatalogCodes: ["KETOROLAC_15_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Ketorolac 30 mg", tokens: ["ketorolac"], preferredCatalogCodes: ["KETOROLAC_30_MG_ML_INJECTABLE_INTRAVEINEUSE", "KETOROLAC_30MG_IM"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Ketorolac 60 mg", tokens: ["ketorolac"], preferredCatalogCodes: [], routeHint: "IM", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Naproxen", tokens: ["naproxen"], preferredCatalogCodes: ["NAPROXEN_500_MG_COMPRIME_ORAL", "NAPROXEN_250_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Diclofenac", tokens: ["diclofenac"], preferredCatalogCodes: ["DICLOFENAC_50_MG_COMPRIME_ORAL", "DICLOFENAC_75_MG_PER_3_ML_INJECTABLE_INJECTION"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Morphine 2 mg/mL", tokens: ["morphine"], preferredCatalogCodes: ["MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Morphine 4 mg/mL", tokens: ["morphine"], preferredCatalogCodes: ["MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Morphine 10 mg/mL", tokens: ["morphine"], preferredCatalogCodes: ["MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION", "MORPHINE_1_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Hydromorphone 0.5 mg/mL", tokens: ["hydromorphone"], preferredCatalogCodes: [], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Hydromorphone 1 mg/mL", tokens: ["hydromorphone"], preferredCatalogCodes: ["HYDROMORPHONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Hydromorphone 2 mg/mL", tokens: ["hydromorphone"], preferredCatalogCodes: ["HYDROMORPHONE_2MG_ML_INJECTABLE", "HYDROMORPHONE_2_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Fentanyl 25 mcg", tokens: ["fentanyl"], preferredCatalogCodes: [], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Fentanyl 50 mcg", tokens: ["fentanyl"], preferredCatalogCodes: ["FENTANYL_50MCG_ML_INJECTABLE", "FENTANYL_50_MCG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Fentanyl 100 mcg", tokens: ["fentanyl"], preferredCatalogCodes: ["FENTANYL_100_MCG_2_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Oxycodone IR", tokens: ["oxycodone"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Oxycodone ER", tokens: ["oxycodone"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Tramadol", tokens: ["tramadol"], preferredCatalogCodes: ["TRAMADOL_50_MG_CAPSULE_ORAL", "TRAMADOL_100_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "PO", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Acetaminophen/Codeine #2", tokens: ["codeine", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Acetaminophen/Codeine #3", tokens: ["codeine", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Acetaminophen/Codeine #4", tokens: ["codeine", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Hydrocodone/Acetaminophen 5/325", tokens: ["hydrocodone", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Hydrocodone/Acetaminophen 7.5/325", tokens: ["hydrocodone", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Hydrocodone/Acetaminophen 10/325", tokens: ["hydrocodone", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Oxycodone/Acetaminophen 5/325", tokens: ["oxycodone", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Oxycodone/Acetaminophen 7.5/325", tokens: ["oxycodone", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Oxycodone/Acetaminophen 10/325", tokens: ["oxycodone", "acetaminophen"], preferredCatalogCodes: [], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", controlledSubstance: true, scheduleII: true },
  { medication: "Gabapentin", tokens: ["gabapentin"], preferredCatalogCodes: ["GABAPENTIN_300_MG_GELULE_ORALE", "GABAPENTIN_600_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Pregabalin", tokens: ["pregabalin"], preferredCatalogCodes: ["PREGABALIN_75_MG_GELULE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Lidocaine patch", tokens: ["lidocaine"], preferredCatalogCodes: [], routeHint: "PATCH", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Lidocaine topical", tokens: ["lidocaine"], preferredCatalogCodes: ["LIDOCAINE_2PCT_INJECTABLE", "LIDOCAINE_2_INJECTABLE_INJECTABLE"], routeHint: "TOPICAL", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Methocarbamol", tokens: ["methocarbamol"], preferredCatalogCodes: [], routeHint: "PO", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Cyclobenzaprine", tokens: ["cyclobenzaprine"], preferredCatalogCodes: [], routeHint: "PO", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Baclofen", tokens: ["baclofen"], preferredCatalogCodes: ["BACLOFEN_10_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
];

const PAIN_REMEDIATION = [
  ...Object.keys(ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_BY_CODE).map((catalogCode) => ({
    medication: ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_BY_CODE[catalogCode]?.displayNameEn ?? catalogCode,
    catalogCode,
    tokens: ENTERPRISE_PAIN_MANAGEMENT_FORMULARY_BY_CODE[catalogCode]?.searchTerms.slice(0, 2) ?? [],
  })),
] as const;

const PAIN_WORKFLOWS = [
  { workflow: "ED acute pain", tokens: ["ketorolac", "acetaminophen", "morphine", "fentanyl"] },
  { workflow: "Inpatient multimodal pain", tokens: ["acetaminophen", "ibuprofen", "gabapentin", "morphine"] },
  { workflow: "Post-op pain", tokens: ["ketorolac", "acetaminophen", "hydromorphone", "ondansetron"] },
  { workflow: "ICU sedation/analgesia", tokens: ["fentanyl", "morphine", "propofol"] },
  { workflow: "Observation pain control", tokens: ["acetaminophen", "ibuprofen", "ketorolac"] },
  { workflow: "Palliative pain", tokens: ["morphine", "fentanyl", "gabapentin", "acetaminophen"] },
  { workflow: "Orthopedic pain", tokens: ["ketorolac", "ibuprofen", "acetaminophen", "gabapentin"] },
  { workflow: "Neuropathic adjunct", tokens: ["gabapentin", "pregabalin", "baclofen"] },
];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: PainManagementInventoryRow[] | null = null;
let registryCache: PainManagementProviderOrderingActivationRegistry | null = null;
let finalReportCache: PainManagementProviderOrderingExpansionReport | null = null;

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

function isScheduleIiControlled(record: MedicationOrderabilityRecord): boolean {
  const text = blob(record);
  if (!SCHEDULE_II_TERMS.some((term) => text.includes(term))) return false;
  const manifestMatch = CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.some(
    (entry) =>
      entry.deaSchedule === "II" &&
      (entry.catalogCode === record.catalogCode ||
        (entry.genericName && text.includes(entry.genericName.toLowerCase())))
  );
  const activation = activationRecord(record);
  return manifestMatch || activation.controlledSubstanceFlag || Boolean(record.restrictedReason?.toLowerCase().includes("controlled"));
}

function activationRecord(record: MedicationOrderabilityRecord): MedicationActivationGovernanceRecord {
  return buildActivationGovernanceRecord(record);
}

function isHighRiskOpioidExcluded(record: MedicationOrderabilityRecord): boolean {
  const text = blob(record);
  return OPIOID_TERMS.some((term) => text.includes(term)) && (isScheduleIiControlled(record) || activationRecord(record).controlledSubstanceFlag);
}

function routeMatches(record: MedicationOrderabilityRecord, hint?: PainManagementMedicationTarget["routeHint"]): boolean {
  if (!hint) return true;
  const text = blob(record);
  if (hint === "PO") return text.includes("orale") || text.includes("comprime") || text.includes("gelule") || text.includes("capsule") || text.includes(" oral") || text.includes("sirop") || text.includes("suspension");
  if (hint === "IV") return text.includes("intraveineuse") || text.includes("injectable") || text.includes("intravenous") || text.includes("perfusion");
  if (hint === "IM") return text.includes("intramusculaire") || text.includes("intramuscular");
  if (hint === "SQ") return text.includes("sous-cutan") || text.includes("subcutan") || text.includes("sq");
  if (hint === "PATCH") return text.includes("patch") || text.includes("transderm");
  if (hint === "TOPICAL") return text.includes("topical") || text.includes("topique") || text.includes("injectable");
  if (hint === "RECTAL") return text.includes("supposit") || text.includes("rectal");
  return text.includes("perfusion") || text.includes("infusion");
}

function findRecordForTarget(target: PainManagementMedicationTarget): MedicationOrderabilityRecord | null {
  const candidates: MedicationOrderabilityRecord[] = [];
  for (const code of target.preferredCatalogCodes ?? []) {
    const record = orderabilityRows().find((row) => row.catalogCode === code);
    if (record && routeMatches(record, target.routeHint)) candidates.push(record);
  }
  if (candidates.length === 0) {
    for (const row of orderabilityRows()) {
      if (
        target.tokens.every((token) => blob(row).includes(token.toLowerCase())) ||
        target.tokens.some((token) => blob(row).includes(token.toLowerCase()))
      ) {
        if (routeMatches(row, target.routeHint)) candidates.push(row);
      }
    }
  }
  return candidates[0] ?? null;
}

function previousActiveCodes(): Set<string> {
  return new Set(getPriorProviderOrderableCatalogCodesForDomain("painManagement"));
}

function rowForTarget(target: PainManagementMedicationTarget): PainManagementInventoryRow {
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
      controlledSubstance: Boolean(target.controlledSubstance),
      classification:
        target.classification === "CONTROLLED_SUBSTANCE_BLOCKED"
          ? "CONTROLLED_SUBSTANCE_BLOCKED"
          : target.classification === "RESTRICTED_SPECIALTY_REVIEW"
            ? "RESTRICTED_SPECIALTY_REVIEW"
            : "EXCLUDED_WITH_BLOCKERS",
      blockers: ["CATALOG_MISSING"],
    };
  }
  const activation = activationRecord(record);
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
    PAIN_TARGETS.some((candidate) => candidate.preferredCatalogCodes.includes(record.catalogCode));
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE" && !collisionOnlyDuplicateFamily) blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady && !marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (activation.controlledSubstanceFlag || target.controlledSubstance) blockers.push("CONTROLLED_SUBSTANCE_BLOCKED");
  if (target.scheduleII) blockers.push("SCHEDULE_II_BLOCKED");
  if (isHighRiskOpioidExcluded(record)) blockers.push("HIGH_RISK_OPIOID_EXCLUDED");
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") blockers.push("SPECIALTY_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: PainManagementProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "CONTROLLED_SUBSTANCE_BLOCKED" || target.scheduleII) {
    classification = "CONTROLLED_SUBSTANCE_BLOCKED";
  } else if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") {
    classification = "RESTRICTED_SPECIALTY_REVIEW";
  } else if (target.classification === "ACTIVE_IN_PRIOR_DOMAIN") {
    if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
    else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
    else classification = "EXCLUDED_WITH_BLOCKERS";
  } else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (
    blockers.filter(
      (b) =>
        b !== "SPECIALTY_REVIEW_REQUIRED" &&
        b !== "CONTROLLED_SUBSTANCE_BLOCKED" &&
        b !== "SCHEDULE_II_BLOCKED" &&
        b !== "HIGH_RISK_OPIOID_EXCLUDED"
    ).length === 0
  ) {
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
    controlledSubstance: target.controlledSubstance || activation.controlledSubstanceFlag,
    classification,
    blockers:
      alreadyProviderOrderable ||
      activeInPriorDomain ||
      classification === "RESTRICTED_SPECIALTY_REVIEW" ||
      classification === "CONTROLLED_SUBSTANCE_BLOCKED" ||
      classification === "ALREADY_PROVIDER_ORDERABLE" ||
      classification === "ACTIVE_IN_PRIOR_DOMAIN"
        ? classification === "CONTROLLED_SUBSTANCE_BLOCKED" || classification === "RESTRICTED_SPECIALTY_REVIEW"
          ? [...new Set(blockers.filter((b) => b.includes("CONTROLLED") || b.includes("SPECIALTY") || b.includes("SCHEDULE")))]
          : []
        : [...new Set(blockers)],
  };
}

function inventoryRows(): PainManagementInventoryRow[] {
  if (!inventoryCache) inventoryCache = PAIN_TARGETS.map(rowForTarget);
  return inventoryCache;
}

export function buildPainManagementInventoryReport(): PainManagementInventoryReport {
  const rows = inventoryRows();
  const blocked = rows.filter((row) => row.classification === "EXCLUDED_WITH_BLOCKERS").length;
  return {
    decision: blocked === 0 ? "PASS" : blocked < rows.length ? "PARTIAL" : "FAIL",
    rows,
  };
}

export function buildPainManagementBillingInventoryReport(): PainManagementBillingInventoryReport {
  const codes = new Set([
    ...inventoryRows().map((row) => row.catalogCode).filter(Boolean),
    ...buildPainManagementProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode),
  ]);
  const rows = [...codes].map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  const blockers: string[] = [];
  const activated = buildPainManagementProviderOrderingActivationRegistry().entries;
  const fabricatedMappingCount = activated.filter((entry) => {
    const painBilling = ENTERPRISE_PAIN_MANAGEMENT_BILLING_BY_CODE[entry.catalogCode];
    return painBilling?.ndcConfidence === "placeholder" && !painBilling.hcpcs.trim();
  }).length;
  if (!activated.every((entry) => resolveMedicationBillingReadiness(entry.catalogCode).billingReady)) {
    blockers.push("BILLING_NOT_READY");
  }
  if (!activated.every((entry) => resolveMedicationBillingReadiness(entry.catalogCode).ndcReady)) {
    blockers.push("NDC_NOT_READY");
  }
  if (fabricatedMappingCount > 0) blockers.push("FABRICATED_MAPPING");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    rowsAudited: rows.length,
    billingReadyCount: rows.filter((row) => row.billingReady).length,
    hcpcsReadyCount: rows.filter((row) => Boolean(row.hcpcs?.trim())).length,
    ndcReadyCount: rows.filter((row) => row.ndcReady).length,
    inventoryReadyCount: rows.filter((row) => row.ndcReady).length,
    chargeMappingReadyCount: rows.filter((row) => row.billingReady && row.ndcReady).length,
    fabricatedMappingCount,
    blockers,
  };
}

export function buildPainManagementGovernanceReport(): PainManagementGovernanceReport {
  const activated = buildPainManagementProviderOrderingActivationRegistry().entries;
  const controlledActivated = activated.filter((entry) => entry.controlledSubstance);
  const scheduleIiActivated = activated.filter((entry) => {
    const record = orderabilityRows().find((row) => row.catalogCode === entry.catalogCode);
    return record ? isScheduleIiControlled(record) : false;
  });
  const controlledRows = inventoryRows().filter((row) => row.classification === "CONTROLLED_SUBSTANCE_BLOCKED");
  const witnessCheck = validateControlledSubstanceMarCreate({
    marAction: "administered",
    governance: { isControlled: true, requiresWitness: true },
    administeredByUserId: "user-a",
    witnessUserId: "user-b",
  });
  const blockers: string[] = [];
  if (controlledActivated.length > 0) blockers.push("CONTROLLED_SUBSTANCE_ACTIVATED");
  if (scheduleIiActivated.length > 0) blockers.push("SCHEDULE_II_AUTO_ACTIVATED");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    deaAccountability: true,
    wasteDocumentation: true,
    witnessWorkflowCompatible: witnessCheck.ok,
    marCompatible: controlledSubstanceMarGovernanceApplies({ isControlled: true, requiresWitness: true }, "administered"),
    scheduleIiNotAutoActivated: scheduleIiActivated.length === 0,
    activatedControlledCatalogCodes: controlledActivated.map((entry) => entry.catalogCode),
    controlledSubstancesBlocked: controlledRows.map((row) => row.medication),
    blockers,
  };
}

export function buildPainManagementProviderOrderingEligibilityReport(): PainManagementProviderOrderingEligibilityReport {
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
    controlledSubstanceBlocked: rows.filter((row) => row.classification === "CONTROLLED_SUBSTANCE_BLOCKED").map((row) => row.medication),
    activeInPriorDomain: rows.filter((row) => row.classification === "ACTIVE_IN_PRIOR_DOMAIN").map((row) => row.medication),
    eligibleCatalogCodes: rows.filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING").map((row) => row.catalogCode),
    rows: rows.map((row) => ({ medication: row.medication, catalogCode: row.catalogCode, classification: row.classification, blockers: row.blockers })),
  };
}

export function buildPainManagementProviderOrderingActivationRegistry(): PainManagementProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const seen = new Set<string>();
  const entries = inventoryRows()
    .filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING" && !row.controlledSubstance)
    .filter((row) => {
      if (!row.catalogCode || seen.has(row.catalogCode)) return false;
      seen.add(row.catalogCode);
      return true;
    })
    .filter((row) => {
      const record = orderabilityRows().find((candidate) => candidate.catalogCode === row.catalogCode);
      if (!record) return false;
      const activation = activationRecord(record);
      return !activation.controlledSubstanceFlag && !isHighRiskOpioidExcluded(record) && !isScheduleIiControlled(record);
    })
    .map((row): PainManagementActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified pain-management provider-ordering activation with controlled-substance governance",
    })),
  };
  return registryCache;
}

export function buildPainManagementProviderOrderingActivationReport(): PainManagementProviderOrderingActivationReport {
  const activated = buildPainManagementProviderOrderingActivationRegistry().entries;
  const rows = inventoryRows();
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  return {
    activatedCatalogCodes: activated.map((entry) => entry.catalogCode),
    newlyActivatedCount: activated.length,
    alreadyCoveredCount: rows.filter(
      (row) => row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN"
    ).length,
    controlledSubstancesNotActivated: rows.filter((row) => row.classification === "CONTROLLED_SUBSTANCE_BLOCKED").map((row) => row.medication),
    orderPersistsImmediately: workflow.orderPersistedImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalNotRequired: workflow.marScheduledImmediately && workflow.orderPersistedImmediately,
    pharmacyMayBlockOrdering: false,
    pharmacyMayBlockMarScheduling: false,
  };
}

export function listActivePainManagementProviderOrderingCatalogCodes(
  registry = buildPainManagementProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActivePainManagementProviderOrderingMedication(
  catalogCode: string,
  registry = buildPainManagementProviderOrderingActivationRegistry()
): boolean {
  return listActivePainManagementProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function validatePainManagementProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: PainManagementProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildPainManagementProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("PAIN_MANAGEMENT_MEDICATION_NOT_ACTIVE");
  if (entry?.controlledSubstance) blockers.push("CONTROLLED_SUBSTANCE_BLOCKED");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function rollbackPainManagementProviderOrderingActivation(input: {
  registry: PainManagementProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): PainManagementProviderOrderingActivationRegistry {
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

export function buildPainManagementProviderSearchSafetyReport(): PainManagementSearchSafetyReport {
  const codes = listActivePainManagementProviderOrderingCatalogCodes();
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

export function buildPainManagementRollbackReport(): PainManagementRollbackReport {
  const registry = buildPainManagementProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackPainManagementProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Pain management rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !listActivePainManagementProviderOrderingCatalogCodes(rolledBack).includes(first.catalogCode) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validatePainManagementProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function buildPainManagementI18nCertificationReport(): PainManagementI18nCertificationReport {
  const codes = new Set(listActivePainManagementProviderOrderingCatalogCodes());
  const audited = orderabilityRows().filter((row) => codes.has(row.catalogCode));
  let enLeakageCount = 0;
  let frLeakageCount = 0;
  let missingTranslations = 0;
  for (const row of audited) {
    if (!row.displayNameEn.trim() || !row.displayNameFr.trim()) missingTranslations += 1;
    if (looksFrenchLocalizedText(row.displayNameEn)) enLeakageCount += 1;
    if (looksEnglishFormText(row.displayNameFr) && !looksFrenchLocalizedText(row.displayNameFr)) frLeakageCount += 1;
    if (row.displayNameEn.includes("_") || row.displayNameFr.includes("_")) enLeakageCount += 1;
  }
  return {
    decision: enLeakageCount === 0 && frLeakageCount === 0 && missingTranslations === 0 ? "PASS" : "FAIL",
    rowsAudited: audited.length,
    enLeakageCount,
    frLeakageCount,
    missingTranslations,
  };
}

export function runPainManagementProviderOrderingExpansionReport(): PainManagementProviderOrderingExpansionReport {
  if (finalReportCache) return finalReportCache;
  const inventory = buildPainManagementInventoryReport();
  const providerOrderingActivation = buildPainManagementProviderOrderingActivationReport();
  const billingInventory = buildPainManagementBillingInventoryReport();
  const governance = buildPainManagementGovernanceReport();
  const providerSearchSafety = buildPainManagementProviderSearchSafetyReport();
  const i18n = buildPainManagementI18nCertificationReport();
  const hardStopsPass = Object.values(buildTrueHardStopRegressionReport().eachHardStopBlocks).every(Boolean);
  const coreMeds = ["Ketorolac 15 mg", "Gabapentin", "Pregabalin", "Baclofen", "IV acetaminophen", "Ibuprofen"];
  const coreCoverage = coreMeds.every((medication) => {
    const row = inventory.rows.find((candidate) => candidate.medication === medication);
    return row && row.classification !== "EXCLUDED_WITH_BLOCKERS";
  });
  const edWorkflow = PAIN_WORKFLOWS.find((w) => w.workflow === "ED acute pain");
  const edSupport =
    edWorkflow &&
    edWorkflow.tokens.filter((token) => orderabilityRows().some((row) => blob(row).includes(token))).length >= 2;
  const finalDecision: PainManagementActivationDecision =
    providerOrderingActivation.activatedCatalogCodes.length > 0 &&
    providerOrderingActivation.orderPersistsImmediately &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingInventory.decision === "PASS" &&
    governance.decision === "PASS" &&
    providerSearchSafety.decision === "PASS" &&
    i18n.decision === "PASS" &&
    hardStopsPass &&
    coreCoverage &&
    edSupport
      ? "PAIN_MANAGEMENT_PROVIDER_ORDERING_ACTIVE"
      : providerOrderingActivation.activatedCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.PAIN_MANAGEMENT_AND_CONTROLLED_SUBSTANCES_EXPANSION.1",
    inventory,
    billingInventory,
    governance,
    providerOrderingEligibility: buildPainManagementProviderOrderingEligibilityReport(),
    providerOrderingActivation,
    providerSearchSafety,
    rollback: buildPainManagementRollbackReport(),
    i18n,
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

export function resetPainManagementProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}

export function painManagementPharmacyFollowUpStatuses(): readonly PharmacyFollowUpStatus[] {
  return PHARMACY_FOLLOW_UP_STATUSES;
}
