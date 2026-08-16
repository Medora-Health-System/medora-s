/**
 * MEDUI.D4B.2 — Enterprise nursing clinical workspace tests.
 */

import { describe, expect, it } from "vitest";
import {
  adaptNursingHandoffToEnterpriseClinicalDocument,
  adaptNursingReassessmentToEnterpriseClinicalDocument,
  buildEnterpriseNursingWorkspaceSummary,
  classifyEncounterTypeToNursingCareSetting,
  ENTERPRISE_NURSING_CLINICAL_WORKSPACE_CERTIFICATION_ID,
  ENTERPRISE_NURSING_DOCUMENT_TYPE_REGISTRY,
  isNursingDocumentTypeAllowedForCareSetting,
  NURSING_RAPID_REASSESSMENT_PANEL_IS_DURABLE,
  nursingDocumentEligibility,
  nursingWorkspaceSectionsForCareSetting,
  resolveNursingSectionAuthoritativeSource,
  resolveNursingWorkspaceSection,
  toClinicalDocumentationHubCareSetting,
} from "./enterpriseNursingClinicalWorkspaceD4b2.js";
import {
  assertDocumentIdentityImmutable,
  authorshipPreservedAfterReassignment,
  canTransitionEnterpriseClinicalDocumentLifecycle,
} from "./enterpriseClinicalDocumentFoundationD4b1.js";

describe("MEDUI.D4B.2 enterprise nursing clinical workspace", () => {
  it("exposes certification id and refuses independent lifecycle engine", () => {
    expect(ENTERPRISE_NURSING_CLINICAL_WORKSPACE_CERTIFICATION_ID).toContain("D4B2");
    const summary = buildEnterpriseNursingWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
    });
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentNursingLifecycleEngine).toBe(false);
    expect(NURSING_RAPID_REASSESSMENT_PANEL_IS_DURABLE).toBe(false);
  });

  it("filters sections by care setting", () => {
    const ed = nursingWorkspaceSectionsForCareSetting("EMERGENCY").map((s) => s.id);
    const ip = nursingWorkspaceSectionsForCareSetting("INPATIENT").map((s) => s.id);
    expect(ed).toContain("reassessment");
    expect(ed).not.toContain("admission");
    expect(ed).not.toContain("nutrition");
    expect(ip).toContain("admission");
    expect(ip).toContain("intakeOutput");
    expect(ip).toContain("nutrition");
  });

  it("INP.1B.6 resolves inpatient systems/reassessment authority to INP.1A (ED keeps ED engine)", () => {
    const systemsIp = nursingWorkspaceSectionsForCareSetting("INPATIENT").find((s) => s.id === "systems");
    const reassessmentIp = nursingWorkspaceSectionsForCareSetting("INPATIENT").find(
      (s) => s.id === "reassessment"
    );
    const systemsEd = nursingWorkspaceSectionsForCareSetting("EMERGENCY").find((s) => s.id === "systems");
    expect(systemsIp?.authoritativeSource).toBe("INPATIENT_NURSING_ASSESSMENT_V1");
    expect(reassessmentIp?.authoritativeSource).toBe("INPATIENT_NURSING_ASSESSMENT_V1");
    expect(systemsEd?.authoritativeSource).toBe("ED_REASSESSMENT_ENGINE");
    expect(
      resolveNursingSectionAuthoritativeSource(
        { id: "systems", authoritativeSource: "ED_REASSESSMENT_ENGINE" },
        "OBSERVATION"
      )
    ).toBe("ED_REASSESSMENT_ENGINE");
  });

  it("rejects prohibited care-setting combinations for admission", () => {
    expect(isNursingDocumentTypeAllowedForCareSetting("nursing.admission_assessment", "EMERGENCY")).toBe(
      false
    );
    expect(isNursingDocumentTypeAllowedForCareSetting("nursing.admission_assessment", "INPATIENT")).toBe(
      true
    );
    expect(isNursingDocumentTypeAllowedForCareSetting("nursing.pain_assessment", "EMERGENCY")).toBe(
      true
    );
  });

  it("preserves assignment≠authorization eligibility", () => {
    const elig = nursingDocumentEligibility({
      documentTypeId: "nursing.pain_assessment",
      careSetting: "INPATIENT",
      assignedUserId: "nurse-a",
      actorUserId: "nurse-b",
    });
    expect(elig.assignmentEqualsAuthorization).toBe(false);
    expect(elig.sameAssignedUser).toBe(false);
    expect(elig.typeKnown).toBe(true);
    expect(elig.careSettingAllowed).toBe(true);
  });

  it("projects admission + reassessment + handoff + nursing notes via D4B.1 adapters", () => {
    const summary = buildEnterpriseNursingWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      admission: {
        encounterId: "e1",
        patientId: "p1",
        facilityId: "f1",
        documentationStatus: "SIGNED",
        signedAt: "2026-07-26T12:00:00.000Z",
        signedByUserId: "n1",
        signedByDisplayName: "Nurse One",
      },
      reassessment: {
        encounterId: "e1",
        patientId: "p1",
        facilityId: "f1",
        hasContent: true,
        updatedAt: "2026-07-26T13:00:00.000Z",
        authorUserId: "n1",
        authorDisplayName: "Nurse One",
      },
      handoff: {
        encounterId: "e1",
        patientId: "p1",
        facilityId: "f1",
        signedAt: "2026-07-26T14:00:00.000Z",
        signerUserId: "n1",
        signerDisplayName: "Nurse One",
        historyCount: 2,
      },
      notes: [
        {
          id: "note1",
          encounterId: "e1",
          patientId: "p1",
          facilityId: "f1",
          noteType: "NURSING",
          body: "Shift note",
          authorUserId: "n1",
          authorDisplayName: "Nurse One",
          authorRoleTitle: "RN",
          createdAt: "2026-07-26T15:00:00.000Z",
        },
        {
          id: "note2",
          encounterId: "e1",
          patientId: "p1",
          facilityId: "f1",
          noteType: "PROVIDER",
          body: "Provider note excluded",
          authorUserId: "d1",
          authorDisplayName: "Dr",
          authorRoleTitle: "MD",
          createdAt: "2026-07-26T15:05:00.000Z",
        },
      ],
      edocEntries: [
        {
          id: "edoc1",
          facilityId: "f1",
          encounterId: "e1",
          patientId: "p1",
          category: "PAIN_ASSESSMENT",
          cardId: "pain_numeric",
          payloadJson: { score: 4 },
          authorUserId: "n1",
          authorDisplayNameSnapshot: "Nurse One",
          authorRoleSnapshot: "RN",
          createdAt: "2026-07-26T16:00:00.000Z",
        },
      ],
    });

    expect(summary.documents.length).toBe(5); // admission + reassessment + handoff + 1 nursing note + 1 edoc
    expect(summary.documents.some((d) => d.documentTypeId === "nursing.admission_assessment")).toBe(
      true
    );
    expect(summary.documents.some((d) => d.documentTypeId === "nursing.reassessment")).toBe(true);
    expect(summary.documents.some((d) => d.documentTypeId === "nursing.handoff")).toBe(true);
    expect(summary.documents.some((d) => d.documentTypeId === "encounter_note.nursing")).toBe(true);
    expect(summary.documents.some((d) => d.sourceArchitecture === "EDOC_ENTRY")).toBe(true);
    expect(summary.nursingDocumentTypeCount).toBe(ENTERPRISE_NURSING_DOCUMENT_TYPE_REGISTRY.length);
  });

  it("reuses D4B.1 lifecycle rules (no silent signed mutation path)", () => {
    expect(canTransitionEnterpriseClinicalDocumentLifecycle("SIGNED", "START_EDIT", "IN_PROGRESS")).toBe(
      false
    );
    expect(
      authorshipPreservedAfterReassignment({
        authorUserId: "n1",
        signerUserId: "n1",
        priorAssignedUserId: "n1",
        newAssignedUserId: "n2",
      }).authorUnchanged
    ).toBe(true);
    expect(
      assertDocumentIdentityImmutable({
        originalPatientId: "p1",
        originalEncounterId: "e1",
        proposedPatientId: "p1",
        proposedEncounterId: "e2",
      })
    ).toEqual({ ok: false, reason: "ENCOUNTER_REASSIGNMENT" });
  });

  it("marks reassessment late-entry and handoff signature states", () => {
    const reassessment = adaptNursingReassessmentToEnterpriseClinicalDocument({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      hasContent: true,
      lateEntryLabeled: true,
    });
    expect(reassessment.lineage.lateEntryLabeled).toBe(true);
    expect(reassessment.lifecycleState).toBe("IN_PROGRESS");

    const unsigned = adaptNursingHandoffToEnterpriseClinicalDocument({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
    });
    expect(unsigned.lifecycleState).toBe("DRAFT");
    expect(unsigned.completeness.signatureReady).toBe(true);
  });

  it("resolves section aliases and encounter type classifiers", () => {
    expect(resolveNursingWorkspaceSection("fall-mobility")).toBe("fallMobility");
    expect(resolveNursingWorkspaceSection("notes")).toBe("documentationHistory");
    expect(classifyEncounterTypeToNursingCareSetting("ER")).toBe("EMERGENCY");
    expect(classifyEncounterTypeToNursingCareSetting("OBSERVATION")).toBe("OBSERVATION");
    expect(toClinicalDocumentationHubCareSetting("EMERGENCY")).toBe("ED");
  });
});
