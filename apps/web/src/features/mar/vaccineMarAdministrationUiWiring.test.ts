import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildVaccineAdministrationAuditNote,
  buildVaccineValidationBlockerReport,
  isVaccineMedicationForMar,
  normalizeVaccineAdministrationDocumentation,
  parseVaccineAdministrationDocumentationFromMarNotes,
  sanitizeMarAdministrationVisibleNote,
  serializeVaccineAdministrationDocumentationForMarNotes,
  validateVaccineAdministrationDocumentation,
  vaccineAdministrationNoteIsMonolingual,
  type VaccineAdministrationDocumentation,
} from "@medora/shared";

const modalSource = readFileSync(
  new URL("../../components/encounters/MedicationAdministrationTab.tsx", import.meta.url),
  "utf8"
);

function doc(overrides: Partial<VaccineAdministrationDocumentation> = {}): VaccineAdministrationDocumentation {
  return {
    vaccineProductId: null,
    catalogCode: "TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR",
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
    visEditionDate: null,
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

describe("MEDUI.MEDICATION.VACCINE_MAR_ADMINISTRATION_UI_WIRING.1", () => {
  it("01 — Tdap modal renders lot number field", () => {
    expect(modalSource).toContain('data-testid="vaccine-lot-number"');
  });

  it("00 — fully populated Tdap vaccine saves successfully by validation contract", () => {
    expect(buildVaccineValidationBlockerReport(doc()).ok).toBe(true);
  });

  it("02 — Tdap modal renders expiration date field", () => {
    expect(modalSource).toContain('data-testid="vaccine-expiration-date"');
  });

  it("03 — Tdap modal renders manufacturer dropdown", () => {
    expect(modalSource).toContain('data-testid="vaccine-manufacturer"');
    expect(modalSource).toContain("VACCINE_MANUFACTURER_CATALOG.map");
  });

  it("04 — Tdap modal renders VIS recipient/date", () => {
    expect(modalSource).toContain('data-testid="vaccine-vis-recipient"');
    expect(modalSource).toContain('data-testid="vaccine-vis-date"');
  });

  it("05 — Tdap modal renders education reviewed", () => {
    expect(modalSource).toContain('data-testid="vaccine-education-reviewed"');
  });

  it("06 — Tdap modal requires site/laterality", () => {
    expect(validateVaccineAdministrationDocumentation(doc({ site: "", laterality: "" }))).toContain(
      "site_required_for_im_vaccine"
    );
  });

  it("06B — Right deltoid label passes validation and derives laterality", () => {
    const normalized = normalizeVaccineAdministrationDocumentation(
      doc({ site: "Right deltoid" as VaccineAdministrationDocumentation["site"], laterality: "" })
    );
    expect(normalized.site).toBe("right_deltoid");
    expect(normalized.laterality).toBe("right");
    expect(buildVaccineValidationBlockerReport(normalized).ok).toBe(true);
  });

  it("07 — Tdap save blocked if lot missing", () => {
    expect(validateVaccineAdministrationDocumentation(doc({ lotNumber: "" }))).toContain("lot_number_required");
  });

  it("08 — Tdap save blocked if expiration missing", () => {
    expect(validateVaccineAdministrationDocumentation(doc({ expirationDate: "" }))).toContain(
      "expiration_date_required"
    );
  });

  it("09 — Tdap save blocked if manufacturer missing", () => {
    expect(validateVaccineAdministrationDocumentation(doc({ manufacturerId: "", manufacturerDisplayName: "" }))).toContain(
      "manufacturer_required"
    );
  });

  it("09B — Sanofi Pasteur display maps to manufacturerId", () => {
    const normalized = normalizeVaccineAdministrationDocumentation(
      doc({ manufacturerId: "", manufacturerDisplayName: "Sanofi Pasteur" })
    );
    expect(normalized.manufacturerId).toBe("sanofi_pasteur");
    expect(buildVaccineValidationBlockerReport(normalized).ok).toBe(true);
  });

  it("09C — blank amount wasted does not block save", () => {
    const report = buildVaccineValidationBlockerReport(doc({ amountWasted: "" }));
    expect(report.invalidAmountWasted).toBe(false);
    expect(report.ok).toBe(true);
  });

  it("09D — VIS date from input formats passes validation", () => {
    expect(buildVaccineValidationBlockerReport(doc({ visDate: "06/14/2026" })).ok).toBe(true);
    expect(buildVaccineValidationBlockerReport(doc({ visDate: "2026-06-14" })).ok).toBe(true);
  });

  it("10 — Tdap save blocked if VIS recipient/date missing when VIS given", () => {
    const errors = validateVaccineAdministrationDocumentation(doc({ visGiven: true, visRecipient: "none", visDate: "" }));
    expect(errors).toContain("vis_recipient_required_when_given");
    expect(errors).toContain("vis_date_required_when_given");
  });

  it("11 — Tdap payload includes lot", () => {
    const line = serializeVaccineAdministrationDocumentationForMarNotes(doc());
    expect(line).toContain("U8653BA");
  });

  it("12 — Tdap payload includes expiration", () => {
    const line = serializeVaccineAdministrationDocumentationForMarNotes(doc());
    expect(line).toContain("2027-09-01");
  });

  it("13 — Tdap payload includes manufacturer", () => {
    const line = serializeVaccineAdministrationDocumentationForMarNotes(doc());
    expect(line).toContain("sanofi_pasteur");
    expect(line).toContain("Sanofi Pasteur");
  });

  it("14 — Tdap payload includes site/laterality", () => {
    const line = serializeVaccineAdministrationDocumentationForMarNotes(doc());
    expect(line).toContain("right_deltoid");
    expect(line).toContain('"laterality":"right"');
  });

  it("15 — Tdap completed view shows Tdap, not Td", () => {
    expect(modalSource).toContain("buildCompletedVaccineAdministrationViewModel");
    expect(buildVaccineAdministrationAuditNote(doc({ vaccineDisplayName: "Td vaccine" }), "en")).toContain(
      "Tdap vaccine"
    );
  });

  it("16 — Tdap completed view shows right deltoid", () => {
    expect(buildVaccineAdministrationAuditNote(doc(), "en").toLowerCase()).toContain("right deltoid");
  });

  it("17 — Tdap completed view shows lot/expiration/manufacturer", () => {
    const note = buildVaccineAdministrationAuditNote(doc(), "en");
    expect(note).toContain("U8653BA");
    expect(note).toContain("2027");
    expect(note).toContain("Sanofi Pasteur");
  });

  it("18 — Tdap completed view shows VIS data", () => {
    const note = buildVaccineAdministrationAuditNote(doc(), "en");
    expect(note).toContain("Vaccine information statement");
    expect(note).toContain("patient");
  });

  it("19 — Influenza vaccine uses same fields", () => {
    expect(isVaccineMedicationForMar({ catalogCode: "INFLUENZA_VACCINE_INJECTABLE_INTRAMUSCULAR" })).toBe(true);
  });

  it("20 — COVID vaccine uses same fields", () => {
    expect(isVaccineMedicationForMar({ catalogCode: "COVID_VACCINE_INJECTABLE_INTRAMUSCULAR" })).toBe(true);
  });

  it("21 — Non-vaccine med does not show vaccine fields", () => {
    expect(isVaccineMedicationForMar({ catalogCode: "ACETAMINOPHEN_500", medicationLabel: "Acetaminophen" })).toBe(false);
  });

  it("22 — EN note has no FR leakage", () => {
    const note = buildVaccineAdministrationAuditNote(doc(), "en");
    expect(vaccineAdministrationNoteIsMonolingual(note, "en")).toBe(true);
  });

  it("23 — FR note has no EN leakage", () => {
    const note = buildVaccineAdministrationAuditNote(doc(), "fr");
    expect(vaccineAdministrationNoteIsMonolingual(note, "fr")).toBe(true);
  });

  it("24 — structured MAR note round-trips for read-only view", () => {
    const saved = serializeVaccineAdministrationDocumentationForMarNotes(doc());
    const parsed = parseVaccineAdministrationDocumentationFromMarNotes(`Action: Administered\n${saved}`);
    expect(parsed?.lotNumber).toBe("U8653BA");
    expect(modalSource).toContain("completed-vaccine-readonly-details");
  });

  it("25 — vaccine save blocker panel is visible in source", () => {
    expect(modalSource).toContain('data-testid="vaccine-save-validation-panel"');
    expect(modalSource).toContain("buildVaccineValidationBlockerReport");
  });

  it("26 — MAR history display uses sanitizer and does not render raw vaccine metadata", () => {
    expect(modalSource).toContain("sanitizeMarAdministrationVisibleNote");
    const visible = sanitizeMarAdministrationVisibleNote(
      [
        "Action: Administered",
        "Site d'injection : Deltoïde droit",
        "IM_INJECTION_SITE:right_deltoid",
        serializeVaccineAdministrationDocumentationForMarNotes(doc()),
      ].join("\n"),
      "en"
    );
    expect(visible).toContain("Tdap vaccine");
    expect(visible).not.toContain("Site d'injection");
    expect(visible).not.toContain("VACCINE_ADMINISTRATION_DOCUMENTATION");
    expect(visible).not.toContain("IM_INJECTION_SITE");
  });
});
