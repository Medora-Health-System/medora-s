/**
 * MEDUI.D4B.5 — Enterprise Rehabilitation Workspaces tests.
 */

import { describe, expect, it } from "vitest";
import {
  adaptRehabVirtualDocument,
  buildEnterpriseRehabilitationWorkspaceSummary,
  distinguishDietRecommendationFromOrder,
  distinguishEquipmentRecommendationFromProcurement,
  ENTERPRISE_REHABILITATION_ACTIVITY_REGISTRY,
  ENTERPRISE_REHABILITATION_WORKSPACES_CERTIFICATION_ID,
  isRehabilitationCapabilityProhibited,
  nursingAssessmentNotOverwrittenByRehab,
  projectRelatedRehabilitationCareOrders,
  rehabPerformerPreservedAfterReassignment,
  rehabilitationActivityEligibility,
  rehabilitationWorkspaceSectionsForCareSetting,
  resolveRehabilitationDisciplineMode,
  resolveRehabilitationRoleProfile,
  resolveRehabilitationWorkspaceSection,
  techTaskPerformerPreservedAfterRehabReview,
} from "./enterpriseRehabilitationWorkspacesD4b5.js";
import { getEnterpriseClinicalDocumentType } from "./enterpriseClinicalDocumentRegistryD4b1.js";

describe("MEDUI.D4B.5 enterprise rehabilitation workspaces", () => {
  it("exposes certification id and refuses lifecycle collapse / authority takeover", () => {
    expect(ENTERPRISE_REHABILITATION_WORKSPACES_CERTIFICATION_ID).toContain("D4B5");
    const summary = buildEnterpriseRehabilitationWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      disciplineMode: "PHYSICAL_THERAPY",
      roleProfile: "NURSE_WITH_REHAB_PERMISSIONS",
    });
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentRehabLifecycleEngine).toBe(false);
    expect(summary.collapsesPtOtSlp).toBe(false);
    expect(summary.masqueradesAsNursingAssessment).toBe(false);
    expect(summary.overwritesTechTasks).toBe(false);
    expect(summary.overwritesRt).toBe(false);
    expect(summary.createsProviderOrders).toBe(false);
    expect(summary.finalizesDietOrders).toBe(false);
    expect(summary.procuresEquipment).toBe(false);
    expect(summary.authorizesDischarge).toBe(false);
  });

  it("keeps PT / OT / SLP section sets distinct", () => {
    const pt = rehabilitationWorkspaceSectionsForCareSetting("INPATIENT", {
      disciplineMode: "PHYSICAL_THERAPY",
      roleProfile: "NURSE_WITH_REHAB_PERMISSIONS",
    }).map((s) => s.id);
    const ot = rehabilitationWorkspaceSectionsForCareSetting("INPATIENT", {
      disciplineMode: "OCCUPATIONAL_THERAPY",
      roleProfile: "NURSE_WITH_REHAB_PERMISSIONS",
    }).map((s) => s.id);
    const slp = rehabilitationWorkspaceSectionsForCareSetting("INPATIENT", {
      disciplineMode: "SPEECH_LANGUAGE_PATHOLOGY",
      roleProfile: "NURSE_WITH_REHAB_PERMISSIONS",
    }).map((s) => s.id);
    expect(pt).toContain("mobilityGait");
    expect(pt).not.toContain("adlIadl");
    expect(pt).not.toContain("swallowingAspiration");
    expect(ot).toContain("adlIadl");
    expect(ot).not.toContain("mobilityGait");
    expect(slp).toContain("swallowingAspiration");
    expect(slp).toContain("dietRecommendation");
    expect(slp).toContain("communication");
    expect(slp).not.toContain("mobilityGait");
  });

  it("filters ED vs inpatient sections and blocks assistant evaluator inheritance", () => {
    const ed = rehabilitationWorkspaceSectionsForCareSetting("EMERGENCY", {
      disciplineMode: "PHYSICAL_THERAPY",
      roleProfile: "NURSE_WITH_REHAB_PERMISSIONS",
    }).map((s) => s.id);
    expect(ed).toContain("evaluation");
    expect(ed).not.toContain("goalsOutcomes");
    expect(ed).not.toContain("dischargeRecommendations");
    const assistantEval = rehabilitationActivityEligibility({
      activityId: "PT_EVALUATION",
      careSetting: "INPATIENT",
      roleProfile: "REHAB_ASSISTANT_LIMITED",
      disciplineMode: "PHYSICAL_THERAPY",
    });
    expect(assistantEval.capabilityAllowedForProfile).toBe(false);
    expect(assistantEval.assistantDoesNotInheritFullEvaluator).toBe(true);
  });

  it("selects live activities and defers instrumental / proprietary scale engines", () => {
    const selected = ENTERPRISE_REHABILITATION_ACTIVITY_REGISTRY.filter((a) => a.selectedInD4b5).map(
      (a) => a.activityId
    );
    expect(selected).toContain("PT_EVALUATION");
    expect(selected).toContain("OT_ADL_ASSESSMENT");
    expect(selected).toContain("SLP_SWALLOWING_EVALUATION");
    expect(selected).toContain("SLP_DIET_RECOMMENDATION");
    expect(selected).not.toContain("SLP_INSTRUMENTAL_SWALLOW");
    expect(selected).not.toContain("PT_PROPRIETARY_SCALE_ENGINE");
  });

  it("keeps assignment≠authorization and prohibits unsafe capabilities", () => {
    const elig = rehabilitationActivityEligibility({
      activityId: "PT_EVALUATION",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_WITH_REHAB_PERMISSIONS",
      disciplineMode: "PHYSICAL_THERAPY",
      assignedUserId: "pt-a",
      actorUserId: "pt-b",
    });
    expect(elig.assignmentEqualsAuthorization).toBe(false);
    expect(elig.recommendationIsNotOrder).toBe(true);
    expect(elig.dietRecommendationIsNotDietOrder).toBe(true);
    expect(elig.equipmentRecommendationIsNotProcurement).toBe(true);
    expect(elig.doesNotAuthorizeDischarge).toBe(true);
    expect(isRehabilitationCapabilityProhibited("diet_order_finalize")).toBe(true);
    expect(isRehabilitationCapabilityProhibited("discharge_authorize")).toBe(true);
    expect(isRehabilitationCapabilityProhibited("dme_procurement")).toBe(true);
    expect(isRehabilitationCapabilityProhibited("nursing_assessment_overwrite")).toBe(true);
  });

  it("resolves role profiles and discipline modes without inventing Prisma RoleCodes", () => {
    expect(resolveRehabilitationRoleProfile(["RN"])).toBe("NURSE_WITH_REHAB_PERMISSIONS");
    expect(resolveRehabilitationRoleProfile(["PT"])).toBe("PHYSICAL_THERAPIST");
    expect(resolveRehabilitationRoleProfile(["OT"])).toBe("OCCUPATIONAL_THERAPIST");
    expect(resolveRehabilitationRoleProfile(["SLP"])).toBe("SPEECH_LANGUAGE_PATHOLOGIST");
    expect(resolveRehabilitationRoleProfile(["PTA"])).toBe("REHAB_ASSISTANT_LIMITED");
    expect(resolveRehabilitationDisciplineMode("ot")).toBe("OCCUPATIONAL_THERAPY");
    expect(resolveRehabilitationDisciplineMode("speech")).toBe("SPEECH_LANGUAGE_PATHOLOGY");
  });

  it("registers distinct PT/OT/SLP document types on D4B.1", () => {
    expect(getEnterpriseClinicalDocumentType("pt.evaluation")?.allowedDisciplines).toContain(
      "PHYSICAL_THERAPY"
    );
    expect(getEnterpriseClinicalDocumentType("ot.adl_assessment")?.allowedDisciplines).toContain(
      "OCCUPATIONAL_THERAPY"
    );
    expect(
      getEnterpriseClinicalDocumentType("slp.diet_recommendation")?.allowedDisciplines
    ).toContain("SPEECH_LANGUAGE_PATHOLOGY");
    expect(getEnterpriseClinicalDocumentType("pt.evaluation")?.sourceArchitecture).toBe(
      "REFERENCE_VIRTUAL"
    );
    // Must not collapse into a single THERAPY type
    expect(getEnterpriseClinicalDocumentType("therapy.evaluation")).toBeNull();
  });

  it("projects related CARE orders without creating provider-order authority", () => {
    const orders = projectRelatedRehabilitationCareOrders({
      encounterId: "e1",
      orders: [
        {
          orderId: "o1",
          procedureCode: "npo_status",
          displayLabel: "NPO",
          status: "ACTIVE",
        },
        {
          orderId: "o2",
          procedureCode: "ambulation_trial",
          displayLabel: "Ambulation trial",
          status: "ACTIVE",
          discontinued: true,
        },
      ],
    });
    expect(orders).toHaveLength(1);
    expect(orders[0]?.createsProviderOrder).toBe(false);
    expect(orders[0]?.recommendationIsNotOrder).toBe(true);
  });

  it("preserves nursing authorship, tech performer, and rehab performer after reassignment", () => {
    expect(
      nursingAssessmentNotOverwrittenByRehab({
        nursingAssessmentAuthorUserId: "rn-1",
        rehabDocumentAuthorUserId: "pt-1",
        storedNursingAuthorUserId: "rn-1",
      })
    ).toBe(true);
    expect(
      techTaskPerformerPreservedAfterRehabReview({
        techPerformerUserId: "tech-1",
        rehabReviewerUserId: "ot-1",
        storedPerformerUserId: "tech-1",
      })
    ).toBe(true);
    expect(
      rehabPerformerPreservedAfterReassignment({
        originalPerformerUserId: "pt-1",
        newAssigneeUserId: "pt-2",
        recordedPerformerUserId: "pt-1",
      })
    ).toBe(true);
  });

  it("distinguishes diet recommendation from diet order and equipment from procurement", () => {
    const diet = distinguishDietRecommendationFromOrder({
      recommendedTexture: "pureed",
      activeDietOrderTexture: "regular",
    });
    expect(diet.dietRecommendationIsNotDietOrder).toBe(true);
    expect(diet.doesNotFinalizeDietOrder).toBe(true);
    expect(diet.recommendationDistinctFromOrder).toBe(true);
    const equip = distinguishEquipmentRecommendationFromProcurement({
      recommendedItem: "walker",
      procuredItemId: null,
    });
    expect(equip.recommendationIsNotProcurement).toBe(true);
    expect(equip.doesNotProcureEquipment).toBe(true);
    expect(equip.hasProcurementRecord).toBe(false);
  });

  it("adapts virtual rehab docs with recommendation≠authority invariants", () => {
    const doc = adaptRehabVirtualDocument({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      documentId: "d1",
      documentTypeId: "slp.diet_recommendation",
      disciplineMode: "SPEECH_LANGUAGE_PATHOLOGY",
      body: "Recommend nectar-thick liquids",
      authorUserId: "rn-1",
      createdAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
    });
    expect(doc.discipline).toBe("SPEECH_LANGUAGE_PATHOLOGY");
    const payload = doc.structured?.payload as {
      doesNotFinalizeDietOrder?: boolean;
      recommendationIsNotOrder?: boolean;
    };
    expect(payload.doesNotFinalizeDietOrder).toBe(true);
    expect(payload.recommendationIsNotOrder).toBe(true);
  });

  it("resolves section aliases and builds discipline-filtered summary", () => {
    expect(resolveRehabilitationWorkspaceSection("gait")).toBe("mobilityGait");
    expect(resolveRehabilitationWorkspaceSection("diet")).toBe("dietRecommendation");
    const summary = buildEnterpriseRehabilitationWorkspaceSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "EMERGENCY",
      disciplineMode: "SPEECH_LANGUAGE_PATHOLOGY",
      roleProfile: "NURSE_WITH_REHAB_PERMISSIONS",
      nursingSwallowScreen: [{ result: "FAILED", authorUserId: "rn-1" }],
      relatedOrders: [
        {
          orderId: "o1",
          procedureCode: "swallowing_precautions",
          displayLabel: "Swallowing precautions",
          status: "ACTIVE",
        },
      ],
    });
    expect(summary.nursingSwallowScreen[0]?.screeningIsNotSlpEvaluation).toBe(true);
    expect(summary.relatedOrders).toHaveLength(1);
    expect(summary.activities.every((a) => a.disciplineMode === "SPEECH_LANGUAGE_PATHOLOGY")).toBe(
      true
    );
  });

  it("requires order presence for order-dependent treatment activities", () => {
    const without = rehabilitationActivityEligibility({
      activityId: "PT_TREATMENT_NOTE",
      careSetting: "INPATIENT",
      roleProfile: "PHYSICAL_THERAPIST",
      disciplineMode: "PHYSICAL_THERAPY",
      orderPresent: false,
    });
    expect(without.orderSatisfied).toBe(false);
    const withOrder = rehabilitationActivityEligibility({
      activityId: "PT_TREATMENT_NOTE",
      careSetting: "INPATIENT",
      roleProfile: "PHYSICAL_THERAPIST",
      disciplineMode: "PHYSICAL_THERAPY",
      orderPresent: true,
    });
    expect(withOrder.orderSatisfied).toBe(true);
  });
});
