/**
 * D4A.2.8A — Enterprise Clinical Rules Engine API client.
 * UI calls APIs only — no rule evaluation logic in pages.
 */

import { apiFetch } from "@/lib/apiClient";
import type {
  ClinicalRuleDefinitionV1,
  ClinicalRuleEvaluationContextV1,
  ClinicalRuleEvaluationResultV1,
  ClinicalRuleConflictV1,
  ClinicalRuleStatus,
  EnterpriseClinicalRulesCatalogV1,
  ClinicalRuleEventType,
} from "@medora/shared";

const BASE = "/hospital-care/enterprise-clinical-rules";

export async function fetchClinicalRulesCatalog(): Promise<{
  certification: string;
  catalog: EnterpriseClinicalRulesCatalogV1;
  conflicts: ClinicalRuleConflictV1[];
  rulesEngineEnabled: true;
  placementEnabled: false;
}> {
  return apiFetch(`${BASE}/catalog`);
}

export async function fetchClinicalRulesConflicts(): Promise<{
  certification: string;
  conflicts: ClinicalRuleConflictV1[];
  expectedVersion: number;
}> {
  return apiFetch(`${BASE}/conflicts`);
}

export async function upsertClinicalRuleRemote(body: {
  rule: ClinicalRuleDefinitionV1;
  expectedVersion: number;
}) {
  return apiFetch(`${BASE}/rules`, {
    method: "PUT",
    body: JSON.stringify(body),
  }) as Promise<{
    certification: string;
    rule: ClinicalRuleDefinitionV1;
    catalog: EnterpriseClinicalRulesCatalogV1;
    conflicts: ClinicalRuleConflictV1[];
  }>;
}

export async function activateClinicalRuleRemote(
  ruleId: string,
  body: { expectedVersion: number }
) {
  return apiFetch(`${BASE}/rules/${encodeURIComponent(ruleId)}/activate`, {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<{
    certification: string;
    rule: ClinicalRuleDefinitionV1;
    catalog: EnterpriseClinicalRulesCatalogV1;
  }>;
}

export async function setClinicalRuleStatusRemote(
  ruleId: string,
  body: { status: ClinicalRuleStatus; expectedVersion: number }
) {
  return apiFetch(`${BASE}/rules/${encodeURIComponent(ruleId)}/status`, {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<{
    certification: string;
    rule: ClinicalRuleDefinitionV1;
    catalog: EnterpriseClinicalRulesCatalogV1;
  }>;
}

export async function rollbackClinicalRuleRemote(
  ruleId: string,
  body: { toVersion: number; expectedVersion: number }
) {
  return apiFetch(`${BASE}/rules/${encodeURIComponent(ruleId)}/rollback`, {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<{
    certification: string;
    rule: ClinicalRuleDefinitionV1;
    catalog: EnterpriseClinicalRulesCatalogV1;
  }>;
}

export async function simulateClinicalRulesRemote(body: {
  context: ClinicalRuleEvaluationContextV1;
}): Promise<{
  certification: string;
  result: ClinicalRuleEvaluationResultV1;
  sideEffectsApplied: false;
}> {
  return apiFetch(`${BASE}/simulate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function evaluateClinicalRulesOnEncounter(
  encounterId: string,
  body: {
    eventType: ClinicalRuleEventType;
    expectedVersion: number;
    payload?: Record<string, unknown> | null;
    simulated?: boolean;
  }
) {
  return apiFetch(
    `${BASE}/encounters/${encodeURIComponent(encounterId)}/evaluate`,
    { method: "POST", body: JSON.stringify(body) }
  );
}
