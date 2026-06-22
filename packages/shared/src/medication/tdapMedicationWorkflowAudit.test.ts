import { describe, expect, it } from "vitest";
import {
  auditTdapCurrentState,
  auditVaccineManufacturerCatalog,
  buildTdapAutoNoteDesignReport,
  buildTdapWorkflowDesignReport,
  runTdapMedicationWorkflowAudit,
} from "./tdapMedicationWorkflowAudit.js";
import {
  buildTdapVaccineAdministrationNote,
  emptyTdapVaccineAdministrationForm,
  sampleCompleteTdapVaccineAdministrationForm,
  TDAP_CATALOG_CODE,
  TDAP_DEFAULT_DOSE_VALUE,
  TDAP_DEFAULT_ROUTE,
  TDAP_IM_INJECTION_SITES,
} from "./tdapVaccineAdministration.js";

function completeTdapForm() {
  return sampleCompleteTdapVaccineAdministrationForm();
}

describe("MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1 — Tdap", () => {
  it("15 — Tdap current state audit runs", () => {
    const state = auditTdapCurrentState();
    expect(state.inMedicationCatalog).toBe(true);
    expect(state.catalogCode).toBe(TDAP_CATALOG_CODE);
  });

  it("16 — Tdap catalog existence is reported", () => {
    const report = runTdapMedicationWorkflowAudit();
    expect(report.currentState.inMedicationCatalog).toBe(true);
  });

  it("17 — Tdap duplicate catalog code is detected if present", () => {
    const state = auditTdapCurrentState();
    expect(state.catalogCodeDuplication.hasDuplicateFormRouteTokens).toBe(true);
    expect(state.catalogCode).toContain("INJECTABLE");
  });

  it("18 — Tdap display name is separate from catalog code", () => {
    const state = auditTdapCurrentState();
    expect(state.displayNameClean).toBe(true);
    expect(state.displayNameEn.toLowerCase()).toContain("tdap");
    expect(state.displayNameEn).not.toContain("INJECTABLEINTRAMUSCULAR");
  });

  it("19 — Tdap orderability status is reported (restricted until activation)", () => {
    const state = auditTdapCurrentState();
    expect(state.providerOrderable).toBe(false);
    expect(state.orderabilityStatus).toBe("RESTRICTED_WITH_REASON");
    expect(state.orderabilityReason?.toLowerCase()).toContain("vaccine");
  });

  it("20 — Tdap MAR readiness is reported", () => {
    const design = buildTdapWorkflowDesignReport();
    expect(design.requiredFields.some((f) => f.field.includes("generated MAR"))).toBe(true);
    expect(auditTdapCurrentState().supportsLotNumber).toBe(true);
  });

  it("21 — Tdap route IM is checked", () => {
    expect(auditTdapCurrentState().routeIm).toBe(true);
    expect(emptyTdapVaccineAdministrationForm().route).toBe(TDAP_DEFAULT_ROUTE);
  });

  it("22 — Tdap dose 0.5 mL is checked", () => {
    expect(auditTdapCurrentState().defaultDose05Ml).toBe(true);
    expect(emptyTdapVaccineAdministrationForm().doseValue).toBe(TDAP_DEFAULT_DOSE_VALUE);
  });

  it("23 — Tdap lot/expiration support is checked", () => {
    const state = auditTdapCurrentState();
    expect(state.supportsLotNumber).toBe(true);
    expect(state.supportsExpirationDate).toBe(true);
  });

  it("24 — Tdap manufacturer support is checked", () => {
    expect(auditTdapCurrentState().supportsManufacturer).toBe(true);
    const mfr = auditVaccineManufacturerCatalog();
    expect(mfr.entryCount).toBeGreaterThanOrEqual(16);
  });

  it("25 — Tdap VIS support is checked", () => {
    const state = auditTdapCurrentState();
    expect(state.supportsVisRecipient).toBe(true);
    expect(state.supportsVisDate).toBe(true);
  });

  it("26 — manufacturer catalog audit is centralized", () => {
    const mfr = auditVaccineManufacturerCatalog();
    expect(mfr.exists).toBe(true);
    expect(mfr.centralized).toBe(true);
    expect(mfr.uiOnly).toBe(false);
    expect(mfr.hasEnFrLabels).toBe(true);
    expect(mfr.manufacturers).toContain("Sanofi Pasteur");
    expect(mfr.manufacturers).toContain("Unknown manufacturer");
  });

  it("27 — Tdap note design omits blank fields", () => {
    const design = buildTdapAutoNoteDesignReport();
    const blankRule = design.rules.find((r) => r.rule.includes("blank"));
    expect(blankRule?.implemented).toBe(true);
  });

  it("28 — Tdap note design includes selected site and manufacturer", () => {
    const design = buildTdapAutoNoteDesignReport();
    expect(design.rules.find((r) => r.rule.includes("site"))?.implemented).toBe(true);
    expect(design.rules.find((r) => r.rule.includes("manufacturer"))?.implemented).toBe(true);
    expect(design.enExample).toContain("Sanofi Pasteur");
    expect(design.enExample.toLowerCase()).toContain("right deltoid");
  });

  it("29 — Tdap note design supports EN and FR without leakage", () => {
    const design = buildTdapAutoNoteDesignReport();
    expect(design.rules.find((r) => r.rule.includes("EN-only"))?.implemented).toBe(true);
    expect(design.rules.find((r) => r.rule.includes("FR-only"))?.implemented).toBe(true);
    expect(design.frExample.toLowerCase()).toContain("administré");
    expect(design.enExample.toLowerCase()).not.toContain("administré");
  });

  it("30 — Tdap workflow design lists all IM sites", () => {
    const design = buildTdapWorkflowDesignReport();
    expect(design.sites.length).toBe(TDAP_IM_INJECTION_SITES.length);
    expect(design.sites).toContain("right_deltoid");
    expect(design.sites).toContain("left_vastus_lateralis");
  });

  it("31 — Tdap note changes when manufacturer changes", () => {
    const a = buildTdapVaccineAdministrationNote({ ...completeTdapForm(), manufacturerId: "sanofi_pasteur" }, "en");
    const b = buildTdapVaccineAdministrationNote({ ...completeTdapForm(), manufacturerId: "pfizer" }, "en");
    expect(a).not.toBe(b);
  });

  it("32 — Tdap workflow audit orchestrator runs", () => {
    const report = runTdapMedicationWorkflowAudit();
    expect(report.ticket).toBe("MEDUI.MEDICATION_CATALOG.MATURITY_AND_ORDERABILITY_AUDIT.1");
    expect(report.autoNoteDesign.i18nReady).toBe(true);
    expect(report.manufacturerCatalog.governanceReady).toBe(true);
  });
});
