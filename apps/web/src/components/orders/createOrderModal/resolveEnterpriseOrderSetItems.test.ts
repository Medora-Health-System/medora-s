import { describe, expect, it, vi } from "vitest";
import { enterpriseOrderSetByCode } from "@medora/shared";
import { toOrderSetUiItems } from "./enterpriseOrderSetAdapter";
import {
  formatOrderSetSkippedSummary,
  resolveEnterpriseOrderSetItems,
} from "./resolveEnterpriseOrderSetItems";

vi.mock("@/lib/orderSetCatalogResolveApi", () => ({
  resolveOrderSetCatalogBatch: vi.fn(async () => new Map()),
}));

import { resolveOrderSetCatalogBatch } from "@/lib/orderSetCatalogResolveApi";

describe("resolveEnterpriseOrderSetItems", () => {
  it("stages provider chest pain CARE items without batch resolver", async () => {
    const set = enterpriseOrderSetByCode("ed_chest_pain_v1")!;
    const items = toOrderSetUiItems(set, "en").filter((item) =>
      ["ekg12Lead", "continuousCardiacMonitoring", "pulseOximetry"].includes(item.key)
    );

    const resolved = await resolveEnterpriseOrderSetItems({
      items,
      facilityId: "fac-1",
      language: "en",
      canPrescribe: true,
      catalogItemToOrderLine: () => null,
      orderSetCode: set.code,
    });

    expect(resolved.CARE.length).toBe(3);
    expect(resolved.LAB.length).toBe(0);
    expect(resolveOrderSetCatalogBatch).not.toHaveBeenCalled();
  });

  it("stages RN standing-order CARE items without verbal attestation at apply time", async () => {
    const set = enterpriseOrderSetByCode("ed_rn_chest_pain_v1")!;
    const items = toOrderSetUiItems(set, "en").filter((item) =>
      ["vitalsQ15", "pulseOximetry"].includes(item.key)
    );

    const resolved = await resolveEnterpriseOrderSetItems({
      items,
      facilityId: "fac-1",
      language: "en",
      canPrescribe: false,
      allowRnStandingOrderSetApply: true,
      catalogItemToOrderLine: () => null,
      orderSetCode: set.code,
    });

    expect(resolved.CARE.length).toBe(2);
    expect(resolved.skipped).toEqual([]);
  });

  it("stages LAB when batch resolver returns an approved match", async () => {
    vi.mocked(resolveOrderSetCatalogBatch).mockResolvedValueOnce(
      new Map([
        [
          "troponin",
          {
            item: {
              id: "lab-trop",
              code: "TROPONIN",
              type: "LAB_TEST",
              displayNameFr: "Troponine",
              displayNameEn: "Troponin",
            },
            ambiguous: false,
          },
        ],
      ])
    );

    const set = enterpriseOrderSetByCode("ed_chest_pain_v1")!;
    const items = toOrderSetUiItems(set, "en").filter((item) => item.key === "troponin");

    const resolved = await resolveEnterpriseOrderSetItems({
      items,
      facilityId: "fac-1",
      language: "en",
      canPrescribe: true,
      catalogItemToOrderLine: () => ({
        _lineId: "line-1",
        isManual: false,
        catalogItemId: "lab-trop",
        catalogItemType: "LAB_TEST",
        _label: "Troponin",
      }),
      orderSetCode: set.code,
    });

    expect(resolved.LAB.length).toBe(1);
    expect(resolved.skipped).toEqual([]);
  });

  it("formats item-level skipped diagnostics", () => {
    const summary = formatOrderSetSkippedSummary({
      skipped: [{ key: "troponin", reason: "noMatch" }],
      itemsByKey: new Map([["troponin", { key: "troponin", displayLabel: "Troponin" } as never]]),
      t: (key) =>
        key === "ordersets.apply.partialStagingSummary"
          ? "Some selected items could not be staged:\n{items}"
          : key === "ordersets.apply.itemReason.noMatch"
            ? "catalog reference not found"
            : key,
    });

    expect(summary).toContain("Troponin");
    expect(summary).toContain("catalog reference not found");
  });
});
