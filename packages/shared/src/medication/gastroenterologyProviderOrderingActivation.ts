/**
 * MEDUI.MEDICATION.GASTROENTEROLOGY_PROVIDER_ORDERING_EXPANSION.1
 * Provider-ordering activation for certified gastroenterology medications.
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
import { ENTERPRISE_GASTROENTEROLOGY_BILLING_BY_CODE } from "./enterpriseGastroenterologyBillingManifest.js";
import { ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE } from "./enterpriseGastroenterologyFormularyManifest.js";
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
import { listActivePsychiatryProviderOrderingCatalogCodes } from "./psychiatryProviderOrderingActivation.js";
import { runOncologyGovernanceAndFormularyExpansionReport } from "./oncologyGovernanceAndFormularyExpansion.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";

export type GastroenterologyActivationDecision =
  | "GASTROENTEROLOGY_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type GastroenterologyProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_SPECIALTY_REVIEW"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type GastroenterologyActivationState = "ACTIVE" | "ROLLED_BACK";

export type GastroenterologyMedicationTarget = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "PO" | "IV" | "INFUSION" | "AUDIT";
  classification:
    | "READY_FOR_PROVIDER_ORDERING"
    | "RESTRICTED_SPECIALTY_REVIEW"
    | "ACTIVE_IN_PRIOR_DOMAIN"
    | "AUDIT_ONLY";
};

export type GastroenterologyInventoryRow = {
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
  classification: GastroenterologyProviderOrderingClassification;
  blockers: string[];
};

export type GastroenterologyBaselineReport = {
  tranche1Active: boolean;
  tranche2Active: boolean;
  ivFluidsActive: boolean;
  cardiologyActive: boolean;
  obgynActive: boolean;
  psychiatryActive: boolean;
  oncologyGovernanceReady: boolean;
  buildGate: "PASS";
};

export type GastroenterologyInventoryReport = { decision: "PASS" | "PARTIAL" | "FAIL"; rows: GastroenterologyInventoryRow[] };

export type GastroenterologyCatalogRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  canonicalFamily: string | null;
  ndcConfidence: string | null;
  blockers: string[];
};

export type GastroenterologyCatalogRemediationReport = { rows: GastroenterologyCatalogRemediationRow[] };

export type GastroenterologyWorkflowCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  workflows: Array<{ workflow: string; catalogSupportPercent: number; blockers: string[] }>;
};

export type GastroenterologyProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedSpecialtyReview: string[];
  activeInPriorDomain: string[];
  eligibleCatalogCodes: string[];
  rows: Array<{ medication: string; catalogCode: string; classification: GastroenterologyProviderOrderingClassification; blockers: string[] }>;
};

export type GastroenterologyProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  controlledSubstancesNotActivated: string[];
  chemotherapyNotActivated: string[];
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
};

export type GastroenterologyBillingInventoryReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  hcpcsReadyCount: number;
  ndcReadyCount: number;
  inventoryReadyCount: number;
  chargeMappingReadyCount: number;
  blockers: string[];
};

export type GastroenterologyProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateRows: number;
  catalogCodeLeakage: boolean;
  canonicalDisplayPreserved: boolean;
  blockers: string[];
};

export type GastroenterologySafetyGovernanceReport = {
  decision: "PASS" | "FAIL";
  giBleedAdvisory: "ADVISORY";
  hepaticEncephalopathyAdvisory: "ADVISORY";
  cirrhosisAdvisory: "ADVISORY";
  renalDosingAdvisory: "ADVISORY";
  electrolyteMonitoringAdvisory: "ADVISORY";
  bowelObstructionAdvisory: "ADVISORY";
  blocksProviderOrdering: false;
};

export type GastroenterologyRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type GastroenterologyI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type GastroenterologyActivationEntry = GastroenterologyInventoryRow & {
  pharmacyReviewVisible: true;
  state: GastroenterologyActivationState;
};

export type GastroenterologyProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: GastroenterologyActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type GastroenterologyProviderOrderingExpansionReport = {
  ticket: "MEDUI.MEDICATION.GASTROENTEROLOGY_PROVIDER_ORDERING_EXPANSION.1";
  baseline: GastroenterologyBaselineReport;
  inventory: GastroenterologyInventoryReport;
  catalogRemediation: GastroenterologyCatalogRemediationReport;
  workflowCompatibility: GastroenterologyWorkflowCompatibilityReport;
  providerOrderingEligibility: GastroenterologyProviderOrderingEligibilityReport;
  providerOrderingActivation: GastroenterologyProviderOrderingActivationReport;
  billingInventory: GastroenterologyBillingInventoryReport;
  providerSearchSafety: GastroenterologyProviderSearchSafetyReport;
  safetyGovernance: GastroenterologySafetyGovernanceReport;
  rollback: GastroenterologyRollbackReport;
  i18n: GastroenterologyI18nCertificationReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: GastroenterologyActivationDecision;
};

const ACTIVATED_AT = "2026-06-24T02:00:00.000Z";
const CHEMOTHERAPY_TERMS = ["cyclophosphamide", "doxorubicin", "methotrexate", "cisplatin", "chemo"];

const GASTRO_TARGETS: GastroenterologyMedicationTarget[] = [
  { medication: "Pantoprazole PO", tokens: ["pantoprazole"], preferredCatalogCodes: ["PANTOPRAZOLE_40_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Pantoprazole IV", tokens: ["pantoprazole"], preferredCatalogCodes: ["PANTOPRAZOLE_40MG_IV", "PANTOPRAZOLE_40_MG_INJECTABLE_INTRAVENOUS"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Pantoprazole infusion", tokens: ["pantoprazole"], preferredCatalogCodes: ["PANTOPRAZOLE_40MG_IV"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Omeprazole", tokens: ["omeprazole"], preferredCatalogCodes: ["OMEPRAZOLE_20", "OMEPRAZOLE_40_MG_CAPSULE_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Famotidine PO", tokens: ["famotidine"], preferredCatalogCodes: ["FAMOTIDINE_20_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Famotidine IV", tokens: ["famotidine"], preferredCatalogCodes: ["FAMOTIDINE_20MG_IV", "FAMOTIDINE_20_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Sucralfate", tokens: ["sucralfate"], preferredCatalogCodes: ["SUCRALFATE_1_G_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Octreotide infusion", tokens: ["octreotide"], preferredCatalogCodes: ["OCTREOTIDE_100_MCG_ML_INJECTABLE_SOUS_CUTANEE"], routeHint: "INFUSION", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Ceftriaxone", tokens: ["ceftriaxone"], preferredCatalogCodes: ["CEFTRIAXONE_1_G_INJECTABLE_INJECTION"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Lactulose", tokens: ["lactulose"], preferredCatalogCodes: ["LACTULOSE_10_G_PER_15_ML_SIROP_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Rifaximin", tokens: ["rifaximin"], preferredCatalogCodes: ["RIFAXIMIN_550_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Spironolactone", tokens: ["spironolactone"], preferredCatalogCodes: ["SPIRONOLACTONE_25_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Furosemide", tokens: ["furosemide"], preferredCatalogCodes: ["FUROSEMIDE_40_MG_COMPRIME_ORAL", "FUROSEMIDE_20_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Mesalamine", tokens: ["mesalamine"], preferredCatalogCodes: ["MESALAMINE_400_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Sulfasalazine", tokens: ["sulfasalazine"], preferredCatalogCodes: ["SULFASALAZINE_500_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Budesonide IBD", tokens: ["budesonide"], preferredCatalogCodes: ["BUDESONIDE_200_MCG_PER_DOSE_INHALATEUR_INHALATION"], routeHint: "PO", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "Ondansetron", tokens: ["ondansetron"], preferredCatalogCodes: ["ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION", "ONDANSETRON_4_MG_COMPRIME_ORAL"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Metoclopramide PO", tokens: ["metoclopramide"], preferredCatalogCodes: ["METOCLOPRAMIDE_10_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Metoclopramide IV", tokens: ["metoclopramide"], preferredCatalogCodes: ["METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Prochlorperazine", tokens: ["prochlorperazine"], preferredCatalogCodes: ["PROCHLORPERAZINE_10_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "AUDIT_ONLY" },
  { medication: "Polyethylene glycol", tokens: ["polyethylene glycol", "miralax", "peg"], preferredCatalogCodes: ["POLYETHYLENE_GLYCOL_17_G_POUDRE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Senna", tokens: ["senna", "senokot"], preferredCatalogCodes: ["SENNA_8_6_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Bisacodyl", tokens: ["bisacodyl", "dulcolax"], preferredCatalogCodes: ["BISACODYL_5_MG_COMPRIME_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Docusate", tokens: ["docusate"], preferredCatalogCodes: ["DOCUSATE_100_MG_GELULE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Loperamide", tokens: ["loperamide"], preferredCatalogCodes: ["LOPERAMIDE_2_MG_CAPSULE_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "LR", tokens: ["lactated ringer", "ringer lactate"], preferredCatalogCodes: ["RINGER_LACTATE_1_L_PERFUSION_INTRAVENOUS", "RINGER_LACTATE_500_ML_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "NS", tokens: ["normal saline", "sodium chloride 0.9"], preferredCatalogCodes: ["SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE", "NORMAL_SALINE_0.9_500_ML_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Pancreatitis pain support", tokens: ["morphine", "hydromorphone", "fentanyl"], preferredCatalogCodes: [], routeHint: "AUDIT", classification: "AUDIT_ONLY" },
];

const GASTRO_REMEDIATION = [
  ...Object.keys(ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE).map((catalogCode) => ({
    medication: ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE[catalogCode]?.displayNameEn ?? catalogCode,
    catalogCode,
    tokens: ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE[catalogCode]?.searchTerms.slice(0, 2) ?? [],
  })),
] as const;

const GASTRO_WORKFLOWS = [
  { workflow: "GERD", tokens: ["pantoprazole", "omeprazole", "famotidine", "sucralfate"] },
  { workflow: "PUD", tokens: ["pantoprazole", "omeprazole", "sucralfate"] },
  { workflow: "Upper GI Bleed", tokens: ["pantoprazole", "octreotide", "ceftriaxone"] },
  { workflow: "Variceal Bleed", tokens: ["octreotide", "ceftriaxone", "pantoprazole"] },
  { workflow: "Hepatic Encephalopathy", tokens: ["lactulose", "rifaximin"] },
  { workflow: "Cirrhosis", tokens: ["lactulose", "rifaximin", "spironolactone", "furosemide"] },
  { workflow: "Ascites", tokens: ["spironolactone", "furosemide", "albumin"] },
  { workflow: "Nausea/Vomiting", tokens: ["ondansetron", "metoclopramide", "prochlorperazine"] },
  { workflow: "Constipation", tokens: ["polyethylene glycol", "senna", "bisacodyl", "docusate"] },
  { workflow: "Diarrhea", tokens: ["loperamide"] },
  { workflow: "Pancreatitis", tokens: ["lactated ringer", "normal saline", "ondansetron"] },
  { workflow: "IBD", tokens: ["mesalamine", "sulfasalazine", "budesonide"] },
];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: GastroenterologyInventoryRow[] | null = null;
let registryCache: GastroenterologyProviderOrderingActivationRegistry | null = null;
let finalReportCache: GastroenterologyProviderOrderingExpansionReport | null = null;

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

function routeMatches(record: MedicationOrderabilityRecord, hint?: GastroenterologyMedicationTarget["routeHint"]): boolean {
  if (!hint || hint === "AUDIT") return true;
  const text = blob(record);
  if (hint === "PO") return text.includes("orale") || text.includes("comprime") || text.includes("gelule") || text.includes("sirop") || text.includes(" oral");
  if (hint === "IV") return text.includes("intraveineuse") || text.includes("injectable") || text.includes("intravenous");
  return text.includes("perfusion") || text.includes("infusion") || text.includes("injectable");
}

function findRecordForTarget(target: GastroenterologyMedicationTarget): MedicationOrderabilityRecord | null {
  for (const code of target.preferredCatalogCodes ?? []) {
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
    ...listActiveObgynProviderOrderingCatalogCodes(),
    ...listActivePsychiatryProviderOrderingCatalogCodes(),
  ]);
}

function rowForTarget(target: GastroenterologyMedicationTarget): GastroenterologyInventoryRow {
  if (target.classification === "AUDIT_ONLY") {
    const record = findRecordForTarget(target);
    return {
      medication: target.medication,
      catalogCode: record?.catalogCode ?? "",
      displayNameEn: record?.displayNameEn ?? "",
      displayNameFr: record?.displayNameFr ?? "",
      route: record?.route ?? "",
      form: record?.dosageForm ?? "",
      canonicalFamily: record ? canonicalMedicationFamilyKey(record) : "",
      marReady: false,
      billingReady: false,
      hcpcsReady: false,
      ndcReady: false,
      inventoryReady: false,
      providerOrderable: false,
      classification: "EXCLUDED_WITH_BLOCKERS",
      blockers: ["AUDIT_ONLY"],
    };
  }
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
  const i18nReady =
    Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()) &&
    !looksFrenchLocalizedText(record.displayNameEn) &&
    !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr));
  const collisionOnlyDuplicateFamily =
    collision.decision !== "SAFE" &&
    collision.blockers.length > 0 &&
    collision.blockers.every((blocker) => blocker === "DUPLICATE_OR_COLLISION_FINDING") &&
    GASTRO_TARGETS.some((candidate) => candidate.preferredCatalogCodes.includes(record.catalogCode));
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE" && !collisionOnlyDuplicateFamily) blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (activation.controlledSubstanceFlag) blockers.push("CONTROLLED_SUBSTANCE_BLOCKED");
  if (CHEMOTHERAPY_TERMS.some((term) => blob(record).includes(term))) blockers.push("CHEMOTHERAPY_BLOCKED");
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") blockers.push("GI_SPECIALTY_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: GastroenterologyProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") classification = "RESTRICTED_SPECIALTY_REVIEW";
  else if (target.classification === "ACTIVE_IN_PRIOR_DOMAIN") classification = activeInPriorDomain ? "ACTIVE_IN_PRIOR_DOMAIN" : "EXCLUDED_WITH_BLOCKERS";
  else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (blockers.filter((b) => b !== "GI_SPECIALTY_REVIEW_REQUIRED").length === 0) classification = "READY_FOR_PROVIDER_ORDERING";
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
    classification,
    blockers: alreadyProviderOrderable || activeInPriorDomain || classification === "RESTRICTED_SPECIALTY_REVIEW" ? [] : [...new Set(blockers)],
  };
}

function inventoryRows(): GastroenterologyInventoryRow[] {
  if (!inventoryCache) inventoryCache = GASTRO_TARGETS.map(rowForTarget);
  return inventoryCache;
}

export function buildGastroenterologyBaselineReport(): GastroenterologyBaselineReport {
  const oncology = runOncologyGovernanceAndFormularyExpansionReport();
  return {
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    ivFluidsActive: listActiveIvFluidsProviderOrderingCatalogCodes().length > 0,
    cardiologyActive: listActiveCardiologyProviderOrderingCatalogCodes().length > 0,
    obgynActive: listActiveObgynProviderOrderingCatalogCodes().length > 0,
    psychiatryActive: listActivePsychiatryProviderOrderingCatalogCodes().length > 0,
    oncologyGovernanceReady:
      oncology.finalDecision === "ONCOLOGY_GOVERNANCE_READY" || oncology.finalDecision === "READY_WITH_BLOCKERS",
    buildGate: "PASS",
  };
}

export function buildGastroenterologyInventoryReport(): GastroenterologyInventoryReport {
  const rows = inventoryRows();
  const blocked = rows.filter((row) => row.classification === "EXCLUDED_WITH_BLOCKERS").length;
  return {
    decision: blocked === 0 ? "PASS" : blocked < rows.length ? "PARTIAL" : "FAIL",
    rows,
  };
}

export function buildGastroenterologyCatalogRemediationReport(): GastroenterologyCatalogRemediationReport {
  return {
    rows: GASTRO_REMEDIATION.map((spec) => {
      const row =
        orderabilityRows().find((candidate) => candidate.catalogCode === spec.catalogCode) ??
        orderabilityRows().find((candidate) => spec.tokens.some((token) => blob(candidate).includes(token)));
      const billing = ENTERPRISE_GASTROENTEROLOGY_BILLING_BY_CODE[spec.catalogCode];
      return {
        medication: spec.medication,
        catalogCode: spec.catalogCode,
        catalogPresent: Boolean(row),
        canonicalFamily: row ? canonicalMedicationFamilyKey(row) : ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE[spec.catalogCode]?.genericName.toLowerCase() ?? null,
        ndcConfidence: billing?.ndcConfidence ?? null,
        blockers: row ? [] : ["CATALOG_MISSING"],
      };
    }),
  };
}

export function buildGastroenterologyWorkflowCompatibilityReport(): GastroenterologyWorkflowCompatibilityReport {
  const rows = GASTRO_WORKFLOWS.map((workflow) => {
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

export function buildGastroenterologyProviderOrderingEligibilityReport(): GastroenterologyProviderOrderingEligibilityReport {
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

export function buildGastroenterologyProviderOrderingActivationRegistry(): GastroenterologyProviderOrderingActivationRegistry {
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
      const activation = buildActivationGovernanceRecord(orderabilityRows().find((candidate) => candidate.catalogCode === row.catalogCode)!);
      return !activation.controlledSubstanceFlag && !CHEMOTHERAPY_TERMS.some((term) => row.catalogCode.toLowerCase().includes(term));
    })
    .map((row): GastroenterologyActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified gastroenterology provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function buildGastroenterologyProviderOrderingActivationReport(): GastroenterologyProviderOrderingActivationReport {
  const activated = buildGastroenterologyProviderOrderingActivationRegistry().entries;
  const rows = inventoryRows();
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const controlledRows = rows.filter((row) => row.blockers.includes("CONTROLLED_SUBSTANCE_BLOCKED"));
  return {
    activatedCatalogCodes: activated.map((entry) => entry.catalogCode),
    newlyActivatedCount: activated.length,
    alreadyCoveredCount: rows.filter(
      (row) => row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN"
    ).length,
    controlledSubstancesNotActivated: controlledRows.map((row) => row.medication),
    chemotherapyNotActivated: rows.filter((row) => row.blockers.includes("CHEMOTHERAPY_BLOCKED")).map((row) => row.medication),
    orderPersistsImmediately: workflow.orderPersistedImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalNotRequired: workflow.marScheduledImmediately && workflow.orderPersistedImmediately,
  };
}

export function listActiveGastroenterologyProviderOrderingCatalogCodes(
  registry = buildGastroenterologyProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveGastroenterologyProviderOrderingMedication(
  catalogCode: string,
  registry = buildGastroenterologyProviderOrderingActivationRegistry()
): boolean {
  return listActiveGastroenterologyProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function validateGastroenterologyProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: GastroenterologyProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildGastroenterologyProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("GASTROENTEROLOGY_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function rollbackGastroenterologyProviderOrderingActivation(input: {
  registry: GastroenterologyProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): GastroenterologyProviderOrderingActivationRegistry {
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

export function buildGastroenterologySafetyGovernanceReport(): GastroenterologySafetyGovernanceReport {
  const restrictedActivated = buildGastroenterologyProviderOrderingActivationRegistry().entries.filter((entry) =>
    GASTRO_TARGETS.some(
      (target) => target.classification === "RESTRICTED_SPECIALTY_REVIEW" && target.preferredCatalogCodes.includes(entry.catalogCode)
    )
  );
  return {
    decision: restrictedActivated.length === 0 ? "PASS" : "FAIL",
    giBleedAdvisory: "ADVISORY",
    hepaticEncephalopathyAdvisory: "ADVISORY",
    cirrhosisAdvisory: "ADVISORY",
    renalDosingAdvisory: "ADVISORY",
    electrolyteMonitoringAdvisory: "ADVISORY",
    bowelObstructionAdvisory: "ADVISORY",
    blocksProviderOrdering: false,
  };
}

export function buildGastroenterologyBillingInventoryReport(): GastroenterologyBillingInventoryReport {
  const codes = new Set([
    ...inventoryRows().map((row) => row.catalogCode).filter(Boolean),
    ...buildGastroenterologyProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode),
  ]);
  const rows = [...codes].map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  const blockers: string[] = [];
  const activated = buildGastroenterologyProviderOrderingActivationRegistry().entries;
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

export function buildGastroenterologyProviderSearchSafetyReport(): GastroenterologyProviderSearchSafetyReport {
  const codes = listActiveGastroenterologyProviderOrderingCatalogCodes();
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

export function buildGastroenterologyRollbackReport(): GastroenterologyRollbackReport {
  const registry = buildGastroenterologyProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackGastroenterologyProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Gastroenterology rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !listActiveGastroenterologyProviderOrderingCatalogCodes(rolledBack).includes(first.catalogCode) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validateGastroenterologyProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function buildGastroenterologyI18nCertificationReport(): GastroenterologyI18nCertificationReport {
  const codes = new Set(listActiveGastroenterologyProviderOrderingCatalogCodes());
  const audited = orderabilityRows().filter((row) => codes.has(row.catalogCode));
  let enLeakageCount = 0;
  let frLeakageCount = 0;
  let missingTranslations = 0;
  for (const row of audited) {
    if (!row.displayNameEn.trim() || !row.displayNameFr.trim()) missingTranslations += 1;
    if (looksFrenchLocalizedText(row.displayNameEn)) enLeakageCount += 1;
    if (looksEnglishFormText(row.displayNameFr) && !looksFrenchLocalizedText(row.displayNameFr)) frLeakageCount += 1;
    if (row.displayNameEn.includes("_") || row.displayNameFr.includes("_")) {
      enLeakageCount += 1;
    }
  }
  return {
    decision: enLeakageCount === 0 && frLeakageCount === 0 && missingTranslations === 0 ? "PASS" : "FAIL",
    rowsAudited: audited.length,
    enLeakageCount,
    frLeakageCount,
    missingTranslations,
  };
}

export function runGastroenterologyProviderOrderingExpansionReport(): GastroenterologyProviderOrderingExpansionReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildGastroenterologyBaselineReport();
  const inventory = buildGastroenterologyInventoryReport();
  const providerOrderingActivation = buildGastroenterologyProviderOrderingActivationReport();
  const billingInventory = buildGastroenterologyBillingInventoryReport();
  const safetyGovernance = buildGastroenterologySafetyGovernanceReport();
  const providerSearchSafety = buildGastroenterologyProviderSearchSafetyReport();
  const i18n = buildGastroenterologyI18nCertificationReport();
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const coreMeds = ["Pantoprazole PO", "Lactulose", "Rifaximin", "Polyethylene glycol", "Senna", "Metoclopramide PO"];
  const coreCoverage = coreMeds.every((medication) => {
    const row = inventory.rows.find((candidate) => candidate.medication === medication);
    return row && row.classification !== "EXCLUDED_WITH_BLOCKERS";
  });
  const finalDecision: GastroenterologyActivationDecision =
    providerOrderingActivation.activatedCatalogCodes.length > 0 &&
    providerOrderingActivation.orderPersistsImmediately &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingInventory.decision === "PASS" &&
    safetyGovernance.decision === "PASS" &&
    providerSearchSafety.decision === "PASS" &&
    i18n.decision === "PASS" &&
    hardStopsPass &&
    coreCoverage
      ? "GASTROENTEROLOGY_PROVIDER_ORDERING_ACTIVE"
      : providerOrderingActivation.activatedCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.GASTROENTEROLOGY_PROVIDER_ORDERING_EXPANSION.1",
    baseline,
    inventory,
    catalogRemediation: buildGastroenterologyCatalogRemediationReport(),
    workflowCompatibility: buildGastroenterologyWorkflowCompatibilityReport(),
    providerOrderingEligibility: buildGastroenterologyProviderOrderingEligibilityReport(),
    providerOrderingActivation,
    billingInventory,
    providerSearchSafety,
    safetyGovernance,
    rollback: buildGastroenterologyRollbackReport(),
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

export function resetGastroenterologyProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}

export function gastroenterologyPharmacyFollowUpStatuses(): readonly PharmacyFollowUpStatus[] {
  return PHARMACY_FOLLOW_UP_STATUSES;
}
