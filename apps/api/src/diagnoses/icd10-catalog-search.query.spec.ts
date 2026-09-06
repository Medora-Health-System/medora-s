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
    const code = buildIcd10CatalogSearchMatch("R07.9");
    expect(code).not.toBeNull();
    expect(code!.isCodeQuery).toBe(true);
    expect(sqlText(code!.matchSql)).toContain("normalizedCode");
    expect(sqlText(code!.matchSql)).not.toContain("shortDescription");
    const text = buildIcd10CatalogSearchMatch("chest pain");
    expect(sqlText(text!.matchSql)).toContain("shortDescription");
  });

  it("select SQL filters one date-of-service release and does not collapse FY years by code", () => {
    const match = buildIcd10CatalogSearchMatch("chest pain");
    expect(match).not.toBeNull();
    const text = sqlText(buildIcd10CatalogSearchSelectSql(match!, 30, { releaseVersion: "FY2026" }));
    expect(text).toContain('"releaseVersion" =');
    expect(text).not.toContain('DISTINCT ON ("code")');
    expect(text).not.toContain("one_per_code");
    const fy2027 = sqlText(buildIcd10CatalogSearchSelectSql(match!, 30, { releaseVersion: "FY2027" }));
    expect(fy2027).toContain('"releaseVersion" =');
    expect(fy2027).not.toContain('DISTINCT ON ("code")');
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
    const match = buildIcd10CatalogSearchMatch("dolor abdominal", "es");
    expect(match).not.toBeNull();
    const matchText = sqlText(match!.matchSql);
    expect(matchText).toContain("Icd10DiagnosisTerminology");
    expect(matchText).toContain("Icd10DiagnosisSearchAlias");
    expect(matchText).toContain("CLINICIAN_PREFERRED");
    expect(matchText).not.toContain("CONSUMER");
    const selectText = sqlText(buildIcd10CatalogSearchSelectSql(match!, 30, { releaseVersion: "FY2026", locale: "es" }));
    expect(selectText).not.toContain('DISTINCT ON ("code")');
    expect(selectText).toContain('"shortDescription"');
    const firstSelect = selectText.slice(selectText.indexOf("SELECT"), selectText.indexOf("FROM"));
    expect(firstSelect).not.toContain("preferredLabel");
    expect(firstSelect).not.toContain("aliasText");
    expect(selectText).toContain('"codeSystem"');
    expect(selectText).toContain('"releaseVersion"');
    expect(matchText).toContain('"Icd10DiagnosisCode"."id"');
    expect(selectText).toContain('"Icd10DiagnosisCode"');
    expect(selectText).toContain("candidate_hits");
    expect(selectText).toContain("UNION");
    expect(selectText).toContain("INNER JOIN candidate_hits");
  });

  it("uses an indexed code fast path without scanning descriptions or terminology", () => {
    const select = sqlText(
      buildIcd10CatalogSearchSelectSql(buildIcd10CatalogSearchMatch("R11.0", "es")!, 25, {
        releaseVersion: "FY2026",
        locale: "es",
      }),
    );
    expect(select).not.toContain("candidate_hits");
    expect(select).toContain("normalizedCode");
    expect(select).not.toContain("preferredLabel ILIKE");
    expect(select).not.toContain('"searchText" ILIKE');
  });

  it("does not run 1-character non-code queries as a full-catalog scan", () => {
    expect(buildIcd10CatalogSearchMatch("r")).toBeNull();
    expect(buildIcd10CatalogSearchMatch("g")).toBeNull();
    const two = buildIcd10CatalogSearchMatch("gi", "en");
    expect(two).not.toBeNull();
    expect(two!.retrievalCatalogPrefixPatterns.length).toBeGreaterThan(0);
    expect(two!.retrievalCatalogPatterns).toEqual([]);
  });

  it("does not unconditionally boost S-chapter injuries above symptom matches", () => {
    const abdominal = sqlText(
      buildIcd10CatalogSearchSelectSql(buildIcd10CatalogSearchMatch("dolor abdominal", "es")!, 25, {
        releaseVersion: "FY2026",
        locale: "es",
      }),
    );
    expect(abdominal).toContain("LIKE 'S%'");
    expect(abdominal).toContain("THEN 1 ELSE 0 END");
    const strain = sqlText(
      buildIcd10CatalogSearchSelectSql(buildIcd10CatalogSearchMatch("cervical strain", "en")!, 25, {
        releaseVersion: "FY2026",
        locale: "en",
      }),
    );
    expect(strain).toContain("M75%");
  });

  it("requires all significant tokens together for multi-word symptom queries", () => {
    const match = buildIcd10CatalogSearchMatch("dolor abdominal", "es");
    const text = sqlText(match!.matchSql);
    expect(text).toContain(" AND ");
    expect(match!.searchIntent).toBe("SYMPTOM");
  });
});
