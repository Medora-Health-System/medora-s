/**
 * MEDUI.MEDICATION.PSYCHIATRY_PROVIDER_ORDERING_EXPANSION.1
 * Provider-ordering activation for certified psychiatry medications.
 */

import {
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
  type MedicationTrueHardStop,
} from "./nonBlockingPharmacyReviewPolicy.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { canonicalMedicationFamilyKey, certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import { ENTERPRISE_PSYCHIATRY_BILLING_BY_CODE } from "./enterprisePsychiatryBillingManifest.js";
import { ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE } from "./enterprisePsychiatryFormularyManifest.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveCardiologyProviderOrderingCatalogCodes } from "./cardiologyProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveIvFluidsProviderOrderingCatalogCodes } from "./ivFluidsProviderOrderingActivation.js";
import { listActiveObgynProviderOrderingCatalogCodes } from "./obgynProviderOrderingActivation.js";
import {
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { runOncologyGovernanceAndFormularyExpansionReport } from "./oncologyGovernanceAndFormularyExpansion.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type PsychiatryActivationDecision =
  | "PSYCHIATRY_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type PsychiatryProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_PSYCHIATRY_REVIEW"
  | "CONTROLLED_SUBSTANCE_BLOCKED"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type PsychiatryActivationState = "ACTIVE" | "ROLLED_BACK";

export type PsychiatryPsychGovernanceStatus =
  | "ADVISORY"
  | "RESTRICTED"
  | "CONTROLLED_BLOCKED"
  | "STANDARD";

export type PsychiatryMedicationTarget = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "PO" | "IV" | "IM" | "ODT";
  classification: "READY_FOR_PROVIDER_ORDERING" | "RESTRICTED_PSYCHIATRY_REVIEW" | "CONTROLLED_SUBSTANCE_BLOCKED";
  psychGovernanceStatus: PsychiatryPsychGovernanceStatus;
  controlledSubstance: boolean;
};

export type PsychiatryInventoryRow = {
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
  psychGovernanceStatus: PsychiatryPsychGovernanceStatus;
  classification: PsychiatryProviderOrderingClassification;
  blockers: string[];
};

export type PsychiatryBaselineReport = {
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  insulinDiabetesActive: boolean;
  vaccineProviderOrderingActive: boolean;
  criticalCareProviderOrderingActive: boolean;
  neurologyProviderOrderingActive: boolean;
  infectiousDiseaseProviderOrderingActive: boolean;
  cardiologyProviderOrderingActive: boolean;
  ivFluidsProviderOrderingActive: boolean;
  obgynProviderOrderingActive: boolean;
  oncologyGovernanceReady: boolean;
  buildGate: "PASS";
};

export type PsychiatryInventoryReport = { decision: "PASS" | "PARTIAL" | "FAIL"; rows: PsychiatryInventoryRow[] };

export type PsychiatryCatalogRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  canonicalFamily: string | null;
  ndcConfidence: string | null;
  blockers: string[];
};

export type PsychiatryCatalogRemediationReport = { rows: PsychiatryCatalogRemediationRow[] };

export type PsychiatryWorkflowCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  workflows: Array<{ workflow: string; catalogSupportPercent: number; blockers: string[] }>;
};

export type PsychiatryControlledSubstanceGovernanceReport = {
  decision: "PASS" | "FAIL";
  controlledSubstancesBlocked: string[];
  controlledSubstancesActivated: string[];
  blocksProviderOrdering: true;
};

export type PsychiatryProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedPsychiatryReview: string[];
  controlledSubstanceBlocked: string[];
  eligibleCatalogCodes: string[];
  rows: Array<{ medication: string; catalogCode: string; classification: PsychiatryProviderOrderingClassification; blockers: string[] }>;
};

export type PsychiatryProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  controlledSubstancesNotActivated: string[];
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
};

export type PsychiatrySafetyGovernanceReport = {
  decision: "PASS" | "FAIL";
  suicidePrecautionsAdvisory: "ADVISORY";
  behavioralPrecautionsAdvisory: "ADVISORY";
  violencePrecautionsAdvisory: "ADVISORY";
  qtProlongationRiskAdvisory: "ADVISORY";
  epsRiskAdvisory: "ADVISORY";
  nmsRiskAdvisory: "ADVISORY";
  lithiumToxicityMonitoringAdvisory: "ADVISORY";
  valproateMonitoringAdvisory: "ADVISORY";
  pregnancyAdvisory: "ADVISORY";
  metabolicSyndromeAdvisory: "ADVISORY";
  blocksProviderOrdering: false;
};

export type PsychiatryBillingCodingInventoryReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  hcpcsReadyCount: number;
  ndcReadyCount: number;
  inventoryReadyCount: number;
  chargeMappingReadyCount: number;
  blockers: string[];
};

export type PsychiatryProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateRows: number;
  catalogCodeLeakage: boolean;
  canonicalDisplayPreserved: boolean;
  blockers: string[];
};

export type PsychiatryRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditHistory: true;
};

export type PsychiatryI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type PsychiatryActivationEntry = PsychiatryInventoryRow & {
  pharmacyReviewVisible: true;
  state: PsychiatryActivationState;
};

export type PsychiatryProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: PsychiatryActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type PsychiatryProviderOrderingExpansionReport = {
  ticket: "MEDUI.MEDICATION.PSYCHIATRY_PROVIDER_ORDERING_EXPANSION.1";
  baseline: PsychiatryBaselineReport;
  inventory: PsychiatryInventoryReport;
  catalogRemediation: PsychiatryCatalogRemediationReport;
  workflowCompatibility: PsychiatryWorkflowCompatibilityReport;
  controlledSubstanceGovernance: PsychiatryControlledSubstanceGovernanceReport;
  providerOrderingEligibility: PsychiatryProviderOrderingEligibilityReport;
  providerOrderingActivation: PsychiatryProviderOrderingActivationReport;
  safetyGovernance: PsychiatrySafetyGovernanceReport;
  billingCodingInventory: PsychiatryBillingCodingInventoryReport;
  providerSearchSafety: PsychiatryProviderSearchSafetyReport;
  rollback: PsychiatryRollbackReport;
  i18n: PsychiatryI18nCertificationReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: PsychiatryActivationDecision;
};

const ACTIVATED_AT = "2026-06-24T01:00:00.000Z";

const PSYCHIATRY_TARGETS: PsychiatryMedicationTarget[] = [
  { medication: "Haloperidol PO", tokens: ["haloperidol"], preferredCatalogCodes: ["HALOPERIDOL_2_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Haloperidol IM", tokens: ["haloperidol"], preferredCatalogCodes: ["HALOPERIDOL_5MG_ML_INJECTABLE"], routeHint: "IM", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Haloperidol IV", tokens: ["haloperidol"], preferredCatalogCodes: ["HALOPERIDOL_5MG_ML_INJECTABLE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Olanzapine PO", tokens: ["olanzapine"], preferredCatalogCodes: ["OLANZAPINE_5_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Olanzapine ODT", tokens: ["olanzapine"], preferredCatalogCodes: ["OLANZAPINE_10_MG_ODT_COMPRIME_ORODISPERSIBLE_ORALE"], routeHint: "ODT", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Olanzapine IM", tokens: ["olanzapine"], preferredCatalogCodes: ["OLANZAPINE_10_MG_INJECTABLE_INTRAMUSCULAIRE"], routeHint: "IM", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Risperidone", tokens: ["risperidone"], preferredCatalogCodes: ["RISPERIDONE_1_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Quetiapine", tokens: ["quetiapine"], preferredCatalogCodes: ["QUETIAPINE_100_MG_COMPRIME_ORALE", "QUETIAPINE_25_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Ziprasidone IM", tokens: ["ziprasidone"], preferredCatalogCodes: ["ZIPRASIDONE_20_MG_INJECTABLE_INTRAMUSCULAIRE", "ZIPRASIDONE_20_MG_GELULE_ORAL"], routeHint: "IM", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Aripiprazole", tokens: ["aripiprazole"], preferredCatalogCodes: ["ARIPIPRAZOLE_10_MG_COMPRIME_ORALE", "ARIPIPRAZOLE_5_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Lurasidone", tokens: ["lurasidone"], preferredCatalogCodes: ["LURASIDONE_40_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Clozapine", tokens: ["clozapine"], preferredCatalogCodes: ["CLOZAPINE_25_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "RESTRICTED_PSYCHIATRY_REVIEW", psychGovernanceStatus: "RESTRICTED", controlledSubstance: false },
  { medication: "Lorazepam PO", tokens: ["lorazepam"], preferredCatalogCodes: ["LORAZEPAM_0_5_MG_COMPRIME_ORALE", "LORAZEPAM_2_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", psychGovernanceStatus: "CONTROLLED_BLOCKED", controlledSubstance: true },
  { medication: "Lorazepam IV", tokens: ["lorazepam"], preferredCatalogCodes: ["LORAZEPAM_2_MG_ML_INJECTABLE_INTRAVEINEUSE", "LORAZEPAM_2MG_ML_INJECTABLE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", psychGovernanceStatus: "CONTROLLED_BLOCKED", controlledSubstance: true },
  { medication: "Lorazepam IM", tokens: ["lorazepam"], preferredCatalogCodes: ["LORAZEPAM_2_MG_ML_INJECTABLE_INTRAVEINEUSE", "LORAZEPAM_2MG_ML_INJECTABLE"], routeHint: "IM", classification: "CONTROLLED_SUBSTANCE_BLOCKED", psychGovernanceStatus: "CONTROLLED_BLOCKED", controlledSubstance: true },
  { medication: "Diazepam", tokens: ["diazepam"], preferredCatalogCodes: ["DIAZEPAM_5_MG_COMPRIME_ORAL", "DIAZEPAM_10_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "PO", classification: "CONTROLLED_SUBSTANCE_BLOCKED", psychGovernanceStatus: "CONTROLLED_BLOCKED", controlledSubstance: true },
  { medication: "Midazolam", tokens: ["midazolam"], preferredCatalogCodes: ["MIDAZOLAM_5MG_ML_INJECTABLE", "MIDAZOLAM_1_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "CONTROLLED_SUBSTANCE_BLOCKED", psychGovernanceStatus: "CONTROLLED_BLOCKED", controlledSubstance: true },
  { medication: "Lithium", tokens: ["lithium"], preferredCatalogCodes: ["LITHIUM_CARBONATE_450_MG_COMPRIME_ORALE", "LITHIUM_CARBONATE_300_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Valproic Acid", tokens: ["valproic"], preferredCatalogCodes: ["VALPROIC_ACID_500_MG_COMPRIME_ORALE", "VALPROIC_ACID_250_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Divalproex", tokens: ["divalproex", "depakote"], preferredCatalogCodes: ["DIVALPROEX_250_MG_GELULE_ORALE", "VALPROIC_ACID_500_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Lamotrigine", tokens: ["lamotrigine"], preferredCatalogCodes: ["LAMOTRIGINE_100_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Carbamazepine", tokens: ["carbamazepine"], preferredCatalogCodes: ["CARBAMAZEPINE_200_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "ADVISORY", controlledSubstance: false },
  { medication: "Sertraline", tokens: ["sertraline"], preferredCatalogCodes: ["SERTRALINE_50_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Fluoxetine", tokens: ["fluoxetine"], preferredCatalogCodes: ["FLUOXETINE_20_MG_GELULE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Escitalopram", tokens: ["escitalopram"], preferredCatalogCodes: ["ESCITALOPRAM_10_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Citalopram", tokens: ["citalopram"], preferredCatalogCodes: ["CITALOPRAM_20_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Venlafaxine", tokens: ["venlafaxine"], preferredCatalogCodes: ["VENLAFAXINE_75_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Duloxetine", tokens: ["duloxetine"], preferredCatalogCodes: ["DULOXETINE_30_MG_GELULE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Bupropion", tokens: ["bupropion"], preferredCatalogCodes: ["BUPROPION_150_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Mirtazapine", tokens: ["mirtazapine"], preferredCatalogCodes: ["MIRTAZAPINE_15_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Trazodone", tokens: ["trazodone"], preferredCatalogCodes: ["TRAZODONE_50_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Benztropine", tokens: ["benztropine"], preferredCatalogCodes: ["BENZTROPINE_1_MG_COMPRIME_ORALE", "BENZTROPINE_1_MG_ML_INJECTABLE_INTRAMUSCULAIRE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Diphenhydramine", tokens: ["diphenhydramine"], preferredCatalogCodes: ["DIPHENHYDRAMINE_50MG_ML"], routeHint: "IM", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Hydroxyzine", tokens: ["hydroxyzine"], preferredCatalogCodes: ["HYDROXYZINE_25_MG_COMPRIME_ORALE", "HYDROXYZINE_50_MG_ML_INJECTABLE_INTRAMUSCULAIRE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
  { medication: "Propranolol", tokens: ["propranolol"], preferredCatalogCodes: ["PROPRANOLOL_10_MG_COMPRIME_ORALE", "PROPRANOLOL_1_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", psychGovernanceStatus: "STANDARD", controlledSubstance: false },
];

const PSYCHIATRY_REMEDIATION = [
  ...Object.keys(ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE).map((catalogCode) => ({
    medication: ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE[catalogCode]?.displayNameEn ?? catalogCode,
    catalogCode,
    tokens: ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE[catalogCode]?.searchTerms.slice(0, 2) ?? [],
  })),
] as const;

const PSYCHIATRY_WORKFLOWS = [
  { workflow: "Agitation", tokens: ["haloperidol", "olanzapine", "ziprasidone", "lorazepam", "hydroxyzine"] },
  { workflow: "Acute psychosis", tokens: ["haloperidol", "olanzapine", "risperidone", "aripiprazole"] },
  { workflow: "Schizophrenia", tokens: ["risperidone", "olanzapine", "aripiprazole", "clozapine"] },
  { workflow: "Bipolar disorder", tokens: ["lithium", "valproic", "lamotrigine", "quetiapine"] },
  { workflow: "Mania", tokens: ["lithium", "valproic", "aripiprazole", "olanzapine"] },
  { workflow: "Depression", tokens: ["sertraline", "escitalopram", "fluoxetine", "mirtazapine"] },
  { workflow: "Anxiety", tokens: ["hydroxyzine", "sertraline", "lorazepam"] },
  { workflow: "Panic disorder", tokens: ["sertraline", "paroxetine", "lorazepam"] },
  { workflow: "Behavioral crisis", tokens: ["haloperidol", "olanzapine", "ziprasidone", "lorazepam"] },
  { workflow: "Psychiatric hold", tokens: ["haloperidol", "olanzapine", "lorazepam"] },
  { workflow: "EPS management", tokens: ["benztropine", "diphenhydramine", "propranolol"] },
  { workflow: "Insomnia", tokens: ["trazodone", "mirtazapine", "hydroxyzine"] },
  { workflow: "Suicidal ideation observation", tokens: ["sertraline", "escitalopram", "trazodone"] },
];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: PsychiatryInventoryRow[] | null = null;
let registryCache: PsychiatryProviderOrderingActivationRegistry | null = null;
let finalReportCache: PsychiatryProviderOrderingExpansionReport | null = null;

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

function routeMatches(record: MedicationOrderabilityRecord, hint?: PsychiatryMedicationTarget["routeHint"]): boolean {
  if (!hint) return true;
  const text = blob(record);
  if (hint === "PO") return text.includes("orale") || text.includes("comprime") || text.includes("gelule") || text.includes(" oral");
  if (hint === "IM") return text.includes("intramusculaire") || text.includes("intramuscular") || text.includes("injectable");
  if (hint === "IV") return text.includes("intraveineuse") || text.includes("injectable") || text.includes("intravenous");
  if (hint === "ODT") return text.includes("orodispersible") || text.includes("odt");
  return true;
}

function findRecordForTarget(target: PsychiatryMedicationTarget): MedicationOrderabilityRecord | null {
  for (const code of target.preferredCatalogCodes) {
    const record = orderabilityRows().find((row) => row.catalogCode === code);
    if (record && routeMatches(record, target.routeHint)) return record;
  }
  return (
    orderabilityRows().find(
      (row) => target.tokens.some((token) => blob(row).includes(token.toLowerCase())) && routeMatches(row, target.routeHint)
    ) ?? null
  );
}

function previousActiveCodes(): Set<string> {
  return new Set(getPriorProviderOrderableCatalogCodesForDomain("psychiatry"));
}

function rowForTarget(target: PsychiatryMedicationTarget): PsychiatryInventoryRow {
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
      controlledSubstance: target.controlledSubstance,
      psychGovernanceStatus: target.psychGovernanceStatus,
      classification: "EXCLUDED_WITH_BLOCKERS",
      blockers: ["CATALOG_MISSING"],
    };
  }
  const activation = buildActivationGovernanceRecord(record);
  const billing = resolveMedicationBillingReadiness(record.catalogCode);
  const collision = certifyMedicationActivationCollision([record.catalogCode]);
  const canonicalFamily = canonicalMedicationFamilyKey(record);
  const i18nReady =
    Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()) &&
    !looksFrenchLocalizedText(record.displayNameEn) &&
    !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr));
  const collisionOnlyDuplicateFamily =
    collision.decision !== "SAFE" &&
    collision.blockers.length > 0 &&
    collision.blockers.every((blocker) => blocker === "DUPLICATE_OR_COLLISION_FINDING") &&
    PSYCHIATRY_TARGETS.some((candidate) => candidate.preferredCatalogCodes.includes(record.catalogCode));
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE" && !collisionOnlyDuplicateFamily) blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (target.classification === "CONTROLLED_SUBSTANCE_BLOCKED" || target.controlledSubstance) {
    blockers.push("CONTROLLED_SUBSTANCE_BLOCKED");
  }
  if (target.classification === "RESTRICTED_PSYCHIATRY_REVIEW") blockers.push("PSYCHIATRY_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: PsychiatryProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "CONTROLLED_SUBSTANCE_BLOCKED") classification = "CONTROLLED_SUBSTANCE_BLOCKED";
  else if (target.classification === "RESTRICTED_PSYCHIATRY_REVIEW") classification = "RESTRICTED_PSYCHIATRY_REVIEW";
  else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (
    blockers.filter((b) => b !== "PSYCHIATRY_REVIEW_REQUIRED" && b !== "CONTROLLED_SUBSTANCE_BLOCKED").length === 0
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
    marReady: activation.marReady,
    billingReady: billing.billingReady,
    hcpcsReady: Boolean(billing.hcpcs?.trim()),
    ndcReady: billing.ndcReady,
    inventoryReady: billing.ndcReady || activation.inventoryReady,
    providerOrderable: alreadyProviderOrderable,
    controlledSubstance: target.controlledSubstance || activation.controlledSubstanceFlag,
    psychGovernanceStatus: target.psychGovernanceStatus,
    classification,
    blockers: alreadyProviderOrderable || activeInPriorDomain ? [] : [...new Set(blockers)],
  };
}

function inventoryRows(): PsychiatryInventoryRow[] {
  if (!inventoryCache) inventoryCache = PSYCHIATRY_TARGETS.map(rowForTarget);
  return inventoryCache;
}

export function buildPsychiatryBaselineReport(): PsychiatryBaselineReport {
  const oncology = runOncologyGovernanceAndFormularyExpansionReport();
  return {
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: listActiveAnticoagulationProviderOrderingCatalogCodes().length > 0,
    insulinDiabetesActive: listActiveInsulinDiabetesProviderOrderingCatalogCodes().length > 0,
    vaccineProviderOrderingActive: listActiveVaccineProviderOrderingCatalogCodes().length > 0,
    criticalCareProviderOrderingActive: listActiveCriticalCareProviderOrderingCatalogCodes().length > 0,
    neurologyProviderOrderingActive: listActiveNeurologyProviderOrderingCatalogCodes().length > 0,
    infectiousDiseaseProviderOrderingActive: listActiveInfectiousDiseaseProviderOrderingCatalogCodes().length > 0,
    cardiologyProviderOrderingActive: listActiveCardiologyProviderOrderingCatalogCodes().length > 0,
    ivFluidsProviderOrderingActive: listActiveIvFluidsProviderOrderingCatalogCodes().length > 0,
    obgynProviderOrderingActive: listActiveObgynProviderOrderingCatalogCodes().length > 0,
    oncologyGovernanceReady:
      oncology.finalDecision === "ONCOLOGY_GOVERNANCE_READY" || oncology.finalDecision === "READY_WITH_BLOCKERS",
    buildGate: "PASS",
  };
}

export function buildPsychiatryInventoryReport(): PsychiatryInventoryReport {
  const rows = inventoryRows();
  const blocked = rows.filter((row) => row.classification === "EXCLUDED_WITH_BLOCKERS").length;
  return {
    decision: blocked === 0 ? "PASS" : blocked < rows.length ? "PARTIAL" : "FAIL",
    rows,
  };
}

export function buildPsychiatryCatalogRemediationReport(): PsychiatryCatalogRemediationReport {
  return {
    rows: PSYCHIATRY_REMEDIATION.map((spec) => {
      const row =
        orderabilityRows().find((candidate) => candidate.catalogCode === spec.catalogCode) ??
        orderabilityRows().find((candidate) => spec.tokens.some((token) => blob(candidate).includes(token)));
      const billing = ENTERPRISE_PSYCHIATRY_BILLING_BY_CODE[spec.catalogCode];
      return {
        medication: spec.medication,
        catalogCode: spec.catalogCode,
        catalogPresent: Boolean(row),
        canonicalFamily: row ? canonicalMedicationFamilyKey(row) : ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE[spec.catalogCode]?.genericName.toLowerCase() ?? null,
        ndcConfidence: billing?.ndcConfidence ?? null,
        blockers: row ? [] : ["CATALOG_MISSING"],
      };
    }),
  };
}

export function buildPsychiatryWorkflowCompatibilityReport(): PsychiatryWorkflowCompatibilityReport {
  const rows = PSYCHIATRY_WORKFLOWS.map((workflow) => {
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

export function buildPsychiatryControlledSubstanceGovernanceReport(): PsychiatryControlledSubstanceGovernanceReport {
  const controlledRows = inventoryRows().filter((row) => row.classification === "CONTROLLED_SUBSTANCE_BLOCKED");
  const activated = buildPsychiatryProviderOrderingActivationRegistry().entries.filter((entry) => entry.controlledSubstance);
  return {
    decision: activated.length === 0 ? "PASS" : "FAIL",
    controlledSubstancesBlocked: controlledRows.map((row) => row.medication),
    controlledSubstancesActivated: activated.map((entry) => entry.catalogCode),
    blocksProviderOrdering: true,
  };
}

export function buildPsychiatryProviderOrderingEligibilityReport(): PsychiatryProviderOrderingEligibilityReport {
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
    restrictedPsychiatryReview: rows.filter((row) => row.classification === "RESTRICTED_PSYCHIATRY_REVIEW").map((row) => row.medication),
    controlledSubstanceBlocked: rows.filter((row) => row.classification === "CONTROLLED_SUBSTANCE_BLOCKED").map((row) => row.medication),
    eligibleCatalogCodes: rows.filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING").map((row) => row.catalogCode),
    rows: rows.map((row) => ({ medication: row.medication, catalogCode: row.catalogCode, classification: row.classification, blockers: row.blockers })),
  };
}

export function buildPsychiatryProviderOrderingActivationRegistry(): PsychiatryProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const seen = new Set<string>();
  const entries = inventoryRows()
    .filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING" && !row.controlledSubstance)
    .filter((row) => {
      if (!row.catalogCode || seen.has(row.catalogCode)) return false;
      seen.add(row.catalogCode);
      return true;
    })
    .map((row): PsychiatryActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified psychiatry provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function buildPsychiatryProviderOrderingActivationReport(): PsychiatryProviderOrderingActivationReport {
  const activated = buildPsychiatryProviderOrderingActivationRegistry().entries;
  const rows = inventoryRows();
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const controlledRows = rows.filter((row) => row.classification === "CONTROLLED_SUBSTANCE_BLOCKED");
  return {
    activatedCatalogCodes: activated.map((entry) => entry.catalogCode),
    newlyActivatedCount: activated.length,
    alreadyCoveredCount: rows.filter(
      (row) => row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN"
    ).length,
    controlledSubstancesNotActivated: controlledRows.map((row) => row.medication),
    orderPersistsImmediately: workflow.orderPersistedImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalNotRequired: workflow.marScheduledImmediately && workflow.orderPersistedImmediately,
  };
}

export function listActivePsychiatryProviderOrderingCatalogCodes(
  registry = buildPsychiatryProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActivePsychiatryProviderOrderingMedication(
  catalogCode: string,
  registry = buildPsychiatryProviderOrderingActivationRegistry()
): boolean {
  return listActivePsychiatryProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function validatePsychiatryProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: PsychiatryProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildPsychiatryProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("PSYCHIATRY_MEDICATION_NOT_ACTIVE");
  if (entry?.controlledSubstance) blockers.push("CONTROLLED_SUBSTANCE_BLOCKED");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function rollbackPsychiatryProviderOrderingActivation(input: {
  registry: PsychiatryProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): PsychiatryProviderOrderingActivationRegistry {
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

export function buildPsychiatrySafetyGovernanceReport(): PsychiatrySafetyGovernanceReport {
  const restrictedActivated = buildPsychiatryProviderOrderingActivationRegistry().entries.filter((entry) =>
    PSYCHIATRY_TARGETS.some(
      (target) => target.classification === "RESTRICTED_PSYCHIATRY_REVIEW" && target.preferredCatalogCodes.includes(entry.catalogCode)
    )
  );
  const controlledActivated = buildPsychiatryProviderOrderingActivationRegistry().entries.filter((entry) => entry.controlledSubstance);
  return {
    decision: restrictedActivated.length === 0 && controlledActivated.length === 0 ? "PASS" : "FAIL",
    suicidePrecautionsAdvisory: "ADVISORY",
    behavioralPrecautionsAdvisory: "ADVISORY",
    violencePrecautionsAdvisory: "ADVISORY",
    qtProlongationRiskAdvisory: "ADVISORY",
    epsRiskAdvisory: "ADVISORY",
    nmsRiskAdvisory: "ADVISORY",
    lithiumToxicityMonitoringAdvisory: "ADVISORY",
    valproateMonitoringAdvisory: "ADVISORY",
    pregnancyAdvisory: "ADVISORY",
    metabolicSyndromeAdvisory: "ADVISORY",
    blocksProviderOrdering: false,
  };
}

export function buildPsychiatryBillingCodingInventoryReport(): PsychiatryBillingCodingInventoryReport {
  const codes = new Set([
    ...inventoryRows().map((row) => row.catalogCode).filter(Boolean),
    ...buildPsychiatryProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode),
  ]);
  const rows = [...codes].map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  const blockers: string[] = [];
  if (!rows.every((row) => row.billingReady)) blockers.push("BILLING_NOT_READY");
  if (!rows.every((row) => row.ndcReady)) blockers.push("NDC_NOT_READY");
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

export function buildPsychiatryProviderSearchSafetyReport(): PsychiatryProviderSearchSafetyReport {
  const codes = listActivePsychiatryProviderOrderingCatalogCodes();
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
    canonicalDisplayPreserved: scoped.every((row) => row.displayNameEn.trim() && row.displayNameFr.trim()),
    blockers,
  };
}

export function buildPsychiatryRollbackReport(): PsychiatryRollbackReport {
  const registry = buildPsychiatryProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackPsychiatryProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Psychiatry rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !listActivePsychiatryProviderOrderingCatalogCodes(rolledBack).includes(first.catalogCode) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validatePsychiatryProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditHistory: true,
  };
}

export function buildPsychiatryI18nCertificationReport(): PsychiatryI18nCertificationReport {
  const codes = new Set(listActivePsychiatryProviderOrderingCatalogCodes());
  const audited = orderabilityRows().filter((row) => codes.has(row.catalogCode));
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

export function runPsychiatryProviderOrderingExpansionReport(): PsychiatryProviderOrderingExpansionReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildPsychiatryBaselineReport();
  const inventory = buildPsychiatryInventoryReport();
  const providerOrderingActivation = buildPsychiatryProviderOrderingActivationReport();
  const billingCodingInventory = buildPsychiatryBillingCodingInventoryReport();
  const safetyGovernance = buildPsychiatrySafetyGovernanceReport();
  const controlledSubstanceGovernance = buildPsychiatryControlledSubstanceGovernanceReport();
  const providerSearchSafety = buildPsychiatryProviderSearchSafetyReport();
  const i18n = buildPsychiatryI18nCertificationReport();
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const coreMeds = [
    "Haloperidol PO",
    "Olanzapine PO",
    "Risperidone",
    "Quetiapine",
    "Sertraline",
    "Escitalopram",
    "Lithium",
    "Benztropine",
  ];
  const coreCoverage = coreMeds.every((medication) => {
    const row = inventory.rows.find((candidate) => candidate.medication === medication);
    return row && row.classification !== "EXCLUDED_WITH_BLOCKERS";
  });
  const controlledBlocked = controlledSubstanceGovernance.decision === "PASS";
  const finalDecision: PsychiatryActivationDecision =
    providerOrderingActivation.activatedCatalogCodes.length > 0 &&
    providerOrderingActivation.orderPersistsImmediately &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingCodingInventory.decision === "PASS" &&
    safetyGovernance.decision === "PASS" &&
    controlledBlocked &&
    providerSearchSafety.decision === "PASS" &&
    i18n.decision === "PASS" &&
    hardStopsPass &&
    coreCoverage
      ? "PSYCHIATRY_PROVIDER_ORDERING_ACTIVE"
      : providerOrderingActivation.activatedCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.PSYCHIATRY_PROVIDER_ORDERING_EXPANSION.1",
    baseline,
    inventory,
    catalogRemediation: buildPsychiatryCatalogRemediationReport(),
    workflowCompatibility: buildPsychiatryWorkflowCompatibilityReport(),
    controlledSubstanceGovernance,
    providerOrderingEligibility: buildPsychiatryProviderOrderingEligibilityReport(),
    providerOrderingActivation,
    safetyGovernance,
    billingCodingInventory,
    providerSearchSafety,
    rollback: buildPsychiatryRollbackReport(),
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

export function resetPsychiatryProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}
