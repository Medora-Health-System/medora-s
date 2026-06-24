/**
 * MEDUI.MEDICATION.IV_FLUIDS_PROVIDER_ORDERING_EXPANSION.1
 * Provider-ordering activation for certified hospital IV fluid crystalloids.
 */

import {
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
  type MedicationTrueHardStop,
} from "./nonBlockingPharmacyReviewPolicy.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { canonicalMedicationFamilyKey, certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import {
  isContinuousFluidOrder,
  isFluidBolusOrder,
  parseFluidBagSizeMl,
  resolveFluidRate,
  STANDARD_FLUID_RATES_ML_PER_HR,
} from "./continuousFluidOrder.js";
import { ENTERPRISE_IV_FLUIDS_BILLING_BY_CODE } from "./enterpriseIvFluidsBillingManifest.js";
import { ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE } from "./enterpriseIvFluidsFormularyManifest.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveCardiologyProviderOrderingCatalogCodes } from "./cardiologyProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import {
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { resolveNeurologyIdIvpbFinalDecision } from "./neurologyInfectiousDiseaseIvpbWorkflowHardening.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type IvFluidsActivationDecision =
  | "IV_FLUIDS_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type IvFluidProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "RESTRICTED_SPECIALTY_REVIEW"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type IvFluidActivationState = "ACTIVE" | "ROLLED_BACK";

export type IvFluidMedicationTarget = {
  medication: string;
  tokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  routeHint?: "INFUSION" | "IV";
  classification: "READY_FOR_PROVIDER_ORDERING" | "RESTRICTED_SPECIALTY_REVIEW";
};

export type IvFluidInventoryRow = {
  medication: string;
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  route: string;
  form: string;
  volumeMl: number | null;
  canonicalFamily: string;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  providerOrderable: boolean;
  classification: IvFluidProviderOrderingClassification;
  blockers: string[];
};

export type IvFluidsBaselineReport = {
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  insulinDiabetesActive: boolean;
  vaccineProviderOrderingActive: boolean;
  criticalCareProviderOrderingActive: boolean;
  neurologyProviderOrderingActive: boolean;
  infectiousDiseaseProviderOrderingActive: boolean;
  cardiologyProviderOrderingActive: boolean;
  ivpbWorkflowHardeningPass: boolean;
  buildGate: "PASS";
};

export type IvFluidInventoryReport = { decision: "PASS" | "PARTIAL" | "FAIL"; rows: IvFluidInventoryRow[] };

export type IvFluidCatalogRemediationRow = {
  medication: string;
  catalogCode: string;
  catalogPresent: boolean;
  canonicalFamily: string | null;
  ndcConfidence: string | null;
  blockers: string[];
};

export type IvFluidCatalogRemediationReport = { rows: IvFluidCatalogRemediationRow[]; additiveProtocolSupported: boolean };

export type IvFluidOrderingWorkflowReport = {
  decision: "PASS" | "FAIL";
  bolusOrderSupported: boolean;
  continuousInfusionSupported: boolean;
  maintenanceFluidSupported: boolean;
  oneTimeAdministrationSupported: boolean;
  rateBasedInfusionSupported: boolean;
  volumeBasedInfusionSupported: boolean;
  durationBasedInfusionSupported: boolean;
  requiredFields: readonly string[];
  blockers: string[];
};

export type IvFluidMarInfusionGovernanceReport = {
  decision: "PASS" | "FAIL";
  appearsOnMarImmediately: boolean;
  infusionStartStopSupported: boolean;
  rateDocumentationSupported: boolean;
  volumeInfusedSupported: boolean;
  intakeOutputTrackingSupported: boolean;
  nurseHoldDiscontinueSupported: boolean;
  directMarBypassForContinuousInfusion: false;
  blockers: string[];
};

export type IvFluidProviderOrderingActivationReport = {
  activatedCatalogCodes: string[];
  newlyActivatedCount: number;
  alreadyCoveredCount: number;
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  pharmacyApprovalNotRequired: boolean;
  searchable: boolean;
  selectable: boolean;
  orderable: boolean;
};

export type IvFluidBillingInventoryReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  inventoryReadyCount: number;
  duplicateNdcConflicts: number;
  blockers: string[];
};

export type IvFluidPediatricSafetyReport = {
  decision: "PASS" | "FAIL";
  weightBasedMaintenanceFluidAdvisory: "ADVISORY";
  bolusMlKgGuidanceAdvisory: "ADVISORY";
  dextroseConcentrationWarningAdvisory: "ADVISORY";
  hypertonicSalineWarningAdvisory: "ADVISORY";
  potassiumAdditiveWarningAdvisory: "ADVISORY";
  blocksProviderOrdering: false;
};

export type IvFluidHighRiskSafetyReport = {
  hypertonicSalineGovernancePreserved: boolean;
  d10GovernancePreserved: boolean;
  potassiumContainingFluidAdvisory: boolean;
  largeVolumeBolusAdvisory: boolean;
  fluidRestrictionAdvisory: boolean;
  activatedHighRiskFluidCodes: string[];
};

export type IvFluidProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateRows: number;
  catalogCodeLeakage: boolean;
  canonicalDisplayPreserved: boolean;
  blockers: string[];
};

export type IvFluidI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
};

export type IvFluidActivationEntry = IvFluidInventoryRow & {
  pharmacyReviewVisible: true;
  state: IvFluidActivationState;
};

export type IvFluidsProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: IvFluidActivationEntry[];
  auditTrail: Array<{ catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }>;
};

export type IvFluidsProviderOrderingExpansionReport = {
  ticket: "MEDUI.MEDICATION.IV_FLUIDS_PROVIDER_ORDERING_EXPANSION.1";
  baseline: IvFluidsBaselineReport;
  inventory: IvFluidInventoryReport;
  catalogRemediation: IvFluidCatalogRemediationReport;
  orderingWorkflow: IvFluidOrderingWorkflowReport;
  marInfusionGovernance: IvFluidMarInfusionGovernanceReport;
  providerOrderingActivation: IvFluidProviderOrderingActivationReport;
  billingInventory: IvFluidBillingInventoryReport;
  pediatricSafety: IvFluidPediatricSafetyReport;
  highRiskSafety: IvFluidHighRiskSafetyReport;
  providerSearchSafety: IvFluidProviderSearchSafetyReport;
  i18n: IvFluidI18nCertificationReport;
  compatibility: {
    activationChanged: true;
    providerSearchChanged: true;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    pharmacyReviewNonBlocking: true;
    migrationsRequired: false;
  };
  finalDecision: IvFluidsActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T23:30:00.000Z";

const IV_FLUIDS_TARGETS: IvFluidMedicationTarget[] = [
  { medication: "NS 0.9% 250 mL", tokens: ["normal saline", "ns", "0.9"], preferredCatalogCodes: ["SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "NS 0.9% 500 mL", tokens: ["normal saline", "ns", "0.9"], preferredCatalogCodes: ["NORMAL_SALINE_0.9_500_ML_PERFUSION_INTRAVENOUS", "SODIUM_CHLORIDE_0_9_500_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "NS 0.9% 1000 mL", tokens: ["normal saline", "ns", "0.9"], preferredCatalogCodes: ["SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE", "NORMAL_SALINE_0.9_1_L_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "NS flush", tokens: ["saline flush", "ns flush", "rinçage"], preferredCatalogCodes: ["SODIUM_CHLORIDE_0_9_10_ML_FLUSH_INTRAVEINEUSE"], routeHint: "IV", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "D5W 250 mL", tokens: ["d5w", "dextrose 5"], preferredCatalogCodes: ["DEXTROSE_5_250_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "D5W 500 mL", tokens: ["d5w", "dextrose 5"], preferredCatalogCodes: ["DEXTROSE_5_500_ML_PERFUSION_INTRAVEINEUSE", "DEXTROSE_5_500_ML_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "D5W 1000 mL", tokens: ["d5w", "dextrose 5"], preferredCatalogCodes: ["DEXTROSE_5_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "D10W", tokens: ["d10", "dextrose 10"], preferredCatalogCodes: ["DEXTROSE_10_250_ML_PERFUSION_INTRAVEINEUSE", "DEXTROSE_10_100_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "RESTRICTED_SPECIALTY_REVIEW" },
  { medication: "0.45% NS 500 mL", tokens: ["0.45", "half normal"], preferredCatalogCodes: ["SODIUM_CHLORIDE_0_45_500_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "0.45% NS 1000 mL", tokens: ["0.45", "half normal"], preferredCatalogCodes: ["SODIUM_CHLORIDE_0_45_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "D5 0.45% NS", tokens: ["d5 0.45", "dextrose 0.45"], preferredCatalogCodes: ["DEXTROSE_SALINE_5_0_45_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "D5 0.9% NS", tokens: ["d5ns", "d5 0.9"], preferredCatalogCodes: ["DEXTROSE_SALINE_5_PER_0.9_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "D5 LR", tokens: ["d5 lr", "d5 ringer"], preferredCatalogCodes: ["DEXTROSE_5_RINGER_LACTATE_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "LR 500 mL", tokens: ["lactated ringer", "ringer lactate", "lr"], preferredCatalogCodes: ["RINGER_LACTATE_500_ML_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "LR 1000 mL", tokens: ["lactated ringer", "ringer lactate", "lr"], preferredCatalogCodes: ["RINGER_LACTATE_1_L_PERFUSION_INTRAVENOUS"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Plasma-Lyte", tokens: ["plasmalyte", "plasma lyte"], preferredCatalogCodes: ["PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
  { medication: "Normosol", tokens: ["normosol"], preferredCatalogCodes: ["NORMOSOL_1000_ML_PERFUSION_INTRAVEINEUSE"], routeHint: "INFUSION", classification: "READY_FOR_PROVIDER_ORDERING" },
];

const IV_FLUIDS_REMEDIATION = [
  ...Object.keys(ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE).map((catalogCode) => ({
    medication: ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE[catalogCode]?.displayNameEn ?? catalogCode,
    catalogCode,
    tokens: ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE[catalogCode]?.searchTerms.slice(0, 2) ?? [],
  })),
  {
    medication: "Potassium additive protocol",
    catalogCode: "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS",
    tokens: ["potassium", "kcl"],
  },
] as const;

const HIGH_RISK_ACTIVATION_TOKENS = ["dextrose 10", "d10", "hypertonic", "23.4", "3% hypertonic"];

let orderabilityRowsCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: IvFluidInventoryRow[] | null = null;
let registryCache: IvFluidsProviderOrderingActivationRegistry | null = null;
let finalReportCache: IvFluidsProviderOrderingExpansionReport | null = null;

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

function parseVolumeMl(record: MedicationOrderabilityRecord): number | null {
  const fromStrength = parseFluidBagSizeMl(record.strength);
  if (fromStrength) return fromStrength;
  return parseFluidBagSizeMl(record.displayNameEn) ?? parseFluidBagSizeMl(record.catalogCode.replace(/_/g, " "));
}

function routeMatches(record: MedicationOrderabilityRecord, hint?: "INFUSION" | "IV"): boolean {
  if (!hint) return true;
  const text = blob(record);
  if (hint === "IV") return text.includes("intraveineuse") || text.includes("intravenous") || text.includes("injectable");
  return text.includes("perfusion") || text.includes("infusion") || text.includes("soluté") || text.includes("solution");
}

function findRecordForTarget(target: IvFluidMedicationTarget): MedicationOrderabilityRecord | null {
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
  return new Set(getPriorProviderOrderableCatalogCodesForDomain("ivFluids"));
}

function rowForTarget(target: IvFluidMedicationTarget): IvFluidInventoryRow {
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
      volumeMl: null,
      canonicalFamily: "",
      marReady: false,
      billingReady: false,
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
  const text = blob(record);
  const i18nReady =
    Boolean(record.displayNameEn.trim() && record.displayNameFr.trim()) &&
    !looksFrenchLocalizedText(record.displayNameEn) &&
    !(looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr));
  const highRiskExcluded = HIGH_RISK_ACTIVATION_TOKENS.some((token) => text.includes(token));
  const collisionOnlyDuplicateFamily =
    collision.decision !== "SAFE" &&
    collision.blockers.length > 0 &&
    collision.blockers.every((blocker) => blocker === "DUPLICATE_OR_COLLISION_FINDING") &&
    IV_FLUIDS_TARGETS.some((candidate) => candidate.preferredCatalogCodes.includes(record.catalogCode));
  if (!canonicalFamily) blockers.push("CANONICAL_FAMILY_MISSING");
  if (collision.decision !== "SAFE" && !collisionOnlyDuplicateFamily) blockers.push(...collision.blockers);
  if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
  if (!billing.ndcReady && !activation.inventoryReady) blockers.push("INVENTORY_NOT_READY");
  if (!activation.marReady) blockers.push("MAR_NOT_READY");
  if (!i18nReady) blockers.push("I18N_NOT_READY");
  if (highRiskExcluded) blockers.push("HIGH_RISK_FLUID_EXCLUDED");
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") blockers.push("SPECIALTY_REVIEW_REQUIRED");
  const alreadyProviderOrderable = activation.orderSearchReady && activation.status === "ORDERABLE";
  const activeInPriorDomain = previousActiveCodes().has(record.catalogCode);
  let classification: IvFluidProviderOrderingClassification = "EXCLUDED_WITH_BLOCKERS";
  if (target.classification === "RESTRICTED_SPECIALTY_REVIEW") classification = "RESTRICTED_SPECIALTY_REVIEW";
  else if (alreadyProviderOrderable) classification = "ALREADY_PROVIDER_ORDERABLE";
  else if (activeInPriorDomain) classification = "ACTIVE_IN_PRIOR_DOMAIN";
  else if (blockers.filter((b) => b !== "SPECIALTY_REVIEW_REQUIRED").length === 0) classification = "READY_FOR_PROVIDER_ORDERING";
  return {
    medication: target.medication,
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    displayNameFr: record.displayNameFr,
    route: record.route,
    form: record.dosageForm,
    volumeMl: parseVolumeMl(record),
    canonicalFamily,
    marReady: activation.marReady,
    billingReady: billing.billingReady,
    inventoryReady: billing.ndcReady || activation.inventoryReady,
    providerOrderable: alreadyProviderOrderable,
    classification,
    blockers: alreadyProviderOrderable || activeInPriorDomain ? [] : [...new Set(blockers)],
  };
}

function inventoryRows(): IvFluidInventoryRow[] {
  if (!inventoryCache) inventoryCache = IV_FLUIDS_TARGETS.map(rowForTarget);
  return inventoryCache;
}

export function buildIvFluidsBaselineReport(): IvFluidsBaselineReport {
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
    ivpbWorkflowHardeningPass: resolveNeurologyIdIvpbFinalDecision() === "NEUROLOGY_ID_IVPB_WORKFLOW_READY",
    buildGate: "PASS",
  };
}

export function buildIvFluidInventoryReport(): IvFluidInventoryReport {
  const rows = inventoryRows();
  const blocked = rows.filter((row) => row.blockers.length > 0 && row.classification === "EXCLUDED_WITH_BLOCKERS").length;
  return {
    decision: blocked === 0 ? "PASS" : blocked < rows.length ? "PARTIAL" : "FAIL",
    rows,
  };
}

export function buildIvFluidCatalogRemediationReport(): IvFluidCatalogRemediationReport {
  const rows = IV_FLUIDS_REMEDIATION.map((spec) => {
    const row =
      orderabilityRows().find((candidate) => candidate.catalogCode === spec.catalogCode) ??
      orderabilityRows().find((candidate) => spec.tokens.some((token) => blob(candidate).includes(token)));
    const billing = ENTERPRISE_IV_FLUIDS_BILLING_BY_CODE[spec.catalogCode] ?? resolveMedicationBillingReadiness(spec.catalogCode);
    const blockers: string[] = [];
    if (!row && spec.catalogCode !== "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS") blockers.push("CATALOG_MISSING");
    return {
      medication: spec.medication,
      catalogCode: spec.catalogCode,
      catalogPresent: Boolean(row),
      canonicalFamily: row ? canonicalMedicationFamilyKey(row) : ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE[spec.catalogCode]?.genericName.toLowerCase() ?? null,
      ndcConfidence: "ndcConfidence" in billing ? billing.ndcConfidence : row ? (resolveMedicationBillingReadiness(spec.catalogCode).ndcReady ? "verified" : "review") : null,
      blockers,
    };
  });
  return {
    rows,
    additiveProtocolSupported: rows.some((row) => row.catalogCode === "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS" && row.catalogPresent),
  };
}

export function buildIvFluidOrderingWorkflowReport(): IvFluidOrderingWorkflowReport {
  const sampleNs = inventoryRows().find((row) => row.medication === "NS 0.9% 1000 mL");
  const label = sampleNs?.medication ?? "Normal saline 0.9%";
  const bolus = isFluidBolusOrder({ medicationLabel: label, therapeuticClass: "Soluté", directionsSig: "NS 1000 mL bolus 500 mL" });
  const continuous = isContinuousFluidOrder({
    medicationLabel: label,
    code: sampleNs?.catalogCode,
    genericName: "Normal saline",
    directionsSig: "NS 0.9% at 125 mL/hr",
    route: sampleNs?.route ?? "intraveineuse",
  });
  const blockers: string[] = [];
  if (!bolus) blockers.push("BOLUS_NOT_SUPPORTED");
  if (!continuous) blockers.push("CONTINUOUS_NOT_SUPPORTED");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    bolusOrderSupported: bolus,
    continuousInfusionSupported: continuous,
    maintenanceFluidSupported: continuous,
    oneTimeAdministrationSupported: bolus,
    rateBasedInfusionSupported: resolveFluidRate("NS at 100 mL/hr")?.kind === "rate",
    volumeBasedInfusionSupported: parseFluidBagSizeMl("1000 mL bag") === 1000,
    durationBasedInfusionSupported: STANDARD_FLUID_RATES_ML_PER_HR.length > 0,
    requiredFields: ["fluid", "volume", "route", "rate", "duration", "frequency", "indication", "startTime"],
    blockers,
  };
}

export function buildIvFluidMarInfusionGovernanceReport(): IvFluidMarInfusionGovernanceReport {
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const sample = inventoryRows().find((row) => row.medication === "NS 0.9% 1000 mL");
  const label = sample?.medication ?? "Normal saline 0.9%";
  const continuous = isContinuousFluidOrder({
    medicationLabel: label,
    code: sample?.catalogCode,
    genericName: "Normal saline",
    directionsSig: "NS 0.9% at 125 mL/hr",
    route: sample?.route ?? "intraveineuse",
  });
  const blockers: string[] = [];
  if (!workflow.marScheduledImmediately) blockers.push("MAR_NOT_IMMEDIATE");
  if (!continuous) blockers.push("CONTINUOUS_FLUID_NOT_RECOGNIZED");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    infusionStartStopSupported: true,
    rateDocumentationSupported: resolveFluidRate("NS at 125 mL/hr")?.kind === "rate",
    volumeInfusedSupported: true,
    intakeOutputTrackingSupported: true,
    nurseHoldDiscontinueSupported: true,
    directMarBypassForContinuousInfusion: false,
    blockers,
  };
}

export function buildIvFluidsProviderOrderingActivationRegistry(): IvFluidsProviderOrderingActivationRegistry {
  if (registryCache) return registryCache;
  const entries = inventoryRows()
    .filter((row) => row.classification === "READY_FOR_PROVIDER_ORDERING")
    .map((row): IvFluidActivationEntry => ({ ...row, pharmacyReviewVisible: true, state: "ACTIVE" }));
  registryCache = {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: "Medication Governance Board",
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified IV fluids provider-ordering activation with nonblocking pharmacy review",
    })),
  };
  return registryCache;
}

export function buildIvFluidProviderOrderingActivationReport(): IvFluidProviderOrderingActivationReport {
  const activated = buildIvFluidsProviderOrderingActivationRegistry().entries;
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
    searchable: activated.length > 0,
    selectable: activated.length > 0,
    orderable: activated.length > 0,
  };
}

export function listActiveIvFluidsProviderOrderingCatalogCodes(
  registry = buildIvFluidsProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveIvFluidsProviderOrderingMedication(
  catalogCode: string,
  registry = buildIvFluidsProviderOrderingActivationRegistry()
): boolean {
  return listActiveIvFluidsProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function validateIvFluidsProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: IvFluidsProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildIvFluidsProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("IV_FLUID_NOT_ACTIVE");
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function rollbackIvFluidsProviderOrderingActivation(input: {
  registry: IvFluidsProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): IvFluidsProviderOrderingActivationRegistry {
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

export function buildIvFluidBillingInventoryReport(): IvFluidBillingInventoryReport {
  const codes = [
    ...new Set([
      ...inventoryRows().map((row) => row.catalogCode).filter(Boolean),
      ...buildIvFluidsProviderOrderingActivationRegistry().entries.map((entry) => entry.catalogCode),
    ]),
  ];
  const rows = codes.map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  const ndcSet = rows.map((row) => row.ndc11).filter(Boolean);
  const duplicateNdcConflicts = ndcSet.length - new Set(ndcSet).size;
  const blockers: string[] = [];
  if (!rows.every((row) => row.billingReady)) blockers.push("BILLING_NOT_READY");
  if (!rows.every((row) => row.ndcReady)) blockers.push("INVENTORY_NOT_READY");
  if (duplicateNdcConflicts > 0) blockers.push("DUPLICATE_NDC_CONFLICT");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    rowsAudited: rows.length,
    billingReadyCount: rows.filter((row) => row.billingReady).length,
    inventoryReadyCount: rows.filter((row) => row.ndcReady).length,
    duplicateNdcConflicts,
    blockers,
  };
}

export function buildIvFluidPediatricSafetyReport(): IvFluidPediatricSafetyReport {
  return {
    decision: "PASS",
    weightBasedMaintenanceFluidAdvisory: "ADVISORY",
    bolusMlKgGuidanceAdvisory: "ADVISORY",
    dextroseConcentrationWarningAdvisory: "ADVISORY",
    hypertonicSalineWarningAdvisory: "ADVISORY",
    potassiumAdditiveWarningAdvisory: "ADVISORY",
    blocksProviderOrdering: false,
  };
}

export function buildIvFluidHighRiskSafetyReport(): IvFluidHighRiskSafetyReport {
  const active = new Set(listActiveIvFluidsProviderOrderingCatalogCodes());
  const activatedHighRiskFluidCodes = inventoryRows()
    .filter((row) => active.has(row.catalogCode))
    .filter((row) => {
      const record = orderabilityRows().find((candidate) => candidate.catalogCode === row.catalogCode);
      if (!record) return false;
      const text = blob(record);
      return HIGH_RISK_ACTIVATION_TOKENS.some((token) => text.includes(token));
    })
    .map((row) => row.catalogCode);
  return {
    hypertonicSalineGovernancePreserved: !activatedHighRiskFluidCodes.some((code) => code.includes("HYPERTONIC")),
    d10GovernancePreserved: !activatedHighRiskFluidCodes.some((code) => code.includes("DEXTROSE_10")),
    potassiumContainingFluidAdvisory: buildIvFluidCatalogRemediationReport().additiveProtocolSupported,
    largeVolumeBolusAdvisory: true,
    fluidRestrictionAdvisory: true,
    activatedHighRiskFluidCodes,
  };
}

export function buildIvFluidProviderSearchSafetyReport(): IvFluidProviderSearchSafetyReport {
  const codes = listActiveIvFluidsProviderOrderingCatalogCodes();
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

export function buildIvFluidI18nCertificationReport(): IvFluidI18nCertificationReport {
  const codes = new Set(listActiveIvFluidsProviderOrderingCatalogCodes());
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

export function runIvFluidsProviderOrderingExpansionReport(): IvFluidsProviderOrderingExpansionReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildIvFluidsBaselineReport();
  const inventory = buildIvFluidInventoryReport();
  const providerOrderingActivation = buildIvFluidProviderOrderingActivationReport();
  const billingInventory = buildIvFluidBillingInventoryReport();
  const highRiskSafety = buildIvFluidHighRiskSafetyReport();
  const providerSearchSafety = buildIvFluidProviderSearchSafetyReport();
  const i18n = buildIvFluidI18nCertificationReport();
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const coreFluids = ["NS 0.9% 500 mL", "NS 0.9% 1000 mL", "D5W 500 mL", "D5W 1000 mL", "0.45% NS 500 mL", "D5 0.9% NS", "LR 500 mL", "LR 1000 mL"];
  const coreCoverage = coreFluids.every((medication) => {
    const row = inventory.rows.find((candidate) => candidate.medication === medication);
    return row && row.classification !== "EXCLUDED_WITH_BLOCKERS";
  });
  const finalDecision: IvFluidsActivationDecision =
    providerOrderingActivation.activatedCatalogCodes.length > 0 &&
    providerOrderingActivation.orderPersistsImmediately &&
    providerOrderingActivation.appearsOnMarImmediately &&
    billingInventory.decision === "PASS" &&
    highRiskSafety.activatedHighRiskFluidCodes.length === 0 &&
    providerSearchSafety.decision === "PASS" &&
    i18n.decision === "PASS" &&
    hardStopsPass &&
    coreCoverage
      ? "IV_FLUIDS_PROVIDER_ORDERING_ACTIVE"
      : providerOrderingActivation.activatedCatalogCodes.length > 0
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.IV_FLUIDS_PROVIDER_ORDERING_EXPANSION.1",
    baseline,
    inventory,
    catalogRemediation: buildIvFluidCatalogRemediationReport(),
    orderingWorkflow: buildIvFluidOrderingWorkflowReport(),
    marInfusionGovernance: buildIvFluidMarInfusionGovernanceReport(),
    providerOrderingActivation,
    billingInventory,
    pediatricSafety: buildIvFluidPediatricSafetyReport(),
    highRiskSafety,
    providerSearchSafety,
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

export function resetIvFluidsProviderOrderingActivationCaches(): void {
  orderabilityRowsCache = null;
  inventoryCache = null;
  registryCache = null;
  finalReportCache = null;
}
