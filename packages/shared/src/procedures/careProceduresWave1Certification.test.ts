/**
 * MEDUI.CARE_PROCEDURES.WAVE_1_CERTIFICATION_AND_LIGHT_UI_HARDENING.1
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activeCanonicalCareProcedureCatalog,
  buildCanonicalCareProcedureDuplicateReport,
  CANONICAL_CARE_PROCEDURE_CATALOG,
  canonicalCareProcedureByCode,
} from "./canonicalCareProcedureCatalog.js";
import { searchCanonicalCareProcedures } from "./canonicalCareProcedureSearch.js";
import {
  isKnownEnterpriseProcedureId,
  validateEnterpriseProcedureIdForOrderItem,
} from "./enterpriseProcedureOrderValidation.js";
import {
  requestorMayCompleteEnterpriseProcedure,
  resolveProcedureExecutionProfile,
} from "./enterpriseProcedureExecutionProfile.js";
import { orderCreateDtoSchema } from "../schemas/patient.js";

const EXPECTED_TOTAL = 290;
const EXPECTED_ACTIVE = 286;
const EXPECTED_ALIASES = 306;

const TARGETED_SEARCH_CASES: Array<{ query: string; expectedCode: string }> = [
  { query: "warm blanket", expectedCode: "warm_blanket" },
  { query: "c collar", expectedCode: "cervical_collar" },
  { query: "stroke alert", expectedCode: "stroke_alert_activation" },
  { query: "trauma activation", expectedCode: "trauma_team_activation" },
  { query: "nephrology consult", expectedCode: "consult_nephrology" },
  { query: "poc troponin", expectedCode: "poc_troponin" },
  { query: "bipap", expectedCode: "bipap_rt_request" },
  { query: "vital signs q15", expectedCode: "vitals_q15_document" },
  { query: "chest tube setup", expectedCode: "chest_tube" },
  { query: "foley catheter", expectedCode: "foley_catheter" },
  { query: "EKG", expectedCode: "ekg_ecg" },
  { query: "sitter at bedside", expectedCode: "constant_observation" },
  { query: "seizure precautions", expectedCode: "seizure_precautions" },
  { query: "suicide precautions", expectedCode: "suicide_precautions" },
  { query: "oxygen", expectedCode: "oxygen_therapy" },
  { query: "ambulate patient", expectedCode: "ambulation_trial" },
];

describe("MEDUI.CARE_PROCEDURES.WAVE_1_CERTIFICATION_AND_LIGHT_UI_HARDENING.1 — catalog invariants", () => {
  it("matches certified row counts", () => {
    expect(CANONICAL_CARE_PROCEDURE_CATALOG.length).toBe(EXPECTED_TOTAL);
    expect(activeCanonicalCareProcedureCatalog().length).toBe(EXPECTED_ACTIVE);
    const aliasCount = CANONICAL_CARE_PROCEDURE_CATALOG.reduce((sum, row) => sum + row.aliases.length, 0);
    expect(aliasCount).toBe(EXPECTED_ALIASES);
  });

  it("has no duplicate canonical codes", () => {
    const codes = CANONICAL_CARE_PROCEDURE_CATALOG.map((row) => row.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("keeps deprecated legacy rows non-orderable", () => {
    for (const legacy of ["cardiac_monitoring", "urinary_catheter_insertion"] as const) {
      const row = canonicalCareProcedureByCode(legacy);
      expect(row?.isActive).toBe(false);
      expect(row?.orderable).toBe(false);
      expect(row?.deprecatedBy).toBeTruthy();
      expect(isKnownEnterpriseProcedureId(legacy)).toBe(false);
    }
  });

  it("requires category and display names on every active row", () => {
    for (const row of activeCanonicalCareProcedureCatalog()) {
      expect(row.category.trim().length).toBeGreaterThan(0);
      expect(row.displayNameEn.trim().length).toBeGreaterThan(0);
      expect(row.displayNameFr.trim().length).toBeGreaterThan(0);
    }
  });

  it("resolves execution profile or safe fallback for every active row", () => {
    for (const row of activeCanonicalCareProcedureCatalog()) {
      const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: row.code });
      expect(profile).not.toBeNull();
      expect(profile?.executionRoleCategory).toBe(row.executionRoleCategory);
    }
  });
});

describe("MEDUI.CARE_PROCEDURES.WAVE_1_CERTIFICATION — search and aliases", () => {
  it("resolves all targeted certification searches", () => {
    for (const { query, expectedCode } of TARGETED_SEARCH_CASES) {
      const matches = searchCanonicalCareProcedures({ q: query, locale: "en", limit: 25 });
      expect(matches.some((row) => row.code === expectedCode)).toBe(true);
    }
  });

  it("caps shared search results at 25 by default request", () => {
    const matches = searchCanonicalCareProcedures({ q: "consult", locale: "en", limit: 25 });
    expect(matches.length).toBeLessThanOrEqual(25);
  });

  it("filters by category", () => {
    const respiratory = searchCanonicalCareProcedures({
      q: "rt",
      category: "RESPIRATORY",
      locale: "en",
      limit: 25,
    });
    expect(respiratory.length).toBeGreaterThan(0);
    expect(respiratory.every((row) => row.category === "RESPIRATORY")).toBe(true);
  });

  it("reports wave-1 alias merges without duplicate active codes", () => {
    const report = buildCanonicalCareProcedureDuplicateReport();
    expect(report.mergedPairs.filter((p) => p.reason === "WAVE1_ALIAS_MERGE").length).toBe(73);
  });
});

describe("MEDUI.CARE_PROCEDURES.WAVE_1_CERTIFICATION — role governance", () => {
  it("allows provider CARE order with canonical enterpriseProcedureId", () => {
    const parsed = orderCreateDtoSchema.safeParse({
      type: "CARE",
      orderSource: "PROVIDER_ORDER",
      items: [
        {
          catalogItemType: "CARE",
          manualLabel: "Warm blanket",
          enterpriseProcedureId: "warm_blanket",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("allows RN free-text CARE order without enterpriseProcedureId", () => {
    const parsed = orderCreateDtoSchema.safeParse({
      type: "CARE",
      orderSource: "VERBAL_ORDER",
      prescriberName: "Dr Test",
      readbackConfirmed: true,
      items: [{ catalogItemType: "CARE", manualLabel: "Custom nursing task" }],
    });
    expect(parsed.success).toBe(true);
    const validation = validateEnterpriseProcedureIdForOrderItem({
      orderType: "CARE",
      catalogItemType: "CARE",
    });
    expect(validation.ok).toBe(true);
  });

  it("protects provider-only procedures in catalog metadata", () => {
    const picc = canonicalCareProcedureByCode("picc_line_placement");
    expect(picc?.requiresProviderOrder).toBe(true);
    expect(picc?.nursingProtocolAllowed).toBe(false);
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "picc_line_placement" });
    expect(profile?.executionRoleCategory).toBe("PROVIDER");
    expect(requestorMayCompleteEnterpriseProcedure(["RN"], profile)).toBe(false);
    expect(requestorMayCompleteEnterpriseProcedure(["PROVIDER"], profile)).toBe(true);
  });

  it("routes RT-related orders to respiratory execution", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "bipap_rt_request" });
    expect(profile?.executionRoleCategory).toBe("RESPIRATORY");
    expect(requestorMayCompleteEnterpriseProcedure(["RN"], profile)).toBe(true);
  });

  it("routes nursing orders to RN execution", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "seizure_precautions" });
    expect(profile?.executionRoleCategory).toBe("NURSING");
    expect(requestorMayCompleteEnterpriseProcedure(["RN"], profile)).toBe(true);
  });
});

describe("MEDUI.CARE_PROCEDURES.WAVE_1_CERTIFICATION — workflow contracts", () => {
  it("preserves effective clinical time eligibility rules for CARE lines", async () => {
    const { isCareProcedureOrderItem } = await import("../orders/careProcedureEffectiveClinicalTime.js");
    expect(isCareProcedureOrderItem("CARE", "CARE")).toBe(true);
    expect(isCareProcedureOrderItem("MEDICATION", "MEDICATION")).toBe(false);
  });
});

describe("MEDUI.CARE_PROCEDURES.WAVE_1_CERTIFICATION — light UI guards", () => {
  const webRoot = join(import.meta.dirname, "../../../../apps/web");
  const modalSource = readFileSync(join(webRoot, "src/components/orders/CreateOrderModal.tsx"), "utf8");

  it("does not render the full catalog as visible preset buttons", () => {
    expect(modalSource).toContain("carePresets.map");
    expect(modalSource).not.toContain("CANONICAL_CARE_PROCEDURE_CATALOG.map");
    expect(modalSource).not.toContain("activeCanonicalCareProcedureCatalog().map");
  });

  it("uses bounded server-side and offline search (limit 25)", () => {
    expect(modalSource).toContain("searchProcedureCatalog");
    expect(modalSource).toContain("limit: 25");
    expect(modalSource).toContain("searchCanonicalCareProcedures");
  });

  it("renders search results only when search or category filter is active", () => {
    expect(modalSource).toContain("careSearchActive");
    expect(modalSource).toContain("careCatalogMatches.map");
  });

  it("preserves free-text custom care task entry", () => {
    expect(modalSource).toContain("customCareTaskDraft");
    expect(modalSource).toContain("customCareTaskLabel");
  });

  it("does not import wave-1 export CSV or audit bundles into the modal", () => {
    expect(modalSource).not.toMatch(/care-procedures-wave1-staff-orders|enterprise-formulary-expansion-wave-audit/i);
  });
});
