import { describe, expect, it } from "vitest";
import {
  buildMarUniversalClinicalTimeNotes,
  parseMarUniversalClinicalTimeNotes,
  resolveMarUniversalClinicalTime,
  resolveMarUniversalPlacementInstant,
  validateMarUniversalClinicalTime,
  isMarUniversalClinicalTimeCorrectionEligible,
  resolveMarUniversalClinicalTimeCorrectionEventType,
  resolveMarUniversalShiftTimelineDosePlacementInstant,
} from "./marUniversalClinicalTimeGovernance.js";

describe("marUniversalClinicalTimeGovernance (H9F)", () => {
  const documentedAt = "2026-06-03T14:20:00.000Z";
  const clinicalTime = "2026-06-03T14:15:00.000Z";
  const scheduledTime = "2026-06-03T14:00:00.000Z";

  it("1 — preserves clinicalTime and documentedAt", () => {
    const result = resolveMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      clinicalTime,
      documentedAt,
      scheduledTime,
      currentScheduledTime: scheduledTime,
    });
    expect(result?.clinicalTime).toBe(clinicalTime);
    expect(result?.documentedAt).toBe(documentedAt);
    expect(result?.placementInstant).toBe(clinicalTime);
  });

  it("2 — reason required when clinicalTime differs beyond threshold", () => {
    const validation = validateMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      clinicalTime,
      documentedAt,
      reasonCode: null,
    });
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.code).toBe("REASON_REQUIRED");
  });

  it("3 — no reason required when within threshold", () => {
    const validation = validateMarUniversalClinicalTime({
      actionType: "ADMINISTER",
      clinicalTime: documentedAt,
      documentedAt,
    });
    expect(validation.ok).toBe(true);
  });

  it("builds and parses universal clinical time notes", () => {
    const notes = buildMarUniversalClinicalTimeNotes({
      actionType: "REFUSE",
      clinicalTime,
      documentedAt,
      reasonCode: "WORKFLOW_DELAY",
      reasonDetail: "busy",
    });
    expect(notes).toContain("MAR_UNIVERSAL_CLINICAL_TIME:");
    const parsed = parseMarUniversalClinicalTimeNotes(notes);
    expect(parsed?.clinicalTime).toBe(clinicalTime);
    expect(parsed?.documentedAt).toBe(documentedAt);
    expect(parsed?.reasonCode).toBe("WORKFLOW_DELAY");
  });

  it("terminal placement uses clinicalTime", () => {
    const placement = resolveMarUniversalPlacementInstant({
      clinicalTime,
      isTerminalOrCompleted: true,
      originalScheduledTime: scheduledTime,
    });
    expect(placement.toISOString()).toBe(clinicalTime);
  });

  it("pending placement uses adjusted scheduled time", () => {
    const adjusted = "2026-06-03T15:00:00.000Z";
    const placement = resolveMarUniversalPlacementInstant({
      isPending: true,
      adjustedScheduledTime: adjusted,
      originalScheduledTime: scheduledTime,
    });
    expect(placement.toISOString()).toBe(adjusted);
  });

  it("correction eligible for refused and held storage actions", () => {
    expect(isMarUniversalClinicalTimeCorrectionEligible("refused")).toBe(true);
    expect(isMarUniversalClinicalTimeCorrectionEligible("not_available")).toBe(true);
    expect(isMarUniversalClinicalTimeCorrectionEligible("md_changed")).toBe(true);
    expect(isMarUniversalClinicalTimeCorrectionEligible("administered")).toBe(true);
  });

  it("H9F.1 — resolves correction event types for infusion and terminal actions", () => {
    expect(
      resolveMarUniversalClinicalTimeCorrectionEventType({
        marActionResolved: "md_changed",
        notes: "Held: PROVIDER_ORDER",
      })
    ).toBe("HOLD");
    expect(
      resolveMarUniversalClinicalTimeCorrectionEventType({
        marActionResolved: "administered",
        infusionPhase: "INFUSION_START",
        doseKind: "IVPB_SESSION",
      })
    ).toBe("IVPB_START");
    expect(
      resolveMarUniversalClinicalTimeCorrectionEventType({
        marActionResolved: "administered",
        infusionPhase: "INFUSION_STOP",
        isFluidBolus: true,
      })
    ).toBe("BOLUS_COMPLETE");
  });

  it("H9F.1 — shift timeline dose placement uses universal wrapper", () => {
    const scheduledAt = new Date("2026-06-03T14:00:00.000Z");
    const clinicalStop = "2026-06-03T11:00:00.000Z";
    const placement = resolveMarUniversalShiftTimelineDosePlacementInstant({
      doseStatus: "COMPLETED",
      doseKind: "IVPB_SESSION",
      scheduledAt,
      adjustedScheduledAt: scheduledAt,
      enrichment: {
        startedAt: "2026-06-03T09:00:00.000Z",
        stoppedAt: clinicalStop,
        administeredAt: null,
      },
    });
    expect(placement.toISOString()).toBe(clinicalStop);
  });
});
