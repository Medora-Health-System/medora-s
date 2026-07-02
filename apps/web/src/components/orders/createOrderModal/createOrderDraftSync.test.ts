import { describe, expect, it } from "vitest";
import {
  buildDraftPayloadAfterDomainSubmit,
  createOrderDraftHasContent,
} from "./createOrderDraftSync";
import type { CreateOrderLineItem } from "./types";

const line = (id: string, label: string): CreateOrderLineItem => ({
  _lineId: id,
  isManual: true,
  catalogItemType: "CARE",
  manualLabel: label,
  _label: label,
});

describe("createOrderDraftSync", () => {
  it("clears submitted domain items from draft payload and advances review tab", () => {
    const next = buildDraftPayloadAfterDomainSubmit({
      submittedType: "LAB",
      nextStagedItems: {
        LAB: [],
        IMAGING: [],
        MEDICATION: [],
        CARE: [line("care-1", "NPO status")],
      },
      nextReviewTab: "CARE",
      activeTab: "LAB",
      selectedOrderSet: "ed_rn_nausea_vomiting_diarrhea_v1",
      selectedOrderSetItemKeys: ["vitalsQ15", "cmp", "npoStatus"],
      orderSetReviewActive: true,
      formData: {
        type: "LAB",
        priority: "ROUTINE",
        notes: "",
        prescriberName: "",
        prescriberLicense: "",
        prescriberContact: "",
        orderSource: "",
        readbackConfirmed: false,
        protocolName: "",
        items: [line("lab-1", "CMP")],
      },
    });

    expect(next.stagedItems.LAB).toEqual([]);
    expect(next.activeTab).toBe("CARE");
    expect(next.formData.type).toBe("CARE");
    expect(next.formData.items).toHaveLength(1);
    expect(createOrderDraftHasContent(next)).toBe(true);
  });

  it("marks review inactive when no staged domains remain", () => {
    const next = buildDraftPayloadAfterDomainSubmit({
      submittedType: "CARE",
      nextStagedItems: {
        LAB: [],
        IMAGING: [],
        MEDICATION: [],
        CARE: [],
      },
      nextReviewTab: null,
      activeTab: "CARE",
      selectedOrderSet: "ed_rn_nausea_vomiting_diarrhea_v1",
      selectedOrderSetItemKeys: ["vitalsQ15", "cmp"],
      orderSetReviewActive: true,
      formData: {
        type: "CARE",
        priority: "ROUTINE",
        notes: "",
        prescriberName: "",
        prescriberLicense: "",
        prescriberContact: "",
        orderSource: "",
        readbackConfirmed: false,
        protocolName: "",
        items: [line("care-1", "NPO status")],
      },
    });

    expect(next.orderSetReviewActive).toBe(false);
    expect(next.selectedOrderSetItemKeys).toEqual([]);
    expect(next.formData.items).toEqual([]);
    expect(createOrderDraftHasContent(next)).toBe(false);
  });
});
