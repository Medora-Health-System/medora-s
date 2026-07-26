/**
 * MEDUI.D4B.7 — Enterprise case management / SW / UR / discharge planning tests.
 */

import { describe, expect, it } from "vitest";
import {
  adaptCareCoordinationVirtualDocument,
  assessReadmissionRiskRules,
  buildEnterpriseCaseManagementDischargePlanningSummary,
  buildLosAvoidableDelayView,
  CARE_COORDINATION_AUTHORITY_INVARIANTS,
  CARE_COORDINATION_BARRIER_IDS,
  CARE_COORDINATION_DESTINATION_IDS,
  CARE_COORDINATION_DOCUMENT_TYPE_IDS,
  careCoordinationWorkspaceSectionsForCareSetting,
  d4b6CarePlansNotRewrittenByCoordination,
  distinguishAssignmentFromAuthorization,
  distinguishPlanningFromDischargeAuthorization,
  distinguishUrPlaceholderFromProprietaryCriteria,
  ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING_CERTIFICATION_ID,
  isCareCoordinationCapabilityProhibited,
  openCareCoordinationEpisode,
  planDestinationOnEpisode,
  projectD4b6CarePlanCoordination,
  resolveCareCoordinationRoleProfile,
  suppressSensitiveSocialWorkOnDashboard,
  trackPayerAuthorization,
  upsertBarrierOnEpisode,
  UR_CRITERIA_SOURCE_IDS,
} from "./enterpriseCaseManagementDischargePlanningD4b7.js";
import { getEnterpriseClinicalDocumentType } from "./enterpriseClinicalDocumentRegistryD4b1.js";

describe("MEDUI.D4B.7 enterprise case management discharge planning", () => {
  it("exposes certification id and hard authority false flags", () => {
    expect(ENTERPRISE_CASE_MANAGEMENT_DISCHARGE_PLANNING_CERTIFICATION_ID).toContain("D4B7");
    expect(CARE_COORDINATION_AUTHORITY_INVARIANTS.authorizesDischarge).toBe(false);
    expect(CARE_COORDINATION_AUTHORITY_INVARIANTS.usesPredictiveAi).toBe(false);
    expect(CARE_COORDINATION_AUTHORITY_INVARIANTS.usesProprietaryInterQualOrMcg).toBe(false);
    expect(CARE_COORDINATION_AUTHORITY_INVARIANTS.rewritesD4b6CarePlans).toBe(false);
    expect(CARE_COORDINATION_AUTHORITY_INVARIANTS.assignmentEqualsAuthorization).toBe(false);

    const summary = buildEnterpriseCaseManagementDischargePlanningSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      roleProfile: "CASE_MANAGER",
    });
    expect(summary.authorizesDischarge).toBe(false);
    expect(summary.mutatesFinalDisposition).toBe(false);
    expect(summary.createsProviderOrders).toBe(false);
    expect(summary.mutatesMar).toBe(false);
    expect(summary.mutatesDiagnosis).toBe(false);
    expect(summary.mutatesProblemList).toBe(false);
    expect(summary.mutatesAdmissionStatus).toBe(false);
    expect(summary.assignmentEqualsAuthorization).toBe(false);
    expect(summary.usesProprietaryInterQualOrMcg).toBe(false);
    expect(summary.usesPredictiveAi).toBe(false);
    expect(summary.rewritesD4b6CarePlans).toBe(false);
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentSignatureEngine).toBe(false);
    expect(summary.disciplineProfiles).toHaveLength(3);
    expect(summary.disciplineProfiles.map((d) => d.discipline)).toEqual([
      "CASE_MANAGEMENT",
      "SOCIAL_WORK",
      "UTILIZATION_REVIEW",
    ]);
  });

  it("keeps CM SW UR capability profiles distinct", () => {
    expect(resolveCareCoordinationRoleProfile(["CM"])).toBe("CASE_MANAGER");
    expect(resolveCareCoordinationRoleProfile(["SW"])).toBe("SOCIAL_WORKER");
    expect(resolveCareCoordinationRoleProfile(["UR"])).toBe("UTILIZATION_REVIEWER");
    expect(isCareCoordinationCapabilityProhibited("discharge_authorize")).toBe(true);
    expect(isCareCoordinationCapabilityProhibited("predictive_ai_readmission")).toBe(true);

    const summary = buildEnterpriseCaseManagementDischargePlanningSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      roleProfile: "SOCIAL_WORKER",
    });
    const sw = summary.disciplineProfiles.find((d) => d.discipline === "SOCIAL_WORK")!;
    const cm = summary.disciplineProfiles.find((d) => d.discipline === "CASE_MANAGEMENT")!;
    expect(sw.allowedCapabilityIds).toContain("document_sw_note");
    expect(sw.allowedCapabilityIds).not.toContain("document_ur_review");
    expect(cm.allowedCapabilityIds).toContain("document_cm_note");
    expect(cm.allowedCapabilityIds).not.toContain("document_sw_note");
  });

  it("curates barrier destination risk and UR placeholder taxonomies", () => {
    expect(CARE_COORDINATION_BARRIER_IDS).toHaveLength(12);
    expect(CARE_COORDINATION_DESTINATION_IDS).toContain("home_with_home_health");
    expect(UR_CRITERIA_SOURCE_IDS).toEqual(
      expect.arrayContaining([
        "FACILITY_POLICY",
        "CLINICAL_DOCUMENTATION_REVIEW",
        "PLACEHOLDER_CRITERIA_LIBRARY",
      ])
    );
    const risk = assessReadmissionRiskRules({
      activeFactorIds: ["prior_admission_30d", "unstable_housing", "unresolved_high_barrier"],
    });
    expect(risk.usesPredictiveAi).toBe(false);
    expect(risk.transparentRulesOnly).toBe(true);
    expect(risk.band).toBe("HIGH");
    expect(distinguishUrPlaceholderFromProprietaryCriteria({
      criteriaSourceId: "PLACEHOLDER_CRITERIA_LIBRARY",
    }).usesProprietaryInterQualOrMcg).toBe(false);
  });

  it("opens episodes in Obs/IP and rejects ED full workflow and discharge auth", () => {
    const ok = openCareCoordinationEpisode({
      episodeId: "ep1",
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      openedByUserId: "cm-1",
      openedAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
      roleProfile: "CASE_MANAGER",
    });
    expect(ok.accepted).toBe(true);
    expect(ok.episode?.authorizesDischarge).toBe(false);
    expect(ok.episode?.assignmentEqualsAuthorization).toBe(false);

    expect(
      openCareCoordinationEpisode({
        episodeId: "ep2",
        encounterId: "e1",
        patientId: "p1",
        facilityId: "f1",
        openedByUserId: "cm-1",
        openedAt: "2026-07-26T12:00:00.000Z",
        careSetting: "EMERGENCY",
        roleProfile: "CASE_MANAGER",
      }).reason
    ).toBe("ED_LIMITED");

    const dest = planDestinationOnEpisode({
      episode: ok.episode!,
      destinationId: "skilled_nursing_facility",
      updatedAt: "2026-07-26T13:00:00.000Z",
      roleProfile: "CASE_MANAGER",
      authorizeDischarge: true,
    });
    expect(dest.accepted).toBe(false);
    expect(dest.reason).toBe("DISCHARGE_AUTH_FORBIDDEN");

    const planned = planDestinationOnEpisode({
      episode: ok.episode!,
      destinationId: "home",
      updatedAt: "2026-07-26T13:00:00.000Z",
      roleProfile: "CASE_MANAGER",
    });
    expect(planned.accepted).toBe(true);
    expect(planned.episode?.destinationPlan?.authorizesDischarge).toBe(false);
  });

  it("manages barriers and builds LOS view without inventing expected LOS", () => {
    const opened = openCareCoordinationEpisode({
      episodeId: "ep1",
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      openedByUserId: "sw-1",
      openedAt: "2026-07-26T12:00:00.000Z",
      careSetting: "OBSERVATION",
      roleProfile: "SOCIAL_WORKER",
    });
    const withBarrier = upsertBarrierOnEpisode({
      episode: opened.episode!,
      instanceId: "b1",
      barrierId: "housing_instability",
      status: "OPEN",
      owningDiscipline: "SOCIAL_WORK",
      notesSummary: "Needs housing support",
      updatedAt: "2026-07-26T12:30:00.000Z",
      roleProfile: "SOCIAL_WORKER",
    });
    expect(withBarrier.accepted).toBe(true);
    expect(withBarrier.episode?.barriers[0]?.sensitiveDetailSuppressed).toBe(true);

    const los = buildLosAvoidableDelayView({
      encounterOpenedAt: "2026-07-26T08:00:00.000Z",
      nowIso: "2026-07-26T12:00:00.000Z",
      openBarrierIds: ["placement_delay"],
      inventedExpectedLosHours: 72,
    });
    expect(los.expectedLosHours).toBeNull();
    expect(los.expectedLosInvented).toBe(false);
    expect(los.elapsedHours).toBe(4);
  });

  it("rejects proprietary payer criteria and suppresses SW narratives on dashboards", () => {
    expect(
      trackPayerAuthorization({
        trackingId: "t1",
        authStatus: "PENDING",
        criteriaSourceId: "FACILITY_POLICY",
        updatedAt: "2026-07-26T12:00:00.000Z",
        usesProprietaryInterQualOrMcg: true,
      }).reason
    ).toBe("PROPRIETARY_CRITERIA_FORBIDDEN");

    const ok = trackPayerAuthorization({
      trackingId: "t1",
      authStatus: "PENDING",
      criteriaSourceId: "PLACEHOLDER_CRITERIA_LIBRARY",
      updatedAt: "2026-07-26T12:00:00.000Z",
    });
    expect(ok.accepted).toBe(true);
    expect(ok.tracking?.usesProprietaryInterQualOrMcg).toBe(false);
    expect(ok.tracking?.isNotClaimsSubmission).toBe(true);

    const suppressed = suppressSensitiveSocialWorkOnDashboard({
      fullNarrative: "Detailed psychosocial history…",
      statusLabel: "IN_PROGRESS",
      barrierCodes: ["housing_instability"],
    });
    expect(suppressed.fullNarrativeExposed).toBe(false);
    expect(suppressed.dashboardSafe.barrierCodes).toEqual(["housing_instability"]);
  });

  it("projects D4B.6 care plans without rewrite and limits ED sections", () => {
    const projected = projectD4b6CarePlanCoordination({
      encounterId: "e1",
      plans: [
        {
          planId: "p1",
          templateId: "discharge_readiness",
          lifecycleState: "ACTIVE",
          readinessHint: "Checklist in progress",
        },
      ],
    });
    expect(projected[0]?.rewritesD4b6CarePlans).toBe(false);
    expect(projected[0]?.readinessIsNotAuthorization).toBe(true);
    expect(
      d4b6CarePlansNotRewrittenByCoordination({
        sourcePlanLifecycleState: "ACTIVE",
        coordinationEditorUserId: "cm-1",
        storedPlanLifecycleState: "ACTIVE",
      })
    ).toBe(true);

    const ed = careCoordinationWorkspaceSectionsForCareSetting("EMERGENCY", {
      roleProfile: "CASE_MANAGER",
    });
    expect(ed.some((s) => s.id === "overview")).toBe(true);
    expect(ed.some((s) => s.id === "episode")).toBe(false);
    expect(ed.every((s) => s.mode !== "WORKFLOW" || s.id === "overview")).toBe(true);

    expect(distinguishPlanningFromDischargeAuthorization({ destinationProposed: true }).authorizesDischarge).toBe(
      false
    );
    expect(distinguishAssignmentFromAuthorization({ assignedUserId: "cm-1" }).assignmentEqualsAuthorization).toBe(
      false
    );
  });

  it("registers curated D4B.7 document types and adapts virtual docs", () => {
    for (const id of CARE_COORDINATION_DOCUMENT_TYPE_IDS) {
      expect(getEnterpriseClinicalDocumentType(id)?.templateVersion).toBe("D4B.7");
    }
    const sw = adaptCareCoordinationVirtualDocument({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      documentId: "d1",
      documentTypeId: "sw.psychosocial_assessment",
      body: "Full sensitive narrative",
      authorUserId: "sw-1",
      createdAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
    });
    expect(sw.discipline).toBe("SOCIAL_WORK");
    expect(sw.structured.payload.authorizesDischarge).toBe(false);
    expect(sw.structured.payload.suppressFullNarrativeOnDashboard).toBe(true);
    expect(sw.narrative.sections[0]?.text).toContain("SENSITIVE");
    expect(sw.legalRecordVisible).toBe(false);

    const cm = adaptCareCoordinationVirtualDocument({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      documentId: "d2",
      documentTypeId: "cm.discharge_planning_note",
      body: "Destination planning note",
      authorUserId: "cm-1",
      createdAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
    });
    expect(cm.discipline).toBe("CASE_MANAGEMENT");
    expect(cm.legalRecordVisible).toBe(true);
  });
});
