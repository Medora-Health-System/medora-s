import { describe, expect, it, beforeEach } from "vitest";
import {
  ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
  activateClinicalRule,
  analyzeClinicalRuleConflicts,
  clearClinicalRulesCompileCache,
  evaluateClinicalRules,
  mergeEnterpriseClinicalRulesExecutionIntoSummary,
  readEnterpriseClinicalRulesExecutionDoc,
  rollbackClinicalRule,
  seedFacilityClinicalRulesCatalog,
  setClinicalRuleStatus,
  simulateClinicalRules,
  upsertClinicalRule,
  buildRuleContextFromOrchestrationEvent,
  enterpriseClinicalRulesEngineStarted,
  enterpriseClinicalRulesMustNotStartPlacement,
  type ClinicalRuleDefinitionV1,
} from "./enterpriseClinicalRulesEngineD4a28a.js";

const NOW = "2026-07-23T14:00:00.000Z";
const FAC = "fac-rules-1";

describe("MEDUI.ENTERPRISE_RULES_ENGINE.D4A2_8A shared", () => {
  beforeEach(() => {
    clearClinicalRulesCompileCache();
  });

  it("certifies rules engine started and placement blocked", () => {
    expect(ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID).toBe(
      "MEDUI.ENTERPRISE_RULES_ENGINE.D4A2_8A"
    );
    expect(enterpriseClinicalRulesEngineStarted()).toBe(true);
    expect(enterpriseClinicalRulesMustNotStartPlacement()).toBe(true);
  });

  it("seeds enterprise templates including critical K / stroke / sepsis", () => {
    const catalog = seedFacilityClinicalRulesCatalog(FAC, NOW);
    expect(catalog.rules.length).toBeGreaterThanOrEqual(10);
    expect(catalog.rules.some((r) => r.templateCode === "CRITICAL_K")).toBe(true);
    expect(catalog.rules.some((r) => r.templateCode === "STROKE")).toBe(true);
    expect(catalog.rules.some((r) => r.templateCode === "SEPSIS")).toBe(true);
    expect(catalog.rules.every((r) => r.status === "ACTIVE")).toBe(true);
  });

  it("evaluates critical K rule and STOPs after match", () => {
    const catalog = seedFacilityClinicalRulesCatalog(FAC, NOW);
    const result = evaluateClinicalRules({
      catalog,
      nowIso: NOW,
      actorUserId: "admin-1",
      context: {
        facilityId: FAC,
        patientId: "pat-1",
        encounterId: "enc-1",
        eventType: "CRITICAL_LAB",
        occurredAt: NOW,
        labCode: "K",
        labFlag: "CRITICAL",
      },
    });
    expect(result.simulated).toBe(false);
    expect(result.matchedRuleIds.some((id) => id.includes("critical-k"))).toBe(true);
    expect(result.stopped).toBe(true);
    expect(result.actions.some((a) => a.type === "ESCALATE")).toBe(true);
    expect(result.actions.some((a) => a.type === "NOTIFY")).toBe(true);
  });

  it("simulates without marking production executions as live", () => {
    const catalog = seedFacilityClinicalRulesCatalog(FAC, NOW);
    const sim = simulateClinicalRules({
      catalog,
      nowIso: NOW,
      context: buildRuleContextFromOrchestrationEvent({
        type: "CRITICAL_LAB",
        facilityId: FAC,
        patientId: "pat-1",
        encounterId: "enc-1",
        occurredAt: NOW,
        payload: { labCode: "TROPONIN", labFlag: "HIGH" },
      }),
    });
    expect(sim.simulated).toBe(true);
    expect(sim.executions.every((e) => e.simulated)).toBe(true);
    expect(sim.actions.some((a) => a.type === "CREATE_WORKFLOW")).toBe(true);
  });

  it("detects conflicts for duplicate workflow intents", () => {
    const catalog = seedFacilityClinicalRulesCatalog(FAC, NOW);
    const dup: ClinicalRuleDefinitionV1 = {
      ...catalog.rules.find((r) => r.templateCode === "TROPONIN")!,
      ruleId: "dup-troponin",
      name: "Dup troponin",
    };
    const conflicts = analyzeClinicalRuleConflicts({
      ...catalog,
      rules: [...catalog.rules, dup],
    });
    expect(conflicts.some((c) => c.code === "DUPLICATE_WORKFLOW_INTENT")).toBe(true);
  });

  it("versioning: immutable after activate; rollback creates draft", () => {
    let catalog = seedFacilityClinicalRulesCatalog(FAC, NOW);
    const rule = catalog.rules.find((r) => r.templateCode === "PAIN_REASSESS")!;
    // Seeded templates are already ACTIVE+immutable — new version path
    const edited = upsertClinicalRule({
      catalog,
      rule: { ...rule, name: "Pain reassessment v2", description: "Updated" },
      clientExpectedVersion: catalog.expectedVersion,
      actorUserId: "admin-1",
      nowIso: NOW,
      createNewVersionIfImmutable: true,
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    catalog = edited.catalog;
    expect(edited.rule.version).toBe(rule.version + 1);
    expect(edited.rule.status).toBe("DRAFT");
    expect(edited.rule.immutable).toBe(false);

    const activated = activateClinicalRule({
      catalog,
      ruleId: rule.ruleId,
      clientExpectedVersion: catalog.expectedVersion,
      actorUserId: "admin-1",
      nowIso: NOW,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    catalog = activated.catalog;
    expect(activated.rule.status).toBe("ACTIVE");
    expect(activated.rule.immutable).toBe(true);

    const rolled = rollbackClinicalRule({
      catalog,
      ruleId: rule.ruleId,
      toVersion: rule.version,
      clientExpectedVersion: catalog.expectedVersion,
      actorUserId: "admin-1",
      nowIso: NOW,
    });
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) return;
    expect(rolled.rule.status).toBe("DRAFT");
    expect(rolled.rule.version).toBeGreaterThan(rule.version);
  });

  it("admin can disable and archive rules", () => {
    let catalog = seedFacilityClinicalRulesCatalog(FAC, NOW);
    const ruleId = catalog.rules[0]!.ruleId;
    const disabled = setClinicalRuleStatus({
      catalog,
      ruleId,
      status: "DISABLED",
      clientExpectedVersion: catalog.expectedVersion,
      actorUserId: "admin-1",
      nowIso: NOW,
    });
    expect(disabled.ok).toBe(true);
    if (!disabled.ok) return;
    catalog = disabled.catalog;
    expect(disabled.rule.enabled).toBe(false);

    const archived = setClinicalRuleStatus({
      catalog,
      ruleId,
      status: "ARCHIVED",
      clientExpectedVersion: catalog.expectedVersion,
      actorUserId: "admin-1",
      nowIso: NOW,
    });
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    expect(archived.rule.status).toBe("ARCHIVED");
  });

  it("persists execution audit bag without breaking sibling keys", () => {
    const merged = mergeEnterpriseClinicalRulesExecutionIntoSummary(
      { enterpriseWorkflowOrchestrationV1: { version: 1 } },
      {
        version: 1,
        expectedVersion: 1,
        executions: [],
        updatedAt: NOW,
      }
    );
    expect(merged.enterpriseWorkflowOrchestrationV1).toEqual({ version: 1 });
    const read = readEnterpriseClinicalRulesExecutionDoc(merged);
    expect(read.expectedVersion).toBe(1);
  });

  it("rejects stale catalog CAS", () => {
    const catalog = seedFacilityClinicalRulesCatalog(FAC, NOW);
    const result = upsertClinicalRule({
      catalog,
      rule: { ...catalog.rules[0]!, name: "x" },
      clientExpectedVersion: 999,
      actorUserId: "admin-1",
      nowIso: NOW,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("CLINICAL_RULES_STALE");
  });
});
