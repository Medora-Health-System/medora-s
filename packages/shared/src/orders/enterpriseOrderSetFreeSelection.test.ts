import { describe, expect, it } from "vitest";
import {
  buildEnterpriseOrderSetApplyContext,
  buildEnterpriseOrderSetProvenance,
  validateEnterpriseOrderSetApplication,
} from "./enterpriseOrderSetProvenance.js";
import {
  defaultCheckedEnterpriseOrderSetItemKeys,
  enterpriseOrderSetByCode,
  enterpriseOrderSetItemByKey,
} from "./orderSets/registry.js";

describe("enterpriseOrderSetFreeSelection (MEDUI.ORDERSETS.FIX_FREE_SELECTION)", () => {
  const chestPain = enterpriseOrderSetByCode("ed_chest_pain_v1")!;
  const rnChestPain = enterpriseOrderSetByCode("ed_rn_chest_pain_v1")!;

  it("treats requiredItems as default-selected recommended keys", () => {
    const defaults = defaultCheckedEnterpriseOrderSetItemKeys(chestPain);
    for (const item of chestPain.requiredItems) {
      expect(defaults).toContain(item.key);
    }
    expect(defaults.length).toBeGreaterThan(chestPain.requiredItems.length);
  });

  it("allows deselecting recommended items in provenance validation", () => {
    const recommendedKey = chestPain.requiredItems[0]!.key;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["troponin"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    expect(applyContext.selectedItemKeys).not.toContain(recommendedKey);
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    expect(
      validateEnterpriseOrderSetApplication({
        provenance,
        itemCount: 1,
        roleCodes: ["PROVIDER"],
        canPrescribe: true,
      }).ok
    ).toBe(true);
  });

  it("still rejects unknown selected item keys", () => {
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["not_a_real_key"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["not_a_real_key"],
    });
    const result = validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNKNOWN_SELECTED_ITEM");
  });

  it("allows structured-parameter item to be skipped when selected", () => {
    const oxygen = enterpriseOrderSetItemByKey(chestPain, "oxygenTherapy");
    expect(oxygen?.requiresStructuredParameters).toBe(true);
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["troponin", "oxygenTherapy"],
      skippedItems: [{ key: "oxygenTherapy", reason: "structuredParametersRequired" }],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    expect(
      validateEnterpriseOrderSetApplication({
        provenance,
        itemCount: 1,
        roleCodes: ["PROVIDER"],
        canPrescribe: true,
      }).ok
    ).toBe(true);
  });

  it("keeps RN standing-order governance when recommended items are omitted", () => {
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: rnChestPain,
      selectedItemKeys: ["troponin"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    expect(
      validateEnterpriseOrderSetApplication({
        provenance,
        itemCount: 1,
        roleCodes: ["RN"],
        canPrescribe: false,
        hasRnStandingOrderAuthority: true,
      }).ok
    ).toBe(true);

    const providerProvenance = buildEnterpriseOrderSetProvenance({
      applyContext: buildEnterpriseOrderSetApplyContext({
        set: chestPain,
        selectedItemKeys: ["troponin"],
        skippedItems: [],
        appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
      }),
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    const denied = validateEnterpriseOrderSetApplication({
      provenance: providerProvenance,
      itemCount: 1,
      roleCodes: ["RN"],
      canPrescribe: false,
      hasRnStandingOrderAuthority: true,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("ORDER_SET_ROLE_DENIED");
  });
});
