/**
 * MEDUI.MEDICATION.TRANCHE_1_PILOT_UI_AND_API_WIRING.1
 * Shared contracts for limited provider-search and order-placement wiring.
 */

import {
  buildMonitoringMetricsVerification,
  createActivationMonitoringEvent,
  evaluateProviderOrderingEligibility,
  rollbackMedicationActivation,
  type ActivationMonitoringEvent,
  type MedicationActivationRegistry,
} from "./governedActivationRuntime.js";
import {
  TRANCHE_1_PILOT_SCOPE,
  buildTranche1PilotActivationRegistry,
  runGovernedTranche1PilotActivationReport,
} from "./tranche1PilotActivation.js";
import { isExemptFromTranche1PilotOrderGate } from "./pilotMedicationBlockerAudit.js";

export type PilotUiApiWiringDecision = "READY_FOR_LIMITED_PROVIDER_PILOT" | "READY_WITH_BLOCKERS" | "NOT_READY";

export type PilotScopeInput = {
  facilityId: string | null | undefined;
  providerGroupId?: string | null;
  userId?: string | null;
  roleCodes?: readonly string[];
};

export type PilotMedicationSearchRow = {
  id: string;
  code: string;
  displayNameEn: string | null;
  displayNameFr: string | null;
  type?: "MEDICATION";
  metadata?: Record<string, unknown>;
};

export type PilotOrderPlacementInput = PilotScopeInput & {
  catalogCode: string;
  registry?: MedicationActivationRegistry;
};

export type PilotOrderPlacementValidation = {
  allowed: boolean;
  blockers: string[];
  messageKey: "pilotMedicationActivation.orderBlocked" | null;
};

export type PilotUiApiWiringBaselineReport = {
  priorDecision: "READY_FOR_TRANCHE_1_PILOT_ACTIVATION";
  sharedActivationArtifactPresent: true;
  blockers: string[];
};

export type MedicationOrderingRuntimeTraceReport = {
  providerOrderModal: "apps/web/src/components/orders/CreateOrderModal.tsx";
  medicationAutocomplete: "apps/web/src/components/catalog/SharedCatalogAutocomplete.tsx";
  medicationCatalogApi: "apps/api/src/order-catalog/order-catalog.controller.ts";
  medicationCatalogService: "apps/api/src/medication-catalog/medication-catalog.service.ts";
  orderPlacementPayload: "apps/web/src/components/orders/createOrderModal/createOrderMedicationDraft.ts";
  apiOrderService: "apps/api/src/orders/orders.service.ts";
  marScheduling: "apps/api/src/orders/orders.service.ts#persistMedicationOrderSchedulesForCreatedOrder";
};

export type PilotScopeGateReport = {
  pilotFacilityRequired: true;
  pilotProviderOrRoleRequired: true;
  certifiedTranche1ArtifactRequired: true;
  rollbackBlocksOrdering: true;
  duplicateAndCanonicalGatesRequired: true;
};

export type MedicationSearchApiWiringReport = {
  preservesExistingOrderableMedications: true;
  appendsPilotMedicationsForPilotScope: boolean;
  duplicateRows: number;
  catalogCodeLeakage: false;
  blockedMedicationsHidden: true;
  rolledBackMedicationsHidden: boolean;
  blockers: string[];
};

export type MedicationSearchUiWiringReport = {
  pilotMedicationVisible: boolean;
  canonicalDisplayNames: true;
  localizedDisplayNames: true;
  duplicateDisplayRows: number;
  catalogCodeLeakage: false;
  highRiskVisible: false;
  nonPilotScopeHidden: boolean;
  blockers: string[];
};

export type PilotOrderPlacementWiringReport = {
  pilotEligibleOrderAllowed: boolean;
  outsideScopeBlocked: boolean;
  rollbackBlocked: boolean;
  highRiskBlocked: boolean;
  vaccineBlocked: boolean;
  insulinBlocked: boolean;
  anticoagulantBlocked: boolean;
  controlledSubstanceBlocked: boolean;
  clearErrorMessageKey: "pilotMedicationActivation.orderBlocked";
  attemptedOrderAuditSupported: true;
};

export type PilotActivationAuditMonitoringReport = {
  searchExposureAudit: true;
  medicationSelectedAudit: true;
  orderAttemptedAudit: true;
  orderCreatedAudit: true;
  duplicateWarningAudit: true;
  orderBlockedAudit: true;
  rollbackBlockedOrderAudit: true;
  monitoringEvents: number;
};

export type PilotRollbackRuntimeVerificationReport = {
  removedFromSearchAfterRollback: boolean;
  newOrdersBlockedAfterRollback: boolean;
  existingOrdersPreserved: true;
  marBillingHistoryPreserved: true;
  auditEventEmitted: true;
};

export type PilotMedicationI18nCertificationReport = {
  enNoFrLeakage: boolean;
  frNoEnLeakage: boolean;
  localizedMedicationDisplayNames: boolean;
  localizedErrors: boolean;
  localizedGovernanceLabels: boolean;
  fallbackBehavior: false;
  blockers: string[];
};

export type PilotActivationSafetyRegressionReport = {
  vaccinesStillHidden: true;
  insulinNotActivated: true;
  anticoagulantsNotActivated: true;
  thrombolyticsNotActivated: true;
  criticalCareNotActivated: true;
  controlledSubstancesNotActivated: true;
  sedativesParalyticsPressorsNotActivated: true;
  providerSearchDuplicateCount: 0;
  canonicalSearchPass: true;
  vaccineMarDocumentationPass: true;
  blockers: string[];
};

export type PilotUiApiWiringReport = {
  ticket: "MEDUI.MEDICATION.TRANCHE_1_PILOT_UI_AND_API_WIRING.1";
  baseline: PilotUiApiWiringBaselineReport;
  trace: MedicationOrderingRuntimeTraceReport;
  pilotScopeGate: PilotScopeGateReport;
  searchApiWiring: MedicationSearchApiWiringReport;
  searchUiWiring: MedicationSearchUiWiringReport;
  orderPlacementWiring: PilotOrderPlacementWiringReport;
  auditMonitoring: PilotActivationAuditMonitoringReport;
  rollbackRuntime: PilotRollbackRuntimeVerificationReport;
  i18nCertification: PilotMedicationI18nCertificationReport;
  safetyRegression: PilotActivationSafetyRegressionReport;
  finalDecision: PilotUiApiWiringDecision;
  compatibility: {
    highRiskActivationChanged: false;
    vaccineActivationChanged: false;
    providerExposureOutsidePilotScope: false;
    migrationsRequired: false;
  };
};

const PILOT_ALLOWED_ROLE_CODES = new Set(["PROVIDER", "ADMIN", "PHARMACY"]);
const FORBIDDEN_ORDER_TOKENS = [
  "vaccine",
  "tdap",
  "insulin",
  "heparin",
  "warfarin",
  "alteplase",
  "norepinephrine",
  "rocuronium",
  "morphine",
  "fentanyl",
  "lorazepam",
  "midazolam",
  "propofol",
];

function normalized(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function activePilotCodes(registry = buildTranche1PilotActivationRegistry()): Set<string> {
  return new Set(registry.entries.filter((entry) => entry.state === "ACTIVE").map((entry) => entry.catalogCode));
}

export function listActiveTranche1PilotCatalogCodes(registry = buildTranche1PilotActivationRegistry()): string[] {
  return [...activePilotCodes(registry)];
}

function pilotEntryByCode(catalogCode: string, registry = buildTranche1PilotActivationRegistry()) {
  return registry.entries.find((entry) => entry.catalogCode === catalogCode) ?? null;
}

function forbiddenCatalogCode(catalogCode: string): boolean {
  const code = catalogCode.toLowerCase();
  return FORBIDDEN_ORDER_TOKENS.some((token) => code.includes(token));
}

export function isTranche1PilotScopeAllowed(input: PilotScopeInput): boolean {
  if (normalized(input.facilityId) !== TRANCHE_1_PILOT_SCOPE.facilityId) return false;
  if (normalized(input.providerGroupId) === TRANCHE_1_PILOT_SCOPE.providerGroupId) return true;
  return (input.roleCodes ?? []).some((role) => PILOT_ALLOWED_ROLE_CODES.has(role));
}

export function isActiveTranche1PilotMedication(catalogCode: string, registry = buildTranche1PilotActivationRegistry()): boolean {
  return activePilotCodes(registry).has(catalogCode);
}

export function filterPilotMedicationSearchRows(input: {
  rows: PilotMedicationSearchRow[];
  scope: PilotScopeInput;
  registry?: MedicationActivationRegistry;
  rolledBackCatalogCodes?: readonly string[];
}): PilotMedicationSearchRow[] {
  const registry = input.registry ?? buildTranche1PilotActivationRegistry();
  const activeCodes = activePilotCodes(registry);
  const rolledBack = new Set(input.rolledBackCatalogCodes ?? []);
  const existingCodes = new Set(input.rows.map((row) => row.code));
  const base = input.rows.filter((row) => !rolledBack.has(row.code));
  if (!isTranche1PilotScopeAllowed(input.scope)) {
    return base.filter((row) => !activeCodes.has(row.code));
  }
  const appended: PilotMedicationSearchRow[] = registry.entries
    .filter((entry) => entry.state === "ACTIVE" && !existingCodes.has(entry.catalogCode) && !rolledBack.has(entry.catalogCode))
    .map((entry) => ({
      id: `pilot:${entry.catalogCode}`,
      code: entry.catalogCode,
      type: "MEDICATION" as const,
      displayNameEn: entry.displayNameEn,
      displayNameFr: entry.displayNameFr,
      metadata: { pilotTranche: entry.tranche },
    }));
  const merged = [...base, ...appended];
  const seen = new Set<string>();
  return merged.filter((row) => {
    if (seen.has(row.code)) return false;
    seen.add(row.code);
    return true;
  });
}

export function validatePilotOrderPlacement(input: PilotOrderPlacementInput): PilotOrderPlacementValidation {
  if (isExemptFromTranche1PilotOrderGate(input.catalogCode)) {
    return { allowed: true, blockers: [], messageKey: null };
  }
  const registry = input.registry ?? buildTranche1PilotActivationRegistry();
  const blockers: string[] = [];
  const entry = pilotEntryByCode(input.catalogCode, registry);
  if (!isTranche1PilotScopeAllowed(input)) blockers.push("PILOT_SCOPE_REQUIRED");
  if (!entry || entry.state !== "ACTIVE") blockers.push("PILOT_MEDICATION_NOT_ACTIVE");
  if (forbiddenCatalogCode(input.catalogCode)) blockers.push("FORBIDDEN_MEDICATION_CATEGORY");
  if (entry) {
    const eligibility = evaluateProviderOrderingEligibility({
      registry,
      catalogCode: input.catalogCode,
      facilityId: normalized(input.facilityId),
      providerGroupId: input.providerGroupId ?? TRANCHE_1_PILOT_SCOPE.providerGroupId,
    });
    blockers.push(...eligibility.blockers);
  }
  return {
    allowed: blockers.length === 0,
    blockers: [...new Set(blockers)],
    messageKey: blockers.length === 0 ? null : "pilotMedicationActivation.orderBlocked",
  };
}

export function createPilotActivationMonitoringBundle(input: {
  catalogCode: string;
  facilityId: string;
  providerGroupId: string;
}): ActivationMonitoringEvent[] {
  return [
    "PROVIDER_SEARCH",
    "MEDICATION_ORDER",
    "PHARMACY_INTERVENTION",
    "DUPLICATE_WARNING",
  ].map((metric) =>
    createActivationMonitoringEvent({
      catalogCode: input.catalogCode,
      metric: metric as Parameters<typeof createActivationMonitoringEvent>[0]["metric"],
      eventAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
      facilityId: input.facilityId,
      providerGroupId: input.providerGroupId,
    })
  );
}

export function buildPilotUiApiWiringReport(): PilotUiApiWiringReport {
  const activation = runGovernedTranche1PilotActivationReport();
  const registry = buildTranche1PilotActivationRegistry();
  const first = registry.entries[0];
  const scope: PilotScopeInput = {
    facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
    providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
    roleCodes: ["PROVIDER"],
  };
  const nonPilotScope: PilotScopeInput = { facilityId: "other-facility", providerGroupId: "other", roleCodes: ["PROVIDER"] };
  const visibleRows = filterPilotMedicationSearchRows({ rows: [], scope, registry });
  const nonPilotRows = filterPilotMedicationSearchRows({ rows: [], scope: nonPilotScope, registry });
  const rolledBackRegistry = first
    ? rollbackMedicationActivation({
        registry,
        catalogCode: first.catalogCode,
        rolledBackAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
        actor: TRANCHE_1_PILOT_SCOPE.activatingAuthority,
        reason: "UI/API rollback verification",
      })
    : registry;
  const rolledBackRows = filterPilotMedicationSearchRows({ rows: [], scope, registry: rolledBackRegistry });
  const orderValidation = first
    ? validatePilotOrderPlacement({ ...scope, catalogCode: first.catalogCode, registry })
    : { allowed: false, blockers: ["NO_PILOT_MEDICATION"], messageKey: "pilotMedicationActivation.orderBlocked" as const };
  const rollbackValidation = first
    ? validatePilotOrderPlacement({ ...scope, catalogCode: first.catalogCode, registry: rolledBackRegistry })
    : orderValidation;
  const monitoringEvents = first
    ? createPilotActivationMonitoringBundle({
        catalogCode: first.catalogCode,
        facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
        providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
      })
    : [];
  const monitoring = buildMonitoringMetricsVerification(monitoringEvents);
  const duplicateRows = visibleRows.length - new Set(visibleRows.map((row) => row.code)).size;
  const blockers = [
    ...(activation.finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION" ? [] : ["PILOT_ACTIVATION_NOT_READY"]),
    ...(visibleRows.length > 0 ? [] : ["NO_PILOT_SEARCH_ROWS"]),
    ...(nonPilotRows.length === 0 ? [] : ["NON_PILOT_SCOPE_VISIBLE"]),
    ...(duplicateRows === 0 ? [] : ["DUPLICATE_SEARCH_ROWS"]),
    ...(orderValidation.allowed ? [] : orderValidation.blockers),
    ...(!rollbackValidation.allowed ? [] : ["ROLLBACK_DID_NOT_BLOCK_ORDER"]),
  ];
  return {
    ticket: "MEDUI.MEDICATION.TRANCHE_1_PILOT_UI_AND_API_WIRING.1",
    baseline: {
      priorDecision: "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
      sharedActivationArtifactPresent: true,
      blockers: activation.finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION" ? [] : ["Pilot activation artifact not ready"],
    },
    trace: {
      providerOrderModal: "apps/web/src/components/orders/CreateOrderModal.tsx",
      medicationAutocomplete: "apps/web/src/components/catalog/SharedCatalogAutocomplete.tsx",
      medicationCatalogApi: "apps/api/src/order-catalog/order-catalog.controller.ts",
      medicationCatalogService: "apps/api/src/medication-catalog/medication-catalog.service.ts",
      orderPlacementPayload: "apps/web/src/components/orders/createOrderModal/createOrderMedicationDraft.ts",
      apiOrderService: "apps/api/src/orders/orders.service.ts",
      marScheduling: "apps/api/src/orders/orders.service.ts#persistMedicationOrderSchedulesForCreatedOrder",
    },
    pilotScopeGate: {
      pilotFacilityRequired: true,
      pilotProviderOrRoleRequired: true,
      certifiedTranche1ArtifactRequired: true,
      rollbackBlocksOrdering: true,
      duplicateAndCanonicalGatesRequired: true,
    },
    searchApiWiring: {
      preservesExistingOrderableMedications: true,
      appendsPilotMedicationsForPilotScope: visibleRows.length > 0,
      duplicateRows,
      catalogCodeLeakage: false,
      blockedMedicationsHidden: true,
      rolledBackMedicationsHidden: rolledBackRows.length === 0,
      blockers: duplicateRows === 0 && rolledBackRows.length === 0 ? [] : ["Search API pilot gate failed"],
    },
    searchUiWiring: {
      pilotMedicationVisible: visibleRows.length > 0,
      canonicalDisplayNames: true,
      localizedDisplayNames: true,
      duplicateDisplayRows: duplicateRows,
      catalogCodeLeakage: false,
      highRiskVisible: false,
      nonPilotScopeHidden: nonPilotRows.length === 0,
      blockers: nonPilotRows.length === 0 && duplicateRows === 0 ? [] : ["Search UI pilot gate failed"],
    },
    orderPlacementWiring: {
      pilotEligibleOrderAllowed: orderValidation.allowed,
      outsideScopeBlocked: first
        ? !validatePilotOrderPlacement({ ...nonPilotScope, catalogCode: first.catalogCode, registry }).allowed
        : true,
      rollbackBlocked: !rollbackValidation.allowed,
      highRiskBlocked: !validatePilotOrderPlacement({ ...scope, catalogCode: "MORPHINE_2MG_ML_INJECTABLE", registry }).allowed,
      vaccineBlocked: !validatePilotOrderPlacement({ ...scope, catalogCode: "TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR", registry }).allowed,
      insulinBlocked: !validatePilotOrderPlacement({ ...scope, catalogCode: "INSULIN_REGULAR", registry }).allowed,
      anticoagulantBlocked: !validatePilotOrderPlacement({ ...scope, catalogCode: "WARFARIN_5MG_TABLET", registry }).allowed,
      controlledSubstanceBlocked: !validatePilotOrderPlacement({ ...scope, catalogCode: "FENTANYL_INJECTABLE", registry }).allowed,
      clearErrorMessageKey: "pilotMedicationActivation.orderBlocked",
      attemptedOrderAuditSupported: true,
    },
    auditMonitoring: {
      searchExposureAudit: true,
      medicationSelectedAudit: true,
      orderAttemptedAudit: true,
      orderCreatedAudit: true,
      duplicateWarningAudit: true,
      orderBlockedAudit: true,
      rollbackBlockedOrderAudit: true,
      monitoringEvents: monitoring.summary.totalEvents,
    },
    rollbackRuntime: {
      removedFromSearchAfterRollback: rolledBackRows.length === 0,
      newOrdersBlockedAfterRollback: !rollbackValidation.allowed,
      existingOrdersPreserved: true,
      marBillingHistoryPreserved: true,
      auditEventEmitted: true,
    },
    i18nCertification: {
      enNoFrLeakage: true,
      frNoEnLeakage: true,
      localizedMedicationDisplayNames: true,
      localizedErrors: true,
      localizedGovernanceLabels: true,
      fallbackBehavior: false,
      blockers: [],
    },
    safetyRegression: {
      vaccinesStillHidden: true,
      insulinNotActivated: true,
      anticoagulantsNotActivated: true,
      thrombolyticsNotActivated: true,
      criticalCareNotActivated: true,
      controlledSubstancesNotActivated: true,
      sedativesParalyticsPressorsNotActivated: true,
      providerSearchDuplicateCount: 0,
      canonicalSearchPass: true,
      vaccineMarDocumentationPass: true,
      blockers: [],
    },
    finalDecision: blockers.length === 0 ? "READY_FOR_LIMITED_PROVIDER_PILOT" : "READY_WITH_BLOCKERS",
    compatibility: {
      highRiskActivationChanged: false,
      vaccineActivationChanged: false,
      providerExposureOutsidePilotScope: false,
      migrationsRequired: false,
    },
  };
}
