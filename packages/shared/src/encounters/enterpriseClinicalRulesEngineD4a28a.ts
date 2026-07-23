/**
 * D4A.2.8A — Enterprise Clinical Rules Engine contracts.
 *
 * Rules decide WHAT (WHEN / IF / THEN / ELSE / STOP).
 * D4A.2.8 Workflow / Task / Event / Escalation / Notification / Timeline engines EXECUTE.
 * Zero-migration: facility catalog key + encounter execution audit bag.
 * Placement / bed / AI / scheduling / secure chat / ML: NOT started.
 */

import {
  CLINICAL_ORCHESTRATION_EVENT_TYPES,
  ENTERPRISE_TASK_PRIORITY_V1,
  ENTERPRISE_TASK_TYPE_V1,
  ENTERPRISE_WORKFLOW_DEPARTMENTS,
  ESCALATION_CHAIN_TEMPLATE_CODES,
  type ClinicalOrchestrationEventType,
  type EnterpriseTaskPriorityV1,
  type EnterpriseTaskTypeV1,
  type EnterpriseWorkflowDepartment,
  type EscalationChainTemplateCode,
} from "./enterpriseWorkflowEngineD4a28.js";

export const ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_RULES_ENGINE.D4A2_8A" as const;

/** Facility-scoped rules catalog (JSON bag / file / overlay). */
export const ENTERPRISE_CLINICAL_RULES_V1_KEY = "enterpriseClinicalRulesV1" as const;

/** Encounter-scoped execution audit (sibling to orchestration V1 — does not mutate it). */
export const ENTERPRISE_CLINICAL_RULES_EXECUTION_V1_KEY =
  "enterpriseClinicalRulesExecutionV1" as const;

export const ENTERPRISE_CLINICAL_RULES_ENGINE_STARTED = true as const;
export const ENTERPRISE_CLINICAL_RULES_PLACEMENT_STARTED = false as const;

export const CLINICAL_RULE_STATUSES = [
  "DRAFT",
  "TESTING",
  "ACTIVE",
  "DISABLED",
  "ARCHIVED",
] as const;
export type ClinicalRuleStatus = (typeof CLINICAL_RULE_STATUSES)[number];

export const CLINICAL_RULE_PRIORITIES = [
  "EMERGENCY",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;
export type ClinicalRulePriority = (typeof CLINICAL_RULE_PRIORITIES)[number];

export const CLINICAL_RULE_CATEGORIES = [
  "CRITICAL_LAB",
  "CARDIAC",
  "NEURO",
  "SEPSIS",
  "MEDICATION",
  "PAIN",
  "FALL_RESTRAINT",
  "ADMISSION_DISCHARGE",
  "QUALITY",
  "GENERAL",
] as const;
export type ClinicalRuleCategory = (typeof CLINICAL_RULE_CATEGORIES)[number];

/** Rule WHEN events — includes orchestration events + clinical policy extensions. */
export const CLINICAL_RULE_EVENT_TYPES = [
  ...CLINICAL_ORCHESTRATION_EVENT_TYPES,
  "LAB_RESULT_POSTED",
  "VITALS_RECORDED",
  "PAIN_SCORE_RECORDED",
  "FALL_RISK_IDENTIFIED",
  "RESTRAINT_APPLIED",
  "SEPSIS_SCREEN_POSITIVE",
  "STROKE_ALERT",
  "STEMI_ALERT",
  "MEDICATION_DUE",
  "MEDICATION_MISSED",
  "DISCHARGE_INITIATED",
] as const;
export type ClinicalRuleEventType = (typeof CLINICAL_RULE_EVENT_TYPES)[number];

export const CLINICAL_RULE_CONDITION_OPS = [
  "EQ",
  "NEQ",
  "GT",
  "GTE",
  "LT",
  "LTE",
  "IN",
  "NOT_IN",
  "EXISTS",
  "CONTAINS",
] as const;
export type ClinicalRuleConditionOp = (typeof CLINICAL_RULE_CONDITION_OPS)[number];

export const CLINICAL_RULE_CONDITION_FIELDS = [
  "ageYears",
  "location",
  "department",
  "medicationPriority",
  "labCode",
  "labValue",
  "labFlag",
  "taskStatus",
  "taskType",
  "painScore",
  "fallRiskScore",
  "sepsisScore",
  "nihssScore",
  "customVar",
  "eventType",
  "facilityId",
] as const;
export type ClinicalRuleConditionField =
  (typeof CLINICAL_RULE_CONDITION_FIELDS)[number];

export type ClinicalRuleConditionLeafV1 = {
  kind: "LEAF";
  field: ClinicalRuleConditionField;
  op: ClinicalRuleConditionOp;
  value?: unknown;
  /** When field === customVar */
  customKey?: string | null;
};

export type ClinicalRuleConditionGroupV1 = {
  kind: "GROUP";
  logic: "AND" | "OR";
  children: ClinicalRuleConditionNodeV1[];
};

export type ClinicalRuleConditionNodeV1 =
  | ClinicalRuleConditionLeafV1
  | ClinicalRuleConditionGroupV1;

export const CLINICAL_RULE_ACTION_TYPES = [
  "CREATE_WORKFLOW",
  "CREATE_TASK",
  "ASSIGN_TASK",
  "NOTIFY",
  "ESCALATE",
  "SLA_TIMER",
  "TIMELINE",
  "FLAG",
  "REQUIRE_ACK",
  "REQUIRE_SIGNATURE",
  "REQUIRE_DOCS",
  "QUALITY_MEASURE",
  "AUDIT",
  "STOP",
] as const;
export type ClinicalRuleActionType = (typeof CLINICAL_RULE_ACTION_TYPES)[number];

export type ClinicalRuleActionV1 = {
  actionId: string;
  type: ClinicalRuleActionType;
  /** Workflow definition code for CREATE_WORKFLOW */
  workflowDefinitionCode?: string | null;
  taskType?: EnterpriseTaskTypeV1 | null;
  taskTitle?: string | null;
  taskPriority?: EnterpriseTaskPriorityV1 | null;
  department?: EnterpriseWorkflowDepartment | null;
  assignToRole?: string | null;
  escalationTemplateCode?: EscalationChainTemplateCode | null;
  slaMinutes?: number | null;
  timelineTitle?: string | null;
  flagCode?: string | null;
  qualityMeasureCode?: string | null;
  message?: string | null;
  requireDocCodes?: string[] | null;
};

export type ClinicalRuleScopeV1 = {
  facilityId: string | null;
  hospitalId?: string | null;
  department?: EnterpriseWorkflowDepartment | null;
};

export type ClinicalRuleDefinitionV1 = {
  ruleId: string;
  name: string;
  description?: string | null;
  scope: ClinicalRuleScopeV1;
  enabled: boolean;
  priority: ClinicalRulePriority;
  category: ClinicalRuleCategory;
  version: number;
  status: ClinicalRuleStatus;
  whenEvent: ClinicalRuleEventType;
  ifCondition: ClinicalRuleConditionNodeV1;
  thenActions: ClinicalRuleActionV1[];
  elseActions: ClinicalRuleActionV1[];
  stopOnMatch: boolean;
  effectiveAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  createdByUserId?: string | null;
  modifiedAt: string;
  modifiedByUserId?: string | null;
  /** Template code if seeded from enterprise template */
  templateCode?: string | null;
  /** Immutable once activated — edits create a new version */
  immutable: boolean;
};

export type ClinicalRuleVersionHistoryEntryV1 = {
  ruleId: string;
  version: number;
  snapshot: ClinicalRuleDefinitionV1;
  activatedAt?: string | null;
  archivedAt?: string | null;
  byUserId?: string | null;
  note?: string | null;
};

export type ClinicalRuleExecutionEntryV1 = {
  executionId: string;
  ruleId: string;
  ruleVersion: number;
  eventType: ClinicalRuleEventType;
  facilityId: string;
  encounterId: string;
  patientId: string;
  matched: boolean;
  stopped: boolean;
  simulated: boolean;
  actionsApplied: ClinicalRuleActionV1[];
  at: string;
  byUserId?: string | null;
  notes?: string | null;
};

export type EnterpriseClinicalRulesCatalogV1 = {
  version: 1;
  facilityId: string;
  expectedVersion: number;
  rules: ClinicalRuleDefinitionV1[];
  history: ClinicalRuleVersionHistoryEntryV1[];
  updatedAt: string;
  updatedByUserId?: string | null;
};

export type EnterpriseClinicalRulesExecutionDocV1 = {
  version: 1;
  expectedVersion: number;
  executions: ClinicalRuleExecutionEntryV1[];
  updatedAt: string;
};

export type ClinicalRuleEvaluationContextV1 = {
  facilityId: string;
  patientId: string;
  encounterId: string;
  hospitalEpisodeId?: string | null;
  eventType: ClinicalRuleEventType;
  occurredAt: string;
  ageYears?: number | null;
  location?: string | null;
  department?: EnterpriseWorkflowDepartment | null;
  medicationPriority?: EnterpriseTaskPriorityV1 | null;
  labCode?: string | null;
  labValue?: number | null;
  labFlag?: string | null;
  taskStatus?: string | null;
  taskType?: EnterpriseTaskTypeV1 | null;
  painScore?: number | null;
  fallRiskScore?: number | null;
  sepsisScore?: number | null;
  nihssScore?: number | null;
  customVars?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
};

export type ClinicalRuleConflictV1 = {
  severity: "ERROR" | "WARNING";
  code: string;
  message: string;
  ruleIds: string[];
};

export type ClinicalRuleEvaluationResultV1 = {
  certification: typeof ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID;
  simulated: boolean;
  eventType: ClinicalRuleEventType;
  matchedRuleIds: string[];
  stopped: boolean;
  stopReason?: string | null;
  actions: ClinicalRuleActionV1[];
  executions: ClinicalRuleExecutionEntryV1[];
  conflicts: ClinicalRuleConflictV1[];
};

/** Compiled rule for in-process cache (no streaming). */
export type CompiledClinicalRuleV1 = {
  rule: ClinicalRuleDefinitionV1;
  priorityRank: number;
  evaluateIf: (ctx: ClinicalRuleEvaluationContextV1) => boolean;
};

/* ─── Priority ranking ─── */

export function clinicalRulePriorityRank(p: ClinicalRulePriority): number {
  switch (p) {
    case "EMERGENCY":
      return 5;
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

/* ─── Catalog helpers ─── */

export function emptyEnterpriseClinicalRulesCatalog(
  facilityId: string,
  nowIso?: string
): EnterpriseClinicalRulesCatalogV1 {
  return {
    version: 1,
    facilityId,
    expectedVersion: 0,
    rules: [],
    history: [],
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

export function emptyEnterpriseClinicalRulesExecutionDoc(
  nowIso?: string
): EnterpriseClinicalRulesExecutionDocV1 {
  return {
    version: 1,
    expectedVersion: 0,
    executions: [],
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

export function readEnterpriseClinicalRulesExecutionDoc(
  admissionSummaryJson: unknown
): EnterpriseClinicalRulesExecutionDocV1 {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object") {
    return emptyEnterpriseClinicalRulesExecutionDoc();
  }
  const raw = (admissionSummaryJson as Record<string, unknown>)[
    ENTERPRISE_CLINICAL_RULES_EXECUTION_V1_KEY
  ];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyEnterpriseClinicalRulesExecutionDoc();
  }
  const doc = raw as EnterpriseClinicalRulesExecutionDocV1;
  return {
    ...emptyEnterpriseClinicalRulesExecutionDoc(),
    ...doc,
    version: 1,
    executions: Array.isArray(doc.executions) ? doc.executions : [],
  };
}

export function mergeEnterpriseClinicalRulesExecutionIntoSummary(
  admissionSummaryJson: unknown,
  doc: EnterpriseClinicalRulesExecutionDocV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson &&
    typeof admissionSummaryJson === "object" &&
    !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[ENTERPRISE_CLINICAL_RULES_EXECUTION_V1_KEY] = doc;
  return base;
}

export function assertRulesCatalogCas(
  catalog: EnterpriseClinicalRulesCatalogV1,
  clientExpectedVersion: number
): { ok: true } | { ok: false; code: "CLINICAL_RULES_STALE" } {
  if (Number(clientExpectedVersion) !== catalog.expectedVersion) {
    return { ok: false, code: "CLINICAL_RULES_STALE" };
  }
  return { ok: true };
}

function bumpCatalog(
  catalog: EnterpriseClinicalRulesCatalogV1,
  actorUserId: string | null | undefined,
  nowIso: string
): EnterpriseClinicalRulesCatalogV1 {
  return {
    ...catalog,
    expectedVersion: catalog.expectedVersion + 1,
    updatedAt: nowIso,
    updatedByUserId: actorUserId ?? null,
  };
}

function isRuleEffective(rule: ClinicalRuleDefinitionV1, nowIso: string): boolean {
  if (rule.effectiveAt && rule.effectiveAt > nowIso) return false;
  if (rule.expiresAt && rule.expiresAt <= nowIso) return false;
  return true;
}

/* ─── Condition evaluation ─── */

function resolveFieldValue(
  field: ClinicalRuleConditionField,
  ctx: ClinicalRuleEvaluationContextV1,
  customKey?: string | null
): unknown {
  switch (field) {
    case "ageYears":
      return ctx.ageYears ?? null;
    case "location":
      return ctx.location ?? null;
    case "department":
      return ctx.department ?? null;
    case "medicationPriority":
      return ctx.medicationPriority ?? null;
    case "labCode":
      return ctx.labCode ?? null;
    case "labValue":
      return ctx.labValue ?? null;
    case "labFlag":
      return ctx.labFlag ?? null;
    case "taskStatus":
      return ctx.taskStatus ?? null;
    case "taskType":
      return ctx.taskType ?? null;
    case "painScore":
      return ctx.painScore ?? null;
    case "fallRiskScore":
      return ctx.fallRiskScore ?? null;
    case "sepsisScore":
      return ctx.sepsisScore ?? null;
    case "nihssScore":
      return ctx.nihssScore ?? null;
    case "eventType":
      return ctx.eventType;
    case "facilityId":
      return ctx.facilityId;
    case "customVar":
      return customKey ? ctx.customVars?.[customKey] ?? null : null;
    default:
      return null;
  }
}

function compareValues(
  left: unknown,
  op: ClinicalRuleConditionOp,
  right: unknown
): boolean {
  switch (op) {
    case "EXISTS":
      return left != null && left !== "";
    case "EQ":
      return left === right;
    case "NEQ":
      return left !== right;
    case "GT":
      return Number(left) > Number(right);
    case "GTE":
      return Number(left) >= Number(right);
    case "LT":
      return Number(left) < Number(right);
    case "LTE":
      return Number(left) <= Number(right);
    case "IN":
      return Array.isArray(right) && right.includes(left as never);
    case "NOT_IN":
      return Array.isArray(right) && !right.includes(left as never);
    case "CONTAINS":
      return typeof left === "string" && typeof right === "string"
        ? left.toLowerCase().includes(right.toLowerCase())
        : false;
    default:
      return false;
  }
}

export function evaluateConditionNode(
  node: ClinicalRuleConditionNodeV1,
  ctx: ClinicalRuleEvaluationContextV1
): boolean {
  if (node.kind === "LEAF") {
    const left = resolveFieldValue(node.field, ctx, node.customKey);
    return compareValues(left, node.op, node.value);
  }
  if (!node.children.length) return true;
  if (node.logic === "AND") {
    return node.children.every((c) => evaluateConditionNode(c, ctx));
  }
  return node.children.some((c) => evaluateConditionNode(c, ctx));
}

/* ─── Compile / cache ─── */

const compiledCache = new Map<string, CompiledClinicalRuleV1>();

export function compileClinicalRule(
  rule: ClinicalRuleDefinitionV1
): CompiledClinicalRuleV1 {
  const cacheKey = `${rule.ruleId}:v${rule.version}:${rule.modifiedAt}`;
  const hit = compiledCache.get(cacheKey);
  if (hit) return hit;
  const compiled: CompiledClinicalRuleV1 = {
    rule,
    priorityRank: clinicalRulePriorityRank(rule.priority),
    evaluateIf: (ctx) => evaluateConditionNode(rule.ifCondition, ctx),
  };
  compiledCache.set(cacheKey, compiled);
  if (compiledCache.size > 500) {
    const first = compiledCache.keys().next().value;
    if (first) compiledCache.delete(first);
  }
  return compiled;
}

export function clearClinicalRulesCompileCache(): void {
  compiledCache.clear();
}

export function listActiveCompiledRules(
  catalog: EnterpriseClinicalRulesCatalogV1,
  nowIso: string,
  eventType: ClinicalRuleEventType
): CompiledClinicalRuleV1[] {
  return catalog.rules
    .filter(
      (r) =>
        r.enabled &&
        r.status === "ACTIVE" &&
        r.whenEvent === eventType &&
        isRuleEffective(r, nowIso) &&
        (r.scope.facilityId == null || r.scope.facilityId === catalog.facilityId)
    )
    .map(compileClinicalRule)
    .sort((a, b) => {
      if (b.priorityRank !== a.priorityRank) return b.priorityRank - a.priorityRank;
      return a.rule.ruleId.localeCompare(b.rule.ruleId);
    });
}

/* ─── Conflict analyzer ─── */

export function analyzeClinicalRuleConflicts(
  catalog: EnterpriseClinicalRulesCatalogV1
): ClinicalRuleConflictV1[] {
  const conflicts: ClinicalRuleConflictV1[] = [];
  const active = catalog.rules.filter(
    (r) => r.enabled && (r.status === "ACTIVE" || r.status === "TESTING")
  );

  const byEvent = new Map<string, ClinicalRuleDefinitionV1[]>();
  for (const r of active) {
    const list = byEvent.get(r.whenEvent) ?? [];
    list.push(r);
    byEvent.set(r.whenEvent, list);
  }

  for (const [eventType, rules] of byEvent) {
    const byPriority = new Map<string, ClinicalRuleDefinitionV1[]>();
    for (const r of rules) {
      const k = r.priority;
      const list = byPriority.get(k) ?? [];
      list.push(r);
      byPriority.set(k, list);
    }
    for (const [, group] of byPriority) {
      if (group.length < 2) continue;
      const stoppers = group.filter((r) => r.stopOnMatch);
      if (stoppers.length > 1) {
        conflicts.push({
          severity: "WARNING",
          code: "MULTIPLE_STOP_SAME_PRIORITY",
          message: `Multiple STOP rules at same priority for ${eventType}`,
          ruleIds: stoppers.map((r) => r.ruleId),
        });
      }
      const workflowCodes = new Map<string, string[]>();
      for (const r of group) {
        for (const a of r.thenActions) {
          if (a.type === "CREATE_WORKFLOW" && a.workflowDefinitionCode) {
            const ids = workflowCodes.get(a.workflowDefinitionCode) ?? [];
            ids.push(r.ruleId);
            workflowCodes.set(a.workflowDefinitionCode, ids);
          }
        }
      }
      for (const [code, ruleIds] of workflowCodes) {
        if (ruleIds.length > 1) {
          conflicts.push({
            severity: "WARNING",
            code: "DUPLICATE_WORKFLOW_INTENT",
            message: `Multiple rules create workflow ${code} on ${eventType}`,
            ruleIds: [...new Set(ruleIds)],
          });
        }
      }
    }
  }

  for (const r of catalog.rules) {
    if (r.status === "ACTIVE" && !r.enabled) {
      conflicts.push({
        severity: "ERROR",
        code: "ACTIVE_BUT_DISABLED",
        message: `Rule ${r.ruleId} is ACTIVE but disabled`,
        ruleIds: [r.ruleId],
      });
    }
    if (r.thenActions.length === 0 && r.elseActions.length === 0) {
      conflicts.push({
        severity: "WARNING",
        code: "NO_ACTIONS",
        message: `Rule ${r.ruleId} has no THEN/ELSE actions`,
        ruleIds: [r.ruleId],
      });
    }
  }

  return conflicts;
}

/* ─── Evaluation / simulation ─── */

export function evaluateClinicalRules(input: {
  catalog: EnterpriseClinicalRulesCatalogV1;
  context: ClinicalRuleEvaluationContextV1;
  simulated?: boolean;
  actorUserId?: string | null;
  nowIso: string;
  executionIdFactory?: () => string;
}): ClinicalRuleEvaluationResultV1 {
  const simulated = input.simulated === true;
  const compiled = listActiveCompiledRules(
    input.catalog,
    input.nowIso,
    input.context.eventType
  );
  const conflicts = analyzeClinicalRuleConflicts(input.catalog).filter((c) =>
    compiled.some((r) => c.ruleIds.includes(r.rule.ruleId))
  );

  const matchedRuleIds: string[] = [];
  const actions: ClinicalRuleActionV1[] = [];
  const executions: ClinicalRuleExecutionEntryV1[] = [];
  let stopped = false;
  let stopReason: string | null = null;
  let seq = 0;

  for (const c of compiled) {
    if (stopped) break;
    const matched = c.evaluateIf(input.context);
    const applied = matched ? c.rule.thenActions : c.rule.elseActions;
    if (matched) matchedRuleIds.push(c.rule.ruleId);

    const hasStop = applied.some((a) => a.type === "STOP") || (matched && c.rule.stopOnMatch);
    const filtered = applied.filter((a) => a.type !== "STOP");
    actions.push(...filtered);

    executions.push({
      executionId:
        input.executionIdFactory?.() ??
        `rex-${c.rule.ruleId}-v${c.rule.version}-${seq++}`,
      ruleId: c.rule.ruleId,
      ruleVersion: c.rule.version,
      eventType: input.context.eventType,
      facilityId: input.context.facilityId,
      encounterId: input.context.encounterId,
      patientId: input.context.patientId,
      matched,
      stopped: hasStop,
      simulated,
      actionsApplied: filtered,
      at: input.nowIso,
      byUserId: input.actorUserId ?? null,
    });

    if (hasStop) {
      stopped = true;
      stopReason = matched
        ? `STOP after rule ${c.rule.ruleId}`
        : `STOP via ELSE on rule ${c.rule.ruleId}`;
    }
  }

  return {
    certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
    simulated,
    eventType: input.context.eventType,
    matchedRuleIds,
    stopped,
    stopReason,
    actions,
    executions,
    conflicts,
  };
}

export function simulateClinicalRules(input: {
  catalog: EnterpriseClinicalRulesCatalogV1;
  context: ClinicalRuleEvaluationContextV1;
  actorUserId?: string | null;
  nowIso: string;
}): ClinicalRuleEvaluationResultV1 {
  return evaluateClinicalRules({ ...input, simulated: true });
}

/* ─── Lifecycle mutations ─── */

export type UpsertClinicalRuleResult =
  | { ok: true; catalog: EnterpriseClinicalRulesCatalogV1; rule: ClinicalRuleDefinitionV1 }
  | {
      ok: false;
      code:
        | "CLINICAL_RULES_STALE"
        | "RULE_IMMUTABLE"
        | "INVALID_RULE"
        | "RULE_NOT_FOUND";
    };

function validateRuleShape(rule: ClinicalRuleDefinitionV1): boolean {
  if (!rule.ruleId?.trim() || !rule.name?.trim()) return false;
  if (!(CLINICAL_RULE_EVENT_TYPES as readonly string[]).includes(rule.whenEvent)) {
    return false;
  }
  if (!(CLINICAL_RULE_PRIORITIES as readonly string[]).includes(rule.priority)) {
    return false;
  }
  if (!(CLINICAL_RULE_STATUSES as readonly string[]).includes(rule.status)) {
    return false;
  }
  return true;
}

export function upsertClinicalRule(input: {
  catalog: EnterpriseClinicalRulesCatalogV1;
  rule: ClinicalRuleDefinitionV1;
  clientExpectedVersion: number;
  actorUserId: string;
  nowIso: string;
  /** When true, allow editing an ACTIVE rule by creating next version */
  createNewVersionIfImmutable?: boolean;
}): UpsertClinicalRuleResult {
  const cas = assertRulesCatalogCas(input.catalog, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  if (!validateRuleShape(input.rule)) return { ok: false, code: "INVALID_RULE" };

  const existing = input.catalog.rules.find((r) => r.ruleId === input.rule.ruleId);
  if (existing?.immutable && existing.status === "ACTIVE") {
    if (!input.createNewVersionIfImmutable) {
      return { ok: false, code: "RULE_IMMUTABLE" };
    }
    const nextVersion = existing.version + 1;
    const next: ClinicalRuleDefinitionV1 = {
      ...input.rule,
      ruleId: existing.ruleId,
      version: nextVersion,
      status: input.rule.status === "ACTIVE" ? "DRAFT" : input.rule.status,
      immutable: false,
      createdAt: existing.createdAt,
      createdByUserId: existing.createdByUserId,
      modifiedAt: input.nowIso,
      modifiedByUserId: input.actorUserId,
    };
    const history: ClinicalRuleVersionHistoryEntryV1 = {
      ruleId: existing.ruleId,
      version: existing.version,
      snapshot: existing,
      archivedAt: input.nowIso,
      byUserId: input.actorUserId,
      note: "Superseded by new version",
    };
    const rules = input.catalog.rules.map((r) =>
      r.ruleId === existing.ruleId ? next : r
    );
    const catalog = bumpCatalog(
      {
        ...input.catalog,
        rules,
        history: [...input.catalog.history, history],
      },
      input.actorUserId,
      input.nowIso
    );
    return { ok: true, catalog, rule: next };
  }

  const merged: ClinicalRuleDefinitionV1 = {
    ...(existing ?? input.rule),
    ...input.rule,
    modifiedAt: input.nowIso,
    modifiedByUserId: input.actorUserId,
    createdAt: existing?.createdAt ?? input.rule.createdAt ?? input.nowIso,
    createdByUserId: existing?.createdByUserId ?? input.actorUserId,
    immutable: existing?.immutable ?? false,
  };

  const rules = existing
    ? input.catalog.rules.map((r) => (r.ruleId === merged.ruleId ? merged : r))
    : [...input.catalog.rules, merged];

  return {
    ok: true,
    catalog: bumpCatalog({ ...input.catalog, rules }, input.actorUserId, input.nowIso),
    rule: merged,
  };
}

export function activateClinicalRule(input: {
  catalog: EnterpriseClinicalRulesCatalogV1;
  ruleId: string;
  clientExpectedVersion: number;
  actorUserId: string;
  nowIso: string;
}): UpsertClinicalRuleResult {
  const cas = assertRulesCatalogCas(input.catalog, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  const existing = input.catalog.rules.find((r) => r.ruleId === input.ruleId);
  if (!existing) return { ok: false, code: "RULE_NOT_FOUND" };
  if (!validateRuleShape(existing)) return { ok: false, code: "INVALID_RULE" };

  const activated: ClinicalRuleDefinitionV1 = {
    ...existing,
    status: "ACTIVE",
    enabled: true,
    immutable: true,
    modifiedAt: input.nowIso,
    modifiedByUserId: input.actorUserId,
  };
  const history: ClinicalRuleVersionHistoryEntryV1 = {
    ruleId: activated.ruleId,
    version: activated.version,
    snapshot: activated,
    activatedAt: input.nowIso,
    byUserId: input.actorUserId,
    note: "Activated",
  };
  const rules = input.catalog.rules.map((r) =>
    r.ruleId === activated.ruleId ? activated : r
  );
  return {
    ok: true,
    catalog: bumpCatalog(
      { ...input.catalog, rules, history: [...input.catalog.history, history] },
      input.actorUserId,
      input.nowIso
    ),
    rule: activated,
  };
}

export function setClinicalRuleStatus(input: {
  catalog: EnterpriseClinicalRulesCatalogV1;
  ruleId: string;
  status: ClinicalRuleStatus;
  clientExpectedVersion: number;
  actorUserId: string;
  nowIso: string;
}): UpsertClinicalRuleResult {
  const cas = assertRulesCatalogCas(input.catalog, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  const existing = input.catalog.rules.find((r) => r.ruleId === input.ruleId);
  if (!existing) return { ok: false, code: "RULE_NOT_FOUND" };

  const next: ClinicalRuleDefinitionV1 = {
    ...existing,
    status: input.status,
    enabled: input.status === "ACTIVE" ? true : input.status === "DISABLED" || input.status === "ARCHIVED" ? false : existing.enabled,
    immutable: input.status === "ACTIVE" ? true : existing.immutable,
    modifiedAt: input.nowIso,
    modifiedByUserId: input.actorUserId,
  };
  const rules = input.catalog.rules.map((r) =>
    r.ruleId === next.ruleId ? next : r
  );
  return {
    ok: true,
    catalog: bumpCatalog({ ...input.catalog, rules }, input.actorUserId, input.nowIso),
    rule: next,
  };
}

/**
 * Rollback = archive current ACTIVE and re-activate a prior version snapshot as a NEW version.
 */
export function rollbackClinicalRule(input: {
  catalog: EnterpriseClinicalRulesCatalogV1;
  ruleId: string;
  toVersion: number;
  clientExpectedVersion: number;
  actorUserId: string;
  nowIso: string;
}): UpsertClinicalRuleResult {
  const cas = assertRulesCatalogCas(input.catalog, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  const historyEntry = input.catalog.history.find(
    (h) => h.ruleId === input.ruleId && h.version === input.toVersion
  );
  if (!historyEntry) return { ok: false, code: "RULE_NOT_FOUND" };

  const current = input.catalog.rules.find((r) => r.ruleId === input.ruleId);
  const baseVersion = current?.version ?? historyEntry.version;
  const restored: ClinicalRuleDefinitionV1 = {
    ...historyEntry.snapshot,
    version: baseVersion + 1,
    status: "DRAFT",
    enabled: false,
    immutable: false,
    modifiedAt: input.nowIso,
    modifiedByUserId: input.actorUserId,
  };

  const histCurrent: ClinicalRuleVersionHistoryEntryV1 | null = current
    ? {
        ruleId: input.ruleId,
        version: current.version,
        snapshot: current,
        archivedAt: input.nowIso,
        byUserId: input.actorUserId,
        note: "Archived before rollback",
      }
    : null;

  const rules = current
    ? input.catalog.rules.map((r) => (r.ruleId === input.ruleId ? restored : r))
    : [...input.catalog.rules, restored];

  const hist: ClinicalRuleVersionHistoryEntryV1 = {
    ruleId: input.ruleId,
    version: restored.version,
    snapshot: restored,
    byUserId: input.actorUserId,
    note: `Rollback draft from v${input.toVersion}`,
  };

  return {
    ok: true,
    catalog: bumpCatalog(
      {
        ...input.catalog,
        rules,
        history: [
          ...input.catalog.history,
          ...(histCurrent ? [histCurrent] : []),
          hist,
        ],
      },
      input.actorUserId,
      input.nowIso
    ),
    rule: restored,
  };
}

export function appendRuleExecutions(
  doc: EnterpriseClinicalRulesExecutionDocV1,
  executions: ClinicalRuleExecutionEntryV1[],
  nowIso: string
): EnterpriseClinicalRulesExecutionDocV1 {
  return {
    ...doc,
    expectedVersion: doc.expectedVersion + 1,
    executions: [...doc.executions, ...executions].slice(-200),
    updatedAt: nowIso,
  };
}

/* ─── Map orchestration event → rule event ─── */

export function mapOrchestrationEventToRuleEvent(
  type: ClinicalOrchestrationEventType
): ClinicalRuleEventType {
  return type;
}

export function buildRuleContextFromOrchestrationEvent(input: {
  type: ClinicalOrchestrationEventType;
  facilityId: string;
  patientId: string;
  encounterId: string;
  hospitalEpisodeId?: string | null;
  occurredAt: string;
  payload?: Record<string, unknown> | null;
}): ClinicalRuleEvaluationContextV1 {
  const p = input.payload ?? {};
  const num = (k: string): number | null => {
    const v = p[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const str = (k: string): string | null => {
    const v = p[k];
    return typeof v === "string" ? v : null;
  };
  return {
    facilityId: input.facilityId,
    patientId: input.patientId,
    encounterId: input.encounterId,
    hospitalEpisodeId: input.hospitalEpisodeId ?? null,
    eventType: mapOrchestrationEventToRuleEvent(input.type),
    occurredAt: input.occurredAt,
    ageYears: num("ageYears"),
    location: str("location"),
    department: (str("department") as EnterpriseWorkflowDepartment | null) ?? null,
    medicationPriority:
      (str("medicationPriority") as EnterpriseTaskPriorityV1 | null) ?? null,
    labCode: str("labCode"),
    labValue: num("labValue"),
    labFlag: str("labFlag"),
    taskStatus: str("taskStatus"),
    taskType: (str("taskType") as EnterpriseTaskTypeV1 | null) ?? null,
    painScore: num("painScore"),
    fallRiskScore: num("fallRiskScore"),
    sepsisScore: num("sepsisScore"),
    nihssScore: num("nihssScore"),
    customVars:
      p.customVars && typeof p.customVars === "object"
        ? (p.customVars as Record<string, unknown>)
        : null,
    payload: input.payload ?? null,
  };
}

/* ─── Enterprise templates ─── */

function leaf(
  field: ClinicalRuleConditionField,
  op: ClinicalRuleConditionOp,
  value?: unknown,
  customKey?: string
): ClinicalRuleConditionLeafV1 {
  return { kind: "LEAF", field, op, value, customKey: customKey ?? null };
}

function and(
  ...children: ClinicalRuleConditionNodeV1[]
): ClinicalRuleConditionGroupV1 {
  return { kind: "GROUP", logic: "AND", children };
}

function action(
  partial: Omit<ClinicalRuleActionV1, "actionId"> & { actionId?: string }
): ClinicalRuleActionV1 {
  return {
    actionId: partial.actionId ?? `act-${partial.type.toLowerCase()}`,
    ...partial,
  };
}

function templateRule(
  partial: Omit<
    ClinicalRuleDefinitionV1,
    | "createdAt"
    | "modifiedAt"
    | "immutable"
    | "enabled"
    | "status"
    | "version"
    | "elseActions"
  > & {
    elseActions?: ClinicalRuleActionV1[];
    version?: number;
  },
  nowIso: string
): ClinicalRuleDefinitionV1 {
  return {
    version: partial.version ?? 1,
    enabled: true,
    status: "ACTIVE",
    immutable: true,
    elseActions: partial.elseActions ?? [],
    createdAt: nowIso,
    modifiedAt: nowIso,
    ...partial,
  };
}

export function buildEnterpriseClinicalRuleTemplates(
  facilityId: string,
  nowIso: string
): ClinicalRuleDefinitionV1[] {
  return [
    templateRule(
      {
        ruleId: `tpl-critical-k-${facilityId}`,
        name: "Critical potassium",
        description: "Critical K+ → escalate + notify provider",
        scope: { facilityId },
        priority: "EMERGENCY",
        category: "CRITICAL_LAB",
        whenEvent: "CRITICAL_LAB",
        ifCondition: and(
          leaf("labCode", "EQ", "K"),
          leaf("labFlag", "EQ", "CRITICAL")
        ),
        thenActions: [
          action({
            type: "ESCALATE",
            escalationTemplateCode: "CRITICAL_RESULT",
            message: "Critical potassium",
          }),
          action({
            type: "NOTIFY",
            department: "PROVIDER",
            message: "Critical K+ result",
          }),
          action({ type: "TIMELINE", timelineTitle: "Critical K+ rule fired" }),
          action({ type: "AUDIT", message: "Critical K+ rule" }),
        ],
        stopOnMatch: true,
        templateCode: "CRITICAL_K",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-troponin-${facilityId}`,
        name: "Elevated troponin",
        description: "Troponin critical → chest pain workflow",
        scope: { facilityId },
        priority: "CRITICAL",
        category: "CARDIAC",
        whenEvent: "CRITICAL_LAB",
        ifCondition: and(
          leaf("labCode", "EQ", "TROPONIN"),
          leaf("labFlag", "IN", ["CRITICAL", "HIGH"])
        ),
        thenActions: [
          action({
            type: "CREATE_WORKFLOW",
            workflowDefinitionCode: "CHEST_PAIN",
          }),
          action({
            type: "NOTIFY",
            department: "PROVIDER",
            message: "Elevated troponin",
          }),
          action({ type: "QUALITY_MEASURE", qualityMeasureCode: "ACS_TROPONIN" }),
        ],
        stopOnMatch: false,
        templateCode: "TROPONIN",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-stroke-${facilityId}`,
        name: "Stroke alert",
        description: "Stroke alert → stroke workflow",
        scope: { facilityId },
        priority: "EMERGENCY",
        category: "NEURO",
        whenEvent: "STROKE_ALERT",
        ifCondition: leaf("eventType", "EQ", "STROKE_ALERT"),
        thenActions: [
          action({ type: "CREATE_WORKFLOW", workflowDefinitionCode: "STROKE" }),
          action({
            type: "ESCALATE",
            escalationTemplateCode: "CRITICAL_RESULT",
            message: "Stroke alert",
          }),
          action({ type: "REQUIRE_ACK", message: "Acknowledge stroke alert" }),
        ],
        stopOnMatch: true,
        templateCode: "STROKE",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-sepsis-${facilityId}`,
        name: "Sepsis screen positive",
        description: "Sepsis screen → urgent RN/provider tasks",
        scope: { facilityId },
        priority: "CRITICAL",
        category: "SEPSIS",
        whenEvent: "SEPSIS_SCREEN_POSITIVE",
        ifCondition: leaf("sepsisScore", "GTE", 2),
        thenActions: [
          action({
            type: "CREATE_TASK",
            taskType: "ASSESSMENT",
            taskTitle: "Sepsis reassessment",
            taskPriority: "STAT",
            department: "RN",
          }),
          action({
            type: "NOTIFY",
            department: "PROVIDER",
            message: "Sepsis screen positive",
          }),
          action({ type: "SLA_TIMER", slaMinutes: 60 }),
          action({ type: "FLAG", flagCode: "SEPSIS" }),
        ],
        stopOnMatch: false,
        templateCode: "SEPSIS",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-chest-pain-${facilityId}`,
        name: "Chest pain pathway",
        description: "Manual/workflow-started chest pain pathway",
        scope: { facilityId },
        priority: "HIGH",
        category: "CARDIAC",
        whenEvent: "WORKFLOW_STARTED",
        ifCondition: leaf("customVar", "EQ", "CHEST_PAIN", "pathway"),
        thenActions: [
          action({
            type: "CREATE_WORKFLOW",
            workflowDefinitionCode: "CHEST_PAIN",
          }),
        ],
        stopOnMatch: false,
        templateCode: "CHEST_PAIN",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-stemi-${facilityId}`,
        name: "STEMI alert",
        description: "STEMI → critical escalation + timeline",
        scope: { facilityId },
        priority: "EMERGENCY",
        category: "CARDIAC",
        whenEvent: "STEMI_ALERT",
        ifCondition: leaf("eventType", "EQ", "STEMI_ALERT"),
        thenActions: [
          action({
            type: "ESCALATE",
            escalationTemplateCode: "CRITICAL_RESULT",
            message: "STEMI",
          }),
          action({
            type: "CREATE_WORKFLOW",
            workflowDefinitionCode: "CHEST_PAIN",
          }),
          action({ type: "REQUIRE_SIGNATURE", message: "STEMI acknowledgment" }),
          action({ type: "TIMELINE", timelineTitle: "STEMI alert" }),
        ],
        stopOnMatch: true,
        templateCode: "STEMI",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-med-due-${facilityId}`,
        name: "Medication due",
        description: "Medication due → RN task",
        scope: { facilityId },
        priority: "MEDIUM",
        category: "MEDICATION",
        whenEvent: "MEDICATION_DUE",
        ifCondition: leaf("eventType", "EQ", "MEDICATION_DUE"),
        thenActions: [
          action({
            type: "CREATE_TASK",
            taskType: "MEDICATION_ADMIN",
            taskTitle: "Medication due",
            taskPriority: "URGENT",
            department: "RN",
          }),
          action({ type: "SLA_TIMER", slaMinutes: 30 }),
        ],
        stopOnMatch: false,
        templateCode: "MED_DUE",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-med-missed-${facilityId}`,
        name: "Medication missed",
        description: "Missed medication → escalate",
        scope: { facilityId },
        priority: "HIGH",
        category: "MEDICATION",
        whenEvent: "MEDICATION_MISSED",
        ifCondition: leaf("eventType", "EQ", "MEDICATION_MISSED"),
        thenActions: [
          action({
            type: "ESCALATE",
            escalationTemplateCode: "MEDICATION_OVERDUE",
            message: "Medication missed",
          }),
          action({ type: "NOTIFY", department: "RN", message: "Missed dose" }),
        ],
        stopOnMatch: false,
        templateCode: "MED_MISSED",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-pain-reassess-${facilityId}`,
        name: "Pain reassessment",
        description: "High pain → RN reassessment task",
        scope: { facilityId },
        priority: "MEDIUM",
        category: "PAIN",
        whenEvent: "PAIN_SCORE_RECORDED",
        ifCondition: leaf("painScore", "GTE", 7),
        thenActions: [
          action({
            type: "CREATE_TASK",
            taskType: "ASSESSMENT",
            taskTitle: "Pain reassessment",
            taskPriority: "URGENT",
            department: "RN",
          }),
          action({ type: "SLA_TIMER", slaMinutes: 60 }),
        ],
        stopOnMatch: false,
        templateCode: "PAIN_REASSESS",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-fall-${facilityId}`,
        name: "Fall risk",
        description: "Fall risk identified → precautions task",
        scope: { facilityId },
        priority: "HIGH",
        category: "FALL_RESTRAINT",
        whenEvent: "FALL_RISK_IDENTIFIED",
        ifCondition: leaf("fallRiskScore", "GTE", 3),
        thenActions: [
          action({
            type: "CREATE_TASK",
            taskType: "ASSESSMENT",
            taskTitle: "Fall precautions",
            taskPriority: "URGENT",
            department: "RN",
          }),
          action({ type: "FLAG", flagCode: "FALL_RISK" }),
          action({ type: "REQUIRE_DOCS", requireDocCodes: ["FALL_PRECAUTIONS"] }),
        ],
        stopOnMatch: false,
        templateCode: "FALL",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-restraint-${facilityId}`,
        name: "Restraint applied",
        description: "Restraint → monitoring + signature",
        scope: { facilityId },
        priority: "HIGH",
        category: "FALL_RESTRAINT",
        whenEvent: "RESTRAINT_APPLIED",
        ifCondition: leaf("eventType", "EQ", "RESTRAINT_APPLIED"),
        thenActions: [
          action({
            type: "CREATE_TASK",
            taskType: "ASSESSMENT",
            taskTitle: "Restraint monitoring",
            taskPriority: "STAT",
            department: "RN",
          }),
          action({ type: "REQUIRE_SIGNATURE", message: "Restraint order signature" }),
          action({ type: "SLA_TIMER", slaMinutes: 15 }),
        ],
        stopOnMatch: false,
        templateCode: "RESTRAINT",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-admission-checklist-${facilityId}`,
        name: "Admission checklist",
        description: "Admission created → admission workflow",
        scope: { facilityId },
        priority: "HIGH",
        category: "ADMISSION_DISCHARGE",
        whenEvent: "ADMISSION_CREATED",
        ifCondition: leaf("eventType", "EQ", "ADMISSION_CREATED"),
        thenActions: [
          action({
            type: "CREATE_WORKFLOW",
            workflowDefinitionCode: "ADMISSION",
          }),
          action({
            type: "REQUIRE_DOCS",
            requireDocCodes: ["ADMISSION_CHECKLIST"],
          }),
          action({ type: "AUDIT", message: "Admission checklist rule" }),
        ],
        stopOnMatch: false,
        templateCode: "ADMISSION_CHECKLIST",
      },
      nowIso
    ),
    templateRule(
      {
        ruleId: `tpl-discharge-checklist-${facilityId}`,
        name: "Discharge checklist",
        description: "Discharge ready → discharge prep task",
        scope: { facilityId },
        priority: "MEDIUM",
        category: "ADMISSION_DISCHARGE",
        whenEvent: "DISCHARGE_READY",
        ifCondition: leaf("eventType", "EQ", "DISCHARGE_READY"),
        thenActions: [
          action({
            type: "CREATE_TASK",
            taskType: "DISCHARGE_PREP",
            taskTitle: "Discharge checklist",
            taskPriority: "ROUTINE",
            department: "CASE_MANAGEMENT",
          }),
          action({
            type: "REQUIRE_DOCS",
            requireDocCodes: ["DISCHARGE_CHECKLIST"],
          }),
        ],
        stopOnMatch: false,
        templateCode: "DISCHARGE_CHECKLIST",
      },
      nowIso
    ),
  ];
}

export function seedFacilityClinicalRulesCatalog(
  facilityId: string,
  nowIso: string
): EnterpriseClinicalRulesCatalogV1 {
  const rules = buildEnterpriseClinicalRuleTemplates(facilityId, nowIso);
  return {
    version: 1,
    facilityId,
    expectedVersion: 0,
    rules,
    history: rules.map((r) => ({
      ruleId: r.ruleId,
      version: r.version,
      snapshot: r,
      activatedAt: nowIso,
      note: "Seeded from enterprise template",
    })),
    updatedAt: nowIso,
  };
}

/** Catalogs for builder UI metadata. */
export const CLINICAL_RULES_BUILDER_CATALOGS = {
  events: CLINICAL_RULE_EVENT_TYPES,
  conditionFields: CLINICAL_RULE_CONDITION_FIELDS,
  conditionOps: CLINICAL_RULE_CONDITION_OPS,
  actionTypes: CLINICAL_RULE_ACTION_TYPES,
  priorities: CLINICAL_RULE_PRIORITIES,
  categories: CLINICAL_RULE_CATEGORIES,
  statuses: CLINICAL_RULE_STATUSES,
  departments: ENTERPRISE_WORKFLOW_DEPARTMENTS,
  taskTypes: ENTERPRISE_TASK_TYPE_V1,
  taskPriorities: ENTERPRISE_TASK_PRIORITY_V1,
  escalationTemplates: ESCALATION_CHAIN_TEMPLATE_CODES,
} as const;

export function enterpriseClinicalRulesEngineStarted(): boolean {
  return ENTERPRISE_CLINICAL_RULES_ENGINE_STARTED === true;
}

export function enterpriseClinicalRulesMustNotStartPlacement(): boolean {
  return ENTERPRISE_CLINICAL_RULES_PLACEMENT_STARTED === false;
}
