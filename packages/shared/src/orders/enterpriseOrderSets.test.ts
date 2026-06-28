import { describe, expect, it } from "vitest";
import {
  activeEnterpriseOrderSets,
  enterpriseOrderSetByCode,
  ENTERPRISE_ORDER_SET_REGISTRY,
  ENTERPRISE_ORDER_SET_CATEGORIES,
} from "./orderSets/index.js";
import {
  validateEnterpriseOrderSetRegistry,
  validateEnterpriseOrderSetDefinition,
} from "./enterpriseOrderSetValidation.js";

describe("enterpriseOrderSets (MEDUI.ORDERSETS.ENTERPRISE_PHASE_4)", () => {
  it("registry has 54 active ED order sets (Phase 1 + Phase 4 expansion)", () => {
    expect(activeEnterpriseOrderSets()).toHaveLength(54);
    const phase1 = activeEnterpriseOrderSets().filter((set) => set.governanceLevel === "PHASE_1_ED");
    const phase4 = activeEnterpriseOrderSets().filter((set) => set.governanceLevel === "PHASE_4_ED");
    expect(phase1).toHaveLength(7);
    expect(phase4).toHaveLength(47);
  });

  it("active codes are unique", () => {
    const codes = activeEnterpriseOrderSets().map((set) => set.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("registry validation passes with no missing catalog dependencies", () => {
    const report = validateEnterpriseOrderSetRegistry();
    expect(report.ok, JSON.stringify(report.issues, null, 2)).toBe(true);
    expect(report.missingDependencies).toHaveLength(0);
  });

  it("Phase 1 order sets validate individually", () => {
    for (const code of [
      "ed_chest_pain_v1",
      "ed_stroke_alert_v1",
      "ed_sepsis_v1",
      "ed_trauma_activation_v1",
      "ed_respiratory_distress_v1",
      "ed_procedural_sedation_v1",
      "ed_behavioral_health_safety_v1",
    ] as const) {
      const set = enterpriseOrderSetByCode(code);
      expect(set, code).toBeTruthy();
      expect(validateEnterpriseOrderSetDefinition(set!)).toEqual([]);
    }
  });

  it("Phase 4 sample order sets validate individually", () => {
    for (const code of [
      "ed_asthma_v1",
      "ed_abdominal_pain_v1",
      "ed_syncope_v1",
      "ed_laceration_v1",
      "ed_overdose_v1",
    ] as const) {
      const set = enterpriseOrderSetByCode(code);
      expect(set, code).toBeTruthy();
      expect(validateEnterpriseOrderSetDefinition(set!)).toEqual([]);
    }
  });

  it("oxygen therapy items require structured parameters", () => {
    for (const set of activeEnterpriseOrderSets()) {
      for (const item of [...set.requiredItems, ...set.optionalItems]) {
        if (item.enterpriseProcedureCode === "oxygen_therapy") {
          expect(item.requiresStructuredParameters).toBe(true);
        }
      }
    }
  });

  it("enterprise order sets exclude medication items", () => {
    for (const set of activeEnterpriseOrderSets()) {
      const meds = [...set.requiredItems, ...set.optionalItems].filter((item) => item.kind === "MEDICATION");
      expect(meds).toEqual([]);
    }
  });

  it("trauma CT head uses WO contrast primary with CT_HEAD fallback", () => {
    const trauma = enterpriseOrderSetByCode("ed_trauma_activation_v1")!;
    const ctHead = trauma.optionalItems.find((item) => item.key === "ctHead");
    expect(ctHead?.catalogCode).toBe("CT_HEAD_WO_CONTRAST");
    expect(ctHead?.catalogCodes).toContain("CT_HEAD");
  });

  it("provider/admin role governance on all sets", () => {
    for (const set of activeEnterpriseOrderSets()) {
      expect(set.rolesAllowed).toContain("PROVIDER");
      expect(set.rolesAllowed).not.toContain("RN");
    }
  });

  it("expanded enterprise categories are defined", () => {
    expect(ENTERPRISE_ORDER_SET_CATEGORIES.length).toBeGreaterThanOrEqual(15);
    const used = new Set(activeEnterpriseOrderSets().map((set) => set.category));
    for (const category of used) {
      expect(ENTERPRISE_ORDER_SET_CATEGORIES).toContain(category);
    }
  });

  it("registry remains modular — composed from Emergency modules", () => {
    expect(ENTERPRISE_ORDER_SET_REGISTRY.length).toBe(54);
  });
});
