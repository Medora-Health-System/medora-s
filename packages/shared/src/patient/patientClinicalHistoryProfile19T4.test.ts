/**
 * Phase 19T.4 — Production readiness: migration backward compat, safe parsing, chart summary fallbacks.
 */
import { describe, expect, it } from "vitest";
import {
  buildPatientClinicalHistorySummary,
  emptyPatientClinicalHistoryProfile,
  patientClinicalHistoryProfileFromJson,
  profileHasClinicalContent,
} from "./patientClinicalHistoryProfile.js";
import {
  emptyTriageCarryForwardDraft,
  triageCarryForwardMetaFromVitalsJson,
  TRIAGE_CARRY_FORWARD_VERSION,
} from "../triage/triageCarryForward.js";

describe("patientClinicalHistoryProfile (19T.4 production validation)", () => {
  it("null clinicalHistoryProfileJson parses as null profile", () => {
    expect(patientClinicalHistoryProfileFromJson(null)).toBeNull();
    expect(patientClinicalHistoryProfileFromJson(undefined)).toBeNull();
  });

  it("malformed clinicalHistoryProfileJson never throws and returns null", () => {
    const malformed: unknown[] = [
      "not-json",
      42,
      [],
      { version: "wrong" },
      { version: "19T.3" },
      { version: "19T.3", updatedAt: 123 },
    ];
    for (const raw of malformed) {
      expect(() => patientClinicalHistoryProfileFromJson(raw)).not.toThrow();
      expect(patientClinicalHistoryProfileFromJson(raw)).toBeNull();
    }
  });

  it("chart summary helper handles null profile safely", () => {
    const summary = buildPatientClinicalHistorySummary(null);
    expect(summary).toEqual({
      hasProfile: false,
      updatedAt: null,
      updatedBy: null,
      sections: [],
    });
  });

  it("chart summary helper handles malformed stored profile as empty", () => {
    const summary = buildPatientClinicalHistorySummary(
      patientClinicalHistoryProfileFromJson({ corrupted: true })
    );
    expect(summary.hasProfile).toBe(false);
    expect(summary.sections).toEqual([]);
  });

  it("profile without clinical sections is not considered hydrated content", () => {
    const empty = emptyPatientClinicalHistoryProfile();
    expect(profileHasClinicalContent(empty)).toBe(false);
    expect(patientClinicalHistoryProfileFromJson(empty)).not.toBeNull();
    expect(profileHasClinicalContent(patientClinicalHistoryProfileFromJson(empty))).toBe(false);
  });

  it("encounters without triageCarryForwardMeta still parse vitals safely", () => {
    const vitals = {
      allergyNote: "Note",
      medoraErTriageV1: { pastMedicalHistory: "HTA" },
    };
    expect(triageCarryForwardMetaFromVitalsJson(vitals)).toBeNull();
    expect(() => triageCarryForwardMetaFromVitalsJson(vitals)).not.toThrow();
  });

  it("legacy 19T.1 carry-forward meta without sectionStatus still loads", () => {
    const vitals = {
      triageCarryForwardMeta: {
        version: TRIAGE_CARRY_FORWARD_VERSION,
        sourceEncounterId: "enc-prior",
        sourceEncounterDate: "2025-12-01T00:00:00.000Z",
        carriedForwardAt: "2026-05-18T10:00:00.000Z",
        fields: { allergies: true },
        reviewStatus: "reviewed",
      },
    };
    const meta = triageCarryForwardMetaFromVitalsJson(vitals);
    expect(meta?.sourceEncounterId).toBe("enc-prior");
    expect(meta?.reviewStatus).toBe("reviewed");
  });

  it("empty triage draft is safe when no profile exists", () => {
    const draft = emptyTriageCarryForwardDraft();
    expect(draft.allergyNote).toBe("");
    expect(draft.erV1.pastMedicalHistory).toBe("");
  });
});
