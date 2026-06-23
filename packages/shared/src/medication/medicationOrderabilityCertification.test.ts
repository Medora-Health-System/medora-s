import { describe, expect, it } from "vitest";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { HOSPITAL_MEDICATION_COVERAGE_GROUPS } from "./hospitalMedicationCoverageManifest.js";
import {
  certifyMedicationOrderability,
  medicationOrderabilityGapsWithoutDocumentedReason,
} from "./medicationOrderabilityCertification.js";
import { buildMedicationCatalogSourceAudit } from "./medicationCatalogSourceRegistry.js";
import {
  buildOrderabilityFromHaitiRow,
  isProviderOrderSearchCandidate,
} from "./medicationOrderabilityGovernance.js";
import {
  buildTdapVaccineAdministrationNote,
  emptyTdapVaccineAdministrationForm,
  getTdapFormularyEntry,
  sampleCompleteTdapVaccineAdministrationForm,
  serializeTdapVaccineAdministrationPayload,
  TDAP_CATALOG_CODE,
  TDAP_DEFAULT_DOSE_VALUE,
  TDAP_DEFAULT_ROUTE,
  TDAP_IM_INJECTION_SITES,
  tdapInjectionSiteLaterality,
  tdapNoteIsMonolingual,
  validateTdapVaccineAdministrationForm,
} from "./tdapVaccineAdministration.js";
import { VACCINE_MANUFACTURER_CATALOG } from "./vaccineManufacturerCatalog.js";
import { TDAP_VIS_REFERENCE, validateVaccineVisDocumentation } from "./vaccineVisGovernance.js";

function completeTdapForm() {
  return sampleCompleteTdapVaccineAdministrationForm();
}

describe("MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1", () => {
  it("01 — medication catalog certification runs", () => {
    const report = certifyMedicationOrderability();
    expect(report.ticket).toBe("MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1");
    expect(report.catalogSourceAudit.length).toBeGreaterThan(8);
    expect(report.orderabilityGaps.length).toBeGreaterThan(200);
  });

  it("02 — catalog source audit includes Haiti and enterprise waves", () => {
    const audit = buildMedicationCatalogSourceAudit({
      haitiCatalog: 251,
      wave1: 45,
      wave2: 89,
      wave3: 116,
      wave4: 227,
      pilotTrancheA: 12,
      vaccineCatalogSeed: 8,
    });
    expect(audit.some((r) => r.source.includes("Haiti"))).toBe(true);
    expect(audit.some((r) => r.source.includes("Wave 4"))).toBe(true);
  });

  it("03 — every non-orderable gap has documented reason", () => {
    const report = certifyMedicationOrderability();
    const undocumented = medicationOrderabilityGapsWithoutDocumentedReason(report.orderabilityGaps);
    expect(undocumented).toEqual([]);
  });

  it("04 — Haiti active meds default to orderable governance", () => {
    const acetaminophen = HAITI_MEDICATION_FORMULARY_CATALOG.find((r) => r.code === "ACETAMINOPHEN_500")!;
    const record = buildOrderabilityFromHaitiRow(acetaminophen);
    expect(record.orderabilityStatus).toBe("ORDERABLE_READY");
    expect(isProviderOrderSearchCandidate(record)).toBe(true);
  });

  it("05 — hospital core groups are audited", () => {
    const report = certifyMedicationOrderability();
    expect(report.hospitalCoverage.length).toBe(HOSPITAL_MEDICATION_COVERAGE_GROUPS.length);
  });

  it("06 — provider order search root causes documented", () => {
    const report = certifyMedicationOrderability();
    expect(report.providerOrderSearchRootCauses.length).toBeGreaterThanOrEqual(5);
  });

  it("07 — Tdap exists in enterprise catalog", () => {
    expect(getTdapFormularyEntry()?.catalogCode).toBe(TDAP_CATALOG_CODE);
  });

  it("08 — Tdap is in unified orderability map", () => {
    const report = certifyMedicationOrderability();
    expect(report.governanceSummary.tdapInCatalog).toBe(true);
  });

  it("09 — Tdap has provider-order governance path (restricted until activation)", () => {
    const gap = certifyMedicationOrderability().orderabilityGaps.find((g) => g.catalogCode === TDAP_CATALOG_CODE)!;
    expect(gap).toBeTruthy();
    expect(gap.restricted).toBe(true);
    expect(gap.missingReason).toContain("Vaccine");
  });

  it("10 — Tdap route is IM", () => {
    expect(getTdapFormularyEntry()?.administrationType).toBe("IM");
    expect(emptyTdapVaccineAdministrationForm().route).toBe(TDAP_DEFAULT_ROUTE);
  });

  it("11 — Tdap default dose is 0.5 mL", () => {
    expect(getTdapFormularyEntry()?.strength).toBe("0.5 mL");
    expect(emptyTdapVaccineAdministrationForm().doseValue).toBe(TDAP_DEFAULT_DOSE_VALUE);
  });

  it("12 — Tdap supports deltoid site", () => {
    expect(TDAP_IM_INJECTION_SITES).toContain("right_deltoid");
    expect(TDAP_IM_INJECTION_SITES).toContain("left_deltoid");
  });

  it("13 — Tdap supports laterality", () => {
    expect(tdapInjectionSiteLaterality("right_deltoid")).toBe("right");
    expect(tdapInjectionSiteLaterality("left_vastus_lateralis")).toBe("left");
  });

  it("14 — Tdap requires lot number", () => {
    const form = { ...completeTdapForm(), lotNumber: "" };
    expect(validateTdapVaccineAdministrationForm(form)).toContain("lot_number_required");
  });

  it("15 — Tdap requires expiration date", () => {
    const form = { ...completeTdapForm(), expirationDate: "" };
    expect(validateTdapVaccineAdministrationForm(form)).toContain("expiration_date_required");
  });

  it("16 — Tdap supports manufacturer catalog", () => {
    expect(VACCINE_MANUFACTURER_CATALOG.some((m) => m.id === "sanofi_pasteur")).toBe(true);
    expect(VACCINE_MANUFACTURER_CATALOG.length).toBeGreaterThanOrEqual(16);
  });

  it("17 — Tdap supports VIS recipient", () => {
    const errors = validateVaccineVisDocumentation({
      visGiven: true,
      visRecipient: "none",
      visDate: "2026-06-14",
    });
    expect(errors).toContain("vis_recipient_required_when_given");
  });

  it("18 — Tdap supports VIS date", () => {
    const errors = validateVaccineVisDocumentation({
      visGiven: true,
      visRecipient: "patient",
      visDate: "",
    });
    expect(errors).toContain("vis_date_required_when_given");
  });

  it("19 — Tdap auto-note includes selected site", () => {
    const note = buildTdapVaccineAdministrationNote(completeTdapForm(), "en");
    expect(note.toLowerCase()).toContain("right deltoid");
  });

  it("20 — Tdap auto-note includes selected manufacturer", () => {
    const note = buildTdapVaccineAdministrationNote(completeTdapForm(), "en");
    expect(note).toContain("Sanofi Pasteur");
  });

  it("21 — Tdap auto-note includes lot and expiration", () => {
    const note = buildTdapVaccineAdministrationNote(completeTdapForm(), "en");
    expect(note).toContain("U8653BA");
    expect(note.toLowerCase()).toContain("expiration");
  });

  it("22 — Tdap auto-note omits blank VIS when not given", () => {
    const form = { ...completeTdapForm(), vis: { visGiven: false, visRecipient: "none" as const, visDate: "" } };
    const note = buildTdapVaccineAdministrationNote(form, "en");
    expect(note.toLowerCase()).not.toContain("vaccine information statement");
  });

  it("23 — Tdap note changes when manufacturer changes", () => {
    const a = buildTdapVaccineAdministrationNote(
      { ...completeTdapForm(), manufacturerId: "sanofi_pasteur" },
      "en"
    );
    const b = buildTdapVaccineAdministrationNote(
      { ...completeTdapForm(), manufacturerId: "pfizer" },
      "en"
    );
    expect(a).not.toBe(b);
  });

  it("24 — Tdap serializes MAR/progress note payload", () => {
    const payload = serializeTdapVaccineAdministrationPayload(completeTdapForm());
    expect(payload.type).toBe("tdap_vaccine_administration_v1");
    expect(String(payload.generatedNoteEn)).toContain("Tdap IM");
    expect(String(payload.generatedNoteFr)).toContain("Tdap IM");
  });

  it("25 — Tdap EN note is EN-only", () => {
    const note = buildTdapVaccineAdministrationNote(completeTdapForm(), "en");
    expect(tdapNoteIsMonolingual(note, "en")).toBe(true);
  });

  it("26 — Tdap FR note has no English leakage", () => {
    const note = buildTdapVaccineAdministrationNote(completeTdapForm(), "fr");
    expect(tdapNoteIsMonolingual(note, "fr")).toBe(true);
    expect(note.toLowerCase()).toContain("administré");
  });

  it("27 — Tdap FR note has no French leakage in EN", () => {
    const note = buildTdapVaccineAdministrationNote(completeTdapForm(), "en");
    expect(note.toLowerCase()).not.toContain("administré");
  });

  it("28 — VIS governance references official source without hardcoded edition date", () => {
    expect(TDAP_VIS_REFERENCE.cdcVisUrl).toContain("cdc.gov");
    expect(TDAP_VIS_REFERENCE.vaccineNameEn).toContain("Tdap");
  });

  it("29 — Tdap workflow certification passes", () => {
    const report = certifyMedicationOrderability();
    expect(report.governanceSummary.tdapWorkflowCertified).toBe(true);
  });
});
