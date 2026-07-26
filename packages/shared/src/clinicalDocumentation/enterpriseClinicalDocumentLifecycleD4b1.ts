/**
 * MEDUI.D4B.1 — Enterprise clinical document lifecycle state machine.
 *
 * Only transitions that can be safely supported across adapters are allowed.
 * VOIDED is reserved for soft legal void (no physical delete).
 */

import {
  ENTERPRISE_CLINICAL_DOCUMENT_LIFECYCLE_STATES,
  type EnterpriseClinicalDocumentLifecycleState,
} from "./enterpriseClinicalDocumentContractD4b1.js";

export type EnterpriseClinicalDocumentLifecycleEvent =
  | "START_EDIT"
  | "MARK_READY_FOR_SIGNATURE"
  | "SIGN"
  | "REQUIRE_COSIGN"
  | "COSIGN"
  | "AMEND"
  | "CORRECT"
  | "ENTER_IN_ERROR"
  | "VOID"
  | "RETURN_TO_DRAFT";

/** Allowed transitions for the enterprise foundation (conservative). */
const ALLOWED: ReadonlyArray<
  readonly [EnterpriseClinicalDocumentLifecycleState, EnterpriseClinicalDocumentLifecycleEvent, EnterpriseClinicalDocumentLifecycleState]
> = [
  ["DRAFT", "START_EDIT", "IN_PROGRESS"],
  ["DRAFT", "MARK_READY_FOR_SIGNATURE", "READY_FOR_SIGNATURE"],
  ["DRAFT", "SIGN", "SIGNED"],
  ["DRAFT", "ENTER_IN_ERROR", "ENTERED_IN_ERROR"],
  ["DRAFT", "VOID", "VOIDED"],
  ["IN_PROGRESS", "MARK_READY_FOR_SIGNATURE", "READY_FOR_SIGNATURE"],
  ["IN_PROGRESS", "SIGN", "SIGNED"],
  ["IN_PROGRESS", "RETURN_TO_DRAFT", "DRAFT"],
  ["IN_PROGRESS", "ENTER_IN_ERROR", "ENTERED_IN_ERROR"],
  ["IN_PROGRESS", "VOID", "VOIDED"],
  ["READY_FOR_SIGNATURE", "SIGN", "SIGNED"],
  ["READY_FOR_SIGNATURE", "RETURN_TO_DRAFT", "DRAFT"],
  ["READY_FOR_SIGNATURE", "START_EDIT", "IN_PROGRESS"],
  ["READY_FOR_SIGNATURE", "ENTER_IN_ERROR", "ENTERED_IN_ERROR"],
  ["READY_FOR_SIGNATURE", "VOID", "VOIDED"],
  ["SIGNED", "REQUIRE_COSIGN", "COSIGN_REQUIRED"],
  ["SIGNED", "AMEND", "AMENDED"],
  ["SIGNED", "CORRECT", "CORRECTED"],
  ["SIGNED", "ENTER_IN_ERROR", "ENTERED_IN_ERROR"],
  ["SIGNED", "VOID", "VOIDED"],
  ["COSIGN_REQUIRED", "COSIGN", "COSIGNED"],
  ["COSIGN_REQUIRED", "AMEND", "AMENDED"],
  ["COSIGN_REQUIRED", "ENTER_IN_ERROR", "ENTERED_IN_ERROR"],
  ["COSIGN_REQUIRED", "VOID", "VOIDED"],
  ["COSIGNED", "AMEND", "AMENDED"],
  ["COSIGNED", "CORRECT", "CORRECTED"],
  ["COSIGNED", "ENTER_IN_ERROR", "ENTERED_IN_ERROR"],
  ["COSIGNED", "VOID", "VOIDED"],
  ["AMENDED", "AMEND", "AMENDED"],
  ["AMENDED", "CORRECT", "CORRECTED"],
  ["AMENDED", "ENTER_IN_ERROR", "ENTERED_IN_ERROR"],
  ["AMENDED", "VOID", "VOIDED"],
  ["CORRECTED", "AMEND", "AMENDED"],
  ["CORRECTED", "CORRECT", "CORRECTED"],
  ["CORRECTED", "ENTER_IN_ERROR", "ENTERED_IN_ERROR"],
  ["CORRECTED", "VOID", "VOIDED"],
  // ENTERED_IN_ERROR / VOIDED are terminal for mutation (history preserved).
];

const ALLOWED_KEY = new Set(ALLOWED.map(([from, event, to]) => `${from}|${event}|${to}`));

export function isEnterpriseClinicalDocumentLifecycleState(
  value: string
): value is EnterpriseClinicalDocumentLifecycleState {
  return (ENTERPRISE_CLINICAL_DOCUMENT_LIFECYCLE_STATES as readonly string[]).includes(value);
}

export function listAllowedEnterpriseClinicalDocumentTransitions(
  from: EnterpriseClinicalDocumentLifecycleState
): ReadonlyArray<{
  event: EnterpriseClinicalDocumentLifecycleEvent;
  to: EnterpriseClinicalDocumentLifecycleState;
}> {
  return ALLOWED.filter(([f]) => f === from).map(([, event, to]) => ({ event, to }));
}

export function canTransitionEnterpriseClinicalDocumentLifecycle(
  from: EnterpriseClinicalDocumentLifecycleState,
  event: EnterpriseClinicalDocumentLifecycleEvent,
  to: EnterpriseClinicalDocumentLifecycleState
): boolean {
  return ALLOWED_KEY.has(`${from}|${event}|${to}`);
}

export type EnterpriseClinicalDocumentTransitionResult =
  | { ok: true; to: EnterpriseClinicalDocumentLifecycleState }
  | { ok: false; reason: "INVALID_TRANSITION" | "TERMINAL_STATE" | "UNKNOWN_STATE" };

export function transitionEnterpriseClinicalDocumentLifecycle(
  from: EnterpriseClinicalDocumentLifecycleState,
  event: EnterpriseClinicalDocumentLifecycleEvent
): EnterpriseClinicalDocumentTransitionResult {
  if (from === "ENTERED_IN_ERROR" || from === "VOIDED") {
    return { ok: false, reason: "TERMINAL_STATE" };
  }
  const match = ALLOWED.find(([f, e]) => f === from && e === event);
  if (!match) {
    return { ok: false, reason: "INVALID_TRANSITION" };
  }
  return { ok: true, to: match[2] };
}

/** Invariants enforced by the foundation (adapters must honor). */
export const ENTERPRISE_CLINICAL_DOCUMENT_LIFECYCLE_INVARIANTS = [
  "unsigned_drafts_may_be_edited_by_authorized_users",
  "signed_content_cannot_be_silently_overwritten",
  "amendments_create_durable_history",
  "corrections_preserve_original_signed_version",
  "addenda_are_separately_authored_and_timestamped",
  "late_entries_are_explicitly_labeled",
  "entered_in_error_does_not_physically_delete",
  "print_export_identifies_document_status",
  "superseded_versions_remain_traceable",
  "current_display_cannot_erase_prior_signed_content",
] as const;

export function assertEnterpriseClinicalDocumentNotSilentlyMutable(
  state: EnterpriseClinicalDocumentLifecycleState
): boolean {
  return (
    state === "SIGNED" ||
    state === "COSIGN_REQUIRED" ||
    state === "COSIGNED" ||
    state === "AMENDED" ||
    state === "CORRECTED" ||
    state === "ENTERED_IN_ERROR" ||
    state === "VOIDED"
  );
}
