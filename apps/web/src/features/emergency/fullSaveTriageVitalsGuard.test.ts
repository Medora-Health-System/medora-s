import { describe, expect, it } from "vitest";
import { hasMeaningfulVitalMeasurement } from "@/lib/patientVitals";

/**
 * Mirrors EmergencyTriagePanel full-Save vitals gating (TEST D):
 * empty/context-only draft must not append a new reading after independent vitals save.
 */
function resolveFullSaveVitalsIntent(args: {
  vitalsMerged: Record<string, unknown> | null;
  existingTriageVitals: Record<string, unknown> | null;
}): { vitalsForSave: Record<string, unknown> | null; createReading: boolean } {
  const draftIsMeaningful = Boolean(
    args.vitalsMerged && hasMeaningfulVitalMeasurement(args.vitalsMerged)
  );
  const vitalsForSave = draftIsMeaningful
    ? args.vitalsMerged
    : args.existingTriageVitals && hasMeaningfulVitalMeasurement(args.existingTriageVitals)
      ? args.existingTriageVitals
      : args.vitalsMerged;
  return { vitalsForSave, createReading: draftIsMeaningful };
}

describe("full Save triage vitals guard (TEST D)", () => {
  it("preserves prior populated reading and does not create a second empty reading", () => {
    const prior = {
      bpSys: 134,
      bpDia: 78,
      hr: 85,
      rr: 16,
      tempC: 36.1,
      spo2: 100,
      weightKg: 79.8,
      oxygenDevice: "ROOM_AIR",
    };
    const emptyDraft = { oxygenDevice: "ROOM_AIR", temperatureSite: "ORAL" };
    const { vitalsForSave, createReading } = resolveFullSaveVitalsIntent({
      vitalsMerged: emptyDraft,
      existingTriageVitals: prior,
    });
    expect(createReading).toBe(false);
    expect(vitalsForSave).toEqual(prior);
    expect(hasMeaningfulVitalMeasurement(emptyDraft)).toBe(false);
  });
});
