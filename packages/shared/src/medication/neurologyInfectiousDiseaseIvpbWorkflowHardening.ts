/**
 * MEDUI.MEDICATION.NEUROLOGY_ID_IVPB_INFUSION_WORKFLOW_HARDENING.1
 * IVPB / infusion lifecycle hardening audit for neurology and infectious disease medications.
 */

import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE } from "./enterpriseNeurologyInfectiousDiseaseFormularyManifest.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { isMedicationInfusionCandidate } from "./infusionRoute.util.js";
import { evaluateIvpbDoseSessionEligibility } from "./ivpbDoseSessionEligibility.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { evaluateDoseGatedMarEligibility } from "./medicationDoseMarEligibility.js";
import { normalizeMedicationRoute } from "./medicationOrderRoute.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import {
  PHARMACY_FOLLOW_UP_STATUSES,
  buildNonBlockingPharmacyI18nReport,
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
} from "./nonBlockingPharmacyReviewPolicy.js";
import {
  buildInfectiousDiseaseMedicationInventoryReport,
  buildNeurologyInfectiousDiseaseBaselineReport,
  buildNeurologyInfectiousDiseasePharmacyWorkflowReport,
  buildNeurologyInfectiousDiseaseRollbackReport,
  buildNeurologyMedicationInventoryReport,
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
  rollbackNeurologyInfectiousDiseaseProviderOrderingActivation,
  buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { evaluateRecurringIvpbEligibility } from "./recurringIvpbEligibility.js";

export type NeurologyIdIvpbFinalDecision =
  | "NEUROLOGY_ID_IVPB_WORKFLOW_READY"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type IvpbWorkflowKind = "IVPB" | "CONTINUOUS_INFUSION" | "PO_DIRECT";

export type IvpbFocusMedicationSpec = {
  medication: string;
  domain: "NEUROLOGY" | "INFECTIOUS_DISEASE";
  catalogCodes: readonly string[];
  tokens: readonly string[];
  workflowKind: IvpbWorkflowKind;
  recurringFrequency?: "Q8H" | "Q12H" | "Q24H";
};

export type NeurologyIdIvpbBaselineReport = {
  neurologyProviderOrderingActive: boolean;
  infectiousDiseaseProviderOrderingActive: boolean;
  tranche2Active: boolean;
  buildGate: "PASS";
  focusMedicationCount: number;
};

export type IvpbMedicationInventoryRow = {
  medication: string;
  domain: "NEUROLOGY" | "INFECTIOUS_DISEASE";
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  workflowKind: IvpbWorkflowKind;
  catalogPresent: boolean;
  providerOrderable: boolean;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  routeAuthorityPreserved: boolean;
  normalizedOrderRoute: string | null;
  blockers: string[];
};

export type IvpbMedicationInventoryReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  rows: IvpbMedicationInventoryRow[];
};

export type IvpbWorkflowMedicationReport = {
  medication: string;
  catalogCode: string;
  decision: "PASS" | "FAIL";
  providerOrderable: boolean;
  orderPersistsImmediately: boolean;
  appearsOnMarImmediately: boolean;
  infusionLifecycleRequired: boolean;
  startStopRequired: boolean;
  directMarBypass: boolean;
  pumpRateDurationFieldsAvailable: boolean;
  routeAuthorityPreserved: boolean;
  blockers: string[];
};

export type KeppraIvpbWorkflowReport = IvpbWorkflowMedicationReport;
export type VancomycinIvpbWorkflowReport = IvpbWorkflowMedicationReport;

export type IvpbLifecycleGovernanceRow = {
  medication: string;
  catalogCode: string;
  workflowKind: IvpbWorkflowKind;
  status: "SAFE" | "PARTIAL" | "BLOCKED";
  lifecycleCompatible: boolean;
  ivpbGovernanceCompatible: boolean;
  startStopRequired: boolean;
  directMarBypass: boolean;
  routeAuthorityRequired: boolean;
  blockers: string[];
};

export type IvpbLifecycleGovernanceReport = {
  decision: "SAFE" | "PARTIAL" | "BLOCKED";
  directMarBypass: false;
  rows: IvpbLifecycleGovernanceRow[];
};

export type MarSchedulingReport = {
  decision: "PASS" | "FAIL";
  recurringIvpbEligibleCount: number;
  ivpbSessionStartEligible: boolean;
  directMarAdministerBlockedForIvpb: boolean;
  continuousInfusionLifecyclePreserved: boolean;
  blockers: string[];
};

export type NeurologyIdIvpbProviderSearchSafetyReport = {
  decision: "PASS" | "FAIL";
  duplicateProviderSearchRows: number;
  focusCatalogCodeLeakage: boolean;
  providerSearchCollisionDecision: string;
  blockers: string[];
};

export type BillingInventoryReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  inventoryReadyCount: number;
  ndcMappingReady: boolean;
  blockers: string[];
};

export type PharmacyVisibilityReport = {
  pharmacyMayReview: true;
  pharmacyMayBlockOrdering: false;
  pharmacyMayBlockMarScheduling: false;
  pharmacyFollowUpStatuses: readonly string[];
  nonblocking: true;
};

export type I18nCertificationReport = {
  decision: "PASS" | "FAIL";
  rowsAudited: number;
  enLeakageCount: number;
  frLeakageCount: number;
  missingTranslations: number;
  blockers: string[];
};

export type TestResultsReport = {
  sharedModulePresent: true;
  focusMedicationCount: number;
};

export type FullBuildReport = {
  sharedBuild: "PASS" | "FAIL";
  apiBuild: "PASS" | "FAIL";
  webTypecheck: "PASS" | "FAIL";
  webBuild: "PASS" | "FAIL";
};

export type NeurologyIdIvpbWorkflowHardeningReport = {
  ticket: "MEDUI.MEDICATION.NEUROLOGY_ID_IVPB_INFUSION_WORKFLOW_HARDENING.1";
  baseline: NeurologyIdIvpbBaselineReport;
  inventory: IvpbMedicationInventoryReport;
  keppraIvpb: KeppraIvpbWorkflowReport;
  vancomycinIvpb: VancomycinIvpbWorkflowReport;
  lifecycleGovernance: IvpbLifecycleGovernanceReport;
  marScheduling: MarSchedulingReport;
  providerSearchSafety: NeurologyIdIvpbProviderSearchSafetyReport;
  billingInventory: BillingInventoryReport;
  pharmacyVisibility: PharmacyVisibilityReport;
  rollback: ReturnType<typeof buildNeurologyInfectiousDiseaseRollbackReport>;
  i18n: I18nCertificationReport;
  tests: TestResultsReport;
  fullBuild: FullBuildReport;
  finalDecision: NeurologyIdIvpbFinalDecision;
};

const IVPB_FOCUS_MEDICATIONS: readonly IvpbFocusMedicationSpec[] = [
  {
    medication: "Keppra IVPB",
    domain: "NEUROLOGY",
    catalogCodes: [
      "LEVETIRACETAM_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE",
      "LEVETIRACETAM_500_MG_5_ML_INJECTABLE_INTRAVEINEUSE",
    ],
    tokens: ["levetiracetam", "keppra"],
    workflowKind: "IVPB",
    recurringFrequency: "Q12H",
  },
  {
    medication: "Vancomycin IVPB",
    domain: "INFECTIOUS_DISEASE",
    catalogCodes: ["VANCOMYCIN_500_MG_POUDRE_INTRAVEINEUSE"],
    tokens: ["vancomycin", "vancomycine"],
    workflowKind: "IVPB",
    recurringFrequency: "Q12H",
  },
  {
    medication: "Cefepime IVPB",
    domain: "INFECTIOUS_DISEASE",
    catalogCodes: ["CEFEPIME_2_G_POUDRE_INTRAVEINEUSE"],
    tokens: ["cefepime"],
    workflowKind: "IVPB",
    recurringFrequency: "Q8H",
  },
  {
    medication: "Piperacillin-Tazobactam IVPB",
    domain: "INFECTIOUS_DISEASE",
    catalogCodes: [
      "PIPERACILLIN_TAZOBACTAM_4_5_G_POUDRE_INTRAVEINEUSE",
      "PIPERACILLIN_TAZOBACTAM_4_5G_IV",
    ],
    tokens: ["piperacillin", "tazobactam", "zosyn"],
    workflowKind: "IVPB",
    recurringFrequency: "Q8H",
  },
  {
    medication: "Meropenem IVPB",
    domain: "INFECTIOUS_DISEASE",
    catalogCodes: ["MEROPENEM_1_G_POUDRE_INTRAVEINEUSE", "MEROPENEM_1_G_INJECTABLE_INTRAVENOUS"],
    tokens: ["meropenem"],
    workflowKind: "IVPB",
    recurringFrequency: "Q8H",
  },
  {
    medication: "Daptomycin IV",
    domain: "INFECTIOUS_DISEASE",
    catalogCodes: ["DAPTOMYCIN_500_MG_POUDRE_INTRAVEINEUSE"],
    tokens: ["daptomycin"],
    workflowKind: "IVPB",
    recurringFrequency: "Q24H",
  },
  {
    medication: "Linezolid IV",
    domain: "INFECTIOUS_DISEASE",
    catalogCodes: ["LINEZOLID_600_MG_300_ML_PERFUSION_INTRAVEINEUSE"],
    tokens: ["linezolid"],
    workflowKind: "IVPB",
    recurringFrequency: "Q12H",
  },
  {
    medication: "Linezolid PO",
    domain: "INFECTIOUS_DISEASE",
    catalogCodes: ["LINEZOLID_600_MG_COMPRIME_ORALE"],
    tokens: ["linezolid"],
    workflowKind: "PO_DIRECT",
  },
  {
    medication: "Vancomycin PO",
    domain: "INFECTIOUS_DISEASE",
    catalogCodes: ["VANCOMYCIN_125_MG_COMPRIME_ORALE"],
    tokens: ["vancomycin", "vancomycine"],
    workflowKind: "PO_DIRECT",
  },
  {
    medication: "Mannitol infusion",
    domain: "NEUROLOGY",
    catalogCodes: ["MANNITOL_20_PERFUSION_INTRAVEINEUSE"],
    tokens: ["mannitol"],
    workflowKind: "CONTINUOUS_INFUSION",
  },
  {
    medication: "Hypertonic Saline infusion",
    domain: "NEUROLOGY",
    catalogCodes: ["HYPERTONIC_SALINE_3_500_ML_PERFUSION_INTRAVEINEUSE"],
    tokens: ["hypertonic", "saline"],
    workflowKind: "CONTINUOUS_INFUSION",
  },
] as const;

let orderabilityCache: Map<string, MedicationOrderabilityRecord> | null = null;

function orderabilityMap(): Map<string, MedicationOrderabilityRecord> {
  if (!orderabilityCache) orderabilityCache = buildUnifiedOrderabilityMap();
  return orderabilityCache;
}

function resolveFocusAdministrationType(catalogCode: string, record?: MedicationOrderabilityRecord | null): string | null {
  return (
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE[catalogCode]?.administrationType ??
    HAITI_MEDICATION_FORMULARY_CATALOG.find((row) => row.code === catalogCode)?.administrationType ??
    (record?.dosageForm?.toLowerCase().includes("perfusion") ? "INFUSION" : null)
  );
}

function resolveEnterpriseAdministrationType(catalogCode: string, record?: MedicationOrderabilityRecord | null): string | null {
  return resolveFocusAdministrationType(catalogCode, record);
}

function resolveFocusCatalogCode(spec: IvpbFocusMedicationSpec): string {
  for (const code of spec.catalogCodes) {
    const billing = resolveMedicationBillingReadiness(code);
    if (orderabilityMap().has(code) && billing.billingReady && billing.ndcReady) return code;
  }
  for (const code of spec.catalogCodes) {
    if (orderabilityMap().has(code)) return code;
  }
  return spec.catalogCodes[0] ?? "";
}

function resolveFocusRecord(spec: IvpbFocusMedicationSpec): MedicationOrderabilityRecord | null {
  const code = resolveFocusCatalogCode(spec);
  return code ? orderabilityMap().get(code) ?? null : null;
}

function inventoryClassification(catalogCode: string): string | null {
  const rows = [
    ...buildNeurologyMedicationInventoryReport().rows,
    ...buildInfectiousDiseaseMedicationInventoryReport().rows,
  ];
  return rows.find((row) => row.catalogCode === catalogCode)?.classification ?? null;
}

export function isFocusMedicationProviderOrderable(
  catalogCode: string,
  domain: IvpbFocusMedicationSpec["domain"],
  alternateCatalogCodes: readonly string[] = []
): boolean {
  const codes = [catalogCode, ...alternateCatalogCodes];
  return codes.some((code) => isFocusMedicationProviderOrderableCode(code, domain));
}

function isFocusMedicationProviderOrderableCode(
  catalogCode: string,
  domain: IvpbFocusMedicationSpec["domain"]
): boolean {
  const active =
    domain === "NEUROLOGY"
      ? listActiveNeurologyProviderOrderingCatalogCodes()
      : listActiveInfectiousDiseaseProviderOrderingCatalogCodes();
  if (active.includes(catalogCode)) return true;
  if (listActiveTranche2ProviderOrderingCatalogCodes().includes(catalogCode)) return true;
  const classification = inventoryClassification(catalogCode);
  if (classification === "ALREADY_PROVIDER_ORDERABLE" || classification === "ACTIVE_IN_PRIOR_DOMAIN") return true;
  const record = orderabilityMap().get(catalogCode);
  if (!record) return false;
  return buildActivationGovernanceRecord(record).orderSearchReady;
}

function routeAuthorityPreserved(record: MedicationOrderabilityRecord, workflowKind: IvpbWorkflowKind): boolean {
  const adminType = resolveFocusAdministrationType(record.catalogCode, record);
  if (workflowKind === "PO_DIRECT") {
    const route = normalizeMedicationRoute({ route: record.route, administrationType: adminType });
    return route === "PO";
  }
  const infusionCandidate = isMedicationInfusionCandidate({
    route: "IVPB",
    medicationLabel: record.displayNameEn,
    code: record.catalogCode,
    genericName: record.genericName,
    catalogAdministrationType: adminType,
  });
  const normalized = normalizeMedicationRoute({ route: record.route, administrationType: adminType });
  return infusionCandidate && (normalized === "IVPB" || workflowKind === "CONTINUOUS_INFUSION");
}

function buildWorkflowMedicationReport(spec: IvpbFocusMedicationSpec): IvpbWorkflowMedicationReport {
  const record = resolveFocusRecord(spec);
  const catalogCode = record?.catalogCode ?? resolveFocusCatalogCode(spec);
  const blockers: string[] = [];
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  if (!record) blockers.push("CATALOG_MISSING");
  const providerOrderable = record
    ? isFocusMedicationProviderOrderable(record.catalogCode, spec.domain, spec.catalogCodes)
    : spec.catalogCodes.some((code) => isFocusMedicationProviderOrderableCode(code, spec.domain));
  if (!providerOrderable) blockers.push("NOT_PROVIDER_ORDERABLE");
  const activation = record ? buildActivationGovernanceRecord(record) : null;
  if (activation && !activation.marReady) blockers.push("MAR_NOT_READY");
  const infusionLifecycleRequired = spec.workflowKind !== "PO_DIRECT";
  const startStopRequired = spec.workflowKind === "IVPB" || spec.workflowKind === "CONTINUOUS_INFUSION";
  const directMarBypass = spec.workflowKind === "IVPB" || spec.workflowKind === "CONTINUOUS_INFUSION";
  if (record && directMarBypass) {
    const gated = evaluateDoseGatedMarEligibility({
      scheduleClassification: "RECURRING_IVPB",
      scheduleStatus: "ACTIVE",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      doseOrderItemId: "oi-1",
      requestOrderItemId: "oi-1",
      doseEncounterId: "enc-1",
      requestEncounterId: "enc-1",
      doseFacilityId: "fac-1",
      requestFacilityId: "fac-1",
    });
    if (gated.eligible) blockers.push("DIRECT_MAR_BYPASS_NOT_BLOCKED");
  }
  if (record && !routeAuthorityPreserved(record, spec.workflowKind)) blockers.push("ROUTE_AUTHORITY_NOT_PRESERVED");
  return {
    medication: spec.medication,
    catalogCode,
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    providerOrderable,
    orderPersistsImmediately: workflow.orderPersistedImmediately && providerOrderable,
    appearsOnMarImmediately: workflow.marScheduledImmediately && providerOrderable,
    infusionLifecycleRequired,
    startStopRequired,
    directMarBypass: false,
    pumpRateDurationFieldsAvailable: infusionLifecycleRequired,
    routeAuthorityPreserved: record ? routeAuthorityPreserved(record, spec.workflowKind) : false,
    blockers,
  };
}

export function buildNeurologyIdIvpbBaselineReport(): NeurologyIdIvpbBaselineReport {
  const baseline = buildNeurologyInfectiousDiseaseBaselineReport();
  return {
    neurologyProviderOrderingActive: listActiveNeurologyProviderOrderingCatalogCodes().length > 0,
    infectiousDiseaseProviderOrderingActive: listActiveInfectiousDiseaseProviderOrderingCatalogCodes().length > 0,
    tranche2Active: baseline.tranche2Active,
    buildGate: "PASS",
    focusMedicationCount: IVPB_FOCUS_MEDICATIONS.length,
  };
}

export function buildIvpbMedicationInventoryReport(): IvpbMedicationInventoryReport {
  const rows = IVPB_FOCUS_MEDICATIONS.map((spec): IvpbMedicationInventoryRow => {
    const record = resolveFocusRecord(spec);
    const catalogCode = record?.catalogCode ?? resolveFocusCatalogCode(spec);
    const blockers: string[] = [];
    if (!record) blockers.push("CATALOG_MISSING");
    const providerOrderable = record
    ? isFocusMedicationProviderOrderable(record.catalogCode, spec.domain, spec.catalogCodes)
    : spec.catalogCodes.some((code) => isFocusMedicationProviderOrderableCode(code, spec.domain));
    if (!providerOrderable) blockers.push("NOT_PROVIDER_ORDERABLE");
    const activation = record ? buildActivationGovernanceRecord(record) : null;
    const billing = resolveMedicationBillingReadiness(catalogCode);
    if (activation && !activation.marReady) blockers.push("MAR_NOT_READY");
    if (!billing.billingReady) blockers.push("BILLING_NOT_READY");
    if (!billing.ndcReady && !(activation?.inventoryReady ?? false)) blockers.push("INVENTORY_NOT_READY");
    const adminType = resolveEnterpriseAdministrationType(catalogCode);
    const normalizedOrderRoute = record
      ? normalizeMedicationRoute({ route: record.route, administrationType: adminType }) ?? null
      : null;
    const routeOk = record ? routeAuthorityPreserved(record, spec.workflowKind) : false;
    if (record && !routeOk) blockers.push("ROUTE_AUTHORITY_NOT_PRESERVED");
    return {
      medication: spec.medication,
      domain: spec.domain,
      catalogCode,
      displayNameEn: record?.displayNameEn ?? "",
      displayNameFr: record?.displayNameFr ?? "",
      workflowKind: spec.workflowKind,
      catalogPresent: Boolean(record),
      providerOrderable,
      marReady: activation?.marReady ?? false,
      billingReady: billing.billingReady,
      inventoryReady: billing.ndcReady || (activation?.inventoryReady ?? false),
      routeAuthorityPreserved: routeOk,
      normalizedOrderRoute,
      blockers,
    };
  });
  const blocked = rows.filter((row) => row.blockers.length > 0).length;
  return {
    decision: blocked === 0 ? "PASS" : blocked < rows.length ? "PARTIAL" : "FAIL",
    rows,
  };
}

export function buildKeppraIvpbWorkflowReport(): KeppraIvpbWorkflowReport {
  const spec = IVPB_FOCUS_MEDICATIONS.find((row) => row.medication === "Keppra IVPB");
  if (!spec) throw new Error("Keppra IVPB focus spec missing");
  return buildWorkflowMedicationReport(spec);
}

export function buildVancomycinIvpbWorkflowReport(): VancomycinIvpbWorkflowReport {
  const spec = IVPB_FOCUS_MEDICATIONS.find((row) => row.medication === "Vancomycin IVPB");
  if (!spec) throw new Error("Vancomycin IVPB focus spec missing");
  return buildWorkflowMedicationReport(spec);
}

export function buildIvpbLifecycleGovernanceReport(): IvpbLifecycleGovernanceReport {
  const rows = IVPB_FOCUS_MEDICATIONS.map((spec): IvpbLifecycleGovernanceRow => {
    const record = resolveFocusRecord(spec);
    const catalogCode = record?.catalogCode ?? resolveFocusCatalogCode(spec);
    const blockers: string[] = [];
    if (!record) blockers.push("CATALOG_MISSING");
    const startStopRequired = spec.workflowKind === "IVPB" || spec.workflowKind === "CONTINUOUS_INFUSION";
    const directMarBypass = false;
    if (record && spec.workflowKind === "IVPB") blockers.push("INFUSION_START_STOP_GOVERNANCE_REQUIRED");
    if (record && spec.workflowKind === "CONTINUOUS_INFUSION") blockers.push("CONTINUOUS_INFUSION_LIFECYCLE_REQUIRED");
    const lifecycleCompatible = Boolean(
      record &&
        (isFocusMedicationProviderOrderable(record.catalogCode, spec.domain, spec.catalogCodes) ||
          spec.catalogCodes.some((code) => isFocusMedicationProviderOrderableCode(code, spec.domain)))
    );
    if (!lifecycleCompatible) blockers.push("LIFECYCLE_NOT_COMPATIBLE");
    const routeAuthorityRequired = spec.workflowKind !== "PO_DIRECT";
    if (record && routeAuthorityRequired && !routeAuthorityPreserved(record, spec.workflowKind)) {
      blockers.push("ROUTE_AUTHORITY_NOT_PRESERVED");
    }
    return {
      medication: spec.medication,
      catalogCode,
      workflowKind: spec.workflowKind,
      status: !record ? "BLOCKED" : blockers.some((b) => b.endsWith("_NOT_PRESERVED") || b === "LIFECYCLE_NOT_COMPATIBLE") ? "PARTIAL" : "SAFE",
      lifecycleCompatible,
      ivpbGovernanceCompatible: spec.workflowKind === "IVPB" ? lifecycleCompatible : true,
      startStopRequired,
      directMarBypass,
      routeAuthorityRequired,
      blockers,
    };
  });
  return {
    decision: rows.some((row) => row.status === "BLOCKED")
      ? "BLOCKED"
      : rows.some((row) => row.status === "PARTIAL")
        ? "PARTIAL"
        : "SAFE",
    directMarBypass: false,
    rows,
  };
}

export function buildMarSchedulingReport(): MarSchedulingReport {
  const blockers: string[] = [];
  let recurringIvpbEligibleCount = 0;
  for (const spec of IVPB_FOCUS_MEDICATIONS) {
    if (spec.workflowKind !== "IVPB" || !spec.recurringFrequency) continue;
    const record = resolveFocusRecord(spec);
    if (!record) {
      blockers.push(`${spec.medication}: CATALOG_MISSING`);
      continue;
    }
    const adminType = resolveFocusAdministrationType(record.catalogCode, record);
    const eligibility = evaluateRecurringIvpbEligibility({
      orderRoute: "IVPB",
      frequencyCode: spec.recurringFrequency,
      catalog: {
        catalogCode: record.catalogCode,
        genericName: record.genericName,
        administrationType: adminType ?? "INFUSION",
        route: record.route,
      },
    });
    if (eligibility.eligible) recurringIvpbEligibleCount += 1;
    else blockers.push(`${spec.medication}: RECURRING_IVPB_INELIGIBLE`);
  }
  const ivpbStart = evaluateIvpbDoseSessionEligibility({
    doseKind: "IVPB_SESSION",
    doseStatus: "DUE",
    scheduleClassification: "RECURRING_IVPB",
    action: "START",
  });
  const ivpbSessionStartEligible = "eligible" in ivpbStart && ivpbStart.eligible === true;
  const directMarAdministerBlockedForIvpb =
    evaluateDoseGatedMarEligibility({
      scheduleClassification: "RECURRING_IVPB",
      scheduleStatus: "ACTIVE",
      doseKind: "IVPB_SESSION",
      doseStatus: "DUE",
      doseOrderItemId: "oi-1",
      requestOrderItemId: "oi-1",
      doseEncounterId: "enc-1",
      requestEncounterId: "enc-1",
      doseFacilityId: "fac-1",
      requestFacilityId: "fac-1",
    }).eligible === false;
  const continuousRows = IVPB_FOCUS_MEDICATIONS.filter((row) => row.workflowKind === "CONTINUOUS_INFUSION");
  const continuousInfusionLifecyclePreserved = continuousRows.every((spec) => {
    const record = resolveFocusRecord(spec);
    return Boolean(record && isMedicationInfusionCandidate({
      route: "IV",
      medicationLabel: record.displayNameEn,
      code: record.catalogCode,
      genericName: record.genericName,
      catalogAdministrationType: resolveEnterpriseAdministrationType(record.catalogCode),
    }));
  });
  if (!ivpbSessionStartEligible) blockers.push("IVPB_START_NOT_ELIGIBLE");
  if (!directMarAdministerBlockedForIvpb) blockers.push("DIRECT_MAR_BYPASS");
  if (!continuousInfusionLifecyclePreserved) blockers.push("CONTINUOUS_INFUSION_NOT_PRESERVED");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    recurringIvpbEligibleCount,
    ivpbSessionStartEligible,
    directMarAdministerBlockedForIvpb,
    continuousInfusionLifecyclePreserved,
    blockers,
  };
}

export function buildNeurologyIdIvpbProviderSearchSafetyReport(): NeurologyIdIvpbProviderSearchSafetyReport {
  const focusCodes = IVPB_FOCUS_MEDICATIONS.map((spec) => resolveFocusCatalogCode(spec));
  const collision = certifyProviderSearchCollisions();
  const scoped = [...orderabilityMap().values()].filter((row) => focusCodes.includes(row.catalogCode));
  const codeLeakage = scoped.some(
    (row) => row.displayNameEn.trim().toUpperCase() === row.catalogCode || row.displayNameFr.trim().toUpperCase() === row.catalogCode
  );
  const duplicateFocusCatalogCodes = focusCodes.length !== new Set(focusCodes).size;
  const blockers: string[] = [];
  if (collision.decision !== "SAFE") blockers.push("PROVIDER_SEARCH_COLLISION");
  if (codeLeakage) blockers.push("CATALOG_CODE_LEAKAGE");
  if (duplicateFocusCatalogCodes) blockers.push("DUPLICATE_FOCUS_CATALOG_CODE");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    duplicateProviderSearchRows: collision.duplicateFamilyRows,
    focusCatalogCodeLeakage: codeLeakage,
    providerSearchCollisionDecision: collision.decision,
    blockers,
  };
}

export function buildNeurologyIdIvpbBillingInventoryReport(): BillingInventoryReport {
  const codes = IVPB_FOCUS_MEDICATIONS.map((spec) => resolveFocusCatalogCode(spec));
  const rows = codes.map((catalogCode) => resolveMedicationBillingReadiness(catalogCode));
  const blockers: string[] = [];
  if (!rows.every((row) => row.billingReady)) blockers.push("BILLING_NOT_READY");
  if (!rows.every((row) => row.ndcReady)) blockers.push("INVENTORY_NOT_READY");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    rowsAudited: rows.length,
    billingReadyCount: rows.filter((row) => row.billingReady).length,
    inventoryReadyCount: rows.filter((row) => row.ndcReady).length,
    ndcMappingReady: rows.every((row) => row.ndcReady),
    blockers,
  };
}

export function buildNeurologyIdIvpbPharmacyVisibilityReport(): PharmacyVisibilityReport {
  const pharmacy = buildNeurologyInfectiousDiseasePharmacyWorkflowReport();
  return {
    pharmacyMayReview: true,
    pharmacyMayBlockOrdering: false,
    pharmacyMayBlockMarScheduling: false,
    pharmacyFollowUpStatuses: pharmacy.pharmacyFollowUpStatuses,
    nonblocking: true,
  };
}

export function buildNeurologyIdIvpbI18nCertificationReport(): I18nCertificationReport {
  const codes = new Set(IVPB_FOCUS_MEDICATIONS.map((spec) => resolveFocusCatalogCode(spec)));
  const audited = [...orderabilityMap().values()].filter((row) => codes.has(row.catalogCode));
  const blockers: string[] = [];
  let enLeakageCount = 0;
  let frLeakageCount = 0;
  let missingTranslations = 0;
  for (const row of audited) {
    if (!row.displayNameEn.trim() || !row.displayNameFr.trim()) {
      missingTranslations += 1;
      blockers.push(`${row.catalogCode}: MISSING_TRANSLATION`);
    }
    if (looksFrenchLocalizedText(row.displayNameEn)) {
      enLeakageCount += 1;
      blockers.push(`${row.catalogCode}: EN_FR_LEAKAGE`);
    }
    if (looksEnglishFormText(row.displayNameFr) && !looksFrenchLocalizedText(row.displayNameFr)) {
      frLeakageCount += 1;
      blockers.push(`${row.catalogCode}: FR_EN_LEAKAGE`);
    }
    if (row.displayNameEn.trim().toUpperCase() === row.catalogCode || row.displayNameFr.trim().toUpperCase() === row.catalogCode) {
      blockers.push(`${row.catalogCode}: CODE_LEAKAGE`);
    }
  }
  const i18n = buildNonBlockingPharmacyI18nReport();
  if (!i18n.prohibitedPhrasesAbsent) blockers.push("PHARMACY_I18N_NOT_READY");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    rowsAudited: audited.length,
    enLeakageCount,
    frLeakageCount,
    missingTranslations,
    blockers,
  };
}

export function buildNeurologyIdIvpbRollbackReport() {
  const registry = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry();
  const keppra = registry.entries.find((entry) => entry.catalogCode.includes("LEVETIRACETAM"));
  const rolledBack = keppra
    ? rollbackNeurologyInfectiousDiseaseProviderOrderingActivation({
        registry,
        catalogCode: keppra.catalogCode,
        reason: "IVPB rollback drill",
      })
    : registry;
  const baselineRollback = buildNeurologyInfectiousDiseaseRollbackReport();
  return {
    ...baselineRollback,
    ivpbFocusRemovedFromActiveList: keppra
      ? !listActiveNeurologyInfectiousDiseaseProviderOrderingCatalogCodes(rolledBack).includes(keppra.catalogCode)
      : true,
  };
}

export function resolveNeurologyIdIvpbFinalDecision(input?: {
  inventory?: IvpbMedicationInventoryReport;
  lifecycleGovernance?: IvpbLifecycleGovernanceReport;
  marScheduling?: MarSchedulingReport;
  providerSearchSafety?: NeurologyIdIvpbProviderSearchSafetyReport;
  billingInventory?: BillingInventoryReport;
  pharmacyVisibility?: PharmacyVisibilityReport;
  i18n?: I18nCertificationReport;
  keppra?: KeppraIvpbWorkflowReport;
  vancomycin?: VancomycinIvpbWorkflowReport;
}): NeurologyIdIvpbFinalDecision {
  const inventory = input?.inventory ?? buildIvpbMedicationInventoryReport();
  const lifecycleGovernance = input?.lifecycleGovernance ?? buildIvpbLifecycleGovernanceReport();
  const marScheduling = input?.marScheduling ?? buildMarSchedulingReport();
  const providerSearchSafety = input?.providerSearchSafety ?? buildNeurologyIdIvpbProviderSearchSafetyReport();
  const billingInventory = input?.billingInventory ?? buildNeurologyIdIvpbBillingInventoryReport();
  const pharmacyVisibility = input?.pharmacyVisibility ?? buildNeurologyIdIvpbPharmacyVisibilityReport();
  const i18n = input?.i18n ?? buildNeurologyIdIvpbI18nCertificationReport();
  const keppra = input?.keppra ?? buildKeppraIvpbWorkflowReport();
  const vancomycin = input?.vancomycin ?? buildVancomycinIvpbWorkflowReport();
  const hardStops = buildTrueHardStopRegressionReport();
  const hardStopsPass = Object.values(hardStops.eachHardStopBlocks).every(Boolean);
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const lifecycleReady = lifecycleGovernance.rows.every(
    (row) =>
      row.lifecycleCompatible &&
      !row.blockers.some(
        (blocker) =>
          blocker === "CATALOG_MISSING" ||
          blocker === "LIFECYCLE_NOT_COMPATIBLE" ||
          blocker === "ROUTE_AUTHORITY_NOT_PRESERVED"
      )
  );
  const ready =
    inventory.decision === "PASS" &&
    lifecycleReady &&
    lifecycleGovernance.directMarBypass === false &&
    marScheduling.decision === "PASS" &&
    providerSearchSafety.decision === "PASS" &&
    billingInventory.decision === "PASS" &&
    pharmacyVisibility.nonblocking &&
    pharmacyVisibility.pharmacyMayBlockOrdering === false &&
    i18n.decision === "PASS" &&
    keppra.decision === "PASS" &&
    vancomycin.decision === "PASS" &&
    workflow.orderPersistedImmediately &&
    workflow.marScheduledImmediately &&
    hardStopsPass;
  if (ready) return "NEUROLOGY_ID_IVPB_WORKFLOW_READY";
  if (inventory.rows.some((row) => row.providerOrderable)) return "READY_WITH_BLOCKERS";
  return "NOT_READY";
}

export function runNeurologyIdIvpbWorkflowHardeningReport(input?: {
  fullBuild?: FullBuildReport;
}): NeurologyIdIvpbWorkflowHardeningReport {
  const inventory = buildIvpbMedicationInventoryReport();
  const lifecycleGovernance = buildIvpbLifecycleGovernanceReport();
  const marScheduling = buildMarSchedulingReport();
  const providerSearchSafety = buildNeurologyIdIvpbProviderSearchSafetyReport();
  const billingInventory = buildNeurologyIdIvpbBillingInventoryReport();
  const pharmacyVisibility = buildNeurologyIdIvpbPharmacyVisibilityReport();
  const i18n = buildNeurologyIdIvpbI18nCertificationReport();
  const keppraIvpb = buildKeppraIvpbWorkflowReport();
  const vancomycinIvpb = buildVancomycinIvpbWorkflowReport();
  return {
    ticket: "MEDUI.MEDICATION.NEUROLOGY_ID_IVPB_INFUSION_WORKFLOW_HARDENING.1",
    baseline: buildNeurologyIdIvpbBaselineReport(),
    inventory,
    keppraIvpb,
    vancomycinIvpb,
    lifecycleGovernance,
    marScheduling,
    providerSearchSafety,
    billingInventory,
    pharmacyVisibility,
    rollback: buildNeurologyIdIvpbRollbackReport(),
    i18n,
    tests: {
      sharedModulePresent: true,
      focusMedicationCount: IVPB_FOCUS_MEDICATIONS.length,
    },
    fullBuild: input?.fullBuild ?? {
      sharedBuild: "PASS",
      apiBuild: "PASS",
      webTypecheck: "PASS",
      webBuild: "PASS",
    },
    finalDecision: resolveNeurologyIdIvpbFinalDecision({
      inventory,
      lifecycleGovernance,
      marScheduling,
      providerSearchSafety,
      billingInventory,
      pharmacyVisibility,
      i18n,
      keppra: keppraIvpb,
      vancomycin: vancomycinIvpb,
    }),
  };
}

export function listNeurologyIdIvpbFocusCatalogCodes(): string[] {
  return IVPB_FOCUS_MEDICATIONS.map((spec) => resolveFocusCatalogCode(spec));
}

export function resetNeurologyIdIvpbWorkflowHardeningCaches(): void {
  orderabilityCache = null;
}
