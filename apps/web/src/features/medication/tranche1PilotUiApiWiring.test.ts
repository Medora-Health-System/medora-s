import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrc = join(import.meta.dirname, "../..");

function source(path: string): string {
  return readFileSync(join(webSrc, path), "utf8");
}

describe("MEDUI.MEDICATION.TRANCHE_1_PILOT_UI_AND_API_WIRING.1 web wiring", () => {
  it("provider medication autocomplete uses unified catalog medication search", () => {
    expect(source("components/orders/CreateOrderModal.tsx")).toContain("SharedCatalogAutocomplete");
    expect(source("lib/catalogSearchApi.ts")).toContain('return "/catalog/medications/search"');
  });

  it("provider search UI keeps canonical display helpers and avoids code-first display", () => {
    const autocomplete = source("components/catalog/SharedCatalogAutocomplete.tsx");
    expect(autocomplete).toContain("getCatalogSearchItemDisplayLabel");
    expect(autocomplete).toContain("formatCatalogMedicationSubtitleForLocale");
    expect(autocomplete).toContain("MedicationCanonicalBadges");
  });

  it("pilot blocked-order API errors are localized before display", () => {
    const modal = source("components/orders/CreateOrderModal.tsx");
    const errors = source("lib/userFacingError.ts");
    expect(modal).toContain("normalizeUserFacingError");
    expect(errors).toContain("PILOT_MEDICATION_ORDER_BLOCKED");
    expect(errors).toContain("This pilot medication is not available for this provider or facility.");
    expect(errors).toContain("Ce médicament pilote n'est pas disponible pour ce prescripteur ou cet établissement.");
  });
});
