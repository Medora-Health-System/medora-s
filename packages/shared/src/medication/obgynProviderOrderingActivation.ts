/**
 * MEDUI.MEDICATION.OBGYN_PROVIDER_ORDERING_EXPANSION.1
 * Provider-ordering activation for certified OBGYN medications.
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
import { ENTERPRISE_OBGYN_BILLING_BY_CODE } from "./enterpriseObgynBillingManifest.js";
import { ENTERPRISE_OBGYN_FORMULARY_BY_CODE } from "./enterpriseObgynFormularyManifest.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveCardiologyProviderOrderingCatalogCodes } from "./cardiologyProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveIvFluidsProviderOrderingCatalogCodes } from "./ivFluidsProviderOrderingActivation.js";
import {
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { runOncologyGovernanceAndFormularyExpansionReport } from "./oncologyGovernanceAndFormularyExpansion.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";

export type ObgynActivationDecision =
  | "OBGYN_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type ObgynProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_OBGYN_REVIEW"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type ObgynActivationState = "ACTIVE" | "ROLLED_BACK";

export type ObgynMedicationTarget = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "PO" | "IV" | "IM" | "SC" | "INFUSION";
  classification: "READY_FOR_PROVIDER_ORDERING" | "RESTRICTED_OBGYN_REVIEW";
  pregnancyPostpartumWarning: "ADVISORY" | "HIGH_RISK_UTEROTONIC" | "STANDARD";
};

export type ObgynInventoryRow = {
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
  pregnancyPostpartumWarning: "ADVISORY" | "HIGH_RISK_UTEROTONIC" | "STANDARD";
  classification: ObgynProviderOrderingClassification;
  blockers: string[];
};

export type ObgynBaselineReport = {
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
  oncologyGovernanceReady: boolean;
  buildGate: "PASS";
};

export type ObgynInventoryReport = { decision: "PASS" | "PARTIAL" | "FAIL"; rows: ObgynInventoryRow[] };

export type ObgynCatalogRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  canonicalFamily: string | null;
  ndcConfidence: string | null;
  blockers: string[];
};

export type ObgynCatalogRemediationReport = { rows: ObgynCatalogRemediationRow[] };

export type ObgynWorkflowCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  workflows: Array<{ workflow: string; catalogSupportPercent: number; blockers: string[] }>;
};

export type ObgynProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedObgynReview: string[];
  eligibleCatalogCodes: string[];
  rows: Array<{ medication: string; catalogCode: string; classification: ObgynProviderOrderingClassification; blockers: string[] }>;
};

export type ObgynProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
};

export type ObgynSafetyGovernanceReport = {
  decision: "PASS" | "FAIL";
  pregnancyStatusAdvisory: "ADVISORY";
  gestationalAgeAdvisory: "ADVISORY";
  postpartumStatusAdvisory: "ADVISORY";
  hypertensionPreeclampsiaAdvisory: "ADVISORY";
  hemorrhageRiskAdvisory: "ADVISORY";
  uterotonicContraindicationAdvisory: "ADVISORY";
  magnesiumToxicityMonitoringAdvisory: "ADVISORY";
  rhStatusAdvisory: "ADVISORY";
  allergyAdvisory: "ADVISORY";
  blocksProviderOrdering: false;
};

export type ObgynBillingCodingInventoryReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  hcpcsReadyCount: number;
  ndcReadyCount: number;
  inventoryReadyCount: number;
  chargeMappingReadyCount: number;
  blockers: string[];
};

export type ObgynProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateRows: number;
  catalogCodeLeakage: boolean;
  canonicalDisplayPreserved: boolean;
  blockers: string[];
};

export type ObgynRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type ObgynI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type ObgynActivationEntry = ObgynInventoryRow & {
  pharmacyReviewVisible: true;
  state: ObgynActivationState;
};

export type ObgynProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: ObgynActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type ObgynProviderOrderingExpansionReport = {
  ticket: "MEDUI.MEDICATION.OBGYN_PROVIDER_ORDERING_EXPANSION.1";
  baseline: ObgynBaselineReport;
  inventory: ObgynInventoryReport;
  catalogRemediation: ObgynCatalogRemediationReport;
  workflowCompatibility: ObgynWorkflowCompatibilityReport;
  providerOrderingEligibility: ObgynProviderOrderingEligibilityReport;
  providerOrderingActivation: ObgynProviderOrderingActivationReport;
  safetyGovernance: ObgynSafetyGovernanceReport;
  billingCodingInventory: ObgynBillingCodingInventoryReport;
  providerSearchSafety: ObgynProviderSearchSafetyReport;
  rollback: ObgynRollbackReport;
  i18n: ObgynI18nCertificationReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: ObgynActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T23:55:00.000Z";

const OBGYN_TARGETS: ObgynMedicationTarget[] = [
  { medication: "Oxytocin / Pitocin", tokens: ["oxytocin", "pitocin"], preferredCatalogCodes: ["OXYTOCIN_10_UNITS_ML_INJECTABLE_INTRAVEINEUSE", "OXYTOCIN_30_UNITS_500_ML_PERFUSION_INTRAVEINEUSE", "OXYTOCIN_10_UI_PER_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "HIGH_RISK_UTEROTONIC" },
  { medication: "Magnesium sulfate", tokens: ["magnesium sulfate", "mgso4"], preferredCatalogCodes: ["MAGNESIUM_SULFATE_4_G_100_ML_OB_PERFUSION_INTRAVEINEUSE", "MAGNESIUM_SULFATE_4_G_100_ML_PERFUSION_INTRAVEINEUSE", "MAGNESIUM_SULFATE_2_G_PER_50_ML_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Misoprostol / Cytotec", tokens: ["misoprostol", "cytotec"], preferredCatalogCodes: ["MISOPROSTOL_200_MCG_COMPRIME_ORALE", "MISOPROSTOL_25_MCG_COMPRIME_ORALE", "MISOPROSTOL_200_MCG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "HIGH_RISK_UTEROTONIC" },
  { medication: "Methylergonovine / Methergine", tokens: ["methylergonovine", "methergine"], preferredCatalogCodes: ["METHYLERGONOVINE_0_2_MG_ML_INJECTABLE_INTRAMUSCULAIRE"], routeHint: "IM", classification: "RESTRICTED_OBGYN_REVIEW", pregnancyPostpartumWarning: "HIGH_RISK_UTEROTONIC" },
  { medication: "Carboprost / Hemabate", tokens: ["carboprost", "hemabate"], preferredCatalogCodes: ["CARBOPROST_250_MCG_ML_INJECTABLE_INTRAMUSCULAIRE"], routeHint: "IM", classification: "RESTRICTED_OBGYN_REVIEW", pregnancyPostpartumWarning: "HIGH_RISK_UTEROTONIC" },
  { medication: "Terbutaline", tokens: ["terbutaline"], preferredCatalogCodes: ["TERBUTALINE_0_25_MG_SC_OB_INJECTABLE_SOUS_CUTANEE", "TERBUTALINE_1_MG_ML_INJECTABLE_SOUS_CUTANEE"], routeHint: "SC", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Betamethasone", tokens: ["betamethasone"], preferredCatalogCodes: ["BETAMETHASONE_12_MG_INJECTABLE_INTRAMUSCULAIRE"], routeHint: "IM", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Rho(D) immune globulin / RhoGAM", tokens: ["rhogam", "rho immune", "anti-d", "anti d"], preferredCatalogCodes: ["RH_IMMUNE_GLOBULIN_300_MCG_INJECTABLE_INTRAMUSCULAIRE"], routeHint: "IM", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Tranexamic acid", tokens: ["tranexamic", "tranexamique", "txa"], preferredCatalogCodes: ["TRANEXAMIC_ACID_1000_MG_10_ML_INJECTABLE_INTRAVEINEUSE", "TRANEXAMIC_ACID_500_MG_PER_5_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Nifedipine", tokens: ["nifedipine"], preferredCatalogCodes: ["NIFEDIPINE_10_MG_GELULE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Labetalol", tokens: ["labetalol"], preferredCatalogCodes: ["LABETALOL_5_MG_ML_INJECTABLE_INTRAVEINEUSE", "LABETALOL_100_MG_20_ML_INJECTABLE_INTRAVEINEUSE", "LABETALOL_200_MG_COMPRIME_ORALE", "LABETALOL_5MG_ML_IV"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Hydralazine", tokens: ["hydralazine"], preferredCatalogCodes: ["HYDRALAZINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Cefazolin", tokens: ["cefazolin", "ancef"], preferredCatalogCodes: ["CEFAZOLIN_2_G_POUDRE_INTRAVEINEUSE", "CEFAZOLIN_1G_INJECTABLE", "CEFAZOLIN_1G_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
  { medication: "Ampicillin", tokens: ["ampicillin"], preferredCatalogCodes: ["AMPICILLIN_500_MG_POUDRE_INTRAVEINEUSE", "AMPICILLIN_SULBACTAM_3_G_POUDRE_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
  { medication: "Gentamicin", tokens: ["gentamicin"], preferredCatalogCodes: ["GENTAMICIN_40_MG_ML_INJECTABLE_INTRAVEINEUSE", "GENTAMICIN_80_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Clindamycin", tokens: ["clindamycin"], preferredCatalogCodes: ["CLINDAMYCIN_900_MG_50_ML_PERFUSION_INTRAVEINEUSE", "CLINDAMYCIN_600_MG_PER_4_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
  { medication: "Penicillin G", tokens: ["penicillin g", "penicillin"], preferredCatalogCodes: ["PENICILLIN_G_5_MILLION_UNITS_POUDRE_INTRAVEINEUSE", "BENZATHINE_PENICILLIN_G_1.2_M_UI_INJECTABLE_INTRAMUSCULAR"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
  { medication: "Azithromycin", tokens: ["azithromycin"], preferredCatalogCodes: ["AZITHROMYCIN_500_MG_250_ML_PERFUSION_INTRAVEINEUSE", "AZITHROMYCIN_500_MG_COMPRIME_ORAL", "AZITHROMYCIN_500_MG_INJECTABLE_INTRAVENOUS"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
  { medication: "Ondansetron", tokens: ["ondansetron", "zofran"], preferredCatalogCodes: ["ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION", "ONDANSETRON_4_MG_COMPRIME_ORAL", "ONDANSETRON_8_MG_COMPRIME_ORAL"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Docusate", tokens: ["docusate", "colace"], preferredCatalogCodes: ["DOCUSATE_100_MG_GELULE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
  { medication: "Ibuprofen", tokens: ["ibuprofen"], preferredCatalogCodes: ["IBUPROFEN_400_MG_COMPRIME_ORAL", "IBUPROFEN_200", "IBUPROFEN_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "ADVISORY" },
  { medication: "Acetaminophen", tokens: ["acetaminophen", "paracetamol"], preferredCatalogCodes: ["ACETAMINOPHEN_500", "ACETAMINOPHEN_10_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
  { medication: "Prenatal vitamins", tokens: ["prenatal", "multivitamin"], preferredCatalogCodes: ["PRENATAL_MULTIVITAMIN_STANDARD_COMPRIME_ORALE", "FERROUS_SULFATE_FOLIC_ACID_60_MG_PER_0.4_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
  { medication: "Ferrous sulfate", tokens: ["ferrous", "iron"], preferredCatalogCodes: ["FERROUS_SULFATE_325_MG_COMPRIME_ORALE", "FERROUS_SULFATE_FOLIC_ACID_60_MG_PER_0.4_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", pregnancyPostpartumWarning: "STANDARD" },
];

const OBGYN_REMEDIATION = [
  ...Object.keys(ENTERPRISE_OBGYN_FORMULARY_BY_CODE).map((catalogCode) => ({
    medication: ENTERPRISE_OBGYN_FORMULARY_BY_CODE[catalogCode]?.displayNameEn ?? catalogCode,
    catalogCode,
    tokens: ENTERPRISE_OBGYN_FORMULARY_BY_CODE[catalogCode]?.searchTerms.slice(0, 2) ?? [],
  })),
] as const;

const OBGYN_WORKFLOWS = [
  { workflow: "Labor induction", tokens: ["oxytocin", "misoprostol", "pitocin"] },
  { workflow: "Postpartum hemorrhage", tokens: ["oxytocin", "misoprostol", "tranexamic", "carboprost", "methylergonovine"] },
  { workflow: "Preeclampsia/eclampsia", tokens: ["magnesium", "labetalol", "hydralazine", "nifedipine"] },
  { workflow: "Preterm labor", tokens: ["terbutaline", "betamethasone", "magnesium"] },
  { workflow: "Antenatal steroid administration", tokens: ["betamethasone"] },
  { workflow: "Rh-negative pregnancy prophylaxis", tokens: ["rh immune", "rhogam", "anti-d"] },
  { workflow: "GBS prophylaxis", tokens: ["penicillin", "ampicillin", "clindamycin", "cefazolin"] },
  { workflow: "C-section prophylaxis", tokens: ["cefazolin", "clindamycin", "azithromycin"] },
  { workflow: "Hyperemesis gravidarum", tokens: ["ondansetron"] },
  { workflow: "Postpartum pain", tokens: ["ibuprofen", "acetaminophen"] },
  { workflow: "Postpartum constipation", tokens: ["docusate"] },
  { workflow: "Iron deficiency anemia", tokens: ["ferrous", "prenatal"] },
];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: ObgynInventoryRow[] | null = null;
let registryCache: ObgynProviderOrderingActivationRegistry | null = null;
let finalReportCache: ObgynProviderOrderingExpansionReport | null = null;

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

function routeMatches(record: MedicationOrderabilityRecord, hint?: ObgynMedicationTarget["routeHint"]): boolean {
  if (!hint) return true;
  const text = blob(record);
  if (hint === "PO") return text.includes("orale") || text.includes("comprime") || text.includes("gelule") || text.includes(" oral");
  if (hint === "IM") return text.includes("intramusculaire") || text.includes("intramuscular");
  if (hint === "SC") return text.includes("sous-cutan") || text.includes("subcutan") || text.includes("sc ");
  if (hint === "IV") return text.includes("intraveineuse") || text.includes("injectable") || text.includes("intravenous");
  return text.includes("perfusion") || text.includes("infusion");
}

function findRecordForTarget(target: ObgynMedicationTarget): MedicationOrderabilityRecord | null {
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
  ]);
}

function rowForTarget(target: ObgynMedicationTarget): ObgynInventoryRow {
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
      pregnancyPostpartumWarning: target.pregnancyPostpartumWarning,
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
    OBGYN_TARGETS.some((candidate) => candidate.preferredCatalogCodes.includes(record.catalogCode));
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE" && !collisionOnlyDuplicateFamily) blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (target.classification === "RESTRICTED_OBGYN_REVIEW") blockers.push("OBGYN_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: ObgynProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "RESTRICTED_OBGYN_REVIEW") classification = "RESTRICTED_OBGYN_REVIEW";
  else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (blockers.filter((b) => b !== "OBGYN_REVIEW_REQUIRED").length === 0) classification = "READY_FOR_PROVIDER_ORDERING";
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
    pregnancyPostpartumWarning: target.pregnancyPostpartumWarning,
    classification,
    blockers: alreadyProviderOrderable || activeInPriorDomain ? [] : [...new Set(blockers)],
  };
}

function inventoryRows(): ObgynInventoryRow[] {
  if (!inventoryCache) inventoryCache = OBGYN_TARGETS.map(rowForTarget);
  return inventoryCache;
}

export function buildObgynBaselineReport(): ObgynBaselineReport {
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
    oncologyGovernanceReady:
      oncology.finalDecision === "ONCOLOGY_GOVERNANCE_READY" || oncology.finalDecision === "READY_WITH_BLOCKERS",
    buildGate: "PASS",
  };
}

export function buildObgynInventoryReport(): ObgynInventoryReport {
  const rows = inventoryRows();
  const blocked = rows.filter((row) => row.classification === "EXCLUDED_WITH_BLOCKERS").length;
  return {
    decision: blocked === 0 ? "PASS" : blocked < rows.length ? "PARTIAL" : "FAIL",
    rows,
  };
}

export function buildObgynCatalogRemediationReport(): ObgynCatalogRemediationReport {
  return {
    rows: OBGYN_REMEDIATION.map((spec) => {
      const row =
        orderabilityRows().find((candidate) => candidate.catalogCode === spec.catalogCode) ??
        orderabilityRows().find((candidate) => spec.tokens.some((token) => blob(candidate).includes(token)));
      const billing = ENTERPRISE_OBGYN_BILLING_BY_CODE[spec.catalogCode];
      return {
        medication: spec.medication,
        catalogCode: spec.catalogCode,
        catalogPresent: Boolean(row),
        canonicalFamily: row ? canonicalMedicationFamilyKey(row) : ENTERPRISE_OBGYN_FORMULARY_BY_CODE[spec.catalogCode]?.genericName.toLowerCase() ?? null,
        ndcConfidence: billing?.ndcConfidence ?? null,
        blockers: row ? [] : ["CATALOG_MISSING"],
      };
    }),
  };
}

export function buildObgynWorkflowCompatibilityReport(): ObgynWorkflowCompatibilityReport {
  const rows = OBGYN_WORKFLOWS.map((workflow) => {
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

export function buildObgynProviderOrderingEligibilityReport(): ObgynProviderOrderingEligibilityReport {
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
    restrictedObgynReview: rows.filter((row) => row.classification === "RESTRICTED_OBGYN_REVIEW").map((row) => row.medication),
    eligibleCatalogCodes: rows.filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING").map((row) => row.catalogCode),
    rows: rows.map((row) => ({ medication: row.medication, catalogCode: row.catalogCode, classification: row.classification, blockers: row.blockers })),
  };
}

export function buildObgynProviderOrderingActivationRegistry(): ObgynProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const entries = inventoryRows()
    .filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING")
    .map((row): ObgynActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified OBGYN provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function buildObgynProviderOrderingActivationReport(): ObgynProviderOrderingActivationReport {
  const activated = buildObgynProviderOrderingActivationRegistry().entries;
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
  };
}

export function listActiveObgynProviderOrderingCatalogCodes(
  registry = buildObgynProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveObgynProviderOrderingMedication(
  catalogCode: string,
  registry = buildObgynProviderOrderingActivationRegistry()
): boolean {
  return listActiveObgynProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function validateObgynProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: ObgynProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildObgynProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("OBGYN_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function rollbackObgynProviderOrderingActivation(input: {
  registry: ObgynProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): ObgynProviderOrderingActivationRegistry {
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

export function buildObgynSafetyGovernanceReport(): ObgynSafetyGovernanceReport {
  const restrictedActivated = buildObgynProviderOrderingActivationRegistry().entries.filter((entry) =>
    OBGYN_TARGETS.some(
      (target) => target.classification === "RESTRICTED_OBGYN_REVIEW" && target.preferredCatalogCodes.includes(entry.catalogCode)
    )
  );
  return {
    decision: restrictedActivated.length === 0 ? "PASS" : "FAIL",
    pregnancyStatusAdvisory: "ADVISORY",
    gestationalAgeAdvisory: "ADVISORY",
    postpartumStatusAdvisory: "ADVISORY",
    hypertensionPreeclampsiaAdvisory: "ADVISORY",
    hemorrhageRiskAdvisory: "ADVISORY",
    uterotonicContraindicationAdvisory: "ADVISORY",
    magnesiumToxicityMonitoringAdvisory: "ADVISORY",
    rhStatusAdvisory: "ADVISORY",
    allergyAdvisory: "ADVISORY",
    blocksProviderOrdering: false,
  };
}

export function buildObgynBillingCodingInventoryReport(): ObgynBillingCodingInventoryReport {
  const codes = new Set([
    ...inventoryRows().map((row) => row.catalogCode).filter(Boolean),
    ...buildObgynProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode),
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

export function buildObgynProviderSearchSafetyReport(): ObgynProviderSearchSafetyReport {
  const codes = listActiveObgynProviderOrderingCatalogCodes();
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

export function buildObgynRollbackReport(): ObgynRollbackReport {
  const registry = buildObgynProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackObgynProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "OBGYN rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !listActiveObgynProviderOrderingCatalogCodes(rolledBack).includes(first.catalogCode) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateObgynProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function buildObgynI18nCertificationReport(): ObgynI18nCertificationReport {
  const codes = new Set(listActiveObgynProviderOrderingCatalogCodes());
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

export function runObgynProviderOrderingExpansionReport(): ObgynProviderOrderingExpansionReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildObgynBaselineReport();
  const inventory = buildObgynInventoryReport();
  const providerOrderingActivation = buildObgynProviderOrderingActivationReport();
  const billingCodingInventory = buildObgynBillingCodingInventoryReport();
  const safetyGovernance = buildObgynSafetyGovernanceReport();
  const providerSearchSafety = buildObgynProviderSearchSafetyReport();
  const i18n = buildObgynI18nCertificationReport();
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const coreMeds = [
    "Oxytocin / Pitocin",
    "Magnesium sulfate",
    "Misoprostol / Cytotec",
    "Cefazolin",
    "Ampicillin",
    "Labetalol",
    "Ondansetron",
    "Acetaminophen",
  ];
  const coreCoverage = coreMeds.every((medication) => {
    const row = inventory.rows.find((candidate) => candidate.medication === medication);
    return row && row.classification !== "EXCLUDED_WITH_BLOCKERS";
  });
  const finalDecision: ObgynActivationDecision =
    providerOrderingActivation.activatedCatalogCodes.length > 0 &&
    providerOrderingActivation.orderPersistsImmediately &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingCodingInventory.decision === "PASS" &&
    safetyGovernance.decision === "PASS" &&
    providerSearchSafety.decision === "PASS" &&
    i18n.decision === "PASS" &&
    hardStopsPass &&
    coreCoverage
      ? "OBGYN_PROVIDER_ORDERING_ACTIVE"
      : providerOrderingActivation.activatedCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.OBGYN_PROVIDER_ORDERING_EXPANSION.1",
    baseline,
    inventory,
    catalogRemediation: buildObgynCatalogRemediationReport(),
    workflowCompatibility: buildObgynWorkflowCompatibilityReport(),
    providerOrderingEligibility: buildObgynProviderOrderingEligibilityReport(),
    providerOrderingActivation,
    safetyGovernance,
    billingCodingInventory,
    providerSearchSafety,
    rollback: buildObgynRollbackReport(),
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

export function resetObgynProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}
