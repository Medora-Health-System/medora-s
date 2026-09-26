import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDiagnosisCandidate,
  newBillingCaptureItemId,
  readBillingCaptureV1,
  upsertBillingCaptureItem,
} from "./billingCaptureV1.js";

const diagnosis = {
  diagnosisId: "diagnosis-1",
  encounterId: "encounter-1",
  patientId: "patient-1",
  facilityId: "facility-1",
  code: "R50.9",
  createdAtIso: "2026-09-26T12:00:00.000Z",
  createdByUserId: "provider-1",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("persisted billing capture identity", () => {
  it("generates separate UUID v4 identities with the supported runtime", () => {
    const first = newBillingCaptureItemId();
    const second = newBillingCaptureItemId();
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(first).toMatch(uuidV4);
    expect(second).toMatch(uuidV4);
    expect(second).not.toBe(first);
  });

  it("uses the cryptographic UUID unchanged without altering clinical attribution", () => {
    const id = "12345678-1234-4234-8234-123456789abc";
    const randomUUID = vi.fn(() => id);
    vi.stubGlobal("crypto", { randomUUID });
    const item = buildDiagnosisCandidate(diagnosis);
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(item).toMatchObject({
      id,
      sourceId: diagnosis.diagnosisId,
      linkedDiagnosisIds: [diagnosis.diagnosisId],
      encounterId: diagnosis.encounterId,
      patientId: diagnosis.patientId,
      facilityId: diagnosis.facilityId,
      createdAt: diagnosis.createdAtIso,
      createdByUserId: diagnosis.createdByUserId,
    });
  });

  it.each([undefined, {}, { randomUUID: "unavailable" }])(
    "refuses to construct a new candidate without secure UUID support (%j)",
    (cryptoValue) => {
      vi.stubGlobal("crypto", cryptoValue);
      const weakRandom = vi.spyOn(Math, "random");
      expect(() => buildDiagnosisCandidate(diagnosis)).toThrow(
        "Secure billing capture ID generation is unavailable",
      );
      expect(weakRandom).not.toHaveBeenCalled();
    },
  );

  it("propagates secure generator failures instead of inventing an identifier", () => {
    vi.stubGlobal("crypto", { randomUUID: () => { throw new Error("entropy unavailable"); } });
    expect(() => newBillingCaptureItemId()).toThrow("entropy unavailable");
  });

  it("preserves legacy IDs and separate history when secure generation is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    const legacy = {
      id: "bc_legacy_existing",
      sourceType: "DIAGNOSIS" as const,
      sourceId: diagnosis.diagnosisId,
      status: "needs_review" as const,
      createdAt: diagnosis.createdAtIso,
      createdByUserId: diagnosis.createdByUserId,
      patientId: diagnosis.patientId,
      facilityId: diagnosis.facilityId,
    };
    const other = { ...legacy, id: "another-existing-id", sourceId: "diagnosis-2" };
    const stored = { version: 1, items: [legacy, other] };
    expect(readBillingCaptureV1(stored).items).toEqual([legacy, other]);
    expect(upsertBillingCaptureItem(stored, legacy).items).toEqual([other, legacy]);
    expect(stored.items).toEqual([legacy, other]);
  });
});
