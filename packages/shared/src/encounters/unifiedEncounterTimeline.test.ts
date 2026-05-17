import { describe, expect, it } from "vitest";
import {
  aggregateUnifiedEncounterTimeline,
  filterSourceRowsForDedupe,
  type UnifiedTimelineSourceRow,
} from "./unifiedEncounterTimeline.js";
import { OBSERVATION_REASSESSMENT_EVENT_SOURCE } from "../observationReassessmentV1.js";

describe("unifiedEncounterTimeline", () => {
  it("dedupes MAR-linked order events", () => {
    const rows: UnifiedTimelineSourceRow[] = [
      {
        sourceKind: "MEDICATION_ADMINISTRATION",
        sourceId: "mar-1",
        storedEventType: "ADMINISTERED",
        documentedAtIso: "2026-05-16T11:00:00.000Z",
        actorDisplayName: "Nurse A",
      },
      {
        sourceKind: "ORDER_EVENT",
        sourceId: "oe-1",
        storedEventType: "COMPLETED",
        documentedAtIso: "2026-05-16T11:00:00.000Z",
        orderType: "MEDICATION",
        payloadJson: { medicationAdministrationId: "mar-1" },
      },
    ];
    const filtered = filterSourceRowsForDedupe(rows);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.sourceKind).toBe("MEDICATION_ADMINISTRATION");
  });

  it("sorts by documented time ascending (operational chronology)", () => {
    const result = aggregateUnifiedEncounterTimeline(
      [
        {
          sourceKind: "ENCOUNTER_CLINICAL_EVENT",
          sourceId: "b",
          storedEventType: "VITALS_RECORDED",
          documentedAtIso: "2026-05-16T12:00:00.000Z",
        },
        {
          sourceKind: "ENCOUNTER_CLINICAL_EVENT",
          sourceId: "a",
          storedEventType: "TRIAGE_ASSESSMENT_SAVED",
          documentedAtIso: "2026-05-16T08:00:00.000Z",
        },
      ],
      { newestFirst: false }
    );
    expect(result.items[0]?.sourceId).toBe("a");
    expect(result.items[1]?.sourceId).toBe("b");
  });

  it("never uses effective time for sort order", () => {
    const result = aggregateUnifiedEncounterTimeline(
      [
        {
          sourceKind: "MEDICATION_ADMINISTRATION",
          sourceId: "mar-late-doc",
          storedEventType: "ADMINISTERED",
          documentedAtIso: "2026-05-16T12:00:00.000Z",
          effectiveClinicalAtIso: "2026-05-16T09:00:00.000Z",
          adjustmentVersion: 1,
        },
        {
          sourceKind: "ENCOUNTER_CLINICAL_EVENT",
          sourceId: "vitals",
          storedEventType: "VITALS_RECORDED",
          documentedAtIso: "2026-05-16T10:00:00.000Z",
        },
      ],
      { newestFirst: false }
    );
    expect(result.items.map((i) => i.sourceId)).toEqual(["vitals", "mar-late-doc"]);
    expect(result.items[1]?.hasClinicalTimeCorrection).toBe(true);
    expect(result.items[1]?.chips).toContain("ADJUSTED");
  });

  it("tags observation reassessment with observation chip", () => {
    const result = aggregateUnifiedEncounterTimeline([
      {
        sourceKind: "ENCOUNTER_CLINICAL_EVENT",
        sourceId: "obs-1",
        storedEventType: "NURSING_ASSESSMENT_SAVED",
        documentedAtIso: "2026-05-16T09:00:00.000Z",
        payloadJson: { source: OBSERVATION_REASSESSMENT_EVENT_SOURCE },
      },
    ]);
    expect(result.items[0]?.displayGroup).toBe("OBSERVATION");
    expect(result.items[0]?.chips).toContain("OBSERVATION");
  });
});
