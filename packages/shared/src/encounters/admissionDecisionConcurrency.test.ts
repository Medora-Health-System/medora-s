import { describe, expect, it } from "vitest";
import {
  extractAdmissionDecisionErrorCode,
  isAdmissionDecisionStaleErrorCode,
  mergeAdmissionDecisionExpectedVersion,
  nextAdmissionDecisionExpectedVersionAfterMutations,
  parseEncounterVersionFromAdmissionDecisionResponse,
  preferNewerEncounterVersion,
  shouldAutomaticallyRetryAdmissionDecisionSignature,
} from "./admissionDecisionConcurrency.js";

describe("admissionDecisionConcurrency", () => {
  it("merges server versions monotonically and never fabricates", () => {
    expect(mergeAdmissionDecisionExpectedVersion(undefined, undefined)).toBeUndefined();
    expect(mergeAdmissionDecisionExpectedVersion(undefined, 3)).toBe(3);
    expect(mergeAdmissionDecisionExpectedVersion(3, 4)).toBe(4);
    expect(mergeAdmissionDecisionExpectedVersion(5, 3)).toBe(5);
    expect(mergeAdmissionDecisionExpectedVersion(4, 4)).toBe(4);
    expect(mergeAdmissionDecisionExpectedVersion(4, -1)).toBe(4);
    expect(mergeAdmissionDecisionExpectedVersion(4, 1.5)).toBe(4);
    expect(mergeAdmissionDecisionExpectedVersion(4, "6" as never)).toBe(4);
  });

  it("save then sign uses refreshed server state even if a later GET regresses", () => {
    expect(
      nextAdmissionDecisionExpectedVersionAfterMutations({
        hydratedFromGet: 3,
        decisionResponseVersion: 4,
        patchResponseVersion: 5,
        subsequentGetVersion: 3,
      })
    ).toBe(5);
  });

  it("direct sign uses current server state from the mutation response", () => {
    expect(
      nextAdmissionDecisionExpectedVersionAfterMutations({
        hydratedFromGet: 7,
        decisionResponseVersion: 8,
        patchResponseVersion: 9,
      })
    ).toBe(9);
  });

  it("parses canonical version from admission/decision response without inventing", () => {
    expect(parseEncounterVersionFromAdmissionDecisionResponse({ encounter: { version: 12 } })).toBe(12);
    expect(parseEncounterVersionFromAdmissionDecisionResponse({ version: 9 })).toBe(9);
    expect(parseEncounterVersionFromAdmissionDecisionResponse({ encounter: {} })).toBeUndefined();
    expect(parseEncounterVersionFromAdmissionDecisionResponse(null)).toBeUndefined();
  });

  it("does not regress the in-memory encounter when a stale GET/cache arrives", () => {
    const current = { id: "e1", version: 8, dest: "INPATIENT" };
    const stale = { id: "e1", version: 3, dest: "OBSERVATION" };
    expect(preferNewerEncounterVersion(current, stale)).toEqual(current);
    expect(preferNewerEncounterVersion(current, { id: "e1", dest: "HOME" })).toEqual(current);
    expect(preferNewerEncounterVersion(null, stale)).toEqual(stale);
    expect(preferNewerEncounterVersion(current, { id: "e1", version: 9, dest: "OBSERVATION" })).toEqual({
      id: "e1",
      version: 9,
      dest: "OBSERVATION",
    });
  });

  it("recognizes ADMISSION_DECISION_STALE from nested Nest conflict bodies", () => {
    expect(isAdmissionDecisionStaleErrorCode("ADMISSION_DECISION_STALE")).toBe(true);
    expect(isAdmissionDecisionStaleErrorCode("ENCOUNTER_NOT_EDITABLE")).toBe(false);
    expect(
      extractAdmissionDecisionErrorCode({
        errorCode: null,
        body: {
          statusCode: 409,
          message: { code: "ADMISSION_DECISION_STALE", errorCode: "ADMISSION_DECISION_STALE" },
        },
      })
    ).toBe("ADMISSION_DECISION_STALE");
    expect(
      extractAdmissionDecisionErrorCode({
        errorCode: "ADMISSION_DECISION_STALE",
        body: {},
      })
    ).toBe("ADMISSION_DECISION_STALE");
  });

  it("never automatically retries a provider signature after a stale conflict", () => {
    expect(shouldAutomaticallyRetryAdmissionDecisionSignature("ADMISSION_DECISION_STALE")).toBe(false);
    expect(shouldAutomaticallyRetryAdmissionDecisionSignature(null)).toBe(false);
  });
});
