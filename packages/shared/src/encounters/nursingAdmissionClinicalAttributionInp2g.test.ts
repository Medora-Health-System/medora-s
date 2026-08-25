import { describe, expect, it } from "vitest";
import {
  formatNursingAdmissionAttributionClinician,
  projectNursingAdmissionClinicalAttribution,
  resolveNursingAdmissionCompletionTimestamp,
} from "./nursingAdmissionClinicalAttributionInp2g.js";
import { emptyMedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import type { NursingAdmissionAmendmentV1 } from "./nursingAdmissionDomainIntegrationD4a25a.js";

describe("nursingAdmissionClinicalAttributionInp2g", () => {
  it("projects Completed by and Signed by from owner + signature without UUIDs", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "pat-1",
      facilityId: "fac-1",
      encounterId: "enc-1",
      nowIso: "2026-08-18T18:00:00.000Z",
    });
    doc.documentOwnerUserId = "rn-a";
    doc.clinicalDocumentedAt = null;
    doc.sections = {
      OVERVIEW: {
        sectionId: "OVERVIEW",
        completionState: "COMPLETE",
        expectedVersion: 1,
        answers: { admissionSource: "ED" },
        updatedAt: "2026-08-18T18:08:00.000Z",
        updatedByUserId: "rn-a",
      },
    };
    doc.nurseSignature = {
      signed: true,
      signedAt: "2026-08-18T18:11:00.000Z",
      signedByUserId: "rn-a",
      displayName: "Elizabeth Posada",
      credentials: "RN",
    };

    const attr = projectNursingAdmissionClinicalAttribution(doc);
    expect(formatNursingAdmissionAttributionClinician(attr.completed)).toBe(
      "Elizabeth Posada, RN"
    );
    expect(formatNursingAdmissionAttributionClinician(attr.signed)).toBe(
      "Elizabeth Posada, RN"
    );
    expect(attr.completed.atIso).toBe("2026-08-18T18:08:00.000Z");
    expect(attr.signed.atIso).toBe("2026-08-18T18:11:00.000Z");
    expect(attr.completed.displayName).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("preserves original completion/signature clocks after owner correction", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "pat-1",
      facilityId: "fac-1",
      encounterId: "enc-1",
      nowIso: "2026-08-18T18:00:00.000Z",
    });
    doc.documentOwnerUserId = "rn-a";
    doc.clinicalDocumentedAt = "2026-08-18T18:08:00.000Z";
    doc.sections = {
      OVERVIEW: {
        sectionId: "OVERVIEW",
        completionState: "COMPLETE",
        expectedVersion: 2,
        answers: { admissionSource: "ED-UPDATED" },
        updatedAt: "2026-08-23T13:42:00.000Z",
        updatedByUserId: "rn-a",
      },
    };
    doc.nurseSignature = {
      signed: true,
      signedAt: "2026-08-18T18:11:00.000Z",
      signedByUserId: "rn-a",
      displayName: "Elizabeth Posada",
      credentials: "RN",
    };
    const amendment: NursingAdmissionAmendmentV1 = {
      amendmentId: "am-1",
      clientRequestId: "c1",
      type: "CORRECTION",
      reason: "Documentation error",
      createdAt: "2026-08-23T13:42:00.000Z",
      createdByUserId: "rn-a",
      credentials: "RN",
      documentRevisionAtCreate: 4,
      amendmentVersion: 1,
    };
    doc.amendments = [amendment];

    const attr = projectNursingAdmissionClinicalAttribution(doc);
    expect(attr.completed.atIso).toBe("2026-08-18T18:08:00.000Z");
    expect(attr.signed.atIso).toBe("2026-08-18T18:11:00.000Z");
    expect(formatNursingAdmissionAttributionClinician(attr.latestCorrection!)).toBe(
      "Elizabeth Posada, RN"
    );
    expect(attr.latestCorrection?.atIso).toBe("2026-08-23T13:42:00.000Z");
  });

  it("does not invent completion display for a foreign owner without a label", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "pat-1",
      facilityId: "fac-1",
      encounterId: "enc-1",
    });
    doc.documentOwnerUserId = "rn-other";
    doc.nurseSignature = {
      signed: true,
      signedAt: "2026-08-18T18:11:00.000Z",
      signedByUserId: "rn-a",
      displayName: "Elizabeth Posada",
      credentials: "RN",
    };
    const attr = projectNursingAdmissionClinicalAttribution(doc);
    expect(attr.completed.userId).toBe("rn-other");
    expect(attr.completed.displayName).toBeNull();
    expect(attr.signed.displayName).toBe("Elizabeth Posada");
  });

  it("resolveNursingAdmissionCompletionTimestamp prefers clinicalDocumentedAt", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "pat-1",
      facilityId: "fac-1",
      encounterId: "enc-1",
    });
    doc.clinicalDocumentedAt = "2026-08-18T17:00:00.000Z";
    expect(resolveNursingAdmissionCompletionTimestamp(doc)).toBe(
      "2026-08-18T17:00:00.000Z"
    );
  });
});
