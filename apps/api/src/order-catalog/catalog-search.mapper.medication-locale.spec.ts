import type { CatalogMedication } from "@prisma/client";
import { mapMedicationToCatalogSearchItem } from "./catalog-search.mapper";

function ibuprofenRow(): CatalogMedication {
  return {
    id: "ibu-200",
    code: "IBUPROFEN_200",
    name: "Ibuprofène",
    genericName: "Ibuprofen",
    displayNameFr: "Ibuprofène",
    displayNameEn: "Ibuprofen",
    strength: "200 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Analgésique / antipyrétique",
    searchText: "ibuprofen ibuprofene",
    isActive: true,
    isEssential: true,
    isControlled: false,
    requiresWitness: false,
    requiresDoubleSign: false,
    sortPriority: 5,
    ndc11: null,
    billingUnitType: null,
    administrationType: null,
    billingClass: null,
    controlledSchedule: null,
    facilityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as CatalogMedication;
}

describe("mapMedicationToCatalogSearchItem locale display (M1.7A.3)", () => {
  it("returns English secondary line without French clinical tokens", () => {
    const item = mapMedicationToCatalogSearchItem(ibuprofenRow());
    expect(item.displayNameEn).toBe("Ibuprofen");
    expect(item.secondaryTextEn).toContain("tablet");
    expect(item.secondaryTextEn).toContain("Analgesic / antipyretic");
    expect(item.secondaryTextEn?.toLowerCase()).not.toContain("comprimé");
    expect(item.secondaryTextEn?.toLowerCase()).not.toContain("antipyrétique");
    expect(item.secondaryTextFr).toContain("comprimé");
    expect(item.secondaryTextFr).toContain("Analgésique");
  });

  it("keeps legacy secondaryText as French-first for backward compatibility", () => {
    const item = mapMedicationToCatalogSearchItem(ibuprofenRow());
    expect(item.secondaryText).toBe(item.secondaryTextFr);
  });
});
