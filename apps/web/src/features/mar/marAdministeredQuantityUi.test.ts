import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatMarModalDefaultAdministeredQuantity,
  validateMarAdministeredQuantityRequired,
} from "@medora/shared";
import { extractMarSaveErrorMessage } from "./marSaveErrorMessage";

function readWebSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("marAdministeredQuantityUi (M1.7B.7E)", () => {
  it("defaults modal administered quantity from ordered quantity on open", () => {
    expect(formatMarModalDefaultAdministeredQuantity(1)).toBe("1");
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("formatMarModalDefaultAdministeredQuantity");
    expect(mar).toContain("orderedQuantity");
  });

  it("blocks administered submit when quantity cannot be resolved", () => {
    const result = validateMarAdministeredQuantityRequired({
      marAction: "administered",
      administeredQuantity: null,
    });
    expect(result.ok).toBe(false);
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("validateMarAdministeredQuantityRequired");
    expect(mar).toContain("errAdministeredQuantityRequired");
  });

  it("surfaces backend validation message instead of generic failure", () => {
    const msg = extractMarSaveErrorMessage(
      {
        message: "Request failed (400).",
        body: {
          statusCode: 400,
          message: "La quantité administrée est requise pour enregistrer une administration.",
          code: "ADMINISTERED_QUANTITY_REQUIRED",
        },
      },
      "fr",
      "fallback"
    );
    expect(msg).toContain("quantité administrée");
    expect(msg).not.toBe("Une erreur est survenue.");
  });

  it("keeps NDC, billing quantity, and dose value fields hidden", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).not.toContain('t("marTab.ndcLabel")');
    expect(mar).not.toContain('t("marTab.doseValuePlaceholder")');
    expect(mar).not.toContain('t("marTab.billingQuantityPlaceholder")');
  });
});
