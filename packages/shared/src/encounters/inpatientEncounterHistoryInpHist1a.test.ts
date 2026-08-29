/**
 * INP.HIST.1A — hospitalization course / linkage tests.
 */

import { describe, expect, it } from "vitest";
import {
  buildInpatientHospitalCourseProjection,
  buildUnitSegmentsFromBedTransfers,
  formatInpatientDispositionLabel,
  readInpatientOriginatingEdEncounterId,
} from "./inpatientEncounterHistoryInpHist1a.js";

describe("INP.HIST.1A inpatient encounter history", () => {
  it("reads originating ED only from canonical JSON — not patient/date inference", () => {
    expect(readInpatientOriginatingEdEncounterId(null)).toBeNull();
    expect(
      readInpatientOriginatingEdEncounterId({
        originatingEdEncounterId: "ed-1",
      })
    ).toBe("ed-1");
    expect(
      readInpatientOriginatingEdEncounterId({
        admissionCorrelation: {
          admissionCorrelationId: "c1",
          sourceEncounterId: "ed-corr",
          admissionIntent: "ED_ADMIT_TO_INPATIENT",
          status: "ACTIVE",
          patientId: "p",
          facilityId: "f",
          destinationEncounterContext: "INPATIENT",
          admissionIntentCreatedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          correlationVersion: 1,
          version: 1,
        },
      })
    ).toBe("ed-corr");
  });

  it("builds ED → ICU → Med/Surg → Home course from transfers + disposition", () => {
    const proj = buildInpatientHospitalCourseProjection({
      id: "ip-1",
      status: "CLOSED",
      createdAt: "2026-08-20T13:42:00.000Z",
      dischargedAt: "2026-08-25T15:36:00.000Z",
      admissionSummaryJson: {
        originatingEdEncounterId: "ed-9",
        serviceUnit: "MED_SURG",
        inpatientLifecycleV1: {
          version: 1,
          bedTransfers: [
            {
              transferredAt: "2026-08-22T10:18:00.000Z",
              transferredByUserId: "u1",
              fromUnit: "ICU",
              fromBedKey: "ICU-1",
              toUnit: "MED_SURG",
              toBedKey: "MS-2",
              reason: "Step down",
              effectiveAt: "2026-08-22T10:18:00.000Z",
            },
          ],
          discharge: {
            dischargedAt: "2026-08-25T15:36:00.000Z",
            dischargedByUserId: "u1",
            disposition: "HOME",
            clinicalDispositionCode: "HOME",
          },
        },
      },
    });
    expect(proj.originatingEdEncounterId).toBe("ed-9");
    expect(proj.encounterTypeLabel).toBe("Hospitalization");
    expect(proj.courseSummary).toContain("ED");
    expect(proj.courseSummary).toContain("ICU");
    expect(proj.courseSummary).toMatch(/MED.?SURG|MED_SURG|Med/i);
    expect(proj.courseSummary).toContain("Home");
    expect(proj.timeline.some((s) => s.kind === "EMERGENCY")).toBe(true);
    expect(proj.timeline.some((s) => s.kind === "DISCHARGE")).toBe(true);
  });

  it("does not invent ED link when absent", () => {
    const proj = buildInpatientHospitalCourseProjection({
      id: "ip-2",
      status: "CLOSED",
      createdAt: "2026-08-20T00:00:00.000Z",
      admissionSummaryJson: {
        serviceUnit: "ICU",
        inpatientLifecycleV1: { version: 1, bedTransfers: [], discharge: null },
      },
    });
    expect(proj.originatingEdEncounterId).toBeNull();
    expect(proj.encounterTypeLabel).toBe("Inpatient");
    expect(proj.courseSummary).not.toContain("ED");
  });

  it("same-unit room change does not create a false unit split", () => {
    const segs = buildUnitSegmentsFromBedTransfers(
      [
        {
          transferredAt: "2026-08-21T10:00:00.000Z",
          transferredByUserId: "u1",
          fromUnit: "MED_SURG",
          fromBedKey: "MS-1",
          toUnit: "MED_SURG",
          toBedKey: "MS-2",
          reason: "Room change",
          effectiveAt: "2026-08-21T10:00:00.000Z",
        },
      ],
      {
        admitAt: "2026-08-20T00:00:00.000Z",
        endAt: "2026-08-22T00:00:00.000Z",
        currentUnit: "MED_SURG",
      }
    );
    const units = segs.filter((s) => s.kind === "UNIT");
    expect(units.length).toBe(1);
    expect(units[0]!.label).toMatch(/MED/i);
  });

  it("OPEN encounters do not append discharge destination to course", () => {
    const proj = buildInpatientHospitalCourseProjection({
      id: "ip-3",
      status: "OPEN",
      createdAt: "2026-08-20T00:00:00.000Z",
      admissionSummaryJson: {
        serviceUnit: "ICU",
        inpatientLifecycleV1: { version: 1, bedTransfers: [], discharge: null },
      },
    });
    expect(proj.courseSummary).not.toMatch(/Home|Discharged/i);
  });

  it("preserves ELOPED as Eloped (not AMA)", () => {
    expect(formatInpatientDispositionLabel("ELOPED")).toBe("Eloped");
    expect(formatInpatientDispositionLabel("AMA")).toBe("AMA");
  });

  it("Med/Surg → ICU → Med/Surg preserves distinct unit segments", () => {
    const segs = buildUnitSegmentsFromBedTransfers(
      [
        {
          transferredAt: "t1",
          transferredByUserId: "u",
          fromUnit: "MED_SURG",
          fromBedKey: "a",
          toUnit: "ICU",
          toBedKey: "b",
          reason: "escalate",
          effectiveAt: "2026-08-21T10:00:00.000Z",
        },
        {
          transferredAt: "t2",
          transferredByUserId: "u",
          fromUnit: "ICU",
          fromBedKey: "b",
          toUnit: "MED_SURG",
          toBedKey: "c",
          reason: "step down",
          effectiveAt: "2026-08-22T10:00:00.000Z",
        },
      ],
      {
        admitAt: "2026-08-20T00:00:00.000Z",
        endAt: "2026-08-25T00:00:00.000Z",
        currentUnit: "MED_SURG",
      }
    );
    const labels = segs.filter((s) => s.kind === "UNIT").map((s) => s.label);
    expect(labels.length).toBe(3);
    expect(labels[0]).toMatch(/MED/i);
    expect(labels[1]).toMatch(/ICU/i);
    expect(labels[2]).toMatch(/MED/i);
  });

  it("roomLabel-only does not become a UNIT segment", () => {
    const proj = buildInpatientHospitalCourseProjection({
      id: "ip-room",
      status: "OPEN",
      createdAt: "2026-08-20T00:00:00.000Z",
      roomLabel: "MS-4",
      admissionSummaryJson: {
        inpatientLifecycleV1: { version: 1, bedTransfers: [], discharge: null },
      },
    });
    expect(proj.timeline.filter((s) => s.kind === "UNIT")).toHaveLength(0);
    expect(proj.courseSummary).toBe("—");
    expect(proj.timelineIncomplete).toBe(true);
    expect(proj.courseSummary).not.toContain("MS-4");
  });

  it("authoritative serviceUnit may appear as current-state when no transfers", () => {
    const proj = buildInpatientHospitalCourseProjection({
      id: "ip-svc",
      status: "OPEN",
      createdAt: "2026-08-20T00:00:00.000Z",
      roomLabel: "MS-4",
      admissionSummaryJson: {
        serviceUnit: "MED_SURG",
        inpatientLifecycleV1: { version: 1, bedTransfers: [], discharge: null },
      },
    });
    expect(proj.courseSummary).toMatch(/MED/i);
    expect(proj.courseSummary).not.toContain("MS-4");
    expect(proj.timelineIncomplete).toBe(true);
    expect(proj.timeline.some((s) => s.kind === "UNIT" && s.currentStateOnly)).toBe(true);
  });
});
