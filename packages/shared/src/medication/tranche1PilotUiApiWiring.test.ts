import { describe, expect, it } from "vitest";
import {
  rollbackMedicationActivation,
} from "./governedActivationRuntime.js";
import {
  TRANCHE_1_PILOT_SCOPE,
  buildTranche1PilotActivationRegistry,
} from "./tranche1PilotActivation.js";
import {
  buildPilotUiApiWiringReport,
  createPilotActivationMonitoringBundle,
  filterPilotMedicationSearchRows,
  isActiveTranche1PilotMedication,
  isTranche1PilotScopeAllowed,
  listActiveTranche1PilotCatalogCodes,
  validatePilotOrderPlacement,
} from "./tranche1PilotUiApiWiring.js";

let cachedRegistry: ReturnType<typeof buildTranche1PilotActivationRegistry> | null = null;
let cachedReport: ReturnType<typeof buildPilotUiApiWiringReport> | null = null;

function registry() {
  cachedRegistry ??= buildTranche1PilotActivationRegistry();
  return cachedRegistry;
}

function report() {
  cachedReport ??= buildPilotUiApiWiringReport();
  return cachedReport;
}

function firstCode(): string {
  const code = registry().entries[0]?.catalogCode;
  if (!code) throw new Error("Missing Tranche 1 pilot medication");
  return code;
}

const pilotScope = {
  facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
  providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
  roleCodes: ["PROVIDER"],
};

const nonPilotScope = {
  facilityId: "non-pilot-facility",
  providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
  roleCodes: ["PROVIDER"],
};

describe("MEDUI.MEDICATION.TRANCHE_1_PILOT_UI_AND_API_WIRING.1", () => {
  it("01 — pilot facility sees Tranche 1 medication", () => {
    const rows = filterPilotMedicationSearchRows({ rows: [], scope: pilotScope, registry: registry() });
    expect(rows.some((row) => row.code === firstCode())).toBe(true);
  });

  it("02 — non-pilot facility does not see pilot-only medication", () => {
    const rows = filterPilotMedicationSearchRows({ rows: [], scope: nonPilotScope, registry: registry() });
    expect(rows).toEqual([]);
  });

  it("03 — pilot provider sees Tranche 1 medication", () => {
    expect(isTranche1PilotScopeAllowed(pilotScope)).toBe(true);
  });

  it("04 — non-pilot provider does not see pilot-only medication", () => {
    expect(isTranche1PilotScopeAllowed({ ...pilotScope, providerGroupId: "other", roleCodes: ["RN"] })).toBe(false);
  });

  it("05 — search has no duplicate rows", () => {
    const rows = filterPilotMedicationSearchRows({ rows: [{ id: "db-1", code: firstCode(), displayNameEn: "A", displayNameFr: "A" }], scope: pilotScope, registry: registry() });
    expect(rows.length - new Set(rows.map((row) => row.code)).size).toBe(0);
  });

  it("06 — search has no catalog-code leakage in display names", () => {
    const rows = filterPilotMedicationSearchRows({ rows: [], scope: pilotScope, registry: registry() });
    expect(rows.every((row) => !row.displayNameEn?.includes(row.code) && !row.displayNameFr?.includes(row.code))).toBe(true);
  });

  it("07 — canonical family display is preserved", () => {
    expect(report().searchUiWiring.canonicalDisplayNames).toBe(true);
  });

  it("08 — rolled-back medication disappears from search", () => {
    const rolledBack = rollbackMedicationActivation({
      registry: registry(),
      catalogCode: firstCode(),
      rolledBackAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
      actor: TRANCHE_1_PILOT_SCOPE.activatingAuthority,
      reason: "test rollback",
    });
    const rows = filterPilotMedicationSearchRows({ rows: [], scope: pilotScope, registry: rolledBack });
    expect(rows.some((row) => row.code === firstCode())).toBe(false);
  });

  it("09 — order placement succeeds for pilot-eligible medication", () => {
    expect(validatePilotOrderPlacement({ ...pilotScope, catalogCode: firstCode(), registry: registry() }).allowed).toBe(true);
  });

  it("10 — order placement fails outside pilot scope", () => {
    expect(validatePilotOrderPlacement({ ...nonPilotScope, catalogCode: firstCode(), registry: registry() }).allowed).toBe(false);
  });

  it("11 — order placement fails after rollback", () => {
    const rolledBack = rollbackMedicationActivation({
      registry: registry(),
      catalogCode: firstCode(),
      rolledBackAt: TRANCHE_1_PILOT_SCOPE.activatedAt,
      actor: TRANCHE_1_PILOT_SCOPE.activatingAuthority,
      reason: "test rollback",
    });
    expect(validatePilotOrderPlacement({ ...pilotScope, catalogCode: firstCode(), registry: rolledBack }).allowed).toBe(false);
  });

  it("12 — order placement blocks high-risk medication", () => {
    expect(validatePilotOrderPlacement({ ...pilotScope, catalogCode: "MORPHINE_2MG_ML_INJECTABLE", registry: registry() }).allowed).toBe(false);
  });

  it("13 — order placement blocks vaccine", () => {
    expect(validatePilotOrderPlacement({ ...pilotScope, catalogCode: "TDAP_VACCINE_0.5ML", registry: registry() }).allowed).toBe(false);
  });

  it("14 — order placement blocks insulin", () => {
    expect(validatePilotOrderPlacement({ ...pilotScope, catalogCode: "INSULIN_REGULAR", registry: registry() }).allowed).toBe(false);
  });

  it("15 — order placement blocks anticoagulant", () => {
    expect(validatePilotOrderPlacement({ ...pilotScope, catalogCode: "WARFARIN_5MG_TABLET", registry: registry() }).allowed).toBe(false);
  });

  it("16 — order placement blocks controlled substance", () => {
    expect(validatePilotOrderPlacement({ ...pilotScope, catalogCode: "FENTANYL_INJECTABLE", registry: registry() }).allowed).toBe(false);
  });

  it("17 — audit event generated for search exposure", () => {
    expect(report().auditMonitoring.searchExposureAudit).toBe(true);
  });

  it("18 — audit event generated for order creation", () => {
    expect(report().auditMonitoring.orderCreatedAudit).toBe(true);
  });

  it("19 — audit event generated for blocked order", () => {
    expect(report().auditMonitoring.orderBlockedAudit).toBe(true);
  });

  it("20 — monitoring metrics increment", () => {
    const events = createPilotActivationMonitoringBundle({
      catalogCode: firstCode(),
      facilityId: TRANCHE_1_PILOT_SCOPE.facilityId,
      providerGroupId: TRANCHE_1_PILOT_SCOPE.providerGroupId,
    });
    expect(events.length).toBeGreaterThan(0);
    expect(report().auditMonitoring.monitoringEvents).toBeGreaterThan(0);
  });

  it("21 — EN search has no FR leakage", () => {
    expect(report().i18nCertification.enNoFrLeakage).toBe(true);
  });

  it("22 — FR search has no EN leakage", () => {
    expect(report().i18nCertification.frNoEnLeakage).toBe(true);
  });

  it("23 — error messages localized", () => {
    expect(report().orderPlacementWiring.clearErrorMessageKey).toBe("pilotMedicationActivation.orderBlocked");
    expect(report().i18nCertification.localizedErrors).toBe(true);
  });

  it("24 — existing orderable meds remain visible", () => {
    const existing = [{ id: "existing", code: "EXISTING_PRODUCTION_MED", displayNameEn: "Existing", displayNameFr: "Existant" }];
    const rows = filterPilotMedicationSearchRows({ rows: existing, scope: nonPilotScope, registry: registry() });
    expect(rows).toEqual(existing);
  });

  it("25 — existing MAR behavior unchanged", () => {
    expect(report().compatibility.highRiskActivationChanged).toBe(false);
    expect(report().rollbackRuntime.marBillingHistoryPreserved).toBe(true);
  });

  it("26 — vaccine MAR documentation regression passes", () => {
    expect(report().safetyRegression.vaccineMarDocumentationPass).toBe(true);
  });

  it("27 — full release gate decision is ready for limited provider pilot", () => {
    expect(listActiveTranche1PilotCatalogCodes().every((code) => isActiveTranche1PilotMedication(code))).toBe(true);
    expect(report().finalDecision).toBe("READY_FOR_LIMITED_PROVIDER_PILOT");
  });
});
