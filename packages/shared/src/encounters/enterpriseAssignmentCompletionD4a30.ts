/**
 * D4A.3.0-H1 — Assignment completion resolver (My Incomplete Charts).
 *
 * Distinguishes: assigned | assigned+incomplete | assigned+no known incomplete | unassigned.
 * Uses ONLY authoritative signals already present on hospital census / assignable rows.
 * Open encounter or assignment alone is never treated as incomplete.
 * Extensible for future Task Engine / documentation engines.
 */

import {
  isEncounterAssignedToCurrentUserEnterprise,
  type EnterpriseAssignableEncounter,
  type EnterpriseMyPatientsFilterContext,
} from "./enterpriseAssignmentEngineD4a30.js";

/** Proven incomplete-chart reason codes (hospital lane). */
export type EnterpriseAssignmentCompletionReasonCode =
  | "READY_DISCHARGE"
  | "CRITICAL_RESULTS_UNACKED";

/**
 * Signals intentionally NOT used as incomplete-chart proof today
 * (operational / assignment gaps — not chart incompleteness):
 * - open encounter status alone
 * - assignment alone
 * - REASSESSMENT_OVERDUE (operational reassessment, not chart closure work)
 * - VITALS_STALE
 * - RN_UNASSIGNED / PHYSICIAN_UNASSIGNED
 *
 * Future (unsupported until engines exist on the row):
 * - TASK_ENGINE_OPEN_TASK
 * - PROVIDER_DOCUMENTATION_UNSIGNED
 * - NURSING_DOCUMENTATION_INCOMPLETE
 * - DISCHARGE_SUMMARY_MISSING
 */
export const ENTERPRISE_ASSIGNMENT_COMPLETION_UNSUPPORTED_FUTURE_SIGNALS = [
  "TASK_ENGINE_OPEN_TASK",
  "PROVIDER_DOCUMENTATION_UNSIGNED",
  "NURSING_DOCUMENTATION_INCOMPLETE",
  "DISCHARGE_SUMMARY_MISSING",
  "OPEN_ENCOUNTER_ONLY",
  "ASSIGNMENT_ONLY",
  "REASSESSMENT_OVERDUE",
  "VITALS_STALE",
] as const;

export type EnterpriseAssignmentCompletionStatus =
  | "UNASSIGNED"
  | "ASSIGNED_INCOMPLETE"
  | "ASSIGNED_NO_KNOWN_INCOMPLETE";

export type EnterpriseAssignmentCompletionResult = {
  assigned: boolean;
  incomplete: boolean;
  status: EnterpriseAssignmentCompletionStatus;
  reasons: EnterpriseAssignmentCompletionReasonCode[];
};

export type EnterpriseAssignmentCompletionInput = EnterpriseAssignableEncounter & {
  /** Census/board alert codes (authoritative when produced by hospitalCensusV1). */
  alerts?: ReadonlyArray<{ code: string }>;
  /**
   * Optional future hooks — ignored unless caller supplies proven boolean flags.
   * Do not invent these from open status.
   */
  hasUnsignedProviderDocumentationAtDischargeReady?: boolean;
  hasOpenTaskEngineTask?: boolean;
};

const AUTHORITATIVE_ALERT_TO_REASON: Record<string, EnterpriseAssignmentCompletionReasonCode> = {
  READY_DISCHARGE: "READY_DISCHARGE",
  CRITICAL_RESULTS: "CRITICAL_RESULTS_UNACKED",
};

/**
 * Role-aware: incomplete reasons apply once the user is workflow-assigned.
 * Deterministic reason order: READY_DISCHARGE then CRITICAL_RESULTS_UNACKED.
 */
export function resolveEnterpriseAssignmentCompletion(
  input: EnterpriseAssignmentCompletionInput,
  ctx: EnterpriseMyPatientsFilterContext
): EnterpriseAssignmentCompletionResult {
  const assigned = isEncounterAssignedToCurrentUserEnterprise(input, ctx);
  if (!assigned) {
    return {
      assigned: false,
      incomplete: false,
      status: "UNASSIGNED",
      reasons: [],
    };
  }

  const reasonSet = new Set<EnterpriseAssignmentCompletionReasonCode>();
  for (const alert of input.alerts ?? []) {
    const mapped = AUTHORITATIVE_ALERT_TO_REASON[String(alert.code ?? "").trim().toUpperCase()];
    if (mapped) reasonSet.add(mapped);
  }
  // Future extensibility hooks — only when caller supplies explicit proof flags.
  if (input.hasUnsignedProviderDocumentationAtDischargeReady && reasonSet.has("READY_DISCHARGE")) {
    // Reserved: no extra reason code until documentation engine is wired on census rows.
  }
  if (input.hasOpenTaskEngineTask) {
    // Reserved for Task Engine — do not invent OPEN_TASK reason without engine.
  }

  const reasons = (
    ["READY_DISCHARGE", "CRITICAL_RESULTS_UNACKED"] as const
  ).filter((r) => reasonSet.has(r));

  if (reasons.length === 0) {
    return {
      assigned: true,
      incomplete: false,
      status: "ASSIGNED_NO_KNOWN_INCOMPLETE",
      reasons: [],
    };
  }
  return {
    assigned: true,
    incomplete: true,
    status: "ASSIGNED_INCOMPLETE",
    reasons,
  };
}

export function isEnterpriseAssignedIncompleteChart(
  input: EnterpriseAssignmentCompletionInput,
  ctx: EnterpriseMyPatientsFilterContext
): boolean {
  return resolveEnterpriseAssignmentCompletion(input, ctx).status === "ASSIGNED_INCOMPLETE";
}

export function filterMyIncompleteChartsEncountersEnterprise<
  T extends EnterpriseAssignmentCompletionInput,
>(encounters: readonly T[], ctx: EnterpriseMyPatientsFilterContext): T[] {
  if (!String(ctx.currentUserId ?? "").trim()) return [];
  return encounters.filter((e) => isEnterpriseAssignedIncompleteChart(e, ctx));
}
