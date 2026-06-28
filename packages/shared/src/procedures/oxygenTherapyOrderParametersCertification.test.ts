/**
 * MEDUI.CARE_PROCEDURES.OXYGEN_ORDER_PARAMETERS.1
 * Search, alias, governance, and execution profile certification.
 */
import { describe, expect, it } from "vitest";
import {
  activeCanonicalCareProcedureCatalog,
  CANONICAL_CARE_PROCEDURE_CATALOG,
  canonicalCareProcedureByCode,
} from "./canonicalCareProcedureCatalog.js";
import { searchCanonicalCareProcedures } from "./canonicalCareProcedureSearch.js";
import { isKnownEnterpriseProcedureId } from "./enterpriseProcedureOrderValidation.js";
import { resolveProcedureExecutionProfile } from "./enterpriseProcedureExecutionProfile.js";
import { OXYGEN_THERAPY_PROCEDURE_CODE } from "./oxygenTherapyOrderParameters.js";

const OXYGEN_SEARCH_ALIASES = [
  { q: "oxygen", code: OXYGEN_THERAPY_PROCEDURE_CODE },
  { q: "O2", code: OXYGEN_THERAPY_PROCEDURE_CODE },
  { q: "nasal cannula", code: OXYGEN_THERAPY_PROCEDURE_CODE },
  { q: "NC", code: OXYGEN_THERAPY_PROCEDURE_CODE },
  { q: "NRB", code: OXYGEN_THERAPY_PROCEDURE_CODE },
  { q: "non-rebreather", code: OXYGEN_THERAPY_PROCEDURE_CODE },
  { q: "Venturi", code: OXYGEN_THERAPY_PROCEDURE_CODE },
];

describe("MEDUI.CARE_PROCEDURES.OXYGEN_ORDER_PARAMETERS.1 — catalog governance", () => {
  it("has exactly one active canonical oxygen therapy row", () => {
    const activeOxygen = activeCanonicalCareProcedureCatalog().filter(
      (row) =>
        row.code === OXYGEN_THERAPY_PROCEDURE_CODE ||
        row.displayNameEn.toLowerCase() === "oxygen therapy" ||
        row.displayNameEn.toLowerCase() === "oxygénothérapie"
    );
    expect(activeOxygen).toHaveLength(1);
    expect(activeOxygen[0]?.code).toBe(OXYGEN_THERAPY_PROCEDURE_CODE);
  });

  it("resolves oxygen search aliases to oxygen_therapy", () => {
    for (const { q, code } of OXYGEN_SEARCH_ALIASES) {
      const matches = searchCanonicalCareProcedures({ q, locale: "en", limit: 25 });
      expect(matches.some((row) => row.code === code)).toBe(true);
    }
  });

  it("deprecates duplicate high-flow and titrate rows as aliases of oxygen_therapy", () => {
    expect(canonicalCareProcedureByCode("high_flow_nasal_cannula")?.isActive).toBe(false);
    expect(canonicalCareProcedureByCode("oxygen_titrate_to_92_percent")?.isActive).toBe(false);
    expect(isKnownEnterpriseProcedureId("high_flow_nasal_cannula")).toBe(false);
    const oxygen = canonicalCareProcedureByCode(OXYGEN_THERAPY_PROCEDURE_CODE);
    expect(oxygen?.aliases.some((a) => /high flow/i.test(a))).toBe(true);
  });

  it("resolves RT execution profile for oxygen_therapy", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: OXYGEN_THERAPY_PROCEDURE_CODE });
    expect(profile?.executionRoleCategory).toBe("RESPIRATORY");
    expect(profile?.canNurseExecute).toBe(true);
  });

  it("does not add duplicate active oxygen canonical codes", () => {
    const activeCodes = activeCanonicalCareProcedureCatalog()
      .filter((row) => /oxygen|o2/i.test(`${row.code} ${row.displayNameEn}`))
      .map((row) => row.code);
    expect(new Set(activeCodes).size).toBe(activeCodes.length);
    expect(activeCodes.filter((c) => c === OXYGEN_THERAPY_PROCEDURE_CODE)).toHaveLength(1);
  });

  it("preserves total catalog count after oxygen governance merge", () => {
    expect(CANONICAL_CARE_PROCEDURE_CATALOG.length).toBe(290);
    expect(activeCanonicalCareProcedureCatalog().length).toBe(286);
  });
});
