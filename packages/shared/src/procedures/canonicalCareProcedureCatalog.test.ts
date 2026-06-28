import { describe, expect, it } from "vitest";
import {
  activeCanonicalCareProcedureCatalog,
  buildCanonicalCareProcedureCategoryReport,
  buildCanonicalCareProcedureDuplicateReport,
  CANONICAL_CARE_PROCEDURE_CATALOG,
  CANONICAL_CARE_PROCEDURE_EXPECTED_COUNT,
  canonicalCareProcedureByCode,
} from "./canonicalCareProcedureCatalog.js";
import { searchCanonicalCareProcedures } from "./canonicalCareProcedureSearch.js";
import { ENTERPRISE_PROCEDURE_CATALOG } from "./enterpriseProcedureCatalog.js";

describe("MEDUI.CARE_PROCEDURES.CANONICAL_CATALOG_FOUNDATION.1", () => {
  it("includes all 55 enterprise procedures (active or deprecated)", () => {
    for (const entry of ENTERPRISE_PROCEDURE_CATALOG) {
      expect(canonicalCareProcedureByCode(entry.id)).toBeDefined();
    }
  });

  it("has no duplicate canonical codes", () => {
    const codes = CANONICAL_CARE_PROCEDURE_CATALOG.map((row) => row.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("consolidates legacy duplicate pairs", () => {
    const report = buildCanonicalCareProcedureDuplicateReport();
    expect(report.mergedPairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ canonicalCode: "foley_catheter", mergedFrom: "urinary_catheter_insertion" }),
        expect.objectContaining({
          canonicalCode: "continuous_cardiac_monitoring",
          mergedFrom: "cardiac_monitoring",
        }),
      ])
    );
    expect(canonicalCareProcedureByCode("urinary_catheter_insertion")?.isActive).toBe(false);
    expect(canonicalCareProcedureByCode("cardiac_monitoring")?.isActive).toBe(false);
  });

  it("finds EKG aliases on canonical ekg_ecg", () => {
    const matches = searchCanonicalCareProcedures({ q: "ecg", locale: "en", limit: 10 });
    expect(matches.some((row) => row.code === "ekg_ecg")).toBe(true);
  });

  it("finds cervical collar aliases", () => {
    const matches = searchCanonicalCareProcedures({ q: "c collar", locale: "en", limit: 10 });
    expect(matches.some((row) => row.code === "cervical_collar")).toBe(true);
  });

  it("finds warm blanket aliases", () => {
    const matches = searchCanonicalCareProcedures({ q: "give warm blanket", locale: "en", limit: 10 });
    expect(matches.some((row) => row.code === "warm_blanket")).toBe(true);
  });

  it("filters by category", () => {
    const consults = searchCanonicalCareProcedures({
      q: "consult",
      category: "CONSULTS",
      locale: "en",
      limit: 20,
    });
    expect(consults.length).toBeGreaterThan(0);
    expect(consults.every((row) => row.category === "CONSULTS")).toBe(true);
  });

  it("reports expected catalog count", () => {
    expect(CANONICAL_CARE_PROCEDURE_EXPECTED_COUNT).toBeGreaterThanOrEqual(80);
    expect(activeCanonicalCareProcedureCatalog().length).toBe(
      CANONICAL_CARE_PROCEDURE_CATALOG.filter((row) => row.isActive && row.orderable).length
    );
    const categories = buildCanonicalCareProcedureCategoryReport();
    expect(Object.values(categories).reduce((sum, n) => sum + n, 0)).toBe(
      activeCanonicalCareProcedureCatalog().length
    );
  });
});
