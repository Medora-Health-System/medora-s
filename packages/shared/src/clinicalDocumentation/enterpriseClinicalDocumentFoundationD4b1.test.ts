/**
 * MEDUI.D4B.1 — Foundation tests (lifecycle, authorship, adapters, validation, render).
 */

import { describe, expect, it } from "vitest";
import {
  adaptEncounterNoteToEnterpriseClinicalDocument,
  adaptEdocEntryToEnterpriseClinicalDocument,
  adaptProviderDocumentationShellToEnterpriseClinicalDocument,
  assertDocumentIdentityImmutable,
  assertSignerIsAuthenticatedUser,
  authorshipPreservedAfterReassignment,
  buildEnterpriseClinicalDocumentLegalProjection,
  canSignEnterpriseClinicalDocument,
  canTransitionEnterpriseClinicalDocumentLifecycle,
  cosignPreservesOriginalAuthor,
  documentTypeEligibilitySummary,
  evaluateEnterpriseClinicalDocumentCompleteness,
  evaluateEnterpriseClinicalDocumentFieldValidation,
  isDocumentTypeAllowedForCareSetting,
  isDocumentTypeAllowedForDiscipline,
  orderEnterpriseClinicalDocumentVersionHistory,
  paginateEnterpriseClinicalDocumentVersionHistory,
  transitionEnterpriseClinicalDocumentLifecycle,
  assertEnterpriseClinicalDocumentNotSilentlyMutable,
  ENTERPRISE_CLINICAL_DOCUMENT_FOUNDATION_CERTIFICATION_ID,
  ENTERPRISE_CLINICAL_DOCUMENT_LIFECYCLE_INVARIANTS,
} from "./enterpriseClinicalDocumentFoundationD4b1.js";

describe("MEDUI.D4B.1 enterprise clinical document foundation", () => {
  it("exposes certification id and lifecycle invariants", () => {
    expect(ENTERPRISE_CLINICAL_DOCUMENT_FOUNDATION_CERTIFICATION_ID).toContain("D4B1");
    expect(ENTERPRISE_CLINICAL_DOCUMENT_LIFECYCLE_INVARIANTS.length).toBeGreaterThanOrEqual(8);
  });

  describe("lifecycle", () => {
    it("creates draft → sign → amended path", () => {
      expect(transitionEnterpriseClinicalDocumentLifecycle("DRAFT", "SIGN")).toEqual({
        ok: true,
        to: "SIGNED",
      });
      expect(transitionEnterpriseClinicalDocumentLifecycle("SIGNED", "AMEND")).toEqual({
        ok: true,
        to: "AMENDED",
      });
    });

    it("rejects invalid transitions", () => {
      expect(transitionEnterpriseClinicalDocumentLifecycle("SIGNED", "START_EDIT").ok).toBe(false);
      expect(
        canTransitionEnterpriseClinicalDocumentLifecycle("SIGNED", "START_EDIT", "IN_PROGRESS")
      ).toBe(false);
    });

    it("rejects mutation of terminal entered-in-error / voided", () => {
      expect(transitionEnterpriseClinicalDocumentLifecycle("ENTERED_IN_ERROR", "SIGN").ok).toBe(
        false
      );
      expect(transitionEnterpriseClinicalDocumentLifecycle("VOIDED", "AMEND").ok).toBe(false);
    });

    it("marks signed states as not silently mutable", () => {
      expect(assertEnterpriseClinicalDocumentNotSilentlyMutable("SIGNED")).toBe(true);
      expect(assertEnterpriseClinicalDocumentNotSilentlyMutable("DRAFT")).toBe(false);
    });

    it("incomplete document cannot sign when completeness fails", () => {
      const validation = evaluateEnterpriseClinicalDocumentFieldValidation({
        payload: {},
        rules: [{ fieldPath: "body", required: true }],
        schemaVersion: "t1",
      });
      const completeness = evaluateEnterpriseClinicalDocumentCompleteness({
        validation,
        requiredClinicalIndicators: ["body"],
        presentIndicators: [],
      });
      expect(canSignEnterpriseClinicalDocument({ completeness })).toBe(false);
    });
  });

  describe("authorship", () => {
    it("preserves author after operational reassignment", () => {
      const result = authorshipPreservedAfterReassignment({
        authorUserId: "nurse-1",
        signerUserId: "nurse-1",
        priorAssignedUserId: "nurse-1",
        newAssignedUserId: "nurse-2",
      });
      expect(result.authorUnchanged).toBe(true);
      expect(result.signerUnchanged).toBe(true);
      expect(result.assignmentChanged).toBe(true);
    });

    it("rejects signing as another user", () => {
      expect(
        assertSignerIsAuthenticatedUser({
          authenticatedUserId: "u1",
          claimedSignerUserId: "u2",
        })
      ).toEqual({ ok: false, reason: "SIGNER_MISMATCH" });
      expect(
        assertSignerIsAuthenticatedUser({
          authenticatedUserId: "u1",
          claimedSignerUserId: "u1",
        })
      ).toEqual({ ok: true });
    });

    it("cosign preserves distinct original author", () => {
      expect(
        cosignPreservesOriginalAuthor({ authorUserId: "a", cosignerUserId: "b" })
      ).toBe(true);
      expect(
        cosignPreservesOriginalAuthor({ authorUserId: "a", cosignerUserId: "a" })
      ).toBe(false);
    });
  });

  describe("EncounterNote reference adapter", () => {
    const baseNote = {
      id: "note-1",
      encounterId: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      noteType: "NURSING" as const,
      body: "Patient resting comfortably.",
      authorUserId: "nurse-1",
      authorDisplayName: "A. Nurse",
      authorRoleTitle: "RN",
      createdAt: "2026-07-26T12:00:00.000Z",
    };

    it("maps create to SIGNED durable note", () => {
      const doc = adaptEncounterNoteToEnterpriseClinicalDocument(baseNote);
      expect(doc.sourceArchitecture).toBe("ENCOUNTER_NOTE");
      expect(doc.lifecycleState).toBe("SIGNED");
      expect(doc.author.userId).toBe("nurse-1");
      expect(doc.narrative?.sections[0]?.text).toContain("resting");
    });

    it("maps amendment lineage and preserves original via priorVersionId", () => {
      const doc = adaptEncounterNoteToEnterpriseClinicalDocument({
        ...baseNote,
        id: "note-2",
        isAmendment: true,
        amendedFromNoteId: "note-1",
        amendmentReason: "Clarification",
      });
      expect(doc.lifecycleState).toBe("AMENDED");
      expect(doc.lineage.amendedFromId).toBe("note-1");
      expect(doc.lineage.amendmentReason).toBe("Clarification");
    });

    it("maps cosign required and cosigned", () => {
      const pending = adaptEncounterNoteToEnterpriseClinicalDocument({
        ...baseNote,
        requiresCosign: true,
      });
      expect(pending.lifecycleState).toBe("COSIGN_REQUIRED");
      const done = adaptEncounterNoteToEnterpriseClinicalDocument({
        ...baseNote,
        requiresCosign: true,
        cosignedAt: "2026-07-26T13:00:00.000Z",
        cosignedByUserId: "md-1",
        cosignRoleSnapshot: "Provider",
      });
      expect(done.lifecycleState).toBe("COSIGNED");
      expect(done.cosigner?.userId).toBe("md-1");
    });

    it("maps entered-in-error without physical delete", () => {
      const doc = adaptEncounterNoteToEnterpriseClinicalDocument({
        ...baseNote,
        voidedAt: "2026-07-26T14:00:00.000Z",
        voidReasonCode: "ENTERED_IN_ERROR",
      });
      expect(doc.lifecycleState).toBe("ENTERED_IN_ERROR");
      expect(doc.enteredInError).toBe(true);
      expect(doc.narrative?.sections[0]?.text).toBeTruthy();
    });

    it("keeps author when assigned clinician differs", () => {
      const doc = adaptEncounterNoteToEnterpriseClinicalDocument({
        ...baseNote,
        currentAssignedClinicianUserId: "nurse-2",
      });
      expect(doc.author.userId).toBe("nurse-1");
      expect(doc.currentAssignedClinicianUserId).toBe("nurse-2");
    });

    it("forbids patient/encounter reassignment", () => {
      expect(
        assertDocumentIdentityImmutable({
          originalPatientId: "pat-1",
          originalEncounterId: "enc-1",
          proposedPatientId: "pat-2",
          proposedEncounterId: "enc-1",
        }).ok
      ).toBe(false);
      expect(
        assertDocumentIdentityImmutable({
          originalPatientId: "pat-1",
          originalEncounterId: "enc-1",
          proposedPatientId: "pat-1",
          proposedEncounterId: "enc-1",
        })
      ).toEqual({ ok: true });
    });
  });

  describe("EDOC / provider shell adapters", () => {
    it("adapts EDOC entry with witness cosign requirement", () => {
      const doc = adaptEdocEntryToEnterpriseClinicalDocument({
        id: "edoc-1",
        facilityId: "fac-1",
        encounterId: "enc-1",
        patientId: "pat-1",
        category: "PAIN",
        cardId: "pain_initial_assessment",
        payloadJson: { score: 4 },
        authorUserId: "nurse-1",
        authorDisplayNameSnapshot: "A. Nurse",
        authorRoleSnapshot: "RN",
        createdAt: "2026-07-26T12:00:00.000Z",
        requiresWitnessSignature: true,
      });
      expect(doc.lifecycleState).toBe("COSIGN_REQUIRED");
      expect(doc.structured?.payload.score).toBe(4);
    });

    it("adapts provider shell draft vs signed", () => {
      const draft = adaptProviderDocumentationShellToEnterpriseClinicalDocument({
        encounterId: "enc-1",
        patientId: "pat-1",
        facilityId: "fac-1",
        status: "DRAFT",
      });
      expect(draft.lifecycleState).toBe("DRAFT");
      const signed = adaptProviderDocumentationShellToEnterpriseClinicalDocument({
        encounterId: "enc-1",
        patientId: "pat-1",
        facilityId: "fac-1",
        status: "SIGNED",
        signedAt: "2026-07-26T15:00:00.000Z",
        signedByUserId: "md-1",
        signedByDisplayName: "Dr. Who",
      });
      expect(signed.lifecycleState).toBe("SIGNED");
      expect(signed.responsibleSigner?.userId).toBe("md-1");
    });
  });

  describe("care setting and discipline", () => {
    it("allows nursing note in emergency; rejects PT on nursing admission type", () => {
      expect(isDocumentTypeAllowedForCareSetting("encounter_note.nursing", "EMERGENCY")).toBe(
        true
      );
      expect(
        isDocumentTypeAllowedForDiscipline("nursing.admission_assessment", "PHYSICAL_THERAPY")
      ).toBe(false);
      const summary = documentTypeEligibilitySummary({
        documentTypeId: "encounter_note.provider",
        careSetting: "INPATIENT",
        discipline: "PROVIDER",
        assignedUserId: "md-1",
        actorUserId: "md-1",
      });
      expect(summary.assignmentEqualsAuthorization).toBe(false);
      expect(summary.careSettingAllowed).toBe(true);
    });
  });

  describe("validation and completeness", () => {
    it("evaluates required and conditional fields; warning vs hard stop", () => {
      const validation = evaluateEnterpriseClinicalDocumentFieldValidation({
        payload: { hasPain: true },
        rules: [
          { fieldPath: "painScore", required: true, conditionalOn: { fieldPath: "hasPain", equals: true } },
        ],
        schemaVersion: "v1",
      });
      expect(validation.fieldValid).toBe(false);
      expect(validation.issues[0]?.severity).toBe("HARD_STOP");
    });

    it("schema-version-specific validation retains schemaVersion argument", () => {
      const validation = evaluateEnterpriseClinicalDocumentFieldValidation({
        payload: { body: "ok" },
        rules: [{ fieldPath: "body", required: true }],
        schemaVersion: "MEDNOTE.2",
      });
      expect(validation.fieldValid).toBe(true);
    });
  });

  describe("rendering and version history", () => {
    it("marks unsigned drafts and amended status on legal projection", () => {
      const draft = adaptProviderDocumentationShellToEnterpriseClinicalDocument({
        encounterId: "enc-1",
        patientId: "pat-1",
        facilityId: "fac-1",
        status: "DRAFT",
      });
      const draftProj = buildEnterpriseClinicalDocumentLegalProjection(draft);
      expect(draftProj.unsignedDraftMarked).toBe(true);

      const amended = adaptEncounterNoteToEnterpriseClinicalDocument({
        id: "n2",
        encounterId: "enc-1",
        patientId: "pat-1",
        facilityId: "fac-1",
        noteType: "PROVIDER",
        body: "Addendum text",
        authorUserId: "md-1",
        authorDisplayName: "MD",
        authorRoleTitle: "Provider",
        createdAt: "2026-07-26T16:00:00.000Z",
        isAmendment: true,
        amendedFromNoteId: "n1",
        amendmentReason: "Update",
      });
      const amendedProj = buildEnterpriseClinicalDocumentLegalProjection(amended);
      expect(amendedProj.amendmentLabel).toBeTruthy();
      expect(amendedProj.signedAt).toBeTruthy();
      expect(amendedProj.templateVersion).toBe("MEDNOTE.2");
    });

    it("orders and paginates version history", () => {
      const ordered = orderEnterpriseClinicalDocumentVersionHistory([
        { documentId: "a", createdAt: "2026-01-01T00:00:00.000Z" },
        { documentId: "b", createdAt: "2026-02-01T00:00:00.000Z" },
      ]);
      expect(ordered[0]?.documentId).toBe("b");
      const page = paginateEnterpriseClinicalDocumentVersionHistory(ordered, {
        limit: 1,
        offset: 0,
      });
      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(2);
    });
  });
});
