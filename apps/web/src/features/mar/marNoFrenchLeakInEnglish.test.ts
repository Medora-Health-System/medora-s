import { describe, expect, it } from "vitest";
import { extractMarSaveErrorMessage } from "./marSaveErrorMessage";
import { formatMarPrnReasonForLocale } from "@medora/shared";
import { normalizeUserFacingError } from "@/lib/userFacingError";

describe("marNoFrenchLeakInEnglish (MEDUI.ED.UI.I18N_CLEANUP.1)", () => {
  it("PRN reason formatter never returns French in English locale", () => {
    for (const label of ["Douleur modérée", "Vomissements", "Nausées"]) {
      const en = formatMarPrnReasonForLocale({ label }, "en");
      expect(en).not.toMatch(/^(un |une |le |la |douleur|vomissements|nausées)/i);
    }
  });

  it("timing reason French API message does not leak to English MAR save error", () => {
    const french = "Un motif est requis pour cet ajustement d'heure.";
    const err = Object.assign(new Error(french), {
      body: { statusCode: 400, message: french },
    });
    const msg = extractMarSaveErrorMessage(err, "en", "Unable to save administration.", (k) => k);
    expect(msg).not.toContain("Un motif");
  });

  it("normalizeUserFacingError blocks French ASCII for English UI", () => {
    expect(normalizeUserFacingError("Un motif est requis pour cet ajustement d'heure.", "en")).toBe(
      "Something went wrong."
    );
  });
});
