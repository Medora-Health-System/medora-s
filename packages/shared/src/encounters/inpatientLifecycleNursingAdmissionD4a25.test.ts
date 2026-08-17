import { describe, expect, it } from "vitest";
import {
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
} from "./connectedInpatientAdmissionIntakeD4a0.js";
import {
  INPATIENT_LIFECYCLE_NURSING_ADMISSION_CERTIFICATION_ID,
  NURSING_ADMISSION_SECTION_SCHEMAS,
  allNursingSectionSchemas,
  emptyInpatientLifecycleMeta,
  fieldIsVisible,
  mergeInpatientLifecycleMeta,
  nursingAdmissionAttestationText,
  openingSectionMustNotAutoDocumentFindings,
  readInpatientLifecycleMeta,
  validateSectionAnswersForCompletion,
} from "./inpatientLifecycleNursingAdmissionD4a25.js";
import {
  emptyMedSurgNursingAdmissionDocV1,
  saveAdmissionSectionDraft,
} from "./medSurgNursingAdmissionD4a1.js";

describe("D4A.2.5 nursing section schemas", () => {
  it("defines structured schemas for all 20 checklist sections", () => {
    expect(allNursingSectionSchemas()).toHaveLength(20);
    for (const id of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
      const schema = NURSING_ADMISSION_SECTION_SCHEMAS[id];
      expect(schema.sectionId).toBe(id);
      expect(schema.fields.length).toBeGreaterThan(0);
      expect(schema.helpKey).toContain(id);
    }
  });

  it("does not auto-document findings on open", () => {
    expect(openingSectionMustNotAutoDocumentFindings()).toBe(true);
  });

  it("requires pain scale/score/location when pain present and COMPLETE", () => {
    const bad = validateSectionAnswersForCompletion({
      sectionId: "PAIN",
      answers: { painPresent: "YES" },
      completionState: "COMPLETE",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.missing).toEqual(expect.arrayContaining(["painScale", "score", "location"]));
    }

    const good = validateSectionAnswersForCompletion({
      sectionId: "PAIN",
      answers: {
        painPresent: "YES",
        painScale: "NUMERIC_0_10",
        score: 4,
        location: "Abdomen",
      },
      completionState: "COMPLETE",
    });
    expect(good.ok).toBe(true);
  });

  it("requires unableReason for UNABLE_TO_COMPLETE", () => {
    const bad = validateSectionAnswersForCompletion({
      sectionId: "FALL_SAFETY",
      answers: {},
      completionState: "UNABLE_TO_COMPLETE",
      unableReason: "",
    });
    expect(bad.ok).toBe(false);
  });

  it("hides conditional fields until parent matches", () => {
    const schema = NURSING_ADMISSION_SECTION_SCHEMAS.PAIN;
    const score = schema.fields.find((f) => f.key === "score")!;
    expect(fieldIsVisible(score, { painPresent: "NO" })).toBe(false);
    expect(fieldIsVisible(score, { painPresent: "YES" })).toBe(true);
  });

  it("persists structured answers on section draft without inventing defaults", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    expect(doc.sections.OVERVIEW?.answers).toBeUndefined();
    const saved = saveAdmissionSectionDraft({
      doc,
      sectionId: "OVERVIEW",
      answers: { modeOfArrival: "AMBULATORY", conditionOnArrival: "STABLE" },
      clientExpectedVersion: 0,
      actorUserId: "rn-1",
    });
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.doc.sections.OVERVIEW?.answers?.modeOfArrival).toBe("AMBULATORY");
      expect(saved.doc.sections.OVERVIEW?.answers?.painPresent).toBeUndefined();
    }
  });

  it("blocks silent overwrite after signature", () => {
    let doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    doc = {
      ...doc,
      nurseSignature: { signed: true, signedAt: new Date().toISOString(), signedByUserId: "rn-1" },
    };
    const saved = saveAdmissionSectionDraft({
      doc,
      sectionId: "OVERVIEW",
      answers: { modeOfArrival: "EMS" },
      clientExpectedVersion: doc.expectedVersion,
      actorUserId: "rn-1",
    });
    expect(saved.ok).toBe(false);
    if (!saved.ok) expect(saved.code).toBe("NURSING_ADMISSION_ALREADY_SIGNED");
  });

  it("INP.2B.1 keeps clinicalDocumentedAt distinct from server updatedAt and does not wipe other sections", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
      nowIso: "2026-08-17T19:00:00.000Z",
    });
    const first = saveAdmissionSectionDraft({
      doc,
      sectionId: "OVERVIEW",
      answers: { admissionSource: "EMERGENCY_DEPARTMENT" },
      clientExpectedVersion: 0,
      actorUserId: "rn-1",
      atIso: "2026-08-17T19:04:52.000Z",
      clinicalDocumentedAt: "2026-08-17T17:04:00.000Z",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.doc.clinicalDocumentedAt).toBe("2026-08-17T17:04:00.000Z");
    expect(first.doc.updatedAt).toBe("2026-08-17T19:04:52.000Z");
    expect(first.doc.clinicalDocumentedAt).not.toBe(first.doc.updatedAt);
    const second = saveAdmissionSectionDraft({
      doc: first.doc,
      sectionId: "PAIN",
      answers: { painPresent: "NO" },
      clientExpectedVersion: first.doc.expectedVersion,
      actorUserId: "rn-1",
      atIso: "2026-08-17T19:10:00.000Z",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.doc.sections.OVERVIEW?.answers?.admissionSource).toBe("EMERGENCY_DEPARTMENT");
    expect(second.doc.sections.PAIN?.answers?.painPresent).toBe("NO");
    expect(second.doc.clinicalDocumentedAt).toBe("2026-08-17T17:04:00.000Z");
    expect(second.doc.updatedAt).toBe("2026-08-17T19:10:00.000Z");
  });

  it("keeps lifecycle meta additive and never hard-deletes", () => {
    const meta = emptyInpatientLifecycleMeta();
    meta.voidedAt = new Date().toISOString();
    meta.voidReason = "Created in error";
    const summary = mergeInpatientLifecycleMeta({}, meta);
    expect(readInpatientLifecycleMeta(summary)?.voidReason).toBe("Created in error");
    expect(INPATIENT_LIFECYCLE_NURSING_ADMISSION_CERTIFICATION_ID).toContain("D4A2_5");
  });

  it("provides EN/FR attestation parity", () => {
    expect(nursingAdmissionAttestationText("en")).toMatch(/attest/i);
    expect(nursingAdmissionAttestationText("fr")).toMatch(/atteste/i);
  });
});
