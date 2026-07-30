/**
 * MEDUI.D4C.7J — encounter closure client state machine.
 *
 * One deliberate confirmation sends exactly one close request. The previous ambulatory path
 * auto-retried a failed close with a different acknowledgement body, which produced the
 * paired 400s seen in production; this machine has no implicit retry at all.
 */

import {
  D4C7J_CLOSE_CODES,
  EMPTY_D4C7J_PENDING_SUMMARY,
  type D4c7jClientState,
  type D4c7jPendingSummary,
  type D4c7jPriorityCategory,
} from "@medora/shared";

export type D4c7jClosureErrorKind = "advisory" | "unauthorized" | "stale" | "technical";

export type D4c7jClosureState = {
  phase: D4c7jClientState;
  pending: D4c7jPendingSummary;
  priorityCategories: D4c7jPriorityCategory[];
  acknowledged: boolean;
  reason: string;
  canCloseAfterAcknowledgement: boolean;
  errorKind: D4c7jClosureErrorKind | null;
  errorMessage: string | null;
  /** Number of close mutations actually dispatched (duplicate-click regression guard). */
  closeRequestCount: number;
  clientRequestId: string | null;
};

export type D4c7jClosureEvent =
  | { type: "PREFLIGHT_REQUESTED" }
  | { type: "CLOSE_REQUESTED"; clientRequestId?: string | null }
  | {
      type: "ADVISORY_RECEIVED";
      pending?: Partial<D4c7jPendingSummary> | null;
      priorityCategories?: readonly D4c7jPriorityCategory[] | null;
      canCloseAfterAcknowledgement?: boolean;
    }
  | { type: "ACKNOWLEDGEMENT_CHANGED"; acknowledged: boolean }
  | { type: "REASON_CHANGED"; reason: string }
  | { type: "CONFIRM_CLOSE" }
  | { type: "CLOSE_SUCCEEDED" }
  | { type: "CLOSE_FAILED"; kind: D4c7jClosureErrorKind; message: string | null }
  | { type: "DISMISSED" }
  | { type: "RETRY" };

export const INITIAL_D4C7J_CLOSURE_STATE: D4c7jClosureState = {
  phase: "IDLE",
  pending: { ...EMPTY_D4C7J_PENDING_SUMMARY },
  priorityCategories: [],
  acknowledged: false,
  reason: "",
  canCloseAfterAcknowledgement: false,
  errorKind: null,
  errorMessage: null,
  closeRequestCount: 0,
  clientRequestId: null,
};

function normalizePending(pending?: Partial<D4c7jPendingSummary> | null): D4c7jPendingSummary {
  const out: D4c7jPendingSummary = { ...EMPTY_D4C7J_PENDING_SUMMARY };
  for (const key of Object.keys(out) as (keyof D4c7jPendingSummary)[]) {
    const raw = Number(pending?.[key] ?? 0);
    out[key] = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  }
  return out;
}

/** Only these phases may dispatch a network mutation. */
export function canDispatchD4c7jClose(state: D4c7jClosureState): boolean {
  return state.phase === "IDLE" || state.phase === "ERROR";
}

export function canConfirmD4c7jClose(state: D4c7jClosureState): boolean {
  return (
    state.phase === "AWAITING_ACKNOWLEDGEMENT" &&
    state.acknowledged &&
    state.canCloseAfterAcknowledgement
  );
}

export function d4c7jClosureReducer(
  state: D4c7jClosureState,
  event: D4c7jClosureEvent
): D4c7jClosureState {
  // Terminal: a closed encounter never re-enters the mutation flow from this machine.
  if (state.phase === "CLOSED") return state;

  switch (event.type) {
    case "PREFLIGHT_REQUESTED":
      if (state.phase === "PREFLIGHT_LOADING" || state.phase === "CLOSING") return state;
      return { ...state, phase: "PREFLIGHT_LOADING", errorKind: null, errorMessage: null };

    case "CLOSE_REQUESTED":
      if (!canDispatchD4c7jClose(state)) return state;
      return {
        ...state,
        phase: "CLOSING",
        errorKind: null,
        errorMessage: null,
        closeRequestCount: state.closeRequestCount + 1,
        clientRequestId: event.clientRequestId ?? state.clientRequestId,
      };

    case "ADVISORY_RECEIVED":
      return {
        ...state,
        phase: "AWAITING_ACKNOWLEDGEMENT",
        pending: normalizePending(event.pending),
        priorityCategories: [...(event.priorityCategories ?? [])],
        canCloseAfterAcknowledgement: event.canCloseAfterAcknowledgement !== false,
        acknowledged: false,
        errorKind: null,
        errorMessage: null,
      };

    case "ACKNOWLEDGEMENT_CHANGED":
      if (state.phase !== "AWAITING_ACKNOWLEDGEMENT") return state;
      return { ...state, acknowledged: event.acknowledged === true };

    case "REASON_CHANGED":
      if (state.phase !== "AWAITING_ACKNOWLEDGEMENT") return state;
      return { ...state, reason: String(event.reason ?? "").slice(0, 240) };

    case "CONFIRM_CLOSE":
      if (!canConfirmD4c7jClose(state)) return state;
      return {
        ...state,
        phase: "CLOSING",
        errorKind: null,
        errorMessage: null,
        closeRequestCount: state.closeRequestCount + 1,
      };

    case "CLOSE_SUCCEEDED":
      return { ...state, phase: "CLOSED", errorKind: null, errorMessage: null, acknowledged: false };

    case "CLOSE_FAILED":
      return {
        ...state,
        phase: "ERROR",
        errorKind: event.kind,
        errorMessage: event.message ?? null,
      };

    case "DISMISSED":
      if (state.phase === "CLOSING") return state;
      return {
        ...state,
        phase: "IDLE",
        acknowledged: false,
        reason: "",
        errorKind: null,
        errorMessage: null,
      };

    case "RETRY":
      if (state.phase !== "ERROR") return state;
      return { ...state, phase: "IDLE", errorKind: null, errorMessage: null };

    default:
      return state;
  }
}

type CloseErrorLike = {
  status?: number;
  errorCode?: string | null;
  body?: unknown;
  message?: string;
};

type AdvisoryPayload = {
  code?: unknown;
  preflight?: {
    pending?: Partial<D4c7jPendingSummary>;
    priorityCategories?: D4c7jPriorityCategory[];
    canCloseAfterAcknowledgement?: boolean;
  };
  pending?: Record<string, unknown>;
  overrideAllowed?: unknown;
};

/**
 * Classify a close failure. `ENCOUNTER_PENDING_CLINICAL_ITEMS` is advisory and must open the
 * acknowledgement modal — never a fatal red toast.
 */
export function classifyD4c7jCloseError(err: unknown): {
  kind: D4c7jClosureErrorKind;
  pending: D4c7jPendingSummary;
  priorityCategories: D4c7jPriorityCategory[];
  canCloseAfterAcknowledgement: boolean;
} {
  const e = (err ?? {}) as CloseErrorLike;
  const body = e.body && typeof e.body === "object" ? (e.body as AdvisoryPayload) : null;
  const code =
    (typeof e.errorCode === "string" && e.errorCode) ||
    (typeof body?.code === "string" ? body.code : null);

  if (code === D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS) {
    const preflight = body?.preflight;
    const legacyPending = body?.pending as Partial<D4c7jPendingSummary> | undefined;
    return {
      kind: "advisory",
      pending: normalizePending(preflight?.pending ?? legacyPending ?? null),
      priorityCategories: [...(preflight?.priorityCategories ?? [])],
      canCloseAfterAcknowledgement:
        preflight?.canCloseAfterAcknowledgement ?? body?.overrideAllowed === true,
    };
  }

  const empty = {
    pending: { ...EMPTY_D4C7J_PENDING_SUMMARY },
    priorityCategories: [] as D4c7jPriorityCategory[],
    canCloseAfterAcknowledgement: false,
  };

  if (code === D4C7J_CLOSE_CODES.UNAUTHORIZED || e.status === 401 || e.status === 403) {
    return { kind: "unauthorized", ...empty };
  }
  if (code === D4C7J_CLOSE_CODES.STALE_VERSION || e.status === 409) {
    return { kind: "stale", ...empty };
  }
  return { kind: "technical", ...empty };
}

/** i18n key for a technical/advisory failure — never a raw object or English code in French UI. */
export function d4c7jCloseErrorMessageKey(kind: D4c7jClosureErrorKind): string {
  switch (kind) {
    case "unauthorized":
      return "clinicCareD4c7j.errors.unauthorized";
    case "stale":
      return "clinicCareD4c7j.errors.staleState";
    case "advisory":
      return "clinicCareD4c7j.closure.pendingTitle";
    default:
      return "clinicCareD4c7j.errors.technical";
  }
}

/** Ordered advisory rows for the modal — zero counts are hidden to keep the dialog scannable. */
export function d4c7jVisiblePendingRows(
  pending: D4c7jPendingSummary
): { category: keyof D4c7jPendingSummary; count: number }[] {
  return (Object.keys(EMPTY_D4C7J_PENDING_SUMMARY) as (keyof D4c7jPendingSummary)[])
    .map((category) => ({ category, count: pending[category] ?? 0 }))
    .filter((row) => row.count > 0);
}
