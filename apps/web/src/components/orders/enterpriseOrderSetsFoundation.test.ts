/**
 * MEDUI.ORDERSETS.ENTERPRISE_FOUNDATION_PHASE_1 — web integration guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activeEnterpriseOrderSets,
  canRolePlaceEnterpriseOrderSet,
  enterpriseOrderSetByCode,
  validateEnterpriseOrderSetRegistry,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");
const modalSource = readFileSync(join(webRoot, "components/orders/CreateOrderModal.tsx"), "utf8");
const adapterSource = readFileSync(
  join(webRoot, "components/orders/createOrderModal/enterpriseOrderSetAdapter.ts"),
  "utf8"
);

describe("enterprise order sets foundation (web)", () => {
  it("reuses Create Order ORDER_SET tab — no second order-set UI", () => {
    expect(modalSource).toContain('activeTab === "ORDER_SET"');
    expect(modalSource).toContain("OrderSetPreview");
    expect(modalSource).not.toMatch(/OrderSetGrid|SecondOrderSet|order-sets-page/i);
  });

  it("imports shared enterprise registry adapter", () => {
    expect(modalSource).toContain("enterpriseOrderSetAdapter");
    expect(modalSource).toContain("enterpriseOrderSetByCode");
    expect(adapterSource).toContain("activeEnterpriseOrderSets");
  });

  it("does not introduce custom lifecycle handlers", () => {
    expect(modalSource).not.toContain("mutateOrderItemLifecycleAction");
    expect(modalSource).not.toContain("orderStateSyncStore");
    expect(modalSource).not.toContain("router.refresh");
  });

  it("care resolution wires enterpriseProcedureId from registry", () => {
    expect(modalSource).toContain("_enterpriseProcedureId");
    expect(modalSource).toContain("requiresStructuredParameters");
    expect(modalSource).toContain("structuredParametersRequired");
  });

  it("oxygen items require structured parameters in registry", () => {
    for (const set of activeEnterpriseOrderSets()) {
      for (const item of [...set.requiredItems, ...set.optionalItems]) {
        if (item.enterpriseProcedureCode === "oxygen_therapy") {
          expect(item.requiresStructuredParameters).toBe(true);
        }
      }
    }
  });

  it("RN cannot place provider-only order sets", () => {
    const set = enterpriseOrderSetByCode("ed_chest_pain_v1")!;
    expect(
      canRolePlaceEnterpriseOrderSet({
        rolesAllowed: set.rolesAllowed,
        canPrescribe: false,
        roleCodes: ["RN"],
      })
    ).toBe(false);
  });

  it("provider can place order sets", () => {
    const set = enterpriseOrderSetByCode("ed_sepsis_v1")!;
    expect(
      canRolePlaceEnterpriseOrderSet({
        rolesAllowed: set.rolesAllowed,
        canPrescribe: true,
        roleCodes: ["PROVIDER"],
      })
    ).toBe(true);
  });

  it("shared registry validation is green", () => {
    expect(validateEnterpriseOrderSetRegistry().ok).toBe(true);
  });

  it("preview panel is compact and lazy — no full catalog render", () => {
    expect(modalSource).toContain('data-testid="enterprise-order-set-preview"');
    expect(modalSource).toContain("maxHeight:");
    expect(modalSource).not.toContain("activeCanonicalCareProcedureCatalog");
    expect(modalSource).not.toContain("HAITI_LAB_CATALOG");
  });

  it("Phase 2 — apply builds provenance and uses batch catalog resolver", () => {
    expect(modalSource).toContain("buildEnterpriseOrderSetApplyContext");
    expect(modalSource).toContain("buildEnterpriseOrderSetProvenance");
    expect(modalSource).toContain("resolveOrderSetCatalogBatch");
    expect(modalSource).toContain("_enterpriseOrderSetItemKey");
    expect(modalSource).toContain("enterpriseOrderSetProvenance");
  });

  it("Phase 2 — manual orders omit provenance unless order-set review active", () => {
    expect(modalSource).toContain("orderSetApplyContext");
    expect(modalSource).toContain("orderSetReviewActive");
  });
});
