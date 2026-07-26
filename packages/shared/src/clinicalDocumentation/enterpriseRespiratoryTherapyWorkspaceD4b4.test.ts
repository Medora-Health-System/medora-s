/**
 * MEDUI.D4B.4 — Enterprise Respiratory Therapy Workspace tests.
 */

import { describe, expect, it } from "vitest";
import {
  adaptRespiratoryDischargeRecommendationProjection,
  adaptRespiratoryEdocEntryToEnterpriseClinicalDocument,
  buildEnterpriseRespiratoryTherapyWorkspaceSummary,
  distinguishVentilatorSettingRoles,
  ENTERPRISE_RESPIRATORY_THERAPY_ACTIVITY_REGISTRY,
  ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_CERTIFICATION_ID,
  isRespiratoryTherapyCapabilityProhibited,
  nursingAssessmentNotOverwrittenByRt,
  projectActiveRespiratoryOrders,
  projectMarRespiratoryResponseLinks,
  resolveRespiratoryTherapyRoleProfile,
  resolveRespiratoryTherapyWorkspaceSection,
  respiratoryTherapyActivityEligibility,
  respiratoryTherapyWorkspaceSectionsForCareSetting,
  rtPerformerPreservedAfterReassignment,
  technicianMeasurementVisibleWithoutRtAuthorship,
} from "./enterpriseRespiratoryTherapyWorkspaceD4b4.js";
import { getEnterpriseClinicalDocumentType } from "./enterpriseClinicalDocumentRegistryD4b1.js";
import { projectTechnicianVitalsContribution } from "./enterpriseTechnicianNursingAssistantWorkspaceD4b3.js";

describe("MEDUI.D4B.4 enterprise respiratory therapy workspace", () => {
  it("exposes certification id and refuses independent lifecycle / nursing / MAR takeover", () => {
    expect(ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE_CERTIFICATION_ID).toContain("D4B4");
    const summary = buildEnterpriseRespiratoryTherapyWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_WITH_RT_PERMISSIONS",
    });
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentRespiratoryTherapyLifecycleEngine).toBe(false);
    expect(summary.masqueradesAsNursingAssessment).toBe(false);
    expect(summary.replacesMar).toBe(false);
    expect(summary.createsProviderOrders).toBe(false);
  });

  it("filters sections by care setting and capability profile", () => {
    const ed = respiratoryTherapyWorkspaceSectionsForCareSetting("EMERGENCY", {
      roleProfile: "NURSE_WITH_RT_PERMISSIONS",
    }).map((s) => s.id);
    const ip = respiratoryTherapyWorkspaceSectionsForCareSetting("INPATIENT", {
      roleProfile: "NURSE_WITH_RT_PERMISSIONS",
    }).map((s) => s.id);
    const tech = respiratoryTherapyWorkspaceSectionsForCareSetting("INPATIENT", {
      roleProfile: "TECHNICIAN_MEASUREMENT_ONLY",
    }).map((s) => s.id);
    expect(ed).toContain("respiratoryAssessment");
    expect(ed).toContain("treatmentResponse");
    expect(ed).not.toContain("education");
    expect(ed).not.toContain("dischargeRecommendations");
    expect(ip).toContain("education");
    expect(ip).toContain("dischargeRecommendations");
    expect(ip).toContain("airwayClearanceTherapy");
    expect(tech).toContain("technicianMeasurements");
    expect(tech).not.toContain("respiratoryAssessment");
  });

  it("selects smallest coherent activity registry without inventing deferred types as live", () => {
    const selected = ENTERPRISE_RESPIRATORY_THERAPY_ACTIVITY_REGISTRY.filter((a) => a.selectedInD4b4).map(
      (a) => a.activityId
    );
    expect(selected).toContain("RT_INITIAL_ASSESSMENT");
    expect(selected).toContain("RT_TREATMENT_RESPONSE");
    expect(selected).toContain("RT_VENTILATOR_CHECK");
    expect(selected).not.toContain("RT_ABG_COLLECTION");
    expect(selected).not.toContain("RT_HIGH_FLOW_CHECK");
    expect(selected).not.toContain("RT_SUCTIONING_EVENT");
    expect(selected).not.toContain("RT_ARTIFICIAL_AIRWAY_CHECK");
  });

  it("keeps assignment≠authorization and prohibits unsafe capabilities", () => {
    const elig = respiratoryTherapyActivityEligibility({
      activityId: "RT_INITIAL_ASSESSMENT",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_WITH_RT_PERMISSIONS",
      assignedUserId: "rt-a",
      actorUserId: "rt-b",
    });
    expect(elig.assignmentEqualsAuthorization).toBe(false);
    expect(elig.doesNotOverwriteNursingAssessment).toBe(true);
    expect(elig.recommendationIsNotOrder).toBe(true);
    expect(elig.marRemainsAuthoritative).toBe(true);
    expect(elig.sameAssignedUser).toBe(false);
    expect(isRespiratoryTherapyCapabilityProhibited("provider_diagnosis_author")).toBe(true);
    expect(isRespiratoryTherapyCapabilityProhibited("mar_duplicate_administration")).toBe(true);
    expect(isRespiratoryTherapyCapabilityProhibited("ungoverned_ventilator_setting_change")).toBe(
      true
    );
  });

  it("resolves role profiles including RN proxy and measurement-only tech", () => {
    expect(resolveRespiratoryTherapyRoleProfile(["RN"])).toBe("NURSE_WITH_RT_PERMISSIONS");
    expect(resolveRespiratoryTherapyRoleProfile(["PATIENT_CARE_TECH"])).toBe(
      "TECHNICIAN_MEASUREMENT_ONLY"
    );
    expect(resolveRespiratoryTherapyRoleProfile(["RT"])).toBe("RESPIRATORY_THERAPIST");
    expect(resolveRespiratoryTherapyRoleProfile(["BILLING"])).toBe("SUPPORT_READ_ONLY");
  });

  it("registers RT document types on D4B.1 without requiring EncounterNoteType migration", () => {
    expect(getEnterpriseClinicalDocumentType("rt.initial_assessment")?.allowedDisciplines).toContain(
      "RESPIRATORY_THERAPY"
    );
    expect(getEnterpriseClinicalDocumentType("rt.treatment_response")?.sourceArchitecture).toBe(
      "REFERENCE_VIRTUAL"
    );
    expect(getEnterpriseClinicalDocumentType("rt.ventilator_check")?.sourceArchitecture).toBe(
      "EDOC_ENTRY"
    );
  });

  it("adapts EDOC.12 respiratory cards with RT discipline overlay and nursing-safe flags", () => {
    const doc = adaptRespiratoryEdocEntryToEnterpriseClinicalDocument({
      id: "edoc-1",
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      category: "RESPIRATORY_DOCUMENTATION",
      cardId: "resp_assessment",
      schemaVersion: "EDOC.12",
      payloadJson: { respiratoryRate: 22 },
      createdAt: "2026-07-26T12:00:00.000Z",
      authorUserId: "rn-1",
      authorDisplayNameSnapshot: "Nurse One",
      authorRoleSnapshot: "RN",
      rnProxyAuthorship: true,
    });
    expect(doc.discipline).toBe("RESPIRATORY_THERAPY");
    expect(doc.documentTypeId).toBe("rt.initial_assessment");
    expect(doc.sourceArchitecture).toBe("EDOC_ENTRY");
    const payload = doc.structured?.payload as { _d4b4?: { doesNotOverwriteNursingAssessment?: boolean } };
    expect(payload?._d4b4?.doesNotOverwriteNursingAssessment).toBe(true);
  });

  it("projects active orders without creating provider-order authority", () => {
    const orders = projectActiveRespiratoryOrders({
      encounterId: "e1",
      orders: [
        {
          orderId: "o1",
          procedureCode: "oxygen_therapy",
          displayLabel: "Oxygen therapy",
          status: "ACTIVE",
          rtInvolvement: "rt_evaluate_treat",
        },
        {
          orderId: "o2",
          displayLabel: "Old O2",
          status: "ACTIVE",
          discontinued: true,
        },
      ],
    });
    expect(orders).toHaveLength(1);
    expect(orders[0]?.createsProviderOrder).toBe(false);
    expect(orders[0]?.recommendationIsNotOrder).toBe(true);
  });

  it("projects MAR respiratory responses without duplicating administration", () => {
    const responses = projectMarRespiratoryResponseLinks({
      encounterId: "e1",
      responses: [
        {
          administrationEventId: "admin-1",
          responseCode: "RESPIRATORY_IMPROVED",
          administratorUserId: "rn-1",
        },
      ],
    });
    expect(responses[0]?.marRemainsAuthoritative).toBe(true);
    expect(responses[0]?.isDuplicateAdministrationRecord).toBe(false);
    expect(responses[0]?.administratorUserId).toBe("rn-1");
  });

  it("preserves nursing authorship, RT performer, and tech measurement performer", () => {
    expect(
      nursingAssessmentNotOverwrittenByRt({
        nursingAssessmentAuthorUserId: "rn-1",
        rtDocumentAuthorUserId: "rt-1",
        storedNursingAuthorUserId: "rn-1",
      })
    ).toBe(true);
    expect(
      rtPerformerPreservedAfterReassignment({
        originalPerformerUserId: "rt-1",
        newAssigneeUserId: "rt-2",
        recordedPerformerUserId: "rt-1",
      })
    ).toBe(true);
    expect(
      technicianMeasurementVisibleWithoutRtAuthorship({
        techPerformerUserId: "tech-1",
        rtReviewerUserId: "rt-1",
        storedPerformerUserId: "tech-1",
      })
    ).toBe(true);
  });

  it("distinguishes ordered vs observed ventilator settings and forbids ungoverned change", () => {
    const d = distinguishVentilatorSettingRoles({
      orderedSetting: "AC 16/400/5/40",
      observedSetting: "AC 16/400/5/50",
      recommendedSetting: "wean FiO2",
    });
    expect(d.orderedDistinctFromObserved).toBe(true);
    expect(d.recommendationIsNotOrder).toBe(true);
    expect(d.ungovernedChangeForbidden).toBe(true);
  });

  it("builds summary with EDOC docs, orders, MAR links, and D4B.3 tech measurements", () => {
    const tech = projectTechnicianVitalsContribution({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      recordedAt: "2026-07-26T11:00:00.000Z",
      performerUserId: "tech-1",
      performerDisplayName: "Tech One",
    });
    const summary = buildEnterpriseRespiratoryTherapyWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "EMERGENCY",
      roleProfile: "NURSE_WITH_RT_PERMISSIONS",
      edocEntries: [
        {
          id: "edoc-1",
          encounterId: "e1",
          patientId: "p1",
          facilityId: "f1",
          category: "RESPIRATORY_DOCUMENTATION",
          cardId: "resp_assessment",
          schemaVersion: "EDOC.12",
          payloadJson: {},
          createdAt: "2026-07-26T12:00:00.000Z",
          authorUserId: "rn-1",
          authorDisplayNameSnapshot: "Nurse",
          authorRoleSnapshot: "RN",
        },
      ],
      activeOrders: [
        {
          orderId: "o1",
          displayLabel: "Nebulizer",
          status: "ACTIVE",
          procedureCode: "nebulizer_treatment",
        },
      ],
      marResponses: [{ administrationEventId: "a1", responseCode: "RESPIRATORY_IMPROVED" }],
      techMeasurements: [tech],
    });
    expect(summary.documents).toHaveLength(1);
    expect(summary.activeOrders).toHaveLength(1);
    expect(summary.marResponses).toHaveLength(1);
    expect(summary.techMeasurements[0]?.discipline).toBe("TECHNICIAN");
    expect(summary.techMeasurements[0]?.isNursingAssessment).toBe(false);
  });

  it("resolves section aliases and discharge recommendation projection invariants", () => {
    expect(resolveRespiratoryTherapyWorkspaceSection("vent")).toBe("mechanicalVentilation");
    expect(resolveRespiratoryTherapyWorkspaceSection("abg")).toBe("bloodGasCollection");
    const rec = adaptRespiratoryDischargeRecommendationProjection({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      noteId: "rec-1",
      body: "Home O2 evaluation recommended",
      authorUserId: "rn-1",
      createdAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
    });
    expect(rec.documentTypeId).toBe("rt.discharge_recommendation");
    const payload = rec.structured?.payload as {
      recommendationIsNotOrder?: boolean;
      doesNotAuthorizeDischarge?: boolean;
    };
    expect(payload.recommendationIsNotOrder).toBe(true);
    expect(payload.doesNotAuthorizeDischarge).toBe(true);
  });

  it("requires order/medication presence for dependent activities", () => {
    const withoutOrder = respiratoryTherapyActivityEligibility({
      activityId: "RT_OXYGEN_DEVICE_ASSESSMENT",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_WITH_RT_PERMISSIONS",
      orderPresent: false,
    });
    expect(withoutOrder.orderSatisfied).toBe(false);
    const withOrder = respiratoryTherapyActivityEligibility({
      activityId: "RT_OXYGEN_DEVICE_ASSESSMENT",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_WITH_RT_PERMISSIONS",
      orderPresent: true,
    });
    expect(withOrder.orderSatisfied).toBe(true);
    const mar = respiratoryTherapyActivityEligibility({
      activityId: "RT_TREATMENT_RESPONSE",
      careSetting: "EMERGENCY",
      roleProfile: "NURSE_WITH_RT_PERMISSIONS",
      medicationOrderPresent: false,
    });
    expect(mar.medicationSatisfied).toBe(false);
  });
});
