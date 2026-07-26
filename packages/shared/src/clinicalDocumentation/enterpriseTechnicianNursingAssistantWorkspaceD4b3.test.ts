/**
 * MEDUI.D4B.3 — Enterprise technician / nursing-assistant workspace tests.
 */

import { describe, expect, it } from "vitest";
import {
  adaptTechnicianObservationNoteProjection,
  buildEnterpriseTechnicianWorkspaceSummary,
  ENTERPRISE_TECHNICIAN_ACTIVITY_REGISTRY,
  ENTERPRISE_TECHNICIAN_NA_WORKSPACE_CERTIFICATION_ID,
  filterTasksBySection,
  isTechnicianCapabilityProhibited,
  nursingReviewPreservesTechnicianPerformer,
  projectTechnicianTasksToOperationalProjections,
  projectTechnicianVitalsContribution,
  resolveTechnicianRoleProfile,
  resolveTechnicianWorkspaceSection,
  technicianActivityEligibility,
  technicianPerformerPreservedAfterReassignment,
  technicianWorkspaceSectionsForCareSetting,
} from "./enterpriseTechnicianNursingAssistantWorkspaceD4b3.js";
import { authorshipPreservedAfterReassignment } from "./enterpriseClinicalDocumentFoundationD4b1.js";
import { defaultEncounterNoteTypeForRole } from "../encounters/encounterNote.js";

describe("MEDUI.D4B.3 enterprise technician / nursing-assistant workspace", () => {
  it("exposes certification id and refuses independent lifecycle / nursing masquerade", () => {
    expect(ENTERPRISE_TECHNICIAN_NA_WORKSPACE_CERTIFICATION_ID).toContain("D4B3");
    const summary = buildEnterpriseTechnicianWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      roleProfile: "PATIENT_CARE_TECH",
    });
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentTechnicianLifecycleEngine).toBe(false);
    expect(summary.masqueradesAsNursingAssessment).toBe(false);
  });

  it("filters sections by care setting and capability profile", () => {
    const ed = technicianWorkspaceSectionsForCareSetting("EMERGENCY", {
      roleProfile: "ED_TECHNICIAN",
    }).map((s) => s.id);
    const ip = technicianWorkspaceSectionsForCareSetting("INPATIENT", {
      roleProfile: "PATIENT_CARE_TECH",
    }).map((s) => s.id);
    expect(ed).toContain("vitalSigns");
    expect(ed).toContain("specimenCollection");
    expect(ed).not.toContain("adlAssistance");
    expect(ip).toContain("adlAssistance");
    expect(ip).toContain("intakeOutput");
    expect(ip).toContain("repositioning");
  });

  it("selects smallest coherent activity registry without inventing deferred types as live", () => {
    const selected = ENTERPRISE_TECHNICIAN_ACTIVITY_REGISTRY.filter((a) => a.selectedInD4b3).map(
      (a) => a.activityId
    );
    expect(selected).toContain("TECH_VITALS_ACQUISITION");
    expect(selected).toContain("TECH_INTAKE_OUTPUT_ENTRY");
    expect(selected).not.toContain("TECH_SITTER_OBSERVATION");
    expect(selected).not.toContain("TECH_HANDOFF");
    expect(selected).not.toContain("TECH_POCT_PERFORMANCE");
  });

  it("keeps assignment≠authorization and prohibits nursing assessment capability", () => {
    const elig = technicianActivityEligibility({
      activityId: "TECH_VITALS_ACQUISITION",
      careSetting: "INPATIENT",
      roleProfile: "PATIENT_CARE_TECH",
      assignedUserId: "tech-a",
      actorUserId: "tech-b",
    });
    expect(elig.assignmentEqualsAuthorization).toBe(false);
    expect(elig.prohibitedAsNursingAssessment).toBe(true);
    expect(elig.sameAssignedUser).toBe(false);
    expect(isTechnicianCapabilityProhibited("nursing_assessment_author")).toBe(true);
    expect(isTechnicianCapabilityProhibited("ecg_interpretation")).toBe(true);
  });

  it("resolves role profiles and PCT note type", () => {
    expect(resolveTechnicianRoleProfile(["PATIENT_CARE_TECH"])).toBe("PATIENT_CARE_TECH");
    expect(resolveTechnicianRoleProfile(["LAB"])).toBe("LAB_TECHNICIAN");
    expect(defaultEncounterNoteTypeForRole("PATIENT_CARE_TECH")).toBe("TECHNICIAN");
  });

  it("projects operational tasks without converting them to clinical documents", () => {
    const tasks = projectTechnicianTasksToOperationalProjections({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      tasks: [
        {
          taskId: "t1",
          type: "VITAL_SIGNS",
          title: "q4h vitals",
          status: "COMPLETED",
          encounterId: "e1",
          performerUserId: "tech-1",
          rnValidationRequired: true,
          rnValidatedAt: "2026-07-26T12:00:00.000Z",
          rnValidatedByUserId: "rn-1",
          escalationRequired: false,
          createdAt: "2026-07-26T10:00:00.000Z",
          completedAt: "2026-07-26T11:00:00.000Z",
        },
      ],
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.kind).toBe("OPERATIONAL_TASK");
    expect(tasks[0]?.isNursingAssessment).toBe(false);
    expect(tasks[0]?.performerUserId).toBe("tech-1");
    expect(tasks[0]?.rnValidatedByUserId).toBe("rn-1");
  });

  it("preserves technician performer after nursing review and reassignment", () => {
    expect(
      nursingReviewPreservesTechnicianPerformer({
        technicianPerformerUserId: "tech-1",
        nurseReviewerUserId: "rn-1",
        storedPerformerUserId: "tech-1",
      })
    ).toBe(true);
    expect(
      technicianPerformerPreservedAfterReassignment({
        originalPerformerUserId: "tech-1",
        newAssigneeUserId: "tech-2",
        recordedPerformerUserId: "tech-1",
      })
    ).toBe(true);
    expect(
      authorshipPreservedAfterReassignment({
        authorUserId: "tech-1",
        signerUserId: "tech-1",
        priorAssignedUserId: "tech-1",
        newAssignedUserId: "tech-2",
      }).authorUnchanged
    ).toBe(true);
  });

  it("projects vitals contributions as technician observations for nursing visibility", () => {
    const contrib = projectTechnicianVitalsContribution({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      recordedAt: "2026-07-26T11:00:00.000Z",
      performerUserId: "tech-1",
      performerDisplayName: "Tech One",
    });
    expect(contrib.discipline).toBe("TECHNICIAN");
    expect(contrib.isNursingAssessment).toBe(false);
    expect(contrib.nursingVisible).toBe(true);
  });

  it("adapts technician notes through D4B.1-compatible projection", () => {
    const doc = adaptTechnicianObservationNoteProjection({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      noteId: "n1",
      body: "Patient refused ambulation; nurse notified.",
      authorUserId: "tech-1",
      authorDisplayName: "Tech One",
      createdAt: "2026-07-26T11:30:00.000Z",
      careSetting: "INPATIENT",
    });
    expect(doc.discipline).toBe("TECHNICIAN");
    expect(doc.documentTypeId).toBe("encounter_note.technician");
    expect(doc.author.userId).toBe("tech-1");
  });

  it("builds workspace summary with technician notes only (not nursing notes)", () => {
    const summary = buildEnterpriseTechnicianWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      roleProfile: "PATIENT_CARE_TECH",
      notes: [
        {
          id: "n-tech",
          encounterId: "e1",
          patientId: "p1",
          facilityId: "f1",
          noteType: "TECHNICIAN",
          body: "Assisted with meal intake.",
          authorUserId: "tech-1",
          authorDisplayName: "Tech",
          authorRoleTitle: "TECHNICIAN",
          createdAt: "2026-07-26T12:00:00.000Z",
        },
        {
          id: "n-rn",
          encounterId: "e1",
          patientId: "p1",
          facilityId: "f1",
          noteType: "NURSING",
          body: "Nursing assessment note",
          authorUserId: "rn-1",
          authorDisplayName: "Nurse",
          authorRoleTitle: "NURSING",
          createdAt: "2026-07-26T12:05:00.000Z",
        },
      ],
    });
    expect(summary.documents).toHaveLength(1);
    expect(summary.documents[0]?.documentTypeId).toBe("encounter_note.technician");
  });

  it("filters tasks by section", () => {
    const tasks = [
      {
        taskId: "t1",
        type: "AMBULATION" as const,
        title: "Walk",
        status: "ASSIGNED" as const,
        encounterId: "e1",
        rnValidationRequired: false,
        escalationRequired: false,
        createdAt: "2026-07-26T10:00:00.000Z",
        dueAt: "2026-07-26T09:00:00.000Z",
      },
      {
        taskId: "t2",
        type: "HYGIENE" as const,
        title: "Bath",
        status: "COMPLETED" as const,
        encounterId: "e1",
        rnValidationRequired: false,
        escalationRequired: false,
        createdAt: "2026-07-26T10:00:00.000Z",
        completedAt: "2026-07-26T11:00:00.000Z",
      },
    ];
    expect(filterTasksBySection(tasks, "mobilityTransfers").map((t) => t.taskId)).toEqual(["t1"]);
    expect(filterTasksBySection(tasks, "completedWork").map((t) => t.taskId)).toEqual(["t2"]);
    expect(
      filterTasksBySection(tasks, "dueOverdue", "2026-07-26T12:00:00.000Z").map((t) => t.taskId)
    ).toEqual(["t1"]);
  });

  it("resolves section aliases", () => {
    expect(resolveTechnicianWorkspaceSection("vitals")).toBe("vitalSigns");
    expect(resolveTechnicianWorkspaceSection("ekg")).toBe("ecgAcquisition");
    expect(resolveTechnicianWorkspaceSection("io")).toBe("intakeOutput");
  });
});
