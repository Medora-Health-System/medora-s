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
const browserSource = readFileSync(
  join(webRoot, "components/orders/createOrderModal/enterpriseOrderSetBrowser.tsx"),
  "utf8"
);

describe("enterprise order sets foundation (web)", () => {
  it("reuses Create Order ORDER_SET tab — no second order-set UI", () => {
    expect(modalSource).toContain('activeTab === "ORDER_SET"');
    expect(modalSource).toContain("EnterpriseOrderSetBrowser");
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
    const resolverSource = readFileSync(
      join(webRoot, "components/orders/createOrderModal/resolveEnterpriseOrderSetItems.ts"),
      "utf8"
    );
    expect(resolverSource).toContain("_enterpriseProcedureId");
    expect(resolverSource).toContain("requiresStructuredParameters");
    expect(resolverSource).toContain("structuredParametersRequired");
    expect(modalSource).toContain("_enterpriseProcedureId");
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
        orderSetAuthority: "PROVIDER_ORDER_SET",
        hasRnStandingOrderAuthority: true,
      })
    ).toBe(false);
  });

  it("RN can place RN standing order sets", () => {
    const set = enterpriseOrderSetByCode("ed_rn_chest_pain_v1")!;
    expect(
      canRolePlaceEnterpriseOrderSet({
        rolesAllowed: set.rolesAllowed,
        canPrescribe: false,
        roleCodes: ["RN"],
        orderSetAuthority: "RN_STANDING_ORDER",
        hasRnStandingOrderAuthority: true,
      })
    ).toBe(true);
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
    expect(browserSource).toContain('data-testid="enterprise-order-set-preview"');
    expect(browserSource).toContain("maxHeight:");
    expect(modalSource).not.toContain("activeCanonicalCareProcedureCatalog");
    expect(modalSource).not.toContain("HAITI_LAB_CATALOG");
  });

  it("Phase 2 — apply builds provenance and uses batch catalog resolver", () => {
    const resolverSource = readFileSync(
      join(webRoot, "components/orders/createOrderModal/resolveEnterpriseOrderSetItems.ts"),
      "utf8"
    );
    expect(modalSource).toContain("buildEnterpriseOrderSetApplyContext");
    expect(modalSource).toContain("resolveOrderSetProvenanceForSubmit");
    expect(modalSource).toContain("resolveEnterpriseOrderSetItems");
    expect(resolverSource).toContain("_enterpriseOrderSetItemKey");
    expect(modalSource).toContain("enterpriseOrderSetProvenance");
  });

  it("Phase 5 — hierarchical browser in ORDER_SET tab", () => {
    expect(modalSource).toContain("EnterpriseOrderSetBrowser");
    expect(browserSource).toContain('data-testid="enterprise-order-set-browser"');
    expect(browserSource).toContain("enterprise-order-set-browser-categories");
    expect(browserSource).toContain("enterprise-order-set-browser-sets");
    expect(browserSource).toContain("buildEnterpriseOrderSetBrowserModel");
    expect(browserSource).not.toContain("enterprise-order-set-category-filter");
    expect(modalSource).not.toContain("function OrderSetPreview");
  });

  it("Phase 5 — search and apply/provenance preserved", () => {
    expect(browserSource).toContain("enterprise-order-set-search");
    expect(modalSource).toContain("resolveOrderSetProvenanceForSubmit");
    expect(browserSource).toContain("enterprise-order-set-apply");
    expect(browserSource).not.toContain("disabled={item.required}");
  });

  it("free selection — recommended items stay editable", () => {
    expect(browserSource).not.toMatch(/disabled=\{item\.required\}/);
    expect(browserSource).toContain("orderSetRecommendedBadge");
    expect(modalSource).not.toContain("isRequiredOrderSetItem");
    expect(browserSource).toContain("orderSetsNoneSelectedWarning");
    expect(modalSource).toContain("canApplyOrderSet");
  });

  it("order set apply resolves CARE locally and LAB via batch resolver", () => {
    const resolverSource = readFileSync(
      join(webRoot, "components/orders/createOrderModal/resolveEnterpriseOrderSetItems.ts"),
      "utf8"
    );
    const payloadSource = readFileSync(
      join(webRoot, "components/orders/createOrderModal/createOrderDomainPayload.ts"),
      "utf8"
    );
    expect(resolverSource).toContain("allowRnStandingOrderSetApply");
    expect(resolverSource).toContain('orderSetItem.type === "CARE"');
    expect(resolverSource).toContain("resolveOrderSetCatalogBatch");
    expect(resolverSource).not.toContain('orderSetItem.type === "MEDICATION" || orderSetItem.type === "CARE"');
    expect(modalSource).toContain("formatOrderSetSkippedSummary");
    expect(modalSource).toContain("buildCreateOrderDomainPayload");
    expect(modalSource).toContain("resolveOrderSetProvenanceForSubmit");
    expect(payloadSource).toContain("isCatalogItemUuid");
    expect(payloadSource).toContain("buildLabOrderItemDto");
  });

  it("order set browser uses min-width zero and wrapping guards", () => {
    expect(browserSource).toContain("minmax(0,");
    expect(browserSource).toContain("minWidth: 0");
    expect(browserSource).toContain("overflowWrap: \"anywhere\"");
  });

  it("Phase 6 — browser separates provider sets and RN standing orders", () => {
    expect(browserSource).toContain("enterprise-order-set-browser-authorities");
    expect(browserSource).toContain("enterprise-order-set-authority-badge");
    expect(browserSource).toContain("hasRnStandingOrderAuthority");
    expect(modalSource).toContain("orderSetBrowserAuthority");
    expect(modalSource).toContain("VERBAL_ORDER");
    expect(activeEnterpriseOrderSets().some((set) => set.orderSetAuthority === "RN_STANDING_ORDER")).toBe(
      true
    );
  });

  it("Phase 7 — RN standing order staged review requires verbal-order attestation", () => {
    expect(modalSource).toContain("rn-standing-verbal-attestation");
    expect(modalSource).toContain("rn-standing-verbal-provider-select");
    expect(modalSource).toContain("rn-standing-verbal-readback");
    expect(modalSource).toContain("buildVerbalOrderAttestation");
    expect(modalSource).toContain("submitBlockedByRnStandingVerbal");
    expect(modalSource).not.toMatch(/cosign|pendingProviderSignature|providerCosign/i);
  });

  it("Phase 4 — registry scales with modular adapter sorting and grouping", () => {
    expect(adapterSource).toContain("sortEnterpriseOrderSetsByDisplayName");
    expect(adapterSource).toContain("groupEnterpriseOrderSetsByCategory");
    expect(adapterSource).toContain("ORDER_SET_CATEGORY_OPTIONS");
    expect(activeEnterpriseOrderSets().length).toBeGreaterThanOrEqual(60);
  });

  it("Phase 2 — manual orders omit provenance unless order-set review active", () => {
    expect(modalSource).toContain("orderSetApplyContext");
    expect(modalSource).toContain("orderSetReviewActive");
  });
});
