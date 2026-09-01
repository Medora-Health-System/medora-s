import { describe, expect, it } from "vitest";
import { ER_DISPOSITION_V1_KEY } from "./edEncounterLifecycle.js";
import {
  preserveSignedAdmissionDecisionOnSummaryWrite,
  preserveSignedProviderDispositionOnNursingWrite,
  readEdDispositionDecisionFromNursingAssessment,
} from "./edDispositionDecisionV1.js";

const signedProviderNa = {
  erDispositionV1: {
    documentationStatus: "SIGNED",
    signedAt: "2026-09-01T12:00:00.000Z",
    signedByDisplayName: "Dr. Provider",
    revision: 2,
    signature: {
      savedAt: "2026-09-01T12:00:00.000Z",
      savedByDisplayName: "Dr. Provider",
    },
    transferHandoffNote: "provider note",
  },
  edNursingDocumentationV1: { drafts: [] },
};

describe("signed provider disposition protection", () => {
  it("RN nursing write cannot downgrade SIGNED status, signer, or signedAt", () => {
    const incoming = {
      erDispositionV1: {
        documentationStatus: "DRAFT",
        signedAt: "2026-09-01T15:00:00.000Z",
        signedByDisplayName: "Synth EdHosp1fRn",
        revision: 3,
        signature: {
          savedAt: "2026-09-01T15:00:00.000Z",
          savedByDisplayName: "Synth EdHosp1fRn",
        },
      },
      edNursingDocumentationV1: { drafts: [{ draftId: "handoff" }] },
      adaptiveEdNursingExecutionV1: { pathway: "OBSERVATION" },
    };
    const protectedNa = preserveSignedProviderDispositionOnNursingWrite(signedProviderNa, incoming);
    const meta = readEdDispositionDecisionFromNursingAssessment(protectedNa);
    expect(meta.documentationStatus).toBe("SIGNED");
    expect(meta.signedByDisplayName).toBe("Dr. Provider");
    expect(meta.signedAt).toBe("2026-09-01T12:00:00.000Z");
    expect(meta.revision).toBe(2);
    const ns = (protectedNa as Record<string, unknown>)[ER_DISPOSITION_V1_KEY] as Record<string, unknown>;
    expect((ns.signature as { savedByDisplayName: string }).savedByDisplayName).toBe("Dr. Provider");
    expect((protectedNa as Record<string, unknown>).edNursingDocumentationV1).toEqual({
      drafts: [{ draftId: "handoff" }],
    });
    expect((protectedNa as Record<string, unknown>).adaptiveEdNursingExecutionV1).toEqual({
      pathway: "OBSERVATION",
    });
  });

  it("does not rewrite unsigned drafts", () => {
    const prior = { erDispositionV1: { documentationStatus: "DRAFT" } };
    const incoming = { erDispositionV1: { documentationStatus: "DRAFT" }, foo: 1 };
    expect(preserveSignedProviderDispositionOnNursingWrite(prior, incoming)).toEqual(incoming);
  });

  it("RN cannot change signed admission decision stamps or destination", () => {
    const prior = {
      admissionDecisionMode: "SIGN",
      admissionDecisionAt: "2026-09-01T12:00:00.000Z",
      admissionDecisionByUserId: "provider-1",
      requestedEncounterType: "OBSERVATION",
      careLevel: "OBSERVATION",
    };
    const incoming = {
      admissionDecisionMode: "DRAFT",
      admissionDecisionAt: "2026-09-01T15:00:00.000Z",
      admissionDecisionByUserId: "rn-1",
      requestedEncounterType: "INPATIENT",
      careLevel: "OBSERVATION",
    };
    expect(preserveSignedAdmissionDecisionOnSummaryWrite(prior, incoming)).toEqual({
      admissionDecisionMode: "SIGN",
      admissionDecisionAt: "2026-09-01T12:00:00.000Z",
      admissionDecisionByUserId: "provider-1",
      requestedEncounterType: "OBSERVATION",
      careLevel: "OBSERVATION",
    });
  });
});
