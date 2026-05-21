import { describe, expect, it } from "vitest";
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
});
