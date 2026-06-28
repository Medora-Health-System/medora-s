import { describe, expect, it } from "vitest";
import {
  activeCanonicalCareProcedureCatalog,
  buildCanonicalCareProcedureDuplicateReport,
  CANONICAL_CARE_PROCEDURE_CATALOG,
  canonicalCareProcedureByCode,
} from "./canonicalCareProcedureCatalog.js";
import { searchCanonicalCareProcedures } from "./canonicalCareProcedureSearch.js";
import {
  WAVE1_STAFF_ORDER_ALIAS_MERGE_COUNT,
  WAVE1_STAFF_ORDER_NEW_ROW_COUNT,
  WAVE1_STAFF_ORDER_SOURCE_COUNT,
} from "./canonicalCareProcedureStaffOrdersWave1Manifest.js";

describe("MEDUI.CARE_PROCEDURES.EXPANSION_WAVE_1_STAFF_ORDERS.2", () => {
  it("ingests the full wave-1 staff-order source", () => {
    expect(WAVE1_STAFF_ORDER_SOURCE_COUNT).toBe(278);
    expect(WAVE1_STAFF_ORDER_NEW_ROW_COUNT).toBe(205);
    expect(WAVE1_STAFF_ORDER_ALIAS_MERGE_COUNT).toBe(73);
    expect(CANONICAL_CARE_PROCEDURE_CATALOG.length).toBe(290);
    expect(activeCanonicalCareProcedureCatalog().length).toBe(288);
  });

  it("has no duplicate canonical codes after wave 1", () => {
    const codes = CANONICAL_CARE_PROCEDURE_CATALOG.map((row) => row.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("merges wave-1 legacy labels as aliases only", () => {
    const report = buildCanonicalCareProcedureDuplicateReport();
    expect(report.mergedPairs.some((p) => p.mergedFrom === "Give Warm Blanket" && p.canonicalCode === "warm_blanket")).toBe(
      true
    );
    expect(report.mergedPairs.some((p) => p.mergedFrom === "Stroke Alert" && p.canonicalCode === "stroke_alert_activation")).toBe(
      true
    );
    expect(report.mergedPairs.filter((p) => p.reason === "WAVE1_ALIAS_MERGE").length).toBe(73);
  });

  it("finds new wave-1 staff orders via search", () => {
    expect(searchCanonicalCareProcedures({ q: "consult nephrology", locale: "en", limit: 5 }).some((r) => r.code === "consult_nephrology")).toBe(
      true
    );
    expect(searchCanonicalCareProcedures({ q: "poc troponin", locale: "en", limit: 5 }).some((r) => r.code === "poc_troponin")).toBe(
      true
    );
    expect(searchCanonicalCareProcedures({ q: "bipap", locale: "en", limit: 5 }).some((r) => r.code === "bipap_rt_request")).toBe(
      true
    );
  });

  it("resolves wave-1 aliases to canonical rows", () => {
    const warmBlanket = canonicalCareProcedureByCode("warm_blanket");
    expect(warmBlanket?.aliases).toContain("Give Warm Blanket");
    const poison = canonicalCareProcedureByCode("consult_poison_control");
    expect(poison?.aliases).toContain("Contact Poison Control");
  });

  it("filters wave-1 consults by category", () => {
    const consults = searchCanonicalCareProcedures({
      q: "consult",
      category: "CONSULTS",
      locale: "en",
      limit: 50,
    });
    expect(consults.length).toBeGreaterThan(10);
    expect(consults.every((row) => row.category === "CONSULTS")).toBe(true);
  });
});
