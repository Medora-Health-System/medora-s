import { describe, expect, it } from "vitest";
import { buildMedicationOrderLabelSnapshot } from "../orders/orderItemDisplayLabels.js";
import { resolveMedicationOrderIdentity } from "./medicationOrderIdentity.js";
import {
  buildCompletedVaccineAdministrationViewModel,
  buildVaccineAdministrationAuditNote,
  buildVaccineMarAdministrationHardeningReport,
  REQUIRED_VACCINE_ADMINISTRATION_DOCUMENTATION_FIELDS,
  resolveVaccineAdministrationDisplayName,
  serializeVaccineAdministrationDocumentation,
  validateVaccineAdministrationDocumentation,
  vaccineAdministrationNoteIsMonolingual,
  vaccineInjectionSiteLaterality,
  type VaccineAdministrationDocumentation,
} from "./vaccineMarAdministrationDocumentation.js";
import { VACCINE_MANUFACTURER_CATALOG } from "./vaccineManufacturerCatalog.js";
import { TDAP_CATALOG_CODE } from "./tdapVaccineAdministration.js";

function doc(overrides: Partial<VaccineAdministrationDocumentation> = {}): VaccineAdministrationDocumentation {
  return {
    vaccineProductId: "product-tdap",
    catalogCode: TDAP_CATALOG_CODE,
    vaccineDisplayName: "Tdap vaccine",
    dose: "0.5",
    unit: "mL",
    route: "IM",
    site: "right_deltoid",
    laterality: "right",
    lotNumber: "U8653BA",
    expirationDate: "2027-09-01",
    manufacturerId: "sanofi_pasteur",
    manufacturerDisplayName: "Sanofi Pasteur",
    visGiven: true,
    visRecipient: "patient",
    visDate: "2026-06-14",
    visEditionDate: "2026-06-14",
    allergiesVerified: true,
    fiveRightsConfirmed: true,
    educationReviewed: true,
    reviewedWith: "patient",
    reviewedTopics: ["reason_for_medication", "signs_of_allergic_reaction", "precautions"],
    understandingConfirmed: true,
    amountWasted: "",
    administeredAt: "2026-06-03T21:25:00.000Z",
    administeredBy: "Elizabeth Posada",
    administeredByCredentials: "RN",
    ...overrides,
  };
}

function catalog(code: string, displayNameEn: string) {
  return {
    code,
    name: displayNameEn,
    displayNameEn,
    displayNameFr: displayNameEn,
    genericName: displayNameEn,
    strength: "0.5 mL",
  };
}

describe("MEDUI.MEDICATION.VACCINE_MAR_ADMINISTRATION_HARDENING.1", () => {
  it("01 — Tdap order stays Tdap in MAR snapshot even when display label says Td", () => {
    const label = buildMedicationOrderLabelSnapshot(
      { catalogItemType: "MEDICATION", strength: "0.5 mL" },
      catalog(TDAP_CATALOG_CODE, "Td vaccine")
    );
    expect(label).toContain("Tdap vaccine");
    expect(label).not.toContain("Td vaccine");
  });

  it("02 — Td order stays Td", () => {
    const label = buildMedicationOrderLabelSnapshot(
      { catalogItemType: "MEDICATION", strength: "0.5 mL" },
      catalog("TD_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR", "Td vaccine")
    );
    expect(label).toContain("Td vaccine");
    expect(label).not.toContain("Tdap");
  });

  it("03 — Tdap does not collapse to Td in generic medication identity", () => {
    const identity = resolveMedicationOrderIdentity({
      catalogMedication: catalog(TDAP_CATALOG_CODE, "Td vaccine"),
    });
    expect(identity.displayLabelEn).toContain("Tdap vaccine");
  });

  it("04 — DTaP does not collapse to Tdap or Td", () => {
    const label = buildMedicationOrderLabelSnapshot(
      { catalogItemType: "MEDICATION", strength: "0.5 mL" },
      catalog("DTAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR", "Tdap vaccine")
    );
    expect(label).toContain("DTaP vaccine");
    expect(label).not.toContain("Tdap vaccine");
    expect(label).not.toContain("Td vaccine");
  });

  it("05 — completed Tdap view includes vaccine name Tdap", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.vaccineName).toContain("Tdap");
  });

  it("06 — completed Tdap view includes dose/unit", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "dose")?.value).toBe("0.5 mL");
  });

  it("07 — completed Tdap view includes route", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "route")?.value).toBe("IM");
  });

  it("08 — completed Tdap view includes site/laterality", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "site")?.value).toContain("Right deltoid");
    expect(view.rows.find((r) => r.key === "site")?.value).toContain("right");
  });

  it("09 — completed Tdap view includes lot number", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "lotNumber")?.value).toBe("U8653BA");
  });

  it("10 — completed Tdap view includes expiration date", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "expirationDate")?.value).toContain("2027");
  });

  it("11 — completed Tdap view includes manufacturer", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "manufacturer")?.value).toBe("Sanofi Pasteur");
  });

  it("12 — completed Tdap view includes VIS recipient/date", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "vis")?.value).toContain("patient");
    expect(view.rows.find((r) => r.key === "vis")?.value).toContain("2026");
  });

  it("13 — completed Tdap view includes administered by", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "administeredBy")?.value).toBe("Elizabeth Posada RN");
  });

  it("14 — completed Tdap view includes administered at", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "administeredAt")?.value).toBeTruthy();
  });

  it("15 — vaccine note includes selected right deltoid", () => {
    expect(buildVaccineAdministrationAuditNote(doc(), "en").toLowerCase()).toContain("right deltoid");
  });

  it("16 — vaccine note includes Sanofi Pasteur when selected", () => {
    expect(buildVaccineAdministrationAuditNote(doc(), "en")).toContain("Sanofi Pasteur");
  });

  it("17 — vaccine note omits manufacturer when blank", () => {
    const note = buildVaccineAdministrationAuditNote(
      doc({ manufacturerId: "", manufacturerDisplayName: "" }),
      "en"
    );
    expect(note.toLowerCase()).not.toContain("manufacturer");
    expect(note).not.toContain("Sanofi");
  });

  it("18 — vaccine validation blocks missing required lot for vaccine policy", () => {
    expect(validateVaccineAdministrationDocumentation(doc({ lotNumber: "" }))).toContain("lot_number_required");
  });

  it("19 — vaccine note EN has no FR leakage", () => {
    const note = buildVaccineAdministrationAuditNote(doc(), "en");
    expect(vaccineAdministrationNoteIsMonolingual(note, "en")).toBe(true);
  });

  it("20 — vaccine note FR has no EN leakage", () => {
    const note = buildVaccineAdministrationAuditNote(doc(), "fr");
    expect(vaccineAdministrationNoteIsMonolingual(note, "fr")).toBe(true);
  });

  it("21 — generic vaccine workflow applies to influenza", () => {
    const label = resolveVaccineAdministrationDisplayName({
      catalogCode: "INFLUENZA_VACCINE_INJECTABLE_INTRAMUSCULAR",
      displayNameEn: "Flu",
      locale: "en",
    });
    expect(label).toBe("Influenza vaccine");
  });

  it("22 — generic vaccine workflow applies to COVID", () => {
    const label = resolveVaccineAdministrationDisplayName({
      catalogCode: "COVID_VACCINE_INJECTABLE_INTRAMUSCULAR",
      displayNameEn: "COVID",
      locale: "en",
    });
    expect(label).toBe("COVID-19 vaccine");
  });

  it("23 — generic vaccine workflow applies to Hep B", () => {
    const serialized = serializeVaccineAdministrationDocumentation(
      doc({ catalogCode: "HEPATITIS_B_VACCINE_INJECTABLE_INTRAMUSCULAR", vaccineDisplayName: "Hep B vaccine" })
    );
    expect(String(serialized.generatedNoteEn)).toContain("Hepatitis vaccine");
  });

  it("24 — manufacturer list uses centralized catalog", () => {
    expect(VACCINE_MANUFACTURER_CATALOG.some((m) => m.id === "sanofi_pasteur")).toBe(true);
  });

  it("25 — site/laterality preserved in saved administration event payload", () => {
    const payload = serializeVaccineAdministrationDocumentation(doc());
    expect(payload.site).toBe("right_deltoid");
    expect(payload.laterality).toBe("right");
  });

  it("26 — completed read-only drawer displays saved site/laterality", () => {
    const view = buildCompletedVaccineAdministrationViewModel(doc(), "en");
    expect(view.rows.find((r) => r.key === "site")?.value).toContain("right");
  });

  it("27 — no provider search activation occurred", () => {
    expect(buildVaccineMarAdministrationHardeningReport().compatibility.providerSearchChanged).toBe(false);
  });

  it("28 — no formulary status changed", () => {
    expect(buildVaccineMarAdministrationHardeningReport().compatibility.formularyStatusChanged).toBe(false);
  });

  it("29 — full vaccine administration hardening release gate passes", () => {
    const report = buildVaccineMarAdministrationHardeningReport();
    expect(REQUIRED_VACCINE_ADMINISTRATION_DOCUMENTATION_FIELDS.length).toBeGreaterThanOrEqual(25);
    expect(vaccineInjectionSiteLaterality("right_deltoid")).toBe("right");
    expect(report.i18n.decision).toBe("PASS");
    expect(report.compatibility.activationChanged).toBe(false);
  });
});
