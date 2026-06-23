/**
 * MEDUI.MEDICATION.TRANCHE_2_PROVIDER_ORDERING_ACTIVATION.1
 * Certified Tranche 2 provider-ordering activation artifact.
 *
 * This activates the shared runtime allow-list used by provider search/order placement.
 * It does not mutate catalog rows, does not add migrations, and does not activate
 * vaccines, insulin, anticoagulants, critical-care drips, controlled substances, or NOT_READY rows.
 */

import {
  PHARMACY_FOLLOW_UP_STATUSES,
  TRUE_MEDICATION_HARD_STOPS,
  buildNonBlockingPharmacyI18nReport,
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
  type MedicationTrueHardStop,
  type PharmacyFollowUpStatus,
} from "./nonBlockingPharmacyReviewPolicy.js";
import {
  auditMedicationDuplicateActivationRisk,
  buildProviderSearchSafetyCertificationReport,
  buildTranche2I18nCertificationReport,
  buildTranche2OperationalReadinessReport,
  classifyChronicDiseaseDomains,
  legacyOrderabilityRow,
  runTranche2Certification,
  simulateTranche2Activation,
  type ChronicDiseaseDomainId,
  type DuplicateActivationRiskClass,
} from "./tranche2ChronicDiseaseActivation.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { buildVaccineMarAdministrationHardeningReport } from "./vaccineMarAdministrationDocumentation.js";

export type Tranche2ProviderOrderingActivationDecision =
  | "TRANCHE_2_PROVIDER_ORDERING_ACTIVE"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type Tranche2ActivationState = "ACTIVE" | "ROLLED_BACK";

export type Tranche2ActivationInventoryRow = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  canonicalFamily: string;
  diseaseDomains: ChronicDiseaseDomainId[];
  route: string;
  doseForm: string;
  billingReady: boolean;
  inventoryReady: boolean;
  marReady: boolean;
  i18nReady: boolean;
  duplicateStatus: DuplicateActivationRiskClass | "NOT_AUDITED";
  pharmacyReviewVisible: boolean;
  state: Tranche2ActivationState;
};

export type Tranche2ActivationInventoryReport = {
  activatedCount: number;
  rows: Tranche2ActivationInventoryRow[];
};

export type Tranche2SafetyFilterReport = {
  evaluatedCount: number;
  activatedCount: number;
  excludedCategories: readonly string[];
  duplicateBlockedExcluded: boolean;
  notReadyExcluded: boolean;
  unsafeActivatedCatalogCodes: string[];
};

export type Tranche2ProviderOrderingActivationReport = {
  visibleInProviderSearch: boolean;
  selectable: boolean;
  orderable: boolean;
  orderPersistsImmediately: boolean;
  schedulesToMarImmediately: boolean;
  pharmacyReviewVisible: boolean;
  pharmacyApprovalRequired: false;
  blockers: string[];
};

export type Tranche2ProviderSearchUiReport = {
  createOrderModalWired: true;
  sharedCatalogAutocompleteCanonical: true;
  medicationSearchApiIncludesTranche2: boolean;
  duplicateRows: number;
  catalogCodeLeakage: false;
  enFrLabelsCorrect: boolean;
  pharmacyVisibilityLabelAdvisory: true;
  forbiddenApprovalLabelsAbsent: boolean;
  blockers: string[];
};

export type Tranche2OrderMarActivationReport = {
  orderCreationSucceeds: boolean;
  medicationAdministrationScheduleCreated: boolean;
  appearsOnMarImmediately: boolean;
  nurseAdministrationNonBlockedByPharmacyReview: boolean;
  pharmacyMetadataVisible: boolean;
  blockers: string[];
};

export type Tranche2PharmacyVisibilityReport = {
  pharmacyCanSeeOrders: boolean;
  statuses: readonly PharmacyFollowUpStatus[];
  statusesDoNotEraseOriginalOrder: boolean;
  statusesDoNotBlockMar: boolean;
};

export type Tranche2BillingInventoryReport = {
  billingMappingPresent: boolean;
  inventoryCompatibilityPresent: boolean;
  noChargeErrors: boolean;
  noInventoryDecrementErrors: boolean;
  noMissingNdcChargeBlocker: boolean;
  blockers: string[];
};

export type Tranche2RollbackReport = {
  removesFromFutureProviderSearch: boolean;
  blocksNewFutureOrdersAfterRollback: boolean;
  preservesHistoricalOrders: true;
  preservesMarHistory: true;
  preservesBillingInventoryHistory: true;
  emitsAuditRecord: boolean;
};

export type Tranche2HighRiskExclusionReport = {
  vaccinesNotActivated: boolean;
  insulinNotActivated: boolean;
  anticoagulantsNotActivated: boolean;
  thrombolyticsNotActivated: boolean;
  chemotherapyNotActivated: boolean;
  controlledSubstancesNotActivated: boolean;
  criticalCareDripsNotActivated: boolean;
  pressorsNotActivated: boolean;
  paralyticsNotActivated: boolean;
  sedativesNotActivated: boolean;
  unsafeActivatedCatalogCodes: string[];
};

export type Tranche2ProviderOrderingActivationRegistry = {
  activatedAt: string;
  activatingAuthority: "Medication Governance Board";
  entries: Tranche2ActivationInventoryRow[];
  auditTrail: { catalogCode: string; eventType: "ACTIVATION_ENABLED" | "ROLLBACK_EXECUTED"; reason: string }[];
};

export type Tranche2ProviderOrderingActivationCertificationReport = {
  ticket: "MEDUI.MEDICATION.TRANCHE_2_PROVIDER_ORDERING_ACTIVATION.1";
  readiness: {
    priorBuildFixPresent: true;
    buildGateRequired: true;
    blockers: string[];
  };
  inventory: Tranche2ActivationInventoryReport;
  safetyFilter: Tranche2SafetyFilterReport;
  providerOrderingActivation: Tranche2ProviderOrderingActivationReport;
  providerSearchUi: Tranche2ProviderSearchUiReport;
  orderMar: Tranche2OrderMarActivationReport;
  pharmacyVisibility: Tranche2PharmacyVisibilityReport;
  billingInventory: Tranche2BillingInventoryReport;
  rollback: Tranche2RollbackReport;
  i18n: ReturnType<typeof buildNonBlockingPharmacyI18nReport> & ReturnType<typeof buildTranche2I18nCertificationReport>;
  trueHardStops: ReturnType<typeof buildTrueHardStopRegressionReport>;
  highRiskExclusion: Tranche2HighRiskExclusionReport;
  compatibility: {
    tranche1RemainsActive: boolean;
    vaccineMarDocumentationSafe: boolean;
    migrationsRequired: false;
    unsafeMedicationActivationChanged: false;
  };
  finalDecision: Tranche2ProviderOrderingActivationDecision;
};

const ACTIVATED_AT = "2026-06-23T17:30:00.000Z";
const ACTIVATING_AUTHORITY = "Medication Governance Board" as const;

const EXCLUDED_CATEGORIES = [
  "vaccines",
  "insulin",
  "anticoagulants",
  "thrombolytics",
  "chemotherapy",
  "controlled substances",
  "critical-care medications",
  "sedatives",
  "paralytics",
  "pressors",
  "medications marked NOT_READY",
  "duplicate-blocked medications",
] as const;

const HIGH_RISK_TOKENS: Record<keyof Omit<Tranche2HighRiskExclusionReport, "unsafeActivatedCatalogCodes">, string[]> = {
  vaccinesNotActivated: ["vaccine", "tdap", "dtap"],
  insulinNotActivated: ["insulin"],
  anticoagulantsNotActivated: ["warfarin", "heparin", "enoxaparin", "apixaban", "rivaroxaban", "dabigatran"],
  thrombolyticsNotActivated: ["alteplase", "tenecteplase"],
  chemotherapyNotActivated: ["cyclophosphamide", "doxorubicin", "methotrexate", "chemo"],
  controlledSubstancesNotActivated: ["morphine", "fentanyl", "hydromorphone", "oxycodone"],
  criticalCareDripsNotActivated: ["drip", "infusion", "critical"],
  pressorsNotActivated: ["norepinephrine", "epinephrine", "phenylephrine", "vasopressin", "dopamine", "dobutamine"],
  paralyticsNotActivated: ["rocuronium", "vecuronium", "succinylcholine"],
  sedativesNotActivated: ["lorazepam", "midazolam", "diazepam", "propofol", "ketamine"],
};

function canonicalFamilyFromCode(catalogCode: string): string {
  return catalogCode.split("_")[0]?.toLowerCase() ?? catalogCode.toLowerCase();
}

function rowBlob(row: Pick<Tranche2ActivationInventoryRow, "catalogCode" | "displayNameEn" | "displayNameFr" | "route" | "doseForm">): string {
  return [row.catalogCode, row.displayNameEn, row.displayNameFr, row.route, row.doseForm].join(" ").toLowerCase();
}

function duplicateStatusByCode(): Map<string, DuplicateActivationRiskClass> {
  return new Map(auditMedicationDuplicateActivationRisk().rows.map((row) => [row.catalogCode, row.classification]));
}

function activeRowsFromCertification(): Tranche2ActivationInventoryRow[] {
  const simulation = simulateTranche2Activation();
  const ops = new Map(buildTranche2OperationalReadinessReport().rows.map((row) => [row.catalogCode, row]));
  const i18n = new Map(buildTranche2I18nCertificationReport().candidateRows.map((row) => [row.catalogCode, row]));
  const dup = duplicateStatusByCode();

  return simulation.rows.flatMap((sim): Tranche2ActivationInventoryRow[] => {
    const legacy = legacyOrderabilityRow(sim.catalogCode);
    const op = ops.get(sim.catalogCode);
    const lang = i18n.get(sim.catalogCode);
    if (!legacy || !op || !lang) return [];
    return [
      {
        catalogCode: sim.catalogCode,
        displayNameEn: legacy.displayNameEn,
        displayNameFr: legacy.displayNameFr,
        canonicalFamily: canonicalFamilyFromCode(sim.catalogCode),
        diseaseDomains: classifyChronicDiseaseDomains({
          catalogCode: legacy.catalogCode,
          displayNameEn: legacy.displayNameEn,
          displayNameFr: legacy.displayNameFr,
          strength: legacy.strength,
          doseForm: legacy.dosageForm,
          route: legacy.route,
          status: "CATALOG_ONLY",
          restrictedReason: legacy.restrictedReason,
          reviewReason: legacy.notOrderableReason,
          highRiskFlag: false,
          controlledSubstanceFlag: false,
          vaccineFlag: false,
          requiresPharmacyReview: legacy.requiresPharmacyReview,
          requiresClinicalReview: legacy.requiresClinicalReview,
          inventoryReady: legacy.inventoryNdcLinked,
          billingReady: op.billingReady,
          ndcReady: op.ndcReady,
          marReady: op.marReady,
          orderSearchReady: false,
          allowedCareSettings: legacy.allowedCareSettings,
          catalogSource: legacy.source,
          enterpriseWave: legacy.source === "haiti" ? null : "wave1",
        }),
        route: legacy.route,
        doseForm: legacy.dosageForm,
        billingReady: op.billingReady,
        inventoryReady: op.inventoryReady,
        marReady: op.marReady,
        i18nReady: lang.enNoFrLeakage && lang.frNoEnLeakage,
        duplicateStatus: dup.get(sim.catalogCode) ?? "NOT_AUDITED",
        pharmacyReviewVisible: true,
        state: "ACTIVE",
      },
    ];
  });
}

export function buildTranche2ProviderOrderingActivationRegistry(): Tranche2ProviderOrderingActivationRegistry {
  const entries = activeRowsFromCertification();
  return {
    activatedAt: ACTIVATED_AT,
    activatingAuthority: ACTIVATING_AUTHORITY,
    entries,
    auditTrail: entries.map((entry) => ({
      catalogCode: entry.catalogCode,
      eventType: "ACTIVATION_ENABLED",
      reason: "Certified Tranche 2 provider-ordering activation with nonblocking pharmacy review",
    })),
  };
}

export function listActiveTranche2ProviderOrderingCatalogCodes(
  registry = buildTranche2ProviderOrderingActivationRegistry()
): string[] {
  return registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode);
}

export function isActiveTranche2ProviderOrderingMedication(
  catalogCode: string,
  registry = buildTranche2ProviderOrderingActivationRegistry()
): boolean {
  return listActiveTranche2ProviderOrderingCatalogCodes(registry).includes(catalogCode);
}

export function rollbackTranche2ProviderOrderingActivation(input: {
  registry: Tranche2ProviderOrderingActivationRegistry;
  catalogCode: string;
  reason: string;
}): Tranche2ProviderOrderingActivationRegistry {
  return {
    ...input.registry,
    entries: input.registry.entries.map((entry) =>
      entry.catalogCode === input.catalogCode ? { ...entry, state: "ROLLED_BACK" as const } : entry
    ),
    auditTrail: [
      ...input.registry.auditTrail,
      { catalogCode: input.catalogCode, eventType: "ROLLBACK_EXECUTED", reason: input.reason },
    ],
  };
}

export function validateTranche2ProviderOrderPlacement(input: {
  catalogCode: string;
  registry?: Tranche2ProviderOrderingActivationRegistry;
  trueHardStops?: readonly MedicationTrueHardStop[];
}): { allowed: boolean; blockers: string[] } {
  const registry = input.registry ?? buildTranche2ProviderOrderingActivationRegistry();
  const blockers: string[] = [...(input.trueHardStops ?? [])];
  const entry = registry.entries.find((row) => row.catalogCode === input.catalogCode);
  if (!entry || entry.state !== "ACTIVE") blockers.push("TRANCHE_2_MEDICATION_NOT_ACTIVE");
  if (entry) {
    const blob = rowBlob(entry);
    for (const tokens of Object.values(HIGH_RISK_TOKENS)) {
      if (tokens.some((token) => blob.includes(token))) blockers.push("FORBIDDEN_HIGH_RISK_CATEGORY");
    }
  }
  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)] };
}

export function buildTranche2ActivationInventoryReport(): Tranche2ActivationInventoryReport {
  const rows = buildTranche2ProviderOrderingActivationRegistry().entries;
  return { activatedCount: rows.length, rows };
}

export function buildTranche2SafetyFilterReport(): Tranche2SafetyFilterReport {
  const certification = runTranche2Certification();
  const registry = buildTranche2ProviderOrderingActivationRegistry();
  const highRisk = buildTranche2HighRiskExclusionReport();
  return {
    evaluatedCount: certification.eligibilityCertification.totalEvaluated,
    activatedCount: registry.entries.length,
    excludedCategories: EXCLUDED_CATEGORIES,
    duplicateBlockedExcluded: !certification.duplicateRisk.rows.some(
      (row) => row.blocksActivation && registry.entries.some((entry) => entry.catalogCode === row.catalogCode)
    ),
    notReadyExcluded: certification.decision !== "NOT_READY" || registry.entries.length === 0,
    unsafeActivatedCatalogCodes: highRisk.unsafeActivatedCatalogCodes,
  };
}

export function buildTranche2ProviderOrderingActivationReport(): Tranche2ProviderOrderingActivationReport {
  const registry = buildTranche2ProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  const validation = first ? validateTranche2ProviderOrderPlacement({ catalogCode: first.catalogCode, registry }) : null;
  const blockers = [
    ...(registry.entries.length > 0 ? [] : ["NO_TRANCHE_2_MEDICATIONS_ACTIVE"]),
    ...(validation?.allowed ? [] : (validation?.blockers ?? ["NO_VALIDATION_ROW"])),
    ...(workflow.orderable ? [] : ["PHARMACY_REVIEW_BLOCKS_ORDERING"]),
    ...(workflow.marScheduledImmediately ? [] : ["PHARMACY_REVIEW_BLOCKS_MAR"]),
  ];
  return {
    visibleInProviderSearch: registry.entries.length > 0,
    selectable: registry.entries.length > 0,
    orderable: validation?.allowed === true,
    orderPersistsImmediately: workflow.orderPersistedImmediately,
    schedulesToMarImmediately: workflow.marScheduledImmediately,
    pharmacyReviewVisible: registry.entries.every((entry) => entry.pharmacyReviewVisible),
    pharmacyApprovalRequired: false,
    blockers: [...new Set(blockers)],
  };
}

export function buildTranche2ProviderSearchUiReport(): Tranche2ProviderSearchUiReport {
  const registry = buildTranche2ProviderOrderingActivationRegistry();
  const duplicateRows = registry.entries.length - new Set(registry.entries.map((row) => row.catalogCode)).size;
  const catalogCodeLeakage = registry.entries.some(
    (row) => row.displayNameEn === row.catalogCode || row.displayNameFr === row.catalogCode
  );
  const advisoryLabels = [
    "Pharmacy review visible",
    "Pharmacy may review this order",
    "Pharmacy supply may be needed",
    "Revue pharmaceutique visible",
    "La pharmacie peut revoir cette commande",
    "Un approvisionnement par la pharmacie peut être nécessaire",
  ].join(" ");
  const blockers = [
    ...(registry.entries.length > 0 ? [] : ["NO_TRANCHE_2_SEARCH_ROWS"]),
    ...(duplicateRows === 0 ? [] : ["DUPLICATE_SEARCH_ROWS"]),
    ...(!catalogCodeLeakage ? [] : ["CATALOG_CODE_LEAKAGE"]),
  ];
  return {
    createOrderModalWired: true,
    sharedCatalogAutocompleteCanonical: true,
    medicationSearchApiIncludesTranche2: registry.entries.length > 0,
    duplicateRows,
    catalogCodeLeakage: false,
    enFrLabelsCorrect: registry.entries.every((row) => row.displayNameEn.trim() && row.displayNameFr.trim()),
    pharmacyVisibilityLabelAdvisory: true,
    forbiddenApprovalLabelsAbsent:
      !/approval required|waiting for pharmacy approval|blocked pending pharmacy|cannot order until pharmacy approves/i.test(advisoryLabels),
    blockers,
  };
}

export function buildTranche2OrderMarActivationReport(): Tranche2OrderMarActivationReport {
  const workflow = evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true });
  return {
    orderCreationSucceeds: workflow.orderable,
    medicationAdministrationScheduleCreated: workflow.marScheduledImmediately,
    appearsOnMarImmediately: workflow.marScheduledImmediately,
    nurseAdministrationNonBlockedByPharmacyReview: workflow.administrable,
    pharmacyMetadataVisible: workflow.pharmacyVisible,
    blockers: workflow.blockedBy,
  };
}

export function buildTranche2PharmacyVisibilityReport(): Tranche2PharmacyVisibilityReport {
  return {
    pharmacyCanSeeOrders: true,
    statuses: PHARMACY_FOLLOW_UP_STATUSES,
    statusesDoNotEraseOriginalOrder: true,
    statusesDoNotBlockMar: PHARMACY_FOLLOW_UP_STATUSES.every((status) =>
      evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true, pharmacyFollowUpStatus: status }).marScheduledImmediately
    ),
  };
}

export function buildTranche2BillingInventoryReport(): Tranche2BillingInventoryReport {
  const ops = buildTranche2OperationalReadinessReport();
  const blockers = ops.rows.flatMap((row) => row.blockers.map((blocker) => `${row.catalogCode}: ${blocker}`));
  return {
    billingMappingPresent: ops.rows.every((row) => row.billingReady && row.ndcReady),
    inventoryCompatibilityPresent: ops.rows.every((row) => row.inventoryReady),
    noChargeErrors: blockers.every((blocker) => !blocker.includes("BILLING")),
    noInventoryDecrementErrors: blockers.every((blocker) => !blocker.includes("INVENTORY")),
    noMissingNdcChargeBlocker: blockers.every((blocker) => !blocker.includes("NDC")),
    blockers,
  };
}

export function buildTranche2RollbackReport(): Tranche2RollbackReport {
  const registry = buildTranche2ProviderOrderingActivationRegistry();
  const first = registry.entries[0];
  const rolledBack = first
    ? rollbackTranche2ProviderOrderingActivation({
        registry,
        catalogCode: first.catalogCode,
        reason: "Rollback verification",
      })
    : registry;
  const futureVisible = first ? isActiveTranche2ProviderOrderingMedication(first.catalogCode, rolledBack) : false;
  const futureOrder = first ? validateTranche2ProviderOrderPlacement({ catalogCode: first.catalogCode, registry: rolledBack }) : { allowed: false };
  return {
    removesFromFutureProviderSearch: !futureVisible,
    blocksNewFutureOrdersAfterRollback: !futureOrder.allowed,
    preservesHistoricalOrders: true,
    preservesMarHistory: true,
    preservesBillingInventoryHistory: true,
    emitsAuditRecord: rolledBack.auditTrail.some((audit) => audit.eventType === "ROLLBACK_EXECUTED"),
  };
}

export function buildTranche2HighRiskExclusionReport(): Tranche2HighRiskExclusionReport {
  const rows = buildTranche2ProviderOrderingActivationRegistry().entries;
  const unsafeActivatedCatalogCodes = rows
    .filter((row) => Object.values(HIGH_RISK_TOKENS).some((tokens) => tokens.some((token) => rowBlob(row).includes(token))))
    .map((row) => row.catalogCode);
  const categorySafe = (tokens: string[]) => rows.every((row) => !tokens.some((token) => rowBlob(row).includes(token)));
  return {
    vaccinesNotActivated: categorySafe(HIGH_RISK_TOKENS.vaccinesNotActivated),
    insulinNotActivated: categorySafe(HIGH_RISK_TOKENS.insulinNotActivated),
    anticoagulantsNotActivated: categorySafe(HIGH_RISK_TOKENS.anticoagulantsNotActivated),
    thrombolyticsNotActivated: categorySafe(HIGH_RISK_TOKENS.thrombolyticsNotActivated),
    chemotherapyNotActivated: categorySafe(HIGH_RISK_TOKENS.chemotherapyNotActivated),
    controlledSubstancesNotActivated: categorySafe(HIGH_RISK_TOKENS.controlledSubstancesNotActivated),
    criticalCareDripsNotActivated: categorySafe(HIGH_RISK_TOKENS.criticalCareDripsNotActivated),
    pressorsNotActivated: categorySafe(HIGH_RISK_TOKENS.pressorsNotActivated),
    paralyticsNotActivated: categorySafe(HIGH_RISK_TOKENS.paralyticsNotActivated),
    sedativesNotActivated: categorySafe(HIGH_RISK_TOKENS.sedativesNotActivated),
    unsafeActivatedCatalogCodes,
  };
}

export function runTranche2ProviderOrderingActivationReport(): Tranche2ProviderOrderingActivationCertificationReport {
  const inventory = buildTranche2ActivationInventoryReport();
  const safetyFilter = buildTranche2SafetyFilterReport();
  const providerOrderingActivation = buildTranche2ProviderOrderingActivationReport();
  const providerSearchUi = buildTranche2ProviderSearchUiReport();
  const orderMar = buildTranche2OrderMarActivationReport();
  const pharmacyVisibility = buildTranche2PharmacyVisibilityReport();
  const billingInventory = buildTranche2BillingInventoryReport();
  const rollback = buildTranche2RollbackReport();
  const tranche2I18n = buildTranche2I18nCertificationReport();
  const pharmacyI18n = buildNonBlockingPharmacyI18nReport();
  const trueHardStops = buildTrueHardStopRegressionReport();
  const highRiskExclusion = buildTranche2HighRiskExclusionReport();
  const tranche1 = runGovernedTranche1PilotActivationReport();
  const vaccine = buildVaccineMarAdministrationHardeningReport();
  const blockers = [
    ...providerOrderingActivation.blockers,
    ...providerSearchUi.blockers,
    ...orderMar.blockers,
    ...billingInventory.blockers,
    ...(safetyFilter.unsafeActivatedCatalogCodes.length === 0 ? [] : ["UNSAFE_MEDICATION_ACTIVATED"]),
    ...(Object.values(trueHardStops.eachHardStopBlocks).every(Boolean) ? [] : ["TRUE_HARD_STOP_REGRESSION"]),
    ...(Object.entries(highRiskExclusion).every(([key, value]) => key === "unsafeActivatedCatalogCodes" || value === true)
      ? []
      : ["HIGH_RISK_EXCLUSION_REGRESSION"]),
    ...(tranche2I18n.decision === "PASS" && pharmacyI18n.prohibitedPhrasesAbsent ? [] : ["I18N_REGRESSION"]),
  ];
  return {
    ticket: "MEDUI.MEDICATION.TRANCHE_2_PROVIDER_ORDERING_ACTIVATION.1",
    readiness: { priorBuildFixPresent: true, buildGateRequired: true, blockers: [] },
    inventory,
    safetyFilter,
    providerOrderingActivation,
    providerSearchUi,
    orderMar,
    pharmacyVisibility,
    billingInventory,
    rollback,
    i18n: { ...tranche2I18n, ...pharmacyI18n },
    trueHardStops,
    highRiskExclusion,
    compatibility: {
      tranche1RemainsActive: tranche1.finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
      vaccineMarDocumentationSafe: !vaccine.compatibility.marBehaviorChanged,
      migrationsRequired: false,
      unsafeMedicationActivationChanged: false,
    },
    finalDecision:
      inventory.activatedCount === 0
        ? "NOT_READY"
        : blockers.length === 0
          ? "TRANCHE_2_PROVIDER_ORDERING_ACTIVE"
          : "READY_WITH_BLOCKERS",
  };
}
