import { pickOrderSetCatalogMatch } from "./order-set-catalog-match.util";
import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";

function lab(code: string): CatalogSearchItemDto {
  return {
    id: `id-${code}`,
    code,
    type: "LAB_TEST",
    displayNameFr: code,
    displayNameEn: code,
  };
}

describe("pickOrderSetCatalogMatch", () => {
  it("prefers the first reference code when multiple catalog rows match", () => {
    const result = pickOrderSetCatalogMatch({
      referenceCodes: ["TROPONIN", "TROP", "ER_TROP"],
      matches: [lab("ER_TROP"), lab("TROPONIN")],
    });
    expect(result.ambiguous).toBe(false);
    expect(result.item?.code).toBe("TROPONIN");
  });

  it("returns ambiguous when one reference code maps to multiple rows", () => {
    const result = pickOrderSetCatalogMatch({
      referenceCodes: ["TROPONIN"],
      matches: [lab("TROPONIN"), { ...lab("TROPONIN"), id: "id-2" }],
    });
    expect(result.ambiguous).toBe(true);
    expect(result.item).toBeNull();
  });

  it("returns null when no acceptable match exists", () => {
    const result = pickOrderSetCatalogMatch({
      referenceCodes: ["TROPONIN"],
      matches: [lab("CBC")],
    });
    expect(result.ambiguous).toBe(false);
    expect(result.item).toBeNull();
  });
});
