import { enrichMedicationSearchItemsWithCanonical } from "./medication-catalog-canonical-enrich.util";
import type { CatalogSearchItemDto } from "../order-catalog/dto/catalog-search-item.dto";

describe("enrichMedicationSearchItemsWithCanonical", () => {
  const baseItem: CatalogSearchItemDto = {
    id: "catalog-uuid-1",
    code: "MED001",
    type: "MEDICATION",
    displayNameFr: "Épinéphrine",
  };

  it("preserves CatalogMedication id and code (no canonical UUIDs)", () => {
    const meta = new Map([
      [
        "catalog-uuid-1",
        {
          matchConfidence: "LEGACY_LINK" as const,
          badges: {
            edFormulary: true,
            rsi: false,
            crashCart: false,
            infusion: true,
            controlled: true,
            highAlert: true,
            billingReview: false,
            ndcPresent: true,
          },
          canonicalAliases: ["Adrenaline"],
        },
      ],
    ]);

    const [out] = enrichMedicationSearchItemsWithCanonical([baseItem], meta);
    expect(out.id).toBe("catalog-uuid-1");
    expect(out.code).toBe("MED001");
    expect(out.metadata?.canonicalReadOnly?.matchConfidence).toBe("LEGACY_LINK");
    expect(JSON.stringify(out)).not.toMatch(/conceptId|productId|packageId/);
  });

  it("leaves items without confident match unchanged", () => {
    const [out] = enrichMedicationSearchItemsWithCanonical([baseItem], new Map());
    expect(out).toEqual(baseItem);
  });
});
