import { describe, expect, it } from "vitest";
import {
  requiresEnterprisePainReassessment,
  resolveEnterprisePainReassessmentMarStatus,
  resolveEnterprisePainReassessmentTimelineSecondaryText,
} from "./enterprisePainReassessmentWorkflow.js";
import { buildMarPainResponseTimelineProjection } from "./marPainResponseTimelineProjection.js";

describe("requiresEnterprisePainReassessment", () => {
  it("requires ketorolac / toradol", () => {
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Ketorolac 30 mg IV" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Toradol" })).toBe(true);
  });

  it("requires opioids", () => {
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Morphine 2 mg/mL" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Hydromorphone" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Fentanyl" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Norco 5/325" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Percocet 5/325" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Tylenol #3" })).toBe(true);
  });

  it("requires muscle relaxants", () => {
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Cyclobenzaprine 10 mg" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Methocarbamol" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Tizanidine 4 mg" })).toBe(true);
  });

  it("requires topical pain agents", () => {
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Lidocaine 5% patch" })).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Diclofenac gel" })).toBe(true);
  });

  it("requires ibuprofen when pain indication present", () => {
    expect(
      requiresEnterprisePainReassessment({
        medicationLabel: "Ibuprofen 600 mg",
        directionsSig: "for pain",
      })
    ).toBe(true);
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Ibuprofen 600 mg" })).toBe(false);
  });

  it("requires gabapentin when ordered for pain", () => {
    expect(
      requiresEnterprisePainReassessment({
        medicationLabel: "Gabapentin 300 mg",
        prnIndication: "neuropathic pain",
      })
    ).toBe(true);
  });

  it("does not require non-pain antibiotic", () => {
    expect(requiresEnterprisePainReassessment({ medicationLabel: "Ceftriaxone 1 g IV" })).toBe(false);
  });
});

describe("resolveEnterprisePainReassessmentMarStatus", () => {
  it("ketorolac administered with empty notes → AWAITING_REASSESSMENT", () => {
    expect(
      resolveEnterprisePainReassessmentMarStatus({
        medicationLabel: "Ketorolac 30 mg IV",
        marAction: "administered",
        administeredAt: "2026-06-25T12:00:00.000Z",
        administrationNotes: "",
      })
    ).toBe("AWAITING_REASSESSMENT");
  });

  it("scheduled morphine completed dose → AWAITING_REASSESSMENT", () => {
    expect(
      resolveEnterprisePainReassessmentMarStatus({
        medicationLabel: "Morphine",
        doseStatus: "COMPLETED",
        administeredAt: "2026-06-25T12:00:00.000Z",
      })
    ).toBe("AWAITING_REASSESSMENT");
  });

  it("transitions to REASSESSMENT_COMPLETED when response note present", () => {
    const notes =
      'MAR_MEDICATION_RESPONSE: {"responseCode":"PAIN_REDUCED","painBefore":8,"painAfter":3,"painResponseTrend":"IMPROVED","documentedAt":"2026-06-25T12:30:00.000Z"}';
    expect(
      resolveEnterprisePainReassessmentMarStatus({
        medicationLabel: "Percocet",
        marAction: "administered",
        administrationNotes: notes,
      })
    ).toBe("REASSESSMENT_COMPLETED");
  });

  it("PRN pain medication requires response", () => {
    expect(
      resolveEnterprisePainReassessmentTimelineSecondaryText(
        {
          medicationLabel: "Hydromorphone 0.5 mg",
          marAction: "administered",
          administeredAt: "2026-06-25T12:00:00.000Z",
          prnIndication: "severe pain",
        },
        "DONE"
      )
    ).toBe("AWAITING_REASSESSMENT");
  });
});

describe("buildMarPainResponseTimelineProjection", () => {
  it("exposes responseRequired for toradol administration", () => {
    const projection = buildMarPainResponseTimelineProjection({
      medicationLabel: "Toradol 30 mg IV",
      marAction: "administered",
      administeredAt: "2026-06-25T12:00:00.000Z",
      doseStatus: "COMPLETED",
      defaultSecondaryText: "DONE",
    });
    expect(projection.responseRequired).toBe(true);
    expect(projection.responseCompleted).toBe(false);
    expect(projection.secondaryText).toBe("AWAITING_REASSESSMENT");
  });
});
