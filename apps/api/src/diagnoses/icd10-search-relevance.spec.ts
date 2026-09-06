import { Prisma } from "@prisma/client";
import { buildIcd10CatalogSearchMatch, buildIcd10CatalogSearchSelectSql, icd10MatchQualityOrderSql } from "./icd10-catalog-search.query";

function sqlText(sql: Prisma.Sql): string {
  return sql.strings.join("?");
}

describe("ICD-10 search relevance SQL (SEARCH.1)", () => {
  it("ranks locale phrase and synonym groups before generic token / S-chapter boost", () => {
    const match = buildIcd10CatalogSearchMatch("dolor abdominal", "es");
    expect(match?.searchIntent).toBe("SYMPTOM");
    const order = sqlText(icd10MatchQualityOrderSql(match!));
    expect(order).toContain("THEN 5");
    expect(order).toContain("ELSE 13");
    expect(order.indexOf("THEN 5")).toBeLessThan(order.indexOf("ELSE 13"));
    expect(order).toContain("(1::integer)");
    expect(order).toContain("LIKE 'T%'");
    expect(order).not.toMatch(/WHEN "code" LIKE 'S%' OR "code" LIKE 'M66%'/);
  });

  it("retrieves GI-bleed synonym phrases, not only the generic gastrointestinal token", () => {
    const match = buildIcd10CatalogSearchMatch("sangrado gastrointestinal", "es");
    const values = JSON.stringify(match!.matchSql.values ?? []).toLowerCase();
    expect(values).toContain("gastrointestinal hemorrhage");
    expect(values).toContain("hemorragia gastrointestinal");
    expect(match!.searchIntent).toBe("SYMPTOM");
  });

  it("does not use bare integer ORDER BY positions for non-trauma / code queries", () => {
    const codeOrder = sqlText(
      icd10MatchQualityOrderSql(buildIcd10CatalogSearchMatch("R11.0", "es")!),
    );
    expect(codeOrder).toContain("(0::integer)");
    expect(codeOrder).toContain("(1::integer)");
  });

  it("keeps trauma chapter boost for injury-shaped queries only", () => {
    const match = buildIcd10CatalogSearchMatch("cervical strain", "en");
    expect(match?.searchIntent).toBe("TRAUMA");
    const order = sqlText(icd10MatchQualityOrderSql(match!));
    expect(order).toContain("M66%");
    expect(order).toContain("M75%");
  });

  it("folds diacritics in ranking SQL for nauseas / náuseas", () => {
    const match = buildIcd10CatalogSearchMatch("nauseas", "es");
    const values = JSON.stringify(match!.matchSql.values ?? []).toLowerCase();
    expect(values).toContain("nauseas");
    const select = sqlText(buildIcd10CatalogSearchSelectSql(match!, 25, { releaseVersion: "FY2026", locale: "es" }));
    expect(select.toLowerCase()).toContain("translate");
    expect(select).toContain('"releaseVersion" =');
  });

  it("does not select alias or terminology text as the catalog row display payload", () => {
    const select = sqlText(
      buildIcd10CatalogSearchSelectSql(buildIcd10CatalogSearchMatch("sangrado gastrointestinal", "es")!, 25, {
        releaseVersion: "FY2026",
        locale: "es",
      }),
    );
    const firstSelect = select.slice(select.indexOf("SELECT"), select.indexOf("FROM"));
    expect(firstSelect).not.toContain("preferredLabel");
    expect(firstSelect).not.toContain("aliasText");
  });
});
