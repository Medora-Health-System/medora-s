/**
 * D4A.2.8A — Clinical Rules Engine (Nest adapter over shared contracts).
 * Decides WHAT; does not own Task/Workflow stores.
 */

import { Injectable } from "@nestjs/common";
import {
  activateClinicalRule,
  analyzeClinicalRuleConflicts,
  evaluateClinicalRules,
  rollbackClinicalRule,
  setClinicalRuleStatus,
  simulateClinicalRules,
  upsertClinicalRule,
  type ClinicalRuleDefinitionV1,
  type ClinicalRuleEvaluationContextV1,
  type ClinicalRuleStatus,
  type EnterpriseClinicalRulesCatalogV1,
} from "@medora/shared";

@Injectable()
export class ClinicalRulesEngine {
  analyzeConflicts(catalog: EnterpriseClinicalRulesCatalogV1) {
    return analyzeClinicalRuleConflicts(catalog);
  }

  evaluate(
    catalog: EnterpriseClinicalRulesCatalogV1,
    context: ClinicalRuleEvaluationContextV1,
    actorUserId: string,
    nowIso: string,
    simulated = false
  ) {
    return evaluateClinicalRules({
      catalog,
      context,
      actorUserId,
      nowIso,
      simulated,
    });
  }

  simulate(
    catalog: EnterpriseClinicalRulesCatalogV1,
    context: ClinicalRuleEvaluationContextV1,
    actorUserId: string,
    nowIso: string
  ) {
    return simulateClinicalRules({ catalog, context, actorUserId, nowIso });
  }

  upsert(
    catalog: EnterpriseClinicalRulesCatalogV1,
    rule: ClinicalRuleDefinitionV1,
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string,
    createNewVersionIfImmutable = true
  ) {
    return upsertClinicalRule({
      catalog,
      rule,
      clientExpectedVersion,
      actorUserId,
      nowIso,
      createNewVersionIfImmutable,
    });
  }

  activate(
    catalog: EnterpriseClinicalRulesCatalogV1,
    ruleId: string,
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string
  ) {
    return activateClinicalRule({
      catalog,
      ruleId,
      clientExpectedVersion,
      actorUserId,
      nowIso,
    });
  }

  setStatus(
    catalog: EnterpriseClinicalRulesCatalogV1,
    ruleId: string,
    status: ClinicalRuleStatus,
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string
  ) {
    return setClinicalRuleStatus({
      catalog,
      ruleId,
      status,
      clientExpectedVersion,
      actorUserId,
      nowIso,
    });
  }

  rollback(
    catalog: EnterpriseClinicalRulesCatalogV1,
    ruleId: string,
    toVersion: number,
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string
  ) {
    return rollbackClinicalRule({
      catalog,
      ruleId,
      toVersion,
      clientExpectedVersion,
      actorUserId,
      nowIso,
    });
  }
}
