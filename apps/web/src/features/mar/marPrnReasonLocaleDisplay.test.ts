import { describe, expect, it } from "vitest";
import { localizeMarTimelinePrnCellText } from "@/features/mar/marShiftTimelineDisplay";
import { formatMarPrnReasonForLocale } from "@medora/shared";

describe("marPrnReasonLocaleDisplay (MEDUI.ED.UI.I18N_CLEANUP.1)", () => {
  it("English drawer label for moderate pain", () => {
    expect(
      formatMarPrnReasonForLocale({ code: "moderate_pain", label: "Douleur modérée" }, "en")
    ).toBe("Moderate pain");
  });

  it("English drawer label for vomiting", () => {
    expect(formatMarPrnReasonForLocale({ code: "vomiting", label: "Vomissements" }, "en")).toBe(
      "Vomiting"
    );
  });

  it("French drawer label when locale is fr", () => {
    expect(formatMarPrnReasonForLocale({ code: "moderate_pain" }, "fr")).toBe("Douleur modérée");
    expect(formatMarPrnReasonForLocale({ code: "vomiting" }, "fr")).toBe("Vomissements");
  });

  it("legacy stored French maps to English display", () => {
    expect(formatMarPrnReasonForLocale({ label: "Douleur modérée" }, "en")).toBe("Moderate pain");
  });

  it("legacy stored English maps to French display", () => {
    expect(formatMarPrnReasonForLocale({ label: "Moderate pain" }, "fr")).toBe("Douleur modérée");
  });

  it("timeline cell tertiary re-localizes French PRN summary", () => {
    expect(localizeMarTimelinePrnCellText("Douleur modérée", "en", "moderate_pain")).toBe(
      "Moderate pain"
    );
    expect(localizeMarTimelinePrnCellText("Douleur 8/10", "en")).toBe("Pain 8/10");
  });
});
