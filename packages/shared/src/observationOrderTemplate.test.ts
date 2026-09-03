import { describe, expect, it } from "vitest";
import {
  OBSERVATION_ORDER_TEMPLATE_ID,
  OBSERVATION_ORDER_TEMPLATE_ITEMS,
  buildObservationTemplateCareOrderDto,
  collectObservationTemplateItemIdsFromOrderItems,
  findUnknownObservationTemplateIds,
  isObservationOrderTemplateProtocol,
  observationOrderTemplateItemManualLabel,
  orderObservationTemplateSelection,
} from "./observationOrderTemplate";

describe("observationOrderTemplate", () => {
  it("isObservationOrderTemplateProtocol matches template id only", () => {
    expect(isObservationOrderTemplateProtocol(OBSERVATION_ORDER_TEMPLATE_ID)).toBe(true);
    expect(isObservationOrderTemplateProtocol("other")).toBe(false);
    expect(isObservationOrderTemplateProtocol(null)).toBe(false);
  });

  it("orders selection in template definition order", () => {
    const ids = ["nurse_pain_q2h", "mon_vitals_q2h", "com_diet_ad_lib"];
    expect(orderObservationTemplateSelection(ids)).toEqual([
      "mon_vitals_q2h",
      "nurse_pain_q2h",
      "com_diet_ad_lib",
    ]);
  });

  it("findUnknownObservationTemplateIds returns unknown only", () => {
    expect(findUnknownObservationTemplateIds(["mon_vitals_q2h", "bogus"])).toEqual(["bogus"]);
    expect(findUnknownObservationTemplateIds(["mon_vitals_q2h"])).toEqual([]);
  });

  it("buildObservationTemplateCareOrderDto sets CARE items and protocol", () => {
    const dto = buildObservationTemplateCareOrderDto({
      selectedItemIds: ["mon_vitals_q2h", "com_diet_ad_lib"],
      prescriberName: "Dr. Test",
    });
    expect(dto.type).toBe("CARE");
    expect(dto.orderSource).toBe("PROVIDER_ORDER");
    expect(dto.protocolName).toBe(OBSERVATION_ORDER_TEMPLATE_ID);
    expect(dto.items).toHaveLength(2);
    expect(dto.items[0]?.catalogItemType).toBe("CARE");
    expect(dto.items[0]?.manualLabel).toBe(
      OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === "mon_vitals_q2h")!.manualLabelEn
    );
  });

  it("buildObservationTemplateCareOrderDto stamps templateItemId for single-line orders", () => {
    const dto = buildObservationTemplateCareOrderDto({
      selectedItemIds: ["mon_vitals_q2h"],
      prescriberName: "Dr. Test",
      observationTemplateGroupId: "grp-1",
    });
    expect(dto.items).toHaveLength(1);
    expect(dto.observationTemplateItemId).toBe("mon_vitals_q2h");
    expect(dto.observationTemplateGroupId).toBe("grp-1");
  });

  it("buildObservationTemplateCareOrderDto uses English labels when locale is omitted", () => {
    const dto = buildObservationTemplateCareOrderDto({
      selectedItemIds: ["mon_vitals_q2h"],
      prescriberName: "Dr. Test",
    });
    expect(dto.items[0]?.manualLabel).toContain("Vital signs every 2 hours");
  });

  it("buildObservationTemplateCareOrderDto uses French labels when labelLocale is fr", () => {
    const dto = buildObservationTemplateCareOrderDto({
      selectedItemIds: ["mon_vitals_q2h"],
      prescriberName: "Dr. Test",
      labelLocale: "fr",
    });
    expect(dto.items[0]?.manualLabel).toContain("Signes vitaux");
  });

  it("observationOrderTemplateItemManualLabel returns locale-specific copy", () => {
    expect(observationOrderTemplateItemManualLabel("mon_vitals_q2h", "en")).toContain("Vital signs");
    expect(observationOrderTemplateItemManualLabel("mon_vitals_q2h", "fr")).toContain("Signes vitaux");
  });

  it("collectObservationTemplateItemIdsFromOrderItems maps persisted manual labels (FR/EN) and ignores cancelled rows", () => {
    const frLabel = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === "mon_vitals_q2h")!.manualLabelFr;
    const enPain = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === "nurse_pain_q2h")!.manualLabelEn;
    expect(
      collectObservationTemplateItemIdsFromOrderItems([
        { manualLabel: frLabel, status: "PENDING", lifecycleState: "ORDERED" },
        { manualLabel: enPain, status: "PENDING", lifecycleState: "ORDERED" },
        { manualLabel: frLabel, status: "CANCELLED", lifecycleState: "ORDERED" },
      ])
    ).toEqual(["mon_vitals_q2h", "nurse_pain_q2h"]);
  });
});
