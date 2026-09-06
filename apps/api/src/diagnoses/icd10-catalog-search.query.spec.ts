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

  it("select SQL filters one date-of-service release and does not collapse FY years by code", () => {
    const match = buildIcd10CatalogSearchMatch("chest pain");
    expect(match).not.toBeNull();
    const text = sqlText(buildIcd10CatalogSearchSelectSql(match!, 30, { releaseVersion: "FY2026" }));
    expect(text).toContain('"releaseVersion" =');
    expect(text).not.toContain('DISTINCT ON ("code")');
    expect(text).not.toContain("one_per_code");
    expect(() => buildIcd10CatalogSearchSelectSql(match!, 30, { releaseVersion: "" })).toThrow(
      /ICD10_SEARCH_REQUIRES_RELEASE_VERSION/,
    );
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

  it("matches approved clinician preferred labels and search aliases without selecting them as display", () => {
    const match = buildIcd10CatalogSearchMatch("dolor abdominal");
    expect(match).not.toBeNull();
    const matchText = sqlText(match!.matchSql);
    expect(matchText).toContain("Icd10DiagnosisTerminology");
    expect(matchText).toContain("Icd10DiagnosisSearchAlias");
    expect(matchText).toContain("CLINICIAN_PREFERRED");
    expect(matchText).not.toContain("CONSUMER");
    const selectText = sqlText(buildIcd10CatalogSearchSelectSql(match!, 30, { releaseVersion: "FY2026" }));
    expect(selectText).not.toContain('DISTINCT ON ("code")');
    expect(selectText).toContain('"shortDescription"');
    const firstSelect = selectText.slice(selectText.indexOf("SELECT"), selectText.indexOf("FROM"));
    expect(firstSelect).not.toContain("preferredLabel");
    expect(firstSelect).not.toContain("aliasText");
    expect(selectText).toContain('"codeSystem"');
    expect(selectText).toContain('"releaseVersion"');
    expect(matchText).toContain('"Icd10DiagnosisCode"."id"');
    expect(selectText).toContain('"Icd10DiagnosisCode"');
  });
});
