import { describe, expect, it } from "vitest";
import {
  buildNursingDischargeVitalsSnapshot,
  isRecentVitalForDischarge,
  mergeNursingDischargeVitalsAssociationIntoNursingAssessment,
  NURSING_DISCHARGE_VITALS_RECENT_MS,
  readNursingDischargeVitalsAssociation,
  validateNursingDischargeVitalsGate,
} from "./nursingDischargeVitalsModel";

describe("nursingDischargeVitalsModel", () => {
  it("requires reading or exception before confirm", () => {
    expect(validateNursingDischargeVitalsGate({}).ok).toBe(false);
    expect(validateNursingDischargeVitalsGate({ dischargeVitalReadingId: "r1" })).toEqual({
      ok: true,
      mode: "READING",
    });
    expect(
      validateNursingDischargeVitalsGate({ dischargeVitalsExceptionReason: "PATIENT_REFUSED" })
    ).toEqual({ ok: true, mode: "EXCEPTION" });
  });

  it("requires free text for OTHER exception", () => {
    const r = validateNursingDischargeVitalsGate({ dischargeVitalsExceptionReason: "OTHER" });
    expect(r).toEqual({ ok: false, code: "EXCEPTION_OTHER_TEXT" });
    expect(
      validateNursingDischargeVitalsGate({
        dischargeVitalsExceptionReason: "OTHER",
        dischargeVitalsExceptionNote: "No cuff available on unit",
      }).ok
    ).toBe(true);
  });

  it("blocks stale selected-from-existing readings", () => {
    const old = new Date(Date.now() - NURSING_DISCHARGE_VITALS_RECENT_MS - 60_000).toISOString();
    expect(
      validateNursingDischargeVitalsGate(
        {
          dischargeVitalReadingId: "r1",
          dischargeVitalsSelectedFromExisting: true,
        },
        { readingMeasuredAtIso: old }
      )
    ).toEqual({ ok: false, code: "STALE_READING" });
  });

  it("detects recent vitals within window", () => {
    const now = Date.now();
    expect(isRecentVitalForDischarge(new Date(now - 10 * 60_000).toISOString(), now)).toBe(true);
    expect(isRecentVitalForDischarge(new Date(now - 90 * 60_000).toISOString(), now)).toBe(false);
  });

  it("builds snapshot from vitalsJson", () => {
    const snap = buildNursingDischargeVitalsSnapshot({
      vitalsJson: {
        bpSys: 120,
        bpDia: 80,
        hr: 72,
        rr: 16,
        tempC: 36.8,
        temperatureSite: "ORAL",
        spo2: 98,
        oxygenDevice: "ROOM_AIR",
        painScore: "2",
      },
      measuredAt: "2026-07-15T12:00:00.000Z",
      enteredBy: "AC",
    });
    expect(snap.bp).toBe("120/80");
    expect(snap.hr).toBe("72");
    expect(snap.temp).toContain("36.8");
    expect(snap.enteredBy).toBe("AC");
  });

  it("merges association into nursingAssessment without wiping unrelated keys", () => {
    const next = mergeNursingDischargeVitalsAssociationIntoNursingAssessment(
      { erDispositionExecutionV1: { nursingDestination: "HOME" }, other: 1 },
      {
        dischargeVitalReadingId: "reading-1",
        dischargeVitalsConfirmedByDisplayName: "Nurse A",
        dischargeVitalsConfirmedAt: "2026-07-15T12:00:00.000Z",
        dischargeVitalsSnapshot: { bp: "120/80", hr: "70" },
      }
    );
    const exec = next.erDispositionExecutionV1 as Record<string, unknown>;
    expect(exec.nursingDestination).toBe("HOME");
    expect(exec.dischargeVitalReadingId).toBe("reading-1");
    expect(next.other).toBe(1);
    expect(readNursingDischargeVitalsAssociation(next).dischargeVitalReadingId).toBe("reading-1");
  });
});
