import { describe, expect, it } from "vitest";
import { formatApiErrorJson } from "./apiClient";
import { catalogImportErrorMessage } from "./catalogImportApi";

describe("catalogImportErrorMessage", () => {
  it("maps INVALID_COMMIT_PARAMS code in French", () => {
    const msg = catalogImportErrorMessage(
      new Error("Paramètres invalides (INVALID_COMMIT_PARAMS)"),
      "fr"
    );
    expect(msg).toContain("Paramètres de validation");
  });

  it("passes through French backend confirmation errors", () => {
    const msg = catalogImportErrorMessage(
      new Error("Confirmation requise pour activer la recherche de prescription."),
      "fr"
    );
    expect(msg).toContain("Confirmation requise");
  });

  it("surfaces backend blockers appended to the error message", () => {
    const raw = formatApiErrorJson({
      message: "Activation bloquée.",
      blockers: ["MISSING_EXACT_NAME_DOSE_FORM"],
    });
    const msg = catalogImportErrorMessage(new Error(raw), "fr");
    expect(msg).toContain("MISSING_EXACT_NAME_DOSE_FORM");
    expect(msg).not.toBe("Une erreur est survenue.");
  });
});
