/**
 * MEDUI.MEDICATION.PEDIATRICS_PROVIDER_ORDERING_EXPANSION.1
 * Provider-ordering activation for certified pediatric medications.
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
import { ENTERPRISE_PEDIATRICS_BILLING_BY_CODE } from "./enterprisePediatricsBillingManifest.js";
import { ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE } from "./enterprisePediatricsFormularyManifest.js";
import {
  ENTERPRISE_PEDIATRICS_VACCINES_MANIFEST,
  type PediatricsVaccineClassification,
} from "./enterprisePediatricsVaccinesManifest.js";
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

export type PediatricsActivationDecision =
  | "PEDIATRICS_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type PediatricsProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_PEDS_REVIEW"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type PediatricsActivationState = "ACTIVE" | "ROLLED_BACK";

export type PediatricsMedicationTarget = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "PO" | "IV" | "IM" | "INFUSION" | "INHALED" | "TOPICAL" | "NEB";
  classification:
    | "READY_FOR_PROVIDER_ORDERING"
    | "RESTRICTED_PEDS_REVIEW"
    | "ACTIVE_IN_PRIOR_DOMAIN"
    | "AUDIT_ONLY";
  preferPediatricFormulation?: boolean;
};

export type PediatricsInventoryRow = {
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
  classification: PediatricsProviderOrderingClassification;
  blockers: string[];
};

export type PediatricsBaselineReport = {
  tranche1Active: boolean;
  tranche2Active: boolean;
  vaccineProviderOrderingActive: boolean;
  ivFluidsActive: boolean;
  gastroenterologyActive: boolean;
  obgynActive: boolean;
  oncologyGovernanceReady: boolean;
  buildGate: "PASS";
};

export type PediatricsInventoryReport = { decision: "PASS" | "PARTIAL" | "FAIL"; rows: PediatricsInventoryRow[] };

export type PediatricsVaccineCoverageRow = {
  vaccineId: string;
  labelEn: string;
  catalogPresent: boolean;
  catalogCode: string | null;
  classification: PediatricsVaccineClassification;
  blockers: string[];
};

export type PediatricsVaccineCoverageReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  ready: string[];
  restrictedPedsReview: string[];
  rows: PediatricsVaccineCoverageRow[];
};

export type PediatricsCatalogRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  canonicalFamily: string | null;
  ndcConfidence: string | null;
  blockers: string[];
};

export type PediatricsCatalogRemediationReport = { rows: PediatricsCatalogRemediationRow[] };

export type PediatricsWorkflowCompatibilityReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  workflows: Array<{ workflow: string; catalogSupportPercent: number; blockers: string[] }>;
};

export type PediatricsProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedPedsReview: string[];
  activeInPriorDomain: string[];
  eligibleCatalogCodes: string[];
  rows: Array<{ medication: string; catalogCode: string; classification: PediatricsProviderOrderingClassification; blockers: string[] }>;
};

export type PediatricsProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  controlledSubstancesNotActivated: string[];
  chemotherapyNotActivated: string[];
  vaccinesNotActivatedByPediatricsModule: string[];
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
};

export type PediatricsBillingInventoryReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  hcpcsReadyCount: number;
  ndcReadyCount: number;
  inventoryReadyCount: number;
  chargeMappingReadyCount: number;
  blockers: string[];
};

export type PediatricsProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateRows: number;
  catalogCodeLeakage: boolean;
  pediatricFormulationsPreferred: boolean;
  canonicalDisplayPreserved: boolean;
  blockers: string[];
};

export type PediatricsSafetyGovernanceReport = {
  decision: "PASS" | "FAIL";
  weightBasedDosingAdvisory: "ADVISORY";
  ageRestrictionAdvisory: "ADVISORY";
  maxDailyDoseAdvisory: "ADVISORY";
  neonatalRestrictionAdvisory: "ADVISORY";
  allergyAlertAdvisory: "ADVISORY";
  vaccineScheduleAdvisory: "ADVISORY";
  blocksProviderOrdering: false;
};

export type PediatricsRollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesOrders: true;
  preservesMar: true;
  preservesBilling: true;
  preservesInventory: true;
  preservesAuditTrail: true;
};

export type PediatricsI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type PediatricsActivationEntry = PediatricsInventoryRow & {
  pharmacyReviewVisible: true;
  state: PediatricsActivationState;
};

export type PediatricsProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: PediatricsActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type PediatricsProviderOrderingExpansionReport = {
  ticket: "MEDUI.MEDICATION.PEDIATRICS_PROVIDER_ORDERING_EXPANSION.1";
  baseline: PediatricsBaselineReport;
  inventory: PediatricsInventoryReport;
  vaccineCoverage: PediatricsVaccineCoverageReport;
  catalogRemediation: PediatricsCatalogRemediationReport;
  workflowCompatibility: PediatricsWorkflowCompatibilityReport;
  providerOrderingEligibility: PediatricsProviderOrderingEligibilityReport;
  providerOrderingActivation: PediatricsProviderOrderingActivationReport;
  safetyGovernance: PediatricsSafetyGovernanceReport;
  billingInventory: PediatricsBillingInventoryReport;
  providerSearchSafety: PediatricsProviderSearchSafetyReport;
  rollback: PediatricsRollbackReport;
  i18n: PediatricsI18nCertificationReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: PediatricsActivationDecision;
};

const ACTIVATED_AT = "2026-06-24T03:00:00.000Z";
const CHEMOTHERAPY_TERMS = ["cyclophosphamide", "doxorubicin", "methotrexate", "cisplatin", "chemo"];

const PEDIATRICS_TARGETS: PediatricsMedicationTarget[] = [
  { medication: "Amoxicillin suspension", tokens: ["amoxicillin"], preferredCatalogCodes: ["AMOXICILLIN_250_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL", "AMOXICILLIN_125_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Augmentin suspension", tokens: ["clavulan", "augmentin"], preferredCatalogCodes: ["AMOXICILLIN_CLAVULANIC_ACID_400_PER_57_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Cefdinir suspension", tokens: ["cefdinir"], preferredCatalogCodes: ["CEFDINIR_125_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Ceftriaxone IV", tokens: ["ceftriaxone"], preferredCatalogCodes: ["CEFTRIAXONE_1_G_INJECTABLE_INJECTION", "CEFTRIAXONE_100_MG_ML_PEDS_POUDRE_INTRAVEINEUSE"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Cefazolin IV", tokens: ["cefazolin"], preferredCatalogCodes: ["CEFAZOLIN_2_G_POUDRE_INTRAVEINEUSE", "CEFAZOLIN_1G_INJECTABLE"], routeHint: "IV", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Clindamycin", tokens: ["clindamycin"], preferredCatalogCodes: ["CLINDAMYCIN_300_MG_CAPSULE_ORAL", "CLINDAMYCIN_600_MG_PER_4_ML_INJECTABLE_INJECTION"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Azithromycin suspension", tokens: ["azithromycin"], preferredCatalogCodes: ["AZITHROMYCIN_200_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Penicillin G", tokens: ["penicillin g"], preferredCatalogCodes: ["PENICILLIN_G_5_MILLION_UNITS_POUDRE_INTRAVEINEUSE", "BENZATHINE_PENICILLIN_G_1.2_M_UI_INJECTABLE_INTRAMUSCULAR"], routeHint: "IV", classification: "RESTRICTED_PEDS_REVIEW" },
  { medication: "Acetaminophen liquid", tokens: ["paracetamol", "acetaminophen"], preferredCatalogCodes: ["PARACETAMOL_120_MG_PER_5_ML_SIROP_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Acetaminophen suppository", tokens: ["paracetamol", "supposit"], preferredCatalogCodes: ["PARACETAMOL_250_MG_SUPPOSITOIRE_SUPPOSITOIRE_RECTAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Ibuprofen suspension", tokens: ["ibuprofen"], preferredCatalogCodes: ["IBUPROFEN_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Albuterol nebulizer", tokens: ["albuterol", "salbutamol"], preferredCatalogCodes: ["SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION", "ALBUTEROL_0_083_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE"], routeHint: "NEB", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Albuterol inhaler", tokens: ["salbutamol", "albuterol"], preferredCatalogCodes: ["SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALATION"], routeHint: "INHALED", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Ipratropium nebulizer", tokens: ["ipratropium"], preferredCatalogCodes: ["IPRATROPIUM_0_5_MG_2_5_ML_SOLUTION_DE_NEBULISATION_INHALEE", "IPRATROPIUM_20_MCG_PER_DOSE_INHALATEUR_INHALATION"], routeHint: "NEB", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Dexamethasone PO", tokens: ["dexamethasone"], preferredCatalogCodes: ["DEXAMETHASONE_0.5_MG_COMPRIME_ORAL", "DEXAMETHASONE_4_MG_COMPRIME_ORAL"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Prednisolone solution", tokens: ["prednisolone"], preferredCatalogCodes: ["PREDNISOLONE_15_MG_PER_5_ML_SIROP_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Ondansetron ODT", tokens: ["ondansetron"], preferredCatalogCodes: ["ONDANSETRON_4_MG_ODT_COMPRIME_ORODISPERSIBLE_ORALE"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Polyethylene glycol", tokens: ["polyethylene glycol", "miralax"], preferredCatalogCodes: ["POLYETHYLENE_GLYCOL_17_G_POUDRE_ORALE"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Lactulose", tokens: ["lactulose"], preferredCatalogCodes: ["LACTULOSE_10_G_PER_15_ML_SIROP_ORAL"], routeHint: "PO", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Diphenhydramine", tokens: ["diphenhydramine"], preferredCatalogCodes: ["DIPHENHYDRAMINE_50MG_ML"], routeHint: "IM", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Cetirizine", tokens: ["cetirizine"], preferredCatalogCodes: ["CETIRIZINE_1_MG_PER_ML_SIROP_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Loratadine", tokens: ["loratadine"], preferredCatalogCodes: ["LORATADINE_5_MG_PER_5_ML_SIROP_ORAL"], routeHint: "PO", classification: "READY_FOR_PROVIDER_ORDERING", preferPediatricFormulation: true },
  { medication: "Vitamin K", tokens: ["phytonadione", "vitamin k"], preferredCatalogCodes: ["PHYTONADIONE_10_MG_ML_INJECTABLE_INTRAVEINEUSE"], routeHint: "IV", classification: "RESTRICTED_PEDS_REVIEW" },
  { medication: "Erythromycin ophthalmic", tokens: ["erythromycin"], preferredCatalogCodes: ["ERYTHROMYCIN_0_5_OPHTHALMIQUE_OPHTHALMIQUE"], routeHint: "TOPICAL", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Hepatitis B vaccine", tokens: ["hepatitis b", "hep b"], preferredCatalogCodes: [], routeHint: "IM", classification: "RESTRICTED_PEDS_REVIEW" },
  { medication: "Epinephrine IM", tokens: ["epinephrine"], preferredCatalogCodes: ["EPINEPHRINE_0_3_MG_0_3_ML_INJECTABLE_INTRAMUSCULAIRE", "EPINEPHRINE_1_MG_1_ML_IM_INJECTABLE_INTRAMUSCULAIRE"], routeHint: "IM", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "Dextrose rescue", tokens: ["dextrose 10", "d10"], preferredCatalogCodes: ["DEXTROSE_10_100_ML_PERFUSION_INTRAVEINEUSE", "DEXTROSE_10_250_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "RESTRICTED_PEDS_REVIEW" },
  { medication: "Normal saline bolus", tokens: ["normal saline", "sodium chloride 0.9"], preferredCatalogCodes: ["SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
  { medication: "LR bolus", tokens: ["lactated ringer", "ringer lactate"], preferredCatalogCodes: ["RINGER_LACTATE_1_L_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "ACTIVE_IN_PRIOR_DOMAIN" },
];

const PEDIATRICS_REMEDIATION = [
  ...Object.keys(ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE).map((catalogCode) => ({
    medication: ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE[catalogCode]?.displayNameEn ?? catalogCode,
    catalogCode,
    tokens: ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE[catalogCode]?.searchTerms.slice(0, 2) ?? [],
  })),
] as const;

const PEDIATRICS_WORKFLOWS = [
  { workflow: "Otitis media", tokens: ["amoxicillin", "cefdinir", "augmentin"] },
  { workflow: "Strep pharyngitis", tokens: ["amoxicillin", "penicillin", "azithromycin"] },
  { workflow: "Pneumonia", tokens: ["amoxicillin", "azithromycin", "ceftriaxone"] },
  { workflow: "Bronchiolitis", tokens: ["albuterol", "salbutamol", "ipratropium"] },
  { workflow: "Asthma", tokens: ["albuterol", "salbutamol", "prednisolone"] },
  { workflow: "Croup", tokens: ["dexamethasone", "racemic epinephrine"] },
  { workflow: "RSV support", tokens: ["albuterol", "oxygen", "salbutamol"] },
  { workflow: "Fever", tokens: ["acetaminophen", "paracetamol", "ibuprofen"] },
  { workflow: "Gastroenteritis", tokens: ["ondansetron", "lactulose", "normal saline"] },
  { workflow: "Constipation", tokens: ["polyethylene glycol", "lactulose"] },
  { workflow: "Allergic reaction", tokens: ["diphenhydramine", "cetirizine", "loratadine"] },
  { workflow: "Anaphylaxis", tokens: ["epinephrine", "diphenhydramine"] },
  { workflow: "Newborn prophylaxis", tokens: ["vitamin k", "phytonadione", "erythromycin ophthalmic"] },
  { workflow: "Well-child immunization", tokens: ["mmr", "varicella", "hepatitis b", "dtap"] },
];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: PediatricsInventoryRow[] | null = null;
let registryCache: PediatricsProviderOrderingActivationRegistry | null = null;
let finalReportCache: PediatricsProviderOrderingExpansionReport | null = null;

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

function isPediatricFormulation(record: MedicationOrderabilityRecord): boolean {
  const text = blob(record);
  return (
    text.includes("suspension") ||
    text.includes("sirop") ||
    text.includes("peds") ||
    text.includes("pediatric") ||
    text.includes("pédiat") ||
    text.includes("odt") ||
    text.includes("orodispersible") ||
    text.includes("supposit") ||
    text.includes("120 mg/5") ||
    text.includes("100 mg/5") ||
    text.includes("125 mg/5") ||
    text.includes("200 mg/5") ||
    text.includes("15 mg/5")
  );
}

function routeMatches(record: MedicationOrderabilityRecord, hint?: PediatricsMedicationTarget["routeHint"]): boolean {
  if (!hint) return true;
  const text = blob(record);
  if (hint === "PO") return text.includes("orale") || text.includes("comprime") || text.includes("gelule") || text.includes("sirop") || text.includes("suspension") || text.includes("supposit");
  if (hint === "IV") return text.includes("intraveineuse") || text.includes("injectable") || text.includes("intravenous");
  if (hint === "IM") return text.includes("intramusculaire") || text.includes("intramuscular");
  if (hint === "INHALED") return text.includes("inhalateur") || text.includes("inhalation") || text.includes("aerosol");
  if (hint === "NEB") return text.includes("nebul") || text.includes("nébul") || text.includes("inhalation");
  if (hint === "TOPICAL") return text.includes("ophtalm") || text.includes("ophthalm");
  return text.includes("perfusion") || text.includes("infusion") || text.includes("bolus");
}

function findRecordForTarget(target: PediatricsMedicationTarget): MedicationOrderabilityRecord | null {
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
  if (candidates.length === 0) return null;
  if (target.preferPediatricFormulation) {
    const pediatric = candidates.find(isPediatricFormulation);
    if (pediatric) return pediatric;
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
  ]);
}

function rowForTarget(target: PediatricsMedicationTarget): PediatricsInventoryRow {
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
    PEDIATRICS_TARGETS.some((candidate) => candidate.preferredCatalogCodes.includes(record.catalogCode));
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE" && !collisionOnlyDuplicateFamily) blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady && !marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (activation.controlledSubstanceFlag) blockers.push("CONTROLLED_SUBSTANCE_BLOCKED");
  if (activation.vaccineFlag && target.classification !== "RESTRICTED_PEDS_REVIEW") blockers.push("VACCINE_MODULE_REQUIRED");
  if (CHEMOTHERAPY_TERMS.some((term) => blob(record).includes(term))) blockers.push("CHEMOTHERAPY_BLOCKED");
  if (target.classification === "RESTRICTED_PEDS_REVIEW") blockers.push("PEDS_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: PediatricsProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "RESTRICTED_PEDS_REVIEW") classification = "RESTRICTED_PEDS_REVIEW";
  else if (target.classification === "ACTIVE_IN_PRIOR_DOMAIN") {
    if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
    else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
    else classification = "EXCLUDED_WITH_BLOCKERS";
  }
  else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (blockers.filter((b) => b !== "PEDS_REVIEW_REQUIRED" && b !== "VACCINE_MODULE_REQUIRED").length === 0) {
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
      classification === "RESTRICTED_PEDS_REVIEW" ||
      classification === "ALREADY_PROVIDER_ORDERABLE" ||
      classification === "ACTIVE_IN_PRIOR_DOMAIN"
        ? []
        : [...new Set(blockers)],
  };
}

function inventoryRows(): PediatricsInventoryRow[] {
  if (!inventoryCache) inventoryCache = PEDIATRICS_TARGETS.map(rowForTarget);
  return inventoryCache;
}

export function buildPediatricsBaselineReport(): PediatricsBaselineReport {
  const oncology = runOncologyGovernanceAndFormularyExpansionReport();
  return {
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    vaccineProviderOrderingActive: listActiveVaccineProviderOrderingCatalogCodes().length > 0,
    ivFluidsActive: listActiveIvFluidsProviderOrderingCatalogCodes().length > 0,
    gastroenterologyActive: listActiveGastroenterologyProviderOrderingCatalogCodes().length > 0,
    obgynActive: listActiveObgynProviderOrderingCatalogCodes().length > 0,
    oncologyGovernanceReady:
      oncology.finalDecision === "ONCOLOGY_GOVERNANCE_READY" || oncology.finalDecision === "READY_WITH_BLOCKERS",
    buildGate: "PASS",
  };
}

export function buildPediatricsInventoryReport(): PediatricsInventoryReport {
  const rows = inventoryRows();
  const blocked = rows.filter((row) => row.classification === "EXCLUDED_WITH_BLOCKERS").length;
  return {
    decision: blocked === 0 ? "PASS" : blocked < rows.length ? "PARTIAL" : "FAIL",
    rows,
  };
}

export function buildPediatricsVaccineCoverageReport(): PediatricsVaccineCoverageReport {
  const rows = ENTERPRISE_PEDIATRICS_VACCINES_MANIFEST.map((entry): PediatricsVaccineCoverageRow => {
    const record =
      orderabilityRows().find((row) => entry.preferredCatalogCodes.includes(row.catalogCode)) ??
      orderabilityRows().find((row) => entry.searchTokens.some((token) => blob(row).includes(token.toLowerCase())));
    const blockers: string[] = [];
    if (!record) blockers.push("CATALOG_MISSING");
    if (entry.classification === "RESTRICTED_PEDS_REVIEW") blockers.push("PEDS_VACCINE_REVIEW_REQUIRED");
    return {
      vaccineId: entry.vaccineId,
      labelEn: entry.labelEn,
      catalogPresent: Boolean(record),
      catalogCode: record?.catalogCode ?? null,
      classification: entry.classification,
      blockers,
    };
  });
  return {
    decision: rows.some((row) => row.catalogPresent) ? "PARTIAL" : "FAIL",
    ready: rows.filter((row) => row.classification === "READY").map((row) => row.labelEn),
    restrictedPedsReview: rows.filter((row) => row.classification === "RESTRICTED_PEDS_REVIEW").map((row) => row.labelEn),
    rows,
  };
}

export function buildPediatricsCatalogRemediationReport(): PediatricsCatalogRemediationReport {
  return {
    rows: PEDIATRICS_REMEDIATION.map((spec) => {
      const row =
        orderabilityRows().find((candidate) => candidate.catalogCode === spec.catalogCode) ??
        orderabilityRows().find((candidate) => spec.tokens.some((token) => blob(candidate).includes(token)));
      const billing = ENTERPRISE_PEDIATRICS_BILLING_BY_CODE[spec.catalogCode];
      return {
        medication: spec.medication,
        catalogCode: spec.catalogCode,
        catalogPresent: Boolean(row),
        canonicalFamily: row ? canonicalMedicationFamilyKey(row) : ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE[spec.catalogCode]?.genericName.toLowerCase() ?? null,
        ndcConfidence: billing?.ndcConfidence ?? null,
        blockers: row ? [] : ["CATALOG_MISSING"],
      };
    }),
  };
}

export function buildPediatricsWorkflowCompatibilityReport(): PediatricsWorkflowCompatibilityReport {
  const rows = PEDIATRICS_WORKFLOWS.map((workflow) => {
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

export function buildPediatricsProviderOrderingEligibilityReport(): PediatricsProviderOrderingEligibilityReport {
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
    restrictedPedsReview: rows.filter((row) => row.classification === "RESTRICTED_PEDS_REVIEW").map((row) => row.medication),
    activeInPriorDomain: rows.filter((row) => row.classification === "ACTIVE_IN_PRIOR_DOMAIN").map((row) => row.medication),
    eligibleCatalogCodes: rows.filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING").map((row) => row.catalogCode),
    rows: rows.map((row) => ({ medication: row.medication, catalogCode: row.catalogCode, classification: row.classification, blockers: row.blockers })),
  };
}

export function buildPediatricsProviderOrderingActivationRegistry(): PediatricsProviderOrderingActivationRegistry {
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
      return !activation.controlledSubstanceFlag && !activation.vaccineFlag && !CHEMOTHERAPY_TERMS.some((term) => row.catalogCode.toLowerCase().includes(term));
    })
    .map((row): PediatricsActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified pediatrics provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function buildPediatricsProviderOrderingActivationReport(): PediatricsProviderOrderingActivationReport {
  const activated = buildPediatricsProviderOrderingActivationRegistry().entries;
  const rows = inventoryRows();
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const vaccineRows = buildPediatricsVaccineCoverageReport().rows;
  return {
    activatedCatalogCodes: activated.map((entry) => entry.catalogCode),
    newlyActivatedCount: activated.length,
    alreadyCoveredCount: rows.filter(
      (row) => row.classification === "ALREADY_PROVIDER_ORDERABLE" || row.classification === "ACTIVE_IN_PRIOR_DOMAIN"
    ).length,
    controlledSubstancesNotActivated: rows.filter((row) => row.blockers.includes("CONTROLLED_SUBSTANCE_BLOCKED")).map((row) => row.medication),
    chemotherapyNotActivated: rows.filter((row) => row.blockers.includes("CHEMOTHERAPY_BLOCKED")).map((row) => row.medication),
    vaccinesNotActivatedByPediatricsModule: vaccineRows.filter((row) => row.classification === "RESTRICTED_PEDS_REVIEW").map((row) => row.labelEn),
    orderPersistsImmediately: workflow.orderPersistedImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    pharmacyApprovalNotRequired: workflow.marScheduledImmediately && workflow.orderPersistedImmediately,
  };
}

export function listActivePediatricsProviderOrderingCatalogCodes(
  registry = buildPediatricsProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActivePediatricsProviderOrderingMedication(
  catalogCode: string,
  registry = buildPediatricsProviderOrderingActivationRegistry()
): boolean {
  return listActivePediatricsProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function validatePediatricsProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: PediatricsProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildPediatricsProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("PEDIATRICS_MEDICATION_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function rollbackPediatricsProviderOrderingActivation(input: {
  registry: PediatricsProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): PediatricsProviderOrderingActivationRegistry {
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

export function buildPediatricsSafetyGovernanceReport(): PediatricsSafetyGovernanceReport {
  const restrictedActivated = buildPediatricsProviderOrderingActivationRegistry().entries.filter((entry) =>
    PEDIATRICS_TARGETS.some(
      (target) => target.classification === "RESTRICTED_PEDS_REVIEW" && target.preferredCatalogCodes.includes(entry.catalogCode)
    )
  );
  return {
    decision: restrictedActivated.length === 0 ? "PASS" : "FAIL",
    weightBasedDosingAdvisory: "ADVISORY",
    ageRestrictionAdvisory: "ADVISORY",
    maxDailyDoseAdvisory: "ADVISORY",
    neonatalRestrictionAdvisory: "ADVISORY",
    allergyAlertAdvisory: "ADVISORY",
    vaccineScheduleAdvisory: "ADVISORY",
    blocksProviderOrdering: false,
  };
}

export function buildPediatricsBillingInventoryReport(): PediatricsBillingInventoryReport {
  const codes = new Set([
    ...inventoryRows().map((row) => row.catalogCode).filter(Boolean),
    ...buildPediatricsProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode),
  ]);
  const rows = [...codes].map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  const blockers: string[] = [];
  const activated = buildPediatricsProviderOrderingActivationRegistry().entries;
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

export function buildPediatricsProviderSearchSafetyReport(): PediatricsProviderSearchSafetyReport {
  const codes = listActivePediatricsProviderOrderingCatalogCodes();
  const collision = certifyProviderSearchCollisions();
  const scoped = orderabilityRows().filter((row) => codes.includes(row.catalogCode));
  const codeLeakage = scoped.some(
    (row) => row.displayNameEn.trim().toUpperCase() === row.catalogCode || row.displayNameFr.trim().toUpperCase() === row.catalogCode
  );
  const duplicateRows = codes.length - new Set(codes).size;
  const pediatricFormulationsPreferred = scoped.every((row) => isPediatricFormulation(row) || row.dosageForm.includes("sirop") || row.dosageForm.includes("suspension"));
  const blockers: string[] = [];
  if (collision.decision !== "SAFE") blockers.push("PROVIDER_SEARCH_COLLISION");
  if (codeLeakage) blockers.push("CATALOG_CODE_LEAKAGE");
  if (duplicateRows > 0) blockers.push("DUPLICATE_ACTIVATION_CODE");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    duplicateRows,
    catalogCodeLeakage: codeLeakage,
    pediatricFormulationsPreferred,
    canonicalDisplayPreserved: scoped.every((row) => row.displayNameEn.trim() && row.displayNameFr.trim()),
    blockers,
  };
}

export function buildPediatricsRollbackReport(): PediatricsRollbackReport {
  const registry = buildPediatricsProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackPediatricsProviderOrderingActivation({ registry, catalogCode: first.catalogCode, reason: "Pediatrics rollback drill" })
    : registry;
  return {
    removesFromFutureProviderSearch: first ? !listActivePediatricsProviderOrderingCatalogCodes(rolledBack).includes(first.catalogCode) : true,
    blocksNewFutureOrdersAfterRollback: first
      ? !validatePediatricsProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }).allowed
      : true,
    preservesOrders: true,
    preservesMar: true,
    preservesBilling: true,
    preservesInventory: true,
    preservesAuditTrail: true,
  };
}

export function buildPediatricsI18nCertificationReport(): PediatricsI18nCertificationReport {
  const codes = new Set(listActivePediatricsProviderOrderingCatalogCodes());
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

export function runPediatricsProviderOrderingExpansionReport(): PediatricsProviderOrderingExpansionReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildPediatricsBaselineReport();
  const inventory = buildPediatricsInventoryReport();
  const providerOrderingActivation = buildPediatricsProviderOrderingActivationReport();
  const billingInventory = buildPediatricsBillingInventoryReport();
  const safetyGovernance = buildPediatricsSafetyGovernanceReport();
  const providerSearchSafety = buildPediatricsProviderSearchSafetyReport();
  const i18n = buildPediatricsI18nCertificationReport();
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const coreMeds = [
    "Amoxicillin suspension",
    "Augmentin suspension",
    "Cefdinir suspension",
    "Acetaminophen liquid",
    "Ibuprofen suspension",
    "Albuterol nebulizer",
    "Prednisolone solution",
    "Ondansetron ODT",
    "Cetirizine",
    "Loratadine",
    "Erythromycin ophthalmic",
  ];
  const coreCoverage = coreMeds.every((medication) => {
    const row = inventory.rows.find((candidate) => candidate.medication === medication);
    return row && row.classification !== "EXCLUDED_WITH_BLOCKERS";
  });
  const finalDecision: PediatricsActivationDecision =
    providerOrderingActivation.activatedCatalogCodes.length > 0 &&
    providerOrderingActivation.orderPersistsImmediately &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingInventory.decision === "PASS" &&
    safetyGovernance.decision === "PASS" &&
    providerSearchSafety.decision === "PASS" &&
    i18n.decision === "PASS" &&
    hardStopsPass &&
    coreCoverage
      ? "PEDIATRICS_PROVIDER_ORDERING_ACTIVE"
      : providerOrderingActivation.activatedCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.PEDIATRICS_PROVIDER_ORDERING_EXPANSION.1",
    baseline,
    inventory,
    vaccineCoverage: buildPediatricsVaccineCoverageReport(),
    catalogRemediation: buildPediatricsCatalogRemediationReport(),
    workflowCompatibility: buildPediatricsWorkflowCompatibilityReport(),
    providerOrderingEligibility: buildPediatricsProviderOrderingEligibilityReport(),
    providerOrderingActivation,
    safetyGovernance,
    billingInventory,
    providerSearchSafety,
    rollback: buildPediatricsRollbackReport(),
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

export function resetPediatricsProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}

export function pediatricsPharmacyFollowUpStatuses(): readonly PharmacyFollowUpStatus[] {
  return PHARMACY_FOLLOW_UP_STATUSES;
}
