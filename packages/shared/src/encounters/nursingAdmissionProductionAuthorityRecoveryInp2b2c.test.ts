import { describe, expect, it } from "vitest";
import { getClinicalDocumentationCardById } from "../clinicalDocumentation/clinicalDocumentationRegistry.js";
import { INPATIENT_ADMISSION_CLINICAL_SECTIONS } from "./connectedInpatientAdmissionIntakeD4a0.js";
import {
  fieldIsVisible,
  NURSING_ADMISSION_OPTION_CATALOGS,
  nursingSectionSchema,
  validateSectionAnswersForCompletion,
} from "./inpatientLifecycleNursingAdmissionD4a25.js";
import {
  computeAdmissionCompletionSummary,
  emptyMedSurgNursingAdmissionDocV1,
  saveAdmissionSectionDraft,
} from "./medSurgNursingAdmissionD4a1.js";
import { projectAuthoritativeSectionCompletion } from "./authoritativeDomainLinkageD4a26h.js";
import {
  linkNursingDomainReference,
  nursingDocDomainReferences,
  nursingSectionIntegration,
  projectNursingSectionCompletion,
} from "./nursingAdmissionDomainIntegrationD4a25a.js";
import { projectNursingAdmissionOverview } from "./nursingAdmissionOverviewProjectionInp2b.js";
import {
  buildNursingAdmissionWriteThrough,
  sectionNeedsAuthoritativeEdocWriteThrough,
} from "./nursingAdmissionAuthoritativeWriteThroughInp2b2b.js";
import type { InpatientAdmissionClinicalSection } from "./connectedInpatientAdmissionIntakeD4a0.js";
import type { NursingAdmissionDomainKey } from "./nursingAdmissionDomainIntegrationD4a25a.js";

const SECTION_LABEL: Record<InpatientAdmissionClinicalSection, string> = {
  OVERVIEW: "Arrival overview",
  SOURCE_ENCOUNTER_SUMMARY: "Source visit",
  IDENTITY_DEMOGRAPHICS: "Identity/demographics",
  NURSING_ADMISSION_ASSESSMENT: "Nursing admission assessment",
  PAIN: "Pain",
  FALL_SAFETY: "Fall/safety",
  MEDICAL_HISTORY: "Medical history",
  SURGICAL_HISTORY: "Surgical history",
  HOME_MEDICATIONS: "Home medications",
  ALLERGIES: "Allergies",
  SOCIAL_HISTORY: "Social history",
  BELONGINGS_VALUABLES: "Belongings",
  SKIN_WOUND: "Skin/wound",
  LINES_DRAINS_DEVICES: "Lines/drains/devices",
  FUNCTIONAL_MOBILITY: "Functional/mobility",
  NUTRITION: "Nutrition",
  ELIMINATION: "Elimination",
  PSYCHOSOCIAL: "Psychosocial",
  EDUCATION_COMMUNICATION: "Education/communication",
  PROVIDER_ADMISSION: "Review/handoff",
};

const WRITE_THROUGH_OVERLAY: Partial<
  Record<InpatientAdmissionClinicalSection, Record<string, unknown>>
> = {
  PAIN: { painPresent: "NO", rapidPainPresence: "NO_PAIN" },
  FALL_SAFETY: { rapidFallPrecautions: ["CALL_LIGHT", "NONSKID"] },
  SKIN_WOUND: { rapidSkinStatus: "INTACT", pressureInjury: "NO", openWound: "NO" },
  BELONGINGS_VALUABLES: {
    rapidBelongingsPresent: "YES",
    inventoryReviewed: "YES",
    valuablesPresent: "NO",
  },
  EDUCATION_COMMUNICATION: { teachBack: "YES" },
  HOME_MEDICATIONS: { reconComplete: "YES", homeMedVerificationAction: "CONFIRMED" },
  MEDICAL_HISTORY: { historyReviewComplete: "YES", historyVerificationAction: "CONFIRMED" },
  SURGICAL_HISTORY: { surgicalReviewComplete: "YES", surgicalVerificationAction: "CONFIRMED" },
  ALLERGIES: { allergyReviewComplete: "YES", allergyVerificationAction: "CONFIRMED" },
};

function defaultFieldValue(control: string, optionsKey?: string): unknown {
  if (control === "yes_no_unknown" || control === "presentAbsentUnable") {
    return (NURSING_ADMISSION_OPTION_CATALOGS[optionsKey ?? "yesNoUnknown"] ?? ["YES"])[0];
  }
  if (control === "datetime") return "2026-08-19T12:00:00.000Z";
  if (control === "date") return "2026-08-19";
  if (control === "number") return 0;
  if (control === "checkbox") return true;
  if (control === "multiselect") {
    const opts = optionsKey ? NURSING_ADMISSION_OPTION_CATALOGS[optionsKey] : undefined;
    return [opts?.[0] ?? "NONE"];
  }
  if (control === "select" || control === "radio") {
    const opts = optionsKey ? NURSING_ADMISSION_OPTION_CATALOGS[optionsKey] : undefined;
    return opts?.[0] ?? "OTHER";
  }
  return "documented";
}

function fillCompleteAnswers(sectionId: InpatientAdmissionClinicalSection): Record<string, unknown> {
  const schema = nursingSectionSchema(sectionId);
  const answers: Record<string, unknown> = { ...(WRITE_THROUGH_OVERLAY[sectionId] ?? {}) };
  for (let pass = 0; pass < 5; pass += 1) {
    for (const field of schema.fields) {
      if (!fieldIsVisible(field, answers)) continue;
      const need =
        field.required === true ||
        (field.requiredWhen != null &&
          field.requiredWhen.values.includes(String(answers[field.requiredWhen.field] ?? "")));
      if (!need) continue;
      const raw = answers[field.key];
      const empty = raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0);
      if (!empty) continue;
      answers[field.key] = defaultFieldValue(field.control, field.optionsKey);
    }
  }
  return answers;
}

function uuidFor(sectionId: InpatientAdmissionClinicalSection): string {
  const n = INPATIENT_ADMISSION_CLINICAL_SECTIONS.indexOf(sectionId) + 1;
  return `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
}

function emptyDoc() {
  return emptyMedSurgNursingAdmissionDocV1({
    patientId: "pat-1",
    facilityId: "fac-1",
    encounterId: "enc-1",
  });
}

function projectComplete(doc: ReturnType<typeof emptyDoc>, sectionId: InpatientAdmissionClinicalSection) {
  return projectAuthoritativeSectionCompletion({
    doc,
    sectionId,
    expectedEncounterId: "enc-1",
    expectedPatientId: "pat-1",
    expectedFacilityId: "fac-1",
    resolvedByRecordId: Object.fromEntries(
      nursingDocDomainReferences(doc).map((ref) => [
        ref.recordId,
        {
          id: ref.recordId,
          facilityId: "fac-1",
          encounterId: "enc-1",
          patientId: "pat-1",
          category: "OBSERVATION_DOCUMENTATION",
          cardId: nursingSectionIntegration(sectionId).edocFocusedCardId ?? "pain_initial_assessment",
          createdAt: "2026-08-19T12:00:00.000Z",
          voidedAt: null,
          authorUserId: "rn-1",
          authorDisplayName: "RN",
        },
      ])
    ),
  });
}

describe("MEDUI.INP.2B.2C nursing admission production authority recovery", () => {
  it("covers all 20 checklist sections", () => {
    expect(INPATIENT_ADMISSION_CLINICAL_SECTIONS).toHaveLength(20);
    for (const id of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
      expect(SECTION_LABEL[id]).toBeTruthy();
    }
  });

  it.each([...INPATIENT_ADMISSION_CLINICAL_SECTIONS])(
    "%s — DRAFT, Save draft, Save and Continue, COMPLETE, N/A, Unable, reload, progress, no duplicate refs",
    (sectionId) => {
      const answers = fillCompleteAnswers(sectionId);
      const valid = validateSectionAnswersForCompletion({
        sectionId,
        answers,
        completionState: "COMPLETE",
      });
      expect(valid.ok).toBe(true);

      let doc = emptyDoc();
      const draft = saveAdmissionSectionDraft({
        doc,
        sectionId,
        answers,
        completionState: "IN_PROGRESS",
        clientExpectedVersion: doc.expectedVersion,
        actorUserId: "rn-1",
      });
      expect(draft.ok).toBe(true);
      if (!draft.ok) return;
      expect(draft.doc.sections[sectionId]?.completionState).toBe("IN_PROGRESS");
      expect(draft.doc.sections[sectionId]?.answers).toEqual(answers);
      doc = draft.doc;

      const continueSave = saveAdmissionSectionDraft({
        doc,
        sectionId,
        answers,
        completionState: "COMPLETE",
        clientExpectedVersion: doc.expectedVersion,
        actorUserId: "rn-1",
      });
      expect(continueSave.ok).toBe(true);
      if (!continueSave.ok) return;
      doc = continueSave.doc;

      const integration = nursingSectionIntegration(sectionId);
      const projection = projectNursingSectionCompletion({ doc, sectionId });
      const needsEdoc = sectionNeedsAuthoritativeEdocWriteThrough(sectionId);
      if (needsEdoc) {
        expect(projection.requiresDomainRecord).toBe(true);
        expect(projection.projectedState).not.toBe("COMPLETE");
        const plan = buildNursingAdmissionWriteThrough({ sectionId, answers });
        expect(plan.ok).toBe(true);
        if (!plan.ok || plan.skip) throw new Error(`${sectionId} expected write-through`);
        expect(getClinicalDocumentationCardById(plan.cardId)).toBeTruthy();
        const linked = linkNursingDomainReference({
          doc,
          clientExpectedVersion: doc.expectedVersion,
          actorUserId: "rn-1",
          reference: {
            domain: plan.domain,
            recordId: uuidFor(sectionId),
            status: "LINKED",
            sectionId,
          },
        });
        expect(linked.ok).toBe(true);
        if (!linked.ok) return;
        const retry = linkNursingDomainReference({
          doc: linked.doc,
          clientExpectedVersion: linked.doc.expectedVersion,
          actorUserId: "rn-1",
          reference: {
            domain: plan.domain,
            recordId: uuidFor(sectionId),
            status: "LINKED",
            sectionId,
          },
        });
        expect(retry.ok).toBe(true);
        if (!retry.ok) return;
        expect(nursingDocDomainReferences(retry.doc)).toHaveLength(1);
        doc = {
          ...retry.doc,
          sections: {
            ...retry.doc.sections,
            [sectionId]: { ...retry.doc.sections[sectionId]!, completionState: "COMPLETE" },
          },
        };
        const authoritative = projectComplete(doc, sectionId);
        expect(authoritative.requiresDomainRecord).toBe(true);
        expect(authoritative.authoritativeLinkedCount).toBe(1);
        expect(authoritative.projectedState).toBe("COMPLETE");
      } else {
        expect(projection.requiresDomainRecord).toBe(false);
        expect(["VERIFY_AND_UPDATE", "ADMISSION_ONLY", "READ_ONLY_PROJECTION"]).toContain(
          integration.writeMode
        );
        const authoritative = projectComplete(doc, sectionId);
        expect(authoritative.authoritativeLinkedCount).toBe(0);
        expect(authoritative.requiresDomainRecord).toBe(false);
      }

      const reloaded = JSON.parse(JSON.stringify(doc)) as typeof doc;
      expect(reloaded.sections[sectionId]?.answers).toEqual(answers);
      expect(reloaded.sections[sectionId]?.completionState).toBe("COMPLETE");

      const na = saveAdmissionSectionDraft({
        doc: emptyDoc(),
        sectionId,
        completionState: "NOT_APPLICABLE",
        clientExpectedVersion: 0,
        actorUserId: "rn-1",
      });
      expect(na.ok).toBe(true);
      if (na.ok) expect(na.doc.sections[sectionId]?.completionState).toBe("NOT_APPLICABLE");

      const unableBad = validateSectionAnswersForCompletion({
        sectionId,
        answers: {},
        completionState: "UNABLE_TO_COMPLETE",
        unableReason: "",
      });
      expect(unableBad.ok).toBe(false);
      const unable = saveAdmissionSectionDraft({
        doc: emptyDoc(),
        sectionId,
        completionState: "UNABLE_TO_COMPLETE",
        unableReason: "Patient off unit",
        clientExpectedVersion: 0,
        actorUserId: "rn-1",
      });
      expect(unable.ok).toBe(true);
      if (unable.ok) expect(unable.doc.sections[sectionId]?.completionState).toBe("UNABLE_TO_COMPLETE");
    }
  );

  it("advances resolved progress 0 → 20 without fabricating Morse or urinary-device cards", () => {
    let doc = emptyDoc();
    expect(computeAdmissionCompletionSummary(doc).resolved).toBe(0);
    for (const sectionId of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
      const answers = fillCompleteAnswers(sectionId);
      const saved = saveAdmissionSectionDraft({
        doc,
        sectionId,
        answers,
        completionState: "COMPLETE",
        clientExpectedVersion: doc.expectedVersion,
        actorUserId: "rn-1",
      });
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;
      doc = saved.doc;
      if (sectionNeedsAuthoritativeEdocWriteThrough(sectionId)) {
        const plan = buildNursingAdmissionWriteThrough({ sectionId, answers });
        expect(plan.ok && !plan.skip).toBe(true);
        if (!plan.ok || plan.skip) return;
        expect(plan.cardId).not.toBe("morse_fall_risk_assessment");
        expect(plan.cardId).not.toBe("external_urinary_device_monitoring");
        const linked = linkNursingDomainReference({
          doc,
          clientExpectedVersion: doc.expectedVersion,
          actorUserId: "rn-1",
          reference: {
            domain: plan.domain as NursingAdmissionDomainKey,
            recordId: uuidFor(sectionId),
            status: "LINKED",
            sectionId,
          },
        });
        expect(linked.ok).toBe(true);
        if (!linked.ok) return;
        doc = linked.doc;
      }
    }
    expect(computeAdmissionCompletionSummary(doc).resolved).toBe(20);
    expect(projectNursingAdmissionOverview(doc).resolvedCount).toBe(20);
  });

  it("keeps 409 optimistic locking when the client version is stale", () => {
    const doc = emptyDoc();
    const conflict = saveAdmissionSectionDraft({
      doc,
      sectionId: "OVERVIEW",
      answers: fillCompleteAnswers("OVERVIEW"),
      completionState: "IN_PROGRESS",
      clientExpectedVersion: doc.expectedVersion + 1,
      actorUserId: "rn-1",
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.code).toBe("EXPECTED_VERSION_CONFLICT");
  });

  it("does not invent NKDA from an empty allergy array and does not require EDOC for home-med review", () => {
    expect(nursingSectionIntegration("ALLERGIES").writeMode).toBe("VERIFY_AND_UPDATE");
    expect(nursingSectionIntegration("HOME_MEDICATIONS").writeMode).toBe("VERIFY_AND_UPDATE");
    expect(sectionNeedsAuthoritativeEdocWriteThrough("HOME_MEDICATIONS")).toBe(false);
    const emptyAllergyDoc = emptyDoc();
    expect(emptyAllergyDoc.preloadedItems ?? []).toEqual([]);
    const projection = projectNursingSectionCompletion({
      doc: {
        ...emptyAllergyDoc,
        sections: {
          ...emptyAllergyDoc.sections,
          ALLERGIES: {
            sectionId: "ALLERGIES",
            completionState: "COMPLETE",
            expectedVersion: 1,
            answers: { allergyReviewComplete: "YES" },
          },
        },
      },
      sectionId: "ALLERGIES",
    });
    expect(projection.requiresDomainRecord).toBe(false);
  });
});
