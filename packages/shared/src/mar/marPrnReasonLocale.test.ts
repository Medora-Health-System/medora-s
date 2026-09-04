import { describe, expect, it } from "vitest";
import {
  formatMarPrnReasonForLocale,
  normalizeMarPrnReasonCode,
  normalizeMarPrnReasonCodeFromStoredValue,
  marPrnReasonLabel,
} from "./marPrnReasonLocale.js";

describe("marPrnReasonLocale (MEDUI.ED.I18N.AUDIT.1)", () => {
  it("stable PRN code maps to English", () => {
    expect(marPrnReasonLabel("moderate_pain", "en")).toBe("Moderate pain");
    expect(marPrnReasonLabel("vomiting", "en")).toBe("Vomiting");
  });

  it("stable PRN code maps to Spanish without EN/FR substitution", () => {
    expect(marPrnReasonLabel("moderate_pain", "es")).toBe("Dolor moderado");
    expect(marPrnReasonLabel("vomiting", "es")).toBe("Vómitos");
    expect(marPrnReasonLabel("moderate_pain", "es")).not.toBe("Moderate pain");
    expect(marPrnReasonLabel("moderate_pain", "es")).not.toBe("Douleur modérée");
  });

  it("legacy French label normalizes to code", () => {
    expect(normalizeMarPrnReasonCode("Douleur modérée")).toBe("moderate_pain");
    expect(normalizeMarPrnReasonCode("Vomissements")).toBe("vomiting");
  });

  it("legacy English label normalizes to code", () => {
    expect(normalizeMarPrnReasonCodeFromStoredValue("Moderate pain")).toBe("moderate_pain");
    expect(normalizeMarPrnReasonCodeFromStoredValue("Vomiting")).toBe("vomiting");
  });

  it("legacy French label maps to English display in English session", () => {
    expect(formatMarPrnReasonForLocale({ label: "Douleur modérée" }, "en")).toBe("Moderate pain");
    expect(formatMarPrnReasonForLocale({ label: "Vomissements" }, "en")).toBe("Vomiting");
  });

  it("legacy English label maps to French display in French session", () => {
    expect(formatMarPrnReasonForLocale({ label: "Moderate pain" }, "fr")).toBe("Douleur modérée");
    expect(formatMarPrnReasonForLocale({ label: "Vomiting" }, "fr")).toBe("Vomissements");
  });

  it("unknown free-text is preserved", () => {
    const custom = "Patient requested comfort measure per family";
    expect(formatMarPrnReasonForLocale({ label: custom }, "en")).toBe(custom);
    expect(formatMarPrnReasonForLocale({ label: custom }, "fr")).toBe(custom);
    expect(normalizeMarPrnReasonCode(custom)).toBeNull();
  });

  it("code wins over legacy label when both present", () => {
    expect(
      formatMarPrnReasonForLocale({ code: "vomiting", label: "Douleur modérée" }, "en")
    ).toBe("Vomiting");
  });
});
