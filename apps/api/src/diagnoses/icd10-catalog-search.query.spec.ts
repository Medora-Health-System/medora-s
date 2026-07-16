import { Prisma } from "@prisma/client";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
  icd10ReleasePreferenceOrderSql,
} from "./icd10-catalog-search.query";

function sqlText(sql: Prisma.Sql): string {
  return sql.strings.join("?");
}

describe("ICD-10 catalog search query architecture", () => {
  it("builds match predicates for code and description search", () => {
    const match = buildIcd10CatalogSearchMatch("R07.9");
    expect(match).not.toBeNull();
    const text = sqlText(match!.matchSql);
    expect(text).toContain("normalizedCode");
    expect(text).toContain("shortDescription");
  });

  it("select SQL collapses multi-release rows with DISTINCT ON code", () => {
    const match = buildIcd10CatalogSearchMatch("chest pain");
    expect(match).not.toBeNull();
    const text = sqlText(buildIcd10CatalogSearchSelectSql(match!, 30));
    expect(text).toContain('DISTINCT ON ("code")');
    expect(text).toContain("one_per_code");
    expect(text).toContain("DEV-SAMPLE");
    expect(text).toContain("UNSPECIFIED");
  });

  it("release preference ranks official before UNSPECIFIED and DEV-SAMPLE", () => {
    const text = sqlText(icd10ReleasePreferenceOrderSql());
    expect(text).toContain("DEV-SAMPLE");
    expect(text).toContain("UNSPECIFIED");
    expect(text.indexOf("DEV-SAMPLE")).toBeLessThan(text.indexOf("UNSPECIFIED") + 1);
  });

  it("returns null match for empty query", () => {
    expect(buildIcd10CatalogSearchMatch("")).toBeNull();
    expect(buildIcd10CatalogSearchMatch("   ")).toBeNull();
  });
});
