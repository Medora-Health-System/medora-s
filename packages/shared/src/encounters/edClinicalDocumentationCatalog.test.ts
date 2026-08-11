import { describe, expect, it } from "vitest";
import { ED_CLINICAL_DOCUMENTATION_CATALOG, ED_CLINICAL_DOCUMENTATION_DISPOSITIONS } from "./edClinicalDocumentationCatalog.js";

describe("ED clinical documentation coverage catalog", () => {
  it("assigns every unique source an explicit summary disposition and explains exclusions", () => {
    expect(new Set(ED_CLINICAL_DOCUMENTATION_CATALOG.map((row) => row.source)).size).toBe(ED_CLINICAL_DOCUMENTATION_CATALOG.length);
    for (const row of ED_CLINICAL_DOCUMENTATION_CATALOG) {
      expect(ED_CLINICAL_DOCUMENTATION_DISPOSITIONS).toContain(row.disposition);
      if (row.disposition === "EXCLUDE_WITH_REASON") expect("reason" in row && row.reason.length > 0).toBe(true);
    }
  });
});
