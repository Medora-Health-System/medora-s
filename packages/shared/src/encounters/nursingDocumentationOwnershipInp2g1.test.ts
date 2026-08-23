import { describe, expect, it } from "vitest";
import {
  resolveNursingAdmissionDocumentOwner,
  stampNursingAdmissionDocumentOwnerOnDraftWrite,
  assertNursingAdmissionOwnerWrite,
  assertInpatientNursingAssessmentWriteAllowed,
  assertInpatientNursingAssessmentCorrection,
} from "./nursingDocumentationOwnershipInp2g1.js";
import {
  emptyMedSurgNursingAdmissionDocV1,
  saveAdmissionSectionDraft,
} from "./medSurgNursingAdmissionD4a1.js";
import { appendNursingAdmissionAmendment } from "./nursingAdmissionDomainIntegrationD4a25a.js";

const baseDoc = () =>
  emptyMedSurgNursingAdmissionDocV1({
    patientId: "p1", facilityId: "f1", encounterId: "e1",
  });

describe("MEDUI.INP.2G.1 nursing documentation ownership", () => {
  it("resolves owner: signed signer > documentOwnerUserId > null", () => {
    expect(resolveNursingAdmissionDocumentOwner(null)).toBeNull();
    expect(resolveNursingAdmissionDocumentOwner({})).toBeNull();
    expect(resolveNursingAdmissionDocumentOwner({ documentOwnerUserId: "rn-a" })).toBe("rn-a");
    expect(
      resolveNursingAdmissionDocumentOwner({
        documentOwnerUserId: "rn-a",
        nurseSignature: { signed: true, signedByUserId: "rn-b" },
      }),
    ).toBe("rn-b");
    expect(
      resolveNursingAdmissionDocumentOwner({
        documentOwnerUserId: "rn-a",
        nurseSignature: { signed: false, signedByUserId: "rn-b" },
      }),
    ).toBe("rn-a");
  });

  it("stamps immutable documentOwnerUserId on first draft write and denies non-owner", () => {
    const emptyDoc = baseDoc();
    const first = saveAdmissionSectionDraft({
      doc: emptyDoc,
      sectionId: "OVERVIEW",
      draftText: "hello",
      clientExpectedVersion: emptyDoc.expectedVersion,
      actorUserId: "rn-1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.doc.documentOwnerUserId).toBe("rn-1");

    const secondSame = saveAdmissionSectionDraft({
      doc: first.doc,
      sectionId: "OVERVIEW",
      draftText: "hello2",
      clientExpectedVersion: first.doc.expectedVersion,
      actorUserId: "rn-1",
    });
    expect(secondSame.ok).toBe(true);
    if (!secondSame.ok) return;
    expect(secondSame.doc.documentOwnerUserId).toBe("rn-1");

    const other = saveAdmissionSectionDraft({
      doc: secondSame.doc,
      sectionId: "OVERVIEW",
      draftText: "intruder",
      clientExpectedVersion: secondSame.doc.expectedVersion,
      actorUserId: "rn-2",
    });
    expect(other.ok).toBe(false);
    if (other.ok) return;
    expect(other.code).toBe("NURSING_ADMISSION_NOT_DOCUMENT_OWNER");

    const stamped = stampNursingAdmissionDocumentOwnerOnDraftWrite({ documentOwnerUserId: "rn-1" }, "rn-2");
    expect(stamped.documentOwnerUserId).toBe("rn-1");
  });

  it("denies non-owner amendments after sign; owner may amend", () => {
    const emptyDoc = baseDoc();
    const draftResult = saveAdmissionSectionDraft({
      doc: emptyDoc,
      sectionId: "OVERVIEW",
      draftText: "x",
      clientExpectedVersion: emptyDoc.expectedVersion,
      actorUserId: "rn-1",
    });
    expect(draftResult.ok).toBe(true);
    if (!draftResult.ok) return;

    const signedSlice = {
      ...draftResult.doc,
      nurseSignature: {
        signed: true as const,
        signedAt: "2026-01-01T00:00:00.000Z",
        signedByUserId: "rn-1",
        displayName: "RN One",
      },
    };

    expect(assertNursingAdmissionOwnerWrite({ doc: signedSlice, actorUserId: "rn-2" }).ok).toBe(false);

    const denied = appendNursingAdmissionAmendment({
      doc: signedSlice,
      type: "CORRECTION",
      clientRequestId: "req-1",
      reason: "fix value",
      actorUserId: "rn-2",
      clientExpectedVersion: signedSlice.expectedVersion,
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.code).toBe("NURSING_ADMISSION_NOT_DOCUMENT_OWNER");

    const allowed = appendNursingAdmissionAmendment({
      doc: signedSlice,
      type: "CORRECTION",
      clientRequestId: "req-2",
      reason: "fix value",
      actorUserId: "rn-1",
      clientExpectedVersion: signedSlice.expectedVersion,
    });
    expect(allowed.ok).toBe(true);
  });

  it("keeps expectedVersion conflict for owner concurrent writes", () => {
    const emptyDoc = baseDoc();
    const first = saveAdmissionSectionDraft({
      doc: emptyDoc,
      sectionId: "OVERVIEW",
      draftText: "a",
      clientExpectedVersion: emptyDoc.expectedVersion,
      actorUserId: "rn-1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const stale = saveAdmissionSectionDraft({
      doc: first.doc,
      sectionId: "OVERVIEW",
      draftText: "b",
      clientExpectedVersion: emptyDoc.expectedVersion,
      actorUserId: "rn-1",
    });
    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.code).toBe("EXPECTED_VERSION_CONFLICT");
  });

  it("locks unsigned assessment drafts to author; allows new episodes after SIGNED/FINAL", () => {
    expect(
      assertInpatientNursingAssessmentWriteAllowed({
        latest: { status: "DRAFT", authorUserId: "rn-1", sessionId: "s1" },
        actorUserId: "rn-2",
      }).ok,
    ).toBe(false);
    expect(
      assertInpatientNursingAssessmentWriteAllowed({
        latest: { status: "SIGNED", authorUserId: "rn-1", sessionId: "s1" },
        actorUserId: "rn-2",
      }).ok,
    ).toBe(true);
  });

  it("links corrections to the exact prior session and rejects cross-session mutation", () => {
    const sessions = [
      { sessionId: "s-a", authorUserId: "rn-1", status: "SIGNED" as const },
      { sessionId: "s-b", authorUserId: "rn-1", status: "SIGNED" as const },
    ];
    const ok = assertInpatientNursingAssessmentCorrection({
      actorUserId: "rn-1",
      correctionOfSessionId: "s-a",
      correctionReason: "DOCUMENTATION_ERROR",
      sessions,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.correctionOfSessionId).toBe("s-a");

    expect(
      assertInpatientNursingAssessmentCorrection({
        actorUserId: "rn-2",
        correctionOfSessionId: "s-a",
        correctionReason: "DOCUMENTATION_ERROR",
        sessions,
      }).ok,
    ).toBe(false);
    expect(
      assertInpatientNursingAssessmentCorrection({
        actorUserId: "rn-1",
        correctionOfSessionId: "s-missing",
        correctionReason: "DOCUMENTATION_ERROR",
        sessions,
      }).ok,
    ).toBe(false);
    expect(
      assertInpatientNursingAssessmentCorrection({
        actorUserId: "rn-1",
        correctionOfSessionId: "s-a",
        correctionReason: "",
        sessions,
      }).ok,
    ).toBe(false);
  });
});
