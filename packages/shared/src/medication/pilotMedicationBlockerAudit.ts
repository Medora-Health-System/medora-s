/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_RUNTIME_REMEDIATION.1
 * Pilot scope blocker audit and enterprise registry bypass (O(1) lookup).
 */

import { isActiveTranche1PilotMedication, validatePilotOrderPlacement, type PilotOrderPlacementInput } from "./tranche1PilotUiApiWiring.js";
import { isActiveProviderOrderableCatalogCode, getActiveProviderOrderableCatalogCodes } from "./providerOrderableCatalogCodesRegistry.js";
import { listActiveControlledSubstanceProviderOrderingCatalogCodes } from "./controlledSubstanceProviderOrderingActivation.js";

export type PilotMedicationBlockerAuditRow = {
  catalogCode: string;
  inTranche1Pilot: boolean;
  inProviderOrderableRegistry: boolean;
  inControlledSubstanceWave: boolean;
  legacyPilotBlockers: string[];
  exemptFromPilotGate: boolean;
  runtimeAllowedAfterRemediation: boolean;
};

export type PilotMedicationBlockerAuditReport = {
  ticket: "MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_RUNTIME_REMEDIATION.1";
  pilotScopeCheckLocations: readonly string[];
  sampleFacilityBlockersBefore: string[];
  sampleFacilityAllowedAfter: boolean;
  rows: PilotMedicationBlockerAuditRow[];
  exemptProviderOrderableCount: number;
  remainingPilotOnlyCount: number;
  decision: "PILOT_BLOCKERS_REMEDIATED" | "PILOT_BLOCKERS_REMAIN";
};

const PILOT_SCOPE_CHECK_LOCATIONS = [
  "packages/shared/src/medication/tranche1PilotUiApiWiring.ts#validatePilotOrderPlacement",
  "packages/shared/src/medication/tranche1PilotUiApiWiring.ts#isTranche1PilotScopeAllowed",
  "packages/shared/src/medication/governedActivationRuntime.ts#evaluateProviderOrderingEligibility",
  "apps/api/src/orders/orders.service.ts#assertPilotMedicationOrderAllowed",
  "apps/api/src/medication-catalog/medication-catalog.service.ts#search (pilot append gate)",
] as const;

/** O(1) — enterprise provider-orderable medications bypass legacy Tranche 1 pilot scope gates. */
export function isExemptFromTranche1PilotOrderGate(catalogCode: string): boolean {
  return isActiveProviderOrderableCatalogCode(catalogCode);
}

export function validatePilotOrderPlacementWithEnterpriseBypass(
  input: PilotOrderPlacementInput
): ReturnType<typeof validatePilotOrderPlacement> {
  if (isExemptFromTranche1PilotOrderGate(input.catalogCode)) {
    return { allowed: true, blockers: [], messageKey: null };
  }
  return validatePilotOrderPlacement(input);
}

export function buildPilotMedicationBlockerAuditReport(
  sampleCatalogCode = "GABAPENTIN_300_MG_GELULE_ORALE"
): PilotMedicationBlockerAuditReport {
  const controlled = new Set(listActiveControlledSubstanceProviderOrderingCatalogCodes());
  const providerOrderable = getActiveProviderOrderableCatalogCodes();
  const auditCodes = [
    sampleCatalogCode,
    "CYCLOBENZAPRINE_10_MG_COMPRIME_ORAL",
    "METHOCARBAMOL_500_MG_COMPRIME_ORAL",
    "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "LIDOCAINE_5_PATCH_TRANSDERMAL",
  ];
  const rows = auditCodes.map((catalogCode) => {
    const legacy = validatePilotOrderPlacement({
      facilityId: "real-facility-id",
      catalogCode,
      providerGroupId: "other-group",
      roleCodes: ["PROVIDER"],
    });
    const remediated = validatePilotOrderPlacementWithEnterpriseBypass({
      facilityId: "real-facility-id",
      catalogCode,
      providerGroupId: "other-group",
      roleCodes: ["PROVIDER"],
    });
    const exempt = isExemptFromTranche1PilotOrderGate(catalogCode);
    return {
      catalogCode,
      inTranche1Pilot: isActiveTranche1PilotMedication(catalogCode),
      inProviderOrderableRegistry: providerOrderable.has(catalogCode),
      inControlledSubstanceWave: controlled.has(catalogCode),
      legacyPilotBlockers: legacy.blockers,
      exemptFromPilotGate: exempt,
      runtimeAllowedAfterRemediation: remediated.allowed,
    };
  });

  const before = validatePilotOrderPlacement({
    facilityId: "real-facility-id",
    catalogCode: sampleCatalogCode,
    providerGroupId: "other-group",
    roleCodes: ["PROVIDER"],
  });
  const after = validatePilotOrderPlacementWithEnterpriseBypass({
    facilityId: "real-facility-id",
    catalogCode: sampleCatalogCode,
    providerGroupId: "other-group",
    roleCodes: ["PROVIDER"],
  });

  const exemptProviderOrderableCount = providerOrderable.size;
  const remainingPilotOnlyCount = rows.filter((row) => row.inTranche1Pilot && !row.exemptFromPilotGate).length;

  return {
    ticket: "MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_RUNTIME_REMEDIATION.1",
    pilotScopeCheckLocations: PILOT_SCOPE_CHECK_LOCATIONS,
    sampleFacilityBlockersBefore: before.blockers,
    sampleFacilityAllowedAfter: after.allowed,
    rows,
    exemptProviderOrderableCount,
    remainingPilotOnlyCount,
    decision:
      after.allowed && rows.every((row) => !row.inProviderOrderableRegistry || row.runtimeAllowedAfterRemediation)
        ? "PILOT_BLOCKERS_REMEDIATED"
        : "PILOT_BLOCKERS_REMAIN",
  };
}
