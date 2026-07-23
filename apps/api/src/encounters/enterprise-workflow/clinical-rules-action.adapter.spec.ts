import {
  ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
  emptyEnterpriseWorkflowOrchestrationDoc,
  evaluateClinicalRules,
  seedFacilityClinicalRulesCatalog,
} from "@medora/shared";
import { ClinicalRulesActionAdapter } from "./clinical-rules-action.adapter";
import { EnterpriseWorkflowEngine } from "./enterprise-workflow.engine";

describe("ClinicalRulesActionAdapter D4A.2.8A", () => {
  const NOW = "2026-07-23T15:00:00.000Z";
  const adapter = new ClinicalRulesActionAdapter(new EnterpriseWorkflowEngine());

  it("applies CREATE_WORKFLOW / NOTIFY / ESCALATE via existing orchestration helpers", () => {
    const catalog = seedFacilityClinicalRulesCatalog("fac-1", NOW);
    const evaluation = evaluateClinicalRules({
      catalog,
      nowIso: NOW,
      actorUserId: "admin-1",
      context: {
        facilityId: "fac-1",
        patientId: "pat-1",
        encounterId: "enc-1",
        eventType: "CRITICAL_LAB",
        occurredAt: NOW,
        labCode: "TROPONIN",
        labFlag: "HIGH",
      },
    });
    expect(evaluation.certification).toBe(ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID);

    const applied = adapter.applyActions({
      doc: emptyEnterpriseWorkflowOrchestrationDoc(NOW),
      actions: evaluation.actions,
      evaluation,
      facilityId: "fac-1",
      patientId: "pat-1",
      hospitalEpisodeId: "hep-1",
      encounterId: "enc-1",
      actorUserId: "admin-1",
      nowIso: NOW,
      sourceEventId: "evt-1",
    });

    expect(applied.appliedActionTypes).toContain("CREATE_WORKFLOW");
    expect(applied.doc.workflows.some((w) => w.definitionCode === "CHEST_PAIN")).toBe(true);
    expect(applied.doc.notifications.length).toBeGreaterThan(0);
    expect(applied.doc.timeline.length).toBeGreaterThan(0);
  });

  it("simulation dry-run does not mutate orchestration doc", () => {
    const doc = emptyEnterpriseWorkflowOrchestrationDoc(NOW);
    const catalog = seedFacilityClinicalRulesCatalog("fac-1", NOW);
    const evaluation = evaluateClinicalRules({
      catalog,
      nowIso: NOW,
      simulated: true,
      context: {
        facilityId: "fac-1",
        patientId: "pat-1",
        encounterId: "enc-1",
        eventType: "CRITICAL_LAB",
        occurredAt: NOW,
        labCode: "K",
        labFlag: "CRITICAL",
      },
    });
    const applied = adapter.applyActions({
      doc,
      actions: evaluation.actions,
      evaluation,
      facilityId: "fac-1",
      patientId: "pat-1",
      hospitalEpisodeId: null,
      encounterId: "enc-1",
      actorUserId: "admin-1",
      nowIso: NOW,
      dryRun: true,
    });
    expect(applied.doc.workflows.length).toBe(0);
    expect(applied.doc.tasks.length).toBe(0);
    expect(applied.skipped.every((s) => s.reason === "SIMULATED")).toBe(true);
  });
});
