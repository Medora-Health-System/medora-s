import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ENTERPRISE_PROCEDURE_BILLING_MAPPING_STATUSES,
  ENTERPRISE_PROCEDURE_CATALOG,
  buildEnterpriseProcedureDefinition,
  enterpriseProcedureById,
  resolveEnterpriseProcedureDisplayName,
} from "./enterpriseProcedureCatalog.js";
import {
  filterEnterpriseProcedures,
  normalizeEnterpriseProcedureSearchText,
} from "./enterpriseProcedureSearch.js";

describe("enterprise procedure catalog (MEDPROC.1)", () => {
  it("exports enterprise procedure catalog", () => {
    expect(ENTERPRISE_PROCEDURE_CATALOG.length).toBeGreaterThan(40);
    expect(enterpriseProcedureById("endotracheal_intubation")).toBeDefined();
  });

  it("contains ED core procedures", () => {
    const ids = ENTERPRISE_PROCEDURE_CATALOG.map((entry) => entry.id);
    for (const required of [
      "endotracheal_intubation",
      "ekg_ecg",
      "peripheral_iv_placement",
      "central_line_placement",
      "laceration_repair",
      "foley_catheter",
      "chest_tube",
      "glucose_check",
      "nebulizer_treatment",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("uses unique catalog ids", () => {
    const ids = ENTERPRISE_PROCEDURE_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses unique English display names", () => {
    const names = ENTERPRISE_PROCEDURE_CATALOG.map((entry) => entry.displayNameEn.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps billing mapping placeholder-only statuses", () => {
    for (const entry of ENTERPRISE_PROCEDURE_CATALOG) {
      expect(ENTERPRISE_PROCEDURE_BILLING_MAPPING_STATUSES).toContain(entry.billingMappingStatus);
      expect(entry.billingMappingStatus).not.toMatch(/CPT|HCPCS/i);
    }
  });

  it("stores documentation linkage as metadata only", () => {
    const intubation = enterpriseProcedureById("endotracheal_intubation");
    expect(intubation?.documentationTemplateId).toBe("INTUBATION");
    expect(intubation?.requiresProcedureNote).toBe(true);
    const iv = enterpriseProcedureById("peripheral_iv_placement");
    expect(iv?.documentationTemplateId).toBeUndefined();
    expect(iv?.requiresProcedureNote).toBe(false);
  });

  it("stores MEDPROC.4 execution profile metadata on catalog entries", () => {
    const intubation = enterpriseProcedureById("endotracheal_intubation");
    expect(intubation?.executionRoleCategory).toBe("PROVIDER");
    expect(intubation?.completeRoles).toEqual(["PROVIDER"]);
    const foley = enterpriseProcedureById("foley_catheter");
    expect(foley?.executionRoleCategory).toBe("NURSING");
    expect(foley?.completeRoles).toEqual(["RN"]);
  });

  it("marks all catalog entries orderable in this phase", () => {
    expect(ENTERPRISE_PROCEDURE_CATALOG.every((entry) => entry.orderable)).toBe(true);
  });
});

describe("enterprise procedure catalog role hint defaults (MEDPROC.1A)", () => {
  it("defaults omitted assistingRoleHints to []", () => {
    const built = buildEnterpriseProcedureDefinition({
      id: "test_glucose_check",
      displayNameEn: "Glucose check",
      displayNameFr: "Contrôle glycémie",
      category: "NURSING_TASK",
      performerRoleHints: ["RN"],
    });
    expect(built.assistingRoleHints).toEqual([]);
  });

  it("defaults omitted completionRoleHints to []", () => {
    const built = buildEnterpriseProcedureDefinition({
      id: "test_glucose_check",
      displayNameEn: "Glucose check",
      displayNameFr: "Contrôle glycémie",
      category: "NURSING_TASK",
      performerRoleHints: ["RN"],
    });
    expect(built.completionRoleHints).toEqual([]);
  });

  it("preserves explicit assistingRoleHints", () => {
    const built = buildEnterpriseProcedureDefinition({
      id: "test_intubation",
      displayNameEn: "Endotracheal intubation",
      displayNameFr: "Intubation endotrachéale",
      category: "AIRWAY",
      performerRoleHints: ["PROVIDER"],
      assistingRoleHints: ["RN", "RT"],
      completionRoleHints: ["PROVIDER", "RN"],
    });
    expect(built.assistingRoleHints).toEqual(["RN", "RT"]);
  });

  it("preserves explicit completionRoleHints", () => {
    const built = buildEnterpriseProcedureDefinition({
      id: "test_intubation",
      displayNameEn: "Endotracheal intubation",
      displayNameFr: "Intubation endotrachéale",
      category: "AIRWAY",
      performerRoleHints: ["PROVIDER"],
      assistingRoleHints: ["RN", "RT"],
      completionRoleHints: ["PROVIDER", "RN"],
    });
    expect(built.completionRoleHints).toEqual(["PROVIDER", "RN"]);
  });

  it("applies role defaults on catalog entries that omit hint arrays", () => {
    const glucose = enterpriseProcedureById("glucose_check");
    expect(glucose?.assistingRoleHints).toEqual([]);
    expect(glucose?.completionRoleHints).toEqual([]);
    expect(glucose?.performerRoleHints).toEqual(["RN"]);
  });

  it("preserves explicit role hints on catalog entries that specify them", () => {
    const intubation = enterpriseProcedureById("endotracheal_intubation");
    expect(intubation?.assistingRoleHints).toEqual(["RN", "RT"]);
    expect(intubation?.completionRoleHints).toEqual(["PROVIDER", "RN"]);
  });
});

describe("enterprise procedure search (MEDPROC.1)", () => {
  it("matches intubation by intub", () => {
    const matches = filterEnterpriseProcedures("intub", "en");
    expect(matches.some((entry) => entry.id === "endotracheal_intubation")).toBe(true);
  });

  it("matches EKG by ekg and ecg", () => {
    expect(filterEnterpriseProcedures("ekg", "en").some((entry) => entry.id === "ekg_ecg")).toBe(true);
    expect(filterEnterpriseProcedures("ecg", "en").some((entry) => entry.id === "ekg_ecg")).toBe(true);
  });

  it("matches Foley by foley", () => {
    expect(filterEnterpriseProcedures("foley", "en").some((entry) => entry.id === "foley_catheter")).toBe(true);
  });

  it("matches central line by central", () => {
    expect(
      filterEnterpriseProcedures("central", "en").some((entry) => entry.id === "central_line_placement")
    ).toBe(true);
  });

  it("matches laceration repair by lac", () => {
    expect(
      filterEnterpriseProcedures("lac", "en").some((entry) => entry.id === "laceration_repair")
    ).toBe(true);
  });

  it("supports aliases", () => {
    expect(filterEnterpriseProcedures("bvm", "en").some((entry) => entry.id === "bag_valve_mask_ventilation")).toBe(
      true
    );
  });

  it("is case-insensitive", () => {
    const lower = filterEnterpriseProcedures("glucose", "en").map((entry) => entry.id);
    const upper = filterEnterpriseProcedures("GLUCOSE", "en").map((entry) => entry.id);
    expect(upper).toEqual(lower);
  });

  it("narrows results with multi-word queries", () => {
    const matches = filterEnterpriseProcedures("chest tube", "en");
    expect(matches.some((entry) => entry.id === "chest_tube")).toBe(true);
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("normalizes punctuation and accents", () => {
    expect(normalizeEnterpriseProcedureSearchText("ÉCG / EKG")).toBe("ecg ekg");
  });

  it("returns all orderable entries when query is empty", () => {
    expect(filterEnterpriseProcedures("", "en")).toHaveLength(ENTERPRISE_PROCEDURE_CATALOG.length);
  });

  it("resolves French display names", () => {
    const entry = enterpriseProcedureById("nebulizer_treatment");
    expect(entry).toBeDefined();
    expect(resolveEnterpriseProcedureDisplayName(entry!, "fr")).toContain("Nébulisation");
  });
});

describe("MEDPROC.1 create order integration guards", () => {
  const webRoot = join(import.meta.dirname, "../../../../apps/web");
  const modalSource = readFileSync(join(webRoot, "src/components/orders/CreateOrderModal.tsx"), "utf8");

  it("uses enterprise catalog in create order modal", () => {
    expect(modalSource).toContain("filterEnterpriseProcedures");
    expect(modalSource).toContain("addCareCatalogProcedure");
    expect(modalSource).toContain("create-order-care-catalog-");
    expect(modalSource).toContain("_enterpriseProcedureId");
    expect(modalSource).toContain("enterpriseProcedureId: it._enterpriseProcedureId.trim()");
  });

  it("preserves care presets and custom care task", () => {
    expect(modalSource).toContain('t("createOrderModal.carePresets")');
    expect(modalSource).toContain("addCustomCareTaskLine");
    expect(modalSource).toContain("customCareTaskDraft");
  });

  it("does not create BillingEvent from modal changes", () => {
    expect(modalSource).not.toMatch(/BillingEvent|createChargeEvent|submitClaim/i);
  });

  it("documents MEDPROC.2 persistence guardrail for enterpriseProcedureId", () => {
    const typesSource = readFileSync(join(webRoot, "src/components/orders/createOrderModal/types.ts"), "utf8");
    expect(typesSource).toMatch(/MEDPROC\.2 must persist.*enterpriseProcedureId/i);
    expect(typesSource).toMatch(/manualLabel.*localized display snapshot only/i);
    expect(modalSource).toContain("MEDPROC.2: persist enterpriseProcedureId on OrderItem");
  });

  it("persists enterpriseProcedureId through API create path (MEDPROC.2)", () => {
    const apiOrdersTypes = readFileSync(
      join(webRoot, "../api/src/orders/orders.types.ts"),
      "utf8"
    );
    expect(apiOrdersTypes).toContain("enterpriseProcedureId");
    expect(apiOrdersTypes).toMatch(/orderType === "CARE"/);
  });
});
