/**
 * MEDUI.D4B.6 — Enterprise Interdisciplinary Care Plans tests.
 */

import { describe, expect, it } from "vitest";
import {
  activateCarePlanFromTemplate,
  adaptCarePlanVirtualDocument,
  assertTemplateUnchangedAfterActivation,
  buildEnterpriseInterdisciplinaryCarePlansSummary,
  canBedsideActivateTemplate,
  carePlanWorkspaceSectionsForCareSetting,
  distinguishCarePlanFromDiagnosis,
  distinguishCarePlanInterventionFromProviderOrder,
  distinguishDischargeReadinessFromAuthorization,
  distinguishSafetyRecommendationFromPrecautionActivation,
  ENTERPRISE_CARE_PLAN_TEMPLATE_CATALOG,
  ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS_CERTIFICATION_ID,
  getCarePlanTemplate,
  isCarePlanCapabilityProhibited,
  listActiveCarePlanTemplates,
  nursingAuthorshipNotOverwrittenByCarePlan,
  previewCarePlanTemplate,
  rehabAuthorshipNotOverwrittenByCarePlan,
  resolveCarePlanRoleProfile,
  resolveCarePlanWorkspaceSection,
  rtAuthorshipNotOverwrittenByCarePlan,
  searchCarePlanTemplates,
  techPerformerPreservedAfterCarePlanProgress,
  transitionCarePlanLifecycle,
  updateCarePlanComponentProgress,
} from "./enterpriseInterdisciplinaryCarePlansD4b6.js";
import { getEnterpriseClinicalDocumentType } from "./enterpriseClinicalDocumentRegistryD4b1.js";

describe("MEDUI.D4B.6 enterprise interdisciplinary care plans", () => {
  it("exposes certification id and hard authority false flags", () => {
    expect(ENTERPRISE_INTERDISCIPLINARY_CARE_PLANS_CERTIFICATION_ID).toContain("D4B6");
    const summary = buildEnterpriseInterdisciplinaryCarePlansSummary({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
    });
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentCarePlanLifecycleEngine).toBe(false);
    expect(summary.isNotDiagnosisEngine).toBe(true);
    expect(summary.doesNotMutateProblemList).toBe(true);
    expect(summary.createsProviderOrders).toBe(false);
    expect(summary.altersMar).toBe(false);
    expect(summary.finalizesDietOrders).toBe(false);
    expect(summary.altersOxygenVent).toBe(false);
    expect(summary.authorizesDischarge).toBe(false);
    expect(summary.procuresDme).toBe(false);
    expect(summary.authorizesRestraintsOrIsolation).toBe(false);
    expect(summary.autoActivatesFromDiagnosisAlone).toBe(false);
    expect(summary.mutatesSourceTemplatesOnActivation).toBe(false);
    expect(summary.overwritesNursing).toBe(false);
    expect(summary.overwritesTech).toBe(false);
    expect(summary.overwritesRt).toBe(false);
    expect(summary.overwritesRehab).toBe(false);
    expect(summary.assignmentEqualsAuthorization).toBe(false);
  });

  it("curates ACTIVE enterprise templates and keeps deferred full pathways non-activatable", () => {
    const active = listActiveCarePlanTemplates().map((t) => t.templateId);
    expect(active).toEqual(
      expect.arrayContaining([
        "fall_risk",
        "aspiration_risk",
        "acute_pain",
        "pneumonia",
        "chf",
        "impaired_mobility",
        "pressure_injury_risk",
        "discharge_readiness",
      ])
    );
    expect(active.length).toBeGreaterThanOrEqual(40);
    expect(active.length).toBeLessThanOrEqual(60);
    const deferred = ENTERPRISE_CARE_PLAN_TEMPLATE_CATALOG.filter((t) => !t.selectedInD4b6);
    expect(deferred.map((t) => t.templateId)).toEqual(
      expect.arrayContaining([
        "copd_exacerbation_full",
        "sepsis_pathway_full",
        "diabetes_endocrine_full",
        "stroke_pathway_full",
        "behavioral_health_full",
      ])
    );
    expect(canBedsideActivateTemplate("ACTIVE")).toBe(true);
    expect(canBedsideActivateTemplate("DRAFT")).toBe(false);
    expect(canBedsideActivateTemplate("RETIRED")).toBe(false);
  });

  it("searches and previews templates without auto-activation", () => {
    expect(searchCarePlanTemplates("chute").some((t) => t.templateId === "fall_risk")).toBe(true);
    expect(searchCarePlanTemplates("CHF").some((t) => t.templateId === "chf")).toBe(true);
    const preview = previewCarePlanTemplate("pneumonia");
    expect(preview.found).toBe(true);
    expect(preview.bedsideActivatable).toBe(true);
    expect(preview.doesNotAutoActivateFromDiagnosis).toBe(true);
    expect(preview.sourceImmutable).toBe(true);
  });

  it("activates patient-specific copy without mutating source template", () => {
    const before = getCarePlanTemplate("fall_risk")!;
    const result = activateCarePlanFromTemplate({
      planId: "plan-1",
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      templateId: "fall_risk",
      activatedByUserId: "nurse-1",
      activatedAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
      customizations: [
        {
          sourceTemplateComponentId: "fall_goal",
          body: "Patient-specific fall goal",
        },
      ],
    });
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe("OK");
    expect(result.plan?.lifecycleState).toBe("ACTIVE");
    expect(result.plan?.sourceTemplateNotMutated).toBe(true);
    expect(result.plan?.doesNotCreateProviderOrders).toBe(true);
    expect(result.plan?.components.some((c) => c.body === "Patient-specific fall goal")).toBe(true);
    const after = getCarePlanTemplate("fall_risk")!;
    expect(assertTemplateUnchangedAfterActivation(before, after)).toBe(true);
    expect(after.components.find((c) => c.componentId === "fall_goal")?.bodyKey).not.toBe(
      "Patient-specific fall goal"
    );
  });

  it("rejects auto-activation, ED full activation, inactive templates, and duplicates", () => {
    expect(
      activateCarePlanFromTemplate({
        planId: "p",
        encounterId: "e",
        patientId: "p",
        facilityId: "f",
        templateId: "fall_risk",
        activatedByUserId: "u",
        activatedAt: "2026-07-26T12:00:00.000Z",
        careSetting: "INPATIENT",
        roleProfile: "NURSE_CARE_PLAN_AUTHOR",
        autoFromDiagnosisAlone: true,
      }).reason
    ).toBe("AUTO_DIAGNOSIS_ACTIVATION_REJECTED");

    expect(
      activateCarePlanFromTemplate({
        planId: "p",
        encounterId: "e",
        patientId: "p",
        facilityId: "f",
        templateId: "fall_risk",
        activatedByUserId: "u",
        activatedAt: "2026-07-26T12:00:00.000Z",
        careSetting: "EMERGENCY",
        roleProfile: "NURSE_CARE_PLAN_AUTHOR",
      }).reason
    ).toBe("CARE_SETTING_LIMITED");

    expect(
      activateCarePlanFromTemplate({
        planId: "p",
        encounterId: "e",
        patientId: "p",
        facilityId: "f",
        templateId: "sepsis_pathway_full",
        activatedByUserId: "u",
        activatedAt: "2026-07-26T12:00:00.000Z",
        careSetting: "INPATIENT",
        roleProfile: "NURSE_CARE_PLAN_AUTHOR",
      }).reason
    ).toBe("TEMPLATE_NOT_ACTIVE");

    const first = activateCarePlanFromTemplate({
      planId: "plan-a",
      encounterId: "e",
      patientId: "p",
      facilityId: "f",
      templateId: "chf",
      activatedByUserId: "u",
      activatedAt: "2026-07-26T12:00:00.000Z",
      careSetting: "OBSERVATION",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
    });
    expect(first.accepted).toBe(true);
    const dup = activateCarePlanFromTemplate({
      planId: "plan-b",
      encounterId: "e",
      patientId: "p",
      facilityId: "f",
      templateId: "chf",
      activatedByUserId: "u",
      activatedAt: "2026-07-26T12:00:00.000Z",
      careSetting: "OBSERVATION",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
      existingActivePlans: [first.plan!],
    });
    expect(dup.reason).toBe("DUPLICATE_ACTIVE_PLAN");
  });

  it("supports progress / review / complete / discontinue lifecycle", () => {
    const activated = activateCarePlanFromTemplate({
      planId: "plan-life",
      encounterId: "e",
      patientId: "p",
      facilityId: "f",
      templateId: "acute_pain",
      activatedByUserId: "nurse-1",
      activatedAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
    });
    let plan = activated.plan!;
    plan = transitionCarePlanLifecycle({
      plan,
      event: "START_PROGRESS",
      at: "2026-07-26T13:00:00.000Z",
    }).plan;
    expect(plan.lifecycleState).toBe("IN_PROGRESS");
    const progress = updateCarePlanComponentProgress({
      plan,
      componentId: plan.components[0]!.componentId,
      status: "IN_PROGRESS",
      authorUserId: "nurse-1",
      at: "2026-07-26T13:05:00.000Z",
    });
    expect(progress.accepted).toBe(true);
    plan = progress.plan;
    plan = transitionCarePlanLifecycle({
      plan,
      event: "REQUEST_REVIEW",
      at: "2026-07-26T14:00:00.000Z",
    }).plan;
    expect(plan.lifecycleState).toBe("IN_REVIEW");
    plan = transitionCarePlanLifecycle({
      plan,
      event: "COMPLETE",
      at: "2026-07-26T15:00:00.000Z",
    }).plan;
    expect(plan.lifecycleState).toBe("COMPLETED");
    expect(plan.completedAt).toBe("2026-07-26T15:00:00.000Z");
  });

  it("filters ED sections to limited projection and Obs/IP to full workflow", () => {
    const ed = carePlanWorkspaceSectionsForCareSetting("EMERGENCY", {
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
    }).map((s) => s.id);
    expect(ed).toContain("overview");
    expect(ed).toContain("activePlans");
    expect(ed).toContain("nursingContributions");
    expect(ed).not.toContain("templateCatalog");
    expect(ed).not.toContain("interventions");

    const ip = carePlanWorkspaceSectionsForCareSetting("INPATIENT", {
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
    }).map((s) => s.id);
    expect(ip).toContain("templateCatalog");
    expect(ip).toContain("goalsOutcomes");
    expect(ip).toContain("legacyD3eStub");
    expect(resolveCarePlanWorkspaceSection("safety")).toBe("safety");
  });

  it("preserves nursing / RT / rehab / tech authorship boundaries", () => {
    expect(
      nursingAuthorshipNotOverwrittenByCarePlan({
        nursingAuthorUserId: "n1",
        carePlanEditorUserId: "cp1",
        storedNursingAuthorUserId: "n1",
      })
    ).toBe(true);
    expect(
      rtAuthorshipNotOverwrittenByCarePlan({
        rtAuthorUserId: "rt1",
        carePlanEditorUserId: "cp1",
        storedRtAuthorUserId: "rt1",
      })
    ).toBe(true);
    expect(
      rehabAuthorshipNotOverwrittenByCarePlan({
        rehabAuthorUserId: "pt1",
        carePlanEditorUserId: "cp1",
        storedRehabAuthorUserId: "pt1",
      })
    ).toBe(true);
    expect(
      techPerformerPreservedAfterCarePlanProgress({
        techPerformerUserId: "t1",
        carePlanEditorUserId: "cp1",
        storedPerformerUserId: "t1",
      })
    ).toBe(true);
  });

  it("distinguishes plan from diagnosis, order, discharge auth, and precaution activation", () => {
    expect(distinguishCarePlanFromDiagnosis({ diagnosisCode: "I50.9" }).planIsNotDiagnosis).toBe(
      true
    );
    expect(
      distinguishCarePlanInterventionFromProviderOrder({ relatedOrderId: "o1" })
        .interventionIsNotOrder
    ).toBe(true);
    expect(
      distinguishDischargeReadinessFromAuthorization({ dischargeAuthorized: true })
        .readinessIsNotAuthorization
    ).toBe(true);
    expect(
      distinguishSafetyRecommendationFromPrecautionActivation({ isolationActivated: true })
        .recommendationIsNotActivation
    ).toBe(true);
    expect(isCarePlanCapabilityProhibited("provider_order_create")).toBe(true);
    expect(isCarePlanCapabilityProhibited("auto_activate_from_diagnosis_alone")).toBe(true);
  });

  it("registers care_plan.* document types and adapts virtual docs on D4B.1", () => {
    for (const id of [
      "care_plan.activation",
      "care_plan.progress_evaluation",
      "care_plan.review",
      "care_plan.revision",
      "care_plan.completion",
      "care_plan.discontinuation",
      "care_plan.entered_in_error",
    ]) {
      const def = getEnterpriseClinicalDocumentType(id);
      expect(def, id).toBeTruthy();
      expect(def!.templateVersion).toBe("D4B.6");
      expect(def!.sourceArchitecture).toBe("REFERENCE_VIRTUAL");
    }
    const doc = adaptCarePlanVirtualDocument({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      documentId: "d1",
      documentTypeId: "care_plan.activation",
      body: "Activated fall risk plan",
      authorUserId: "nurse-1",
      createdAt: "2026-07-26T12:00:00.000Z",
      careSetting: "INPATIENT",
    });
    expect(doc.structured?.payload?.usesD4b1Lifecycle).toBe(true);
    expect(doc.structured?.payload?.independentCarePlanLifecycleEngine).toBe(false);
    expect(doc.structured?.payload?.doesNotAuthorizeDischarge).toBe(true);
  });

  it("resolves role profiles without treating assignment as authorization", () => {
    expect(resolveCarePlanRoleProfile(["RN"])).toBe("NURSE_CARE_PLAN_AUTHOR");
    expect(resolveCarePlanRoleProfile(["RT"])).toBe("RESPIRATORY_CONTRIBUTOR");
    expect(resolveCarePlanRoleProfile(["PT"])).toBe("REHAB_CONTRIBUTOR");
    expect(resolveCarePlanRoleProfile(["MD"])).toBe("PROVIDER_REVIEW_ONLY");
    expect(resolveCarePlanRoleProfile(["TECH"])).toBe("TECHNICIAN_PROGRESS_LIMITED");
    const summary = buildEnterpriseInterdisciplinaryCarePlansSummary({
      encounterId: "e",
      patientId: "p",
      facilityId: "f",
      careSetting: "INPATIENT",
      roleProfile: resolveCarePlanRoleProfile(["RN"]),
      nursingContributions: [{ cardId: "nursing_care_plan_update", authorUserId: "n1" }],
      rtContributions: [{ documentTypeId: "rt.care_plan_contribution", authorUserId: "rt1" }],
      rehabContributions: [
        { discipline: "PHYSICAL_THERAPY", documentTypeId: "pt.goals", authorUserId: "pt1" },
      ],
      techProgress: [{ activityId: "ambulate", performerUserId: "t1" }],
      legacyD3eStub: [{ itemId: "g1", discipline: "NURSING", goalText: "Legacy", status: "ACTIVE" }],
    });
    expect(summary.nursingContributions[0]?.carePlanMustNotOverwrite).toBe(true);
    expect(summary.rtContributions[0]?.contributionIsNotFullPlan).toBe(true);
    expect(summary.rehabContributions[0]?.isNotFullInterdisciplinaryCarePlan).toBe(true);
    expect(summary.techProgress[0]?.isTechnicianAuthored).toBe(true);
    expect(summary.legacyD3eStub[0]?.isNotAuthoritativeIdcp).toBe(true);
  });


  it("MEDUI.CP.1A clinician primary nav hides legacy and discipline walls", () => {
    const ip = carePlanWorkspaceSectionsForCareSetting("INPATIENT", {
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
      clinicianPrimaryNav: true,
      includeDeferred: false,
    }).map((s) => s.id);
    expect(ip).toEqual(
      expect.arrayContaining(["activePlans", "goalsOutcomes", "interventions", "progress", "history"])
    );
    expect(ip).not.toContain("legacyD3eStub");
    expect(ip).not.toContain("deferredBoundaries");
    expect(ip).not.toContain("nursingContributions");
    expect(ip).not.toContain("rtContributions");
  });

});
