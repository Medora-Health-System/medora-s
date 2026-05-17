import { describe, expect, it } from "vitest";
import {
  buildClinicalTimeDisplayPair,
  clinicalDocumentationEventBelongsInAdmissionHistory,
  clinicalDocumentationEventBelongsInDischargeHistory,
  clinicalTimelineCarePhaseForDisplayEventType,
  orderAttributionActionForOrderType,
  orderAttributionLabelKey,
  orderCreatorMustNotDisplayAsPerformer,
  resolveClinicalTimelineDisplayEventType,
} from "./clinicalTimelineDisplayNormalization.js";
import { DISCHARGE_MODE_FR_ADMISSION } from "./observationAdmissionDischargeRouting.js";

describe("clinicalTimelineDisplayNormalization", () => {
  it("remaps mislabeled discharge to observation admission display type", () => {
    const display = resolveClinicalTimelineDisplayEventType({
      eventType: "DISCHARGE_SUMMARY_SAVED",
      payloadJson: { snapshot: { dischargeMode: DISCHARGE_MODE_FR_ADMISSION } },
    });
    expect(display).toBe("OBSERVATION_ADMISSION_PACKET_SAVED");
    expect(clinicalTimelineCarePhaseForDisplayEventType(display)).toBe("OBSERVATION");
  });

  it("keeps true discharge in discharge history filter", () => {
    const dischargeEvent = {
      eventType: "DISCHARGE_SUMMARY_SAVED",
      payloadJson: { snapshot: { dischargeMode: "Domicile", dischargeInstructions: "Repos" } },
    };
    expect(clinicalDocumentationEventBelongsInDischargeHistory(dischargeEvent)).toBe(true);
    expect(clinicalDocumentationEventBelongsInAdmissionHistory(dischargeEvent)).toBe(false);
  });

  it("routes observation admission to admission history only", () => {
    const obs = {
      eventType: "DISCHARGE_SUMMARY_SAVED",
      payloadJson: { snapshot: { dischargeMode: DISCHARGE_MODE_FR_ADMISSION } },
    };
    expect(clinicalDocumentationEventBelongsInDischargeHistory(obs)).toBe(false);
    expect(clinicalDocumentationEventBelongsInAdmissionHistory(obs)).toBe(true);
  });

  it("uses documented time for sort and flags correction separately", () => {
    const pair = buildClinicalTimeDisplayPair({
      documentedAt: "2026-05-16T10:00:00.000Z",
      effectiveAt: "2026-05-16T09:00:00.000Z",
      adjustmentVersion: 1,
    });
    expect(pair.sortAtIso).toBe("2026-05-16T10:00:00.000Z");
    expect(pair.hasCorrection).toBe(true);
    expect(pair.effectiveAtIso).toBe("2026-05-16T09:00:00.000Z");
  });

  it("maps lab completion to resulted attribution", () => {
    expect(orderAttributionActionForOrderType("COMPLETED", "LAB")).toBe("RESULTED");
    expect(orderAttributionLabelKey("RESULTED")).toBe("attribution.resultedBy");
  });

  it("blocks provider order creator shown as performer", () => {
    expect(
      orderCreatorMustNotDisplayAsPerformer({
        creatorName: "Dr A",
        actorName: "Dr A",
      })
    ).toBe(true);
  });
});
