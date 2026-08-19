import { describe, expect, it } from "vitest";
import { emptyMedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import {
  NURSING_DOMAIN_INTEGRATION_CERTIFICATION_ID,
  appendNursingAdmissionAmendment,
  buildNursingAdmissionPrintSummary,
  linkNursingDomainReference,
  nursingAdmissionMustNotCreateSecondPainEngine,
  nursingAdmissionMustNotDuplicateAllergyArray,
  nursingAdmissionMustNotDuplicateWoundInventory,
  nursingDocAmendments,
  nursingSectionIntegration,
  projectNursingSectionCompletion,
  providerMustNotRewriteNursingAdmissionDocumentation,
  reviewNursingAdmissionWithDomains,
  signedNursingAdmissionMustRemainImmutable,
} from "./nursingAdmissionDomainIntegrationD4a25a.js";

function baseDoc() {
  return emptyMedSurgNursingAdmissionDocV1({
    patientId: "p1",
    facilityId: "f1",
    encounterId: "e1",
  });
}

describe("D4A.2.5A nursing domain integration", () => {
  it("certifies orchestration invariants", () => {
    expect(NURSING_DOMAIN_INTEGRATION_CERTIFICATION_ID).toBe(
      "MEDUI.NURSING_DOMAIN_INTEGRATION.D4A2_5A"
    );
    expect(nursingAdmissionMustNotDuplicateAllergyArray()).toBe(true);
    expect(nursingAdmissionMustNotDuplicateWoundInventory()).toBe(true);
    expect(nursingAdmissionMustNotCreateSecondPainEngine()).toBe(true);
    expect(signedNursingAdmissionMustRemainImmutable()).toBe(true);
    expect(providerMustNotRewriteNursingAdmissionDocumentation()).toBe(true);
  });

  it("maps pain/fall/wound/allergy to enterprise domains", () => {
    expect(nursingSectionIntegration("PAIN").authoritativeDomain).toBe("PAIN_EDOC13");
    expect(nursingSectionIntegration("PAIN").writeMode).toBe("EMBED_CANONICAL_EDITOR");
    expect(nursingSectionIntegration("FALL_SAFETY").edocFocusedCardId).toBe(
      "safety_precautions_documentation"
    );
    expect(nursingSectionIntegration("FUNCTIONAL_MOBILITY").authoritativeDomain).toBe(
      "ADMISSION_OWNED"
    );
    expect(nursingSectionIntegration("HOME_MEDICATIONS").writeMode).toBe("VERIFY_AND_UPDATE");
    expect(nursingSectionIntegration("LINES_DRAINS_DEVICES").writeMode).toBe("ADMISSION_ONLY");
    expect(nursingSectionIntegration("EDUCATION_COMMUNICATION").edocFocusedCardId).toBe(
      "patient_education_session"
    );
    expect(nursingSectionIntegration("SKIN_WOUND").badgeKey).toBe("wound");
    expect(nursingSectionIntegration("ALLERGIES").readMode).toBe("VERIFY_AND_UPDATE");
    expect(nursingSectionIntegration("IDENTITY_DEMOGRAPHICS").writeMode).toBe(
      "VERIFY_AND_UPDATE"
    );
  });

  it("does not mark EDOC section complete from local checkbox alone", () => {
    let doc = baseDoc();
    doc = {
      ...doc,
      sections: {
        ...doc.sections,
        PAIN: {
          sectionId: "PAIN",
          completionState: "COMPLETE",
          expectedVersion: 1,
          answers: { painPresent: "YES", score: 4 },
        },
      },
    };
    const projection = projectNursingSectionCompletion({ doc, sectionId: "PAIN" });
    expect(projection.projectedState).toBe("IN_PROGRESS");
    expect(projection.warnings).toContain("DOMAIN_RECORD_REQUIRED");

    const linked = linkNursingDomainReference({
      doc,
      clientExpectedVersion: doc.expectedVersion,
      actorUserId: "rn1",
      reference: {
        domain: "PAIN_EDOC13",
        recordId: "edoc-pain-1",
        status: "COMPLETE",
        sectionId: "PAIN",
      },
    });
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;
    const after = projectNursingSectionCompletion({
      doc: {
        ...linked.doc,
        sections: {
          ...linked.doc.sections,
          PAIN: {
            ...linked.doc.sections.PAIN!,
            completionState: "COMPLETE",
          },
        },
      },
      sectionId: "PAIN",
    });
    expect(after.projectedState).toBe("COMPLETE");
    expect(after.domainRefCount).toBe(1);
  });

  it("keeps signed original immutable and appends amendments idempotently", () => {
    let doc = baseDoc();
    doc = {
      ...doc,
      expectedVersion: 3,
      nurseSignature: {
        signed: true,
        signedAt: "2026-07-22T10:00:00.000Z",
        signedByUserId: "rn1",
      },
    };
    const first = appendNursingAdmissionAmendment({
      doc,
      type: "ADDENDUM",
      clientRequestId: "req-1",
      reason: "New wound found after transfer",
      note: "Left heel blister noted",
      sectionId: "SKIN_WOUND",
      actorUserId: "rn1",
      clientExpectedVersion: 3,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.doc.nurseSignature?.signedAt).toBe("2026-07-22T10:00:00.000Z");
    expect(nursingDocAmendments(first.doc)).toHaveLength(1);

    const dup = appendNursingAdmissionAmendment({
      doc: first.doc,
      type: "ADDENDUM",
      clientRequestId: "req-1",
      reason: "duplicate",
      actorUserId: "rn1",
      clientExpectedVersion: first.doc.expectedVersion,
    });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.code).toBe("NURSING_ADMISSION_AMENDMENT_DUPLICATE");

    const correction = appendNursingAdmissionAmendment({
      doc: first.doc,
      type: "CORRECTION",
      clientRequestId: "req-2",
      reason: "Incorrect pain score transcribed",
      sectionId: "PAIN",
      originalValue: { score: 8 },
      correctedValue: { score: 4 },
      actorUserId: "rn2",
      clientExpectedVersion: first.doc.expectedVersion,
    });
    expect(correction.ok).toBe(true);
    if (!correction.ok) return;
    expect(correction.amendment.originalValue).toEqual({ score: 8 });
    expect(correction.amendment.correctedValue).toEqual({ score: 4 });
    expect(nursingDocAmendments(correction.doc)).toHaveLength(2);

    const unsigned = appendNursingAdmissionAmendment({
      doc: baseDoc(),
      type: "ADDENDUM",
      clientRequestId: "x",
      reason: "too early",
      actorUserId: "rn1",
      clientExpectedVersion: 0,
    });
    expect(unsigned.ok).toBe(false);
    if (!unsigned.ok) expect(unsigned.code).toBe("NURSING_ADMISSION_NOT_SIGNED");
  });

  it("builds print summary with status labels and domain load errors", () => {
    let doc = baseDoc();
    doc = {
      ...doc,
      expectedVersion: 2,
      nurseSignature: {
        signed: true,
        signedAt: "2026-07-22T10:00:00.000Z",
        signedByUserId: "rn1",
        displayName: "Nurse One",
      },
      amendments: [
        {
          amendmentId: "amd-1",
          clientRequestId: "c1",
          type: "ADDENDUM",
          reason: "Late finding",
          createdAt: "2026-07-22T12:00:00.000Z",
          createdByUserId: "rn1",
          documentRevisionAtCreate: 2,
          amendmentVersion: 1,
        },
      ],
    };
    const summary = buildNursingAdmissionPrintSummary({
      doc,
      facility: { id: "f1", name: "Clinic A" },
      patient: { id: "p1", legalName: "Ada Lovelace", mrn: "MRN1" },
      encounter: { id: "e1", unit: "MedSurg", roomBed: "A-1" },
      domainLoadErrors: { PAIN: "Unable to load PAIN at print time" },
    });
    expect(summary.printStatus).toBe("AMENDED");
    expect(summary.certification).toBe(NURSING_DOMAIN_INTEGRATION_CERTIFICATION_ID);
    expect(summary.amendments).toHaveLength(1);
    const pain = summary.sections.find((s) => s.sectionId === "PAIN");
    expect(pain?.loadError).toContain("Unable to load");
  });

  it("aggregates domain review without requiring provider H&P", () => {
    const doc = baseDoc();
    const review = reviewNursingAdmissionWithDomains(doc);
    expect(review.signed).toBe(false);
    expect(review.sections).toHaveLength(20);
    expect(review.sections.every((s) => s.sectionId !== ("PROVIDER_HP" as never))).toBe(true);
  });
});
