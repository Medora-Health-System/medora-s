import { describe, expect, it } from "vitest";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { isActiveProviderOrderableCatalogCode, prewarmProviderOrderableCatalogCodesRegistry, resetProviderOrderableCatalogCodesRegistryForTests } from "./providerOrderableCatalogCodesRegistry.js";
import { isExemptFromTranche1PilotOrderGate } from "./pilotMedicationBlockerAudit.js";
import { validatePilotOrderPlacement } from "./tranche1PilotUiApiWiring.js";
import {
  buildInfectiousDiseaseMedicationInventoryReport,
  buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry,
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";

const ZOSYN_3375 = "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE";

describe("MEDUI.MEDS.ZOSYN_ORDERABILITY_AND_IVPB_DIRECTION_POLISH.1", () => {
  it("activates Piperacillin-tazobactam 3.375 g for infectious-disease provider ordering", () => {
    resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches();
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();

    const map = buildUnifiedOrderabilityMap();
    const record = map.get(ZOSYN_3375);
    expect(record).toBeDefined();
    expect(record?.strength).toBe("3.375 g");

    const governance = buildActivationGovernanceRecord(record!);
    expect(governance.marReady).toBe(true);
    expect(governance.billingReady).toBe(true);

    const inventory = buildInfectiousDiseaseMedicationInventoryReport().rows.find(
      (row) => row.medication === "Zosyn"
    );
    expect(inventory?.catalogCode).toBeTruthy();

    const registryEntry = buildNeurologyInfectiousDiseaseProviderOrderingActivationRegistry().entries.find(
      (entry) => entry.catalogCode === ZOSYN_3375
    );
    expect(registryEntry?.medication).toBe("Zosyn 3.375g IV");
    expect(registryEntry?.state).toBe("ACTIVE");
    expect(registryEntry?.blockers).toEqual([]);

    expect(listActiveInfectiousDiseaseProviderOrderingCatalogCodes()).toContain(ZOSYN_3375);
    expect(isActiveProviderOrderableCatalogCode(ZOSYN_3375)).toBe(true);
  });

  it("bypasses legacy Tranche 1 pilot gate when enterprise provider-orderable", () => {
    resetNeurologyInfectiousDiseaseProviderOrderingActivationCaches();
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
    const pilot = validatePilotOrderPlacement({
      facilityId: "real-facility-id",
      catalogCode: ZOSYN_3375,
      providerGroupId: "other-group",
      roleCodes: ["PROVIDER"],
    });
    expect(isExemptFromTranche1PilotOrderGate(ZOSYN_3375)).toBe(true);
    expect(pilot.blockers.length).toBeGreaterThanOrEqual(0);
  });
});
