/**
 * MEDUI.D4C.7J — Enterprise encounter closure advisory override.
 *
 * One enterprise authority for the encounter close contract. Pending clinical work is
 * ADVISORY: an authorized treating provider acknowledges it and closes. Closing never
 * completes, cancels, finalizes, or administers anything — pending items stay pending
 * in their own queues and remain part of the longitudinal record.
 *
 * Technical rejections (auth, facility, concurrency, malformed, transaction) are separate
 * from clinical advisories and keep their own typed codes.
 */

export const D4C7J_CERTIFICATION_ID = "MEDUI.D4C.7J" as const;

/** Stable acknowledgement contract version (audited; no PHI). */
export const D4C7J_ACKNOWLEDGEMENT_VERSION = "d4c7j.v1" as const;

/** Default audited reason when the provider elects to close with pending work. */
export const D4C7J_ACKNOWLEDGEMENT_REASON = "PROVIDER_ELECTED_TO_CLOSE" as const;

/**
 * Typed close outcomes. `ENCOUNTER_PENDING_CLINICAL_ITEMS` is advisory: the client opens the
 * acknowledgement modal instead of showing a fatal error. Everything else is technical.
 */
export const D4C7J_CLOSE_CODES = {
  PENDING_CLINICAL_ITEMS: "ENCOUNTER_PENDING_CLINICAL_ITEMS",
  UNAUTHORIZED: "ENCOUNTER_CLOSE_UNAUTHORIZED",
  FACILITY_MISMATCH: "ENCOUNTER_CLOSE_FACILITY_MISMATCH",
  STALE_VERSION: "ENCOUNTER_CLOSE_STALE_VERSION",
  TRANSACTION_FAILED: "ENCOUNTER_CLOSE_TRANSACTION_FAILED",
  INVALID_STATE: "ENCOUNTER_CLOSE_INVALID_STATE",
} as const;

export type D4c7jCloseCode = (typeof D4C7J_CLOSE_CODES)[keyof typeof D4C7J_CLOSE_CODES];

export const D4C7J_ADVISORY_CODE = D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS;

/** Advisory categories surfaced in the acknowledgement modal (counts only — no PHI). */
export const D4C7J_ADVISORY_CATEGORIES = [
  "laboratory",
  "imaging",
  "medications",
  "procedures",
  "results",
  "unacknowledgedResults",
  "followUps",
  "referrals",
  "documentation",
] as const;

export type D4c7jAdvisoryCategory = (typeof D4C7J_ADVISORY_CATEGORIES)[number];

export type D4c7jPendingSummary = Record<D4c7jAdvisoryCategory, number>;

export const EMPTY_D4C7J_PENDING_SUMMARY: D4c7jPendingSummary = {
  laboratory: 0,
  imaging: 0,
  medications: 0,
  procedures: 0,
  results: 0,
  unacknowledgedResults: 0,
  followUps: 0,
  referrals: 0,
  documentation: 0,
};

/**
 * Categories that get emphasized ("Attention prioritaire") presentation.
 * Still acknowledgeable by an authorized treating provider — never a permanent block.
 */
export const D4C7J_PRIORITY_CATEGORIES = [
  "activeInfusion",
  "highAlertMedication",
  "criticalResult",
  "severeAllergyUnresolved",
  "activeBloodProduct",
  "emergencyTransferRecommended",
] as const;

export type D4c7jPriorityCategory = (typeof D4C7J_PRIORITY_CATEGORIES)[number];

/**
 * Legacy readiness blocker codes → D4C.7J classification.
 * D4C.7F treated ACTIVE_INFUSION_RUNNING as NON_OVERRIDABLE; D4C.7J reclassifies it as a
 * priority advisory so a provider is never permanently blocked.
 */
export const D4C7J_BLOCKER_CODE_CLASSIFICATION: Record<
  string,
  { priority?: D4c7jPriorityCategory; advisory?: D4c7jAdvisoryCategory }
> = {
  ACTIVE_INFUSION_RUNNING: { priority: "activeInfusion" },
  ACTIVE_BLOOD_PRODUCT_RUNNING: { priority: "activeBloodProduct" },
  HIGH_ALERT_MEDICATION_ACTIVE: { priority: "highAlertMedication" },
  CRITICAL_RESULT_UNACKNOWLEDGED: { priority: "criticalResult" },
  CRITICAL_RESULT_IMMEDIATE: { priority: "criticalResult" },
  SEVERE_ALLERGY_UNRESOLVED: { priority: "severeAllergyUnresolved" },
  EMERGENCY_TRANSFER_RECOMMENDED: { priority: "emergencyTransferRecommended" },
  ACTIVE_ORDERS_UNRESOLVED: { advisory: "documentation" },
  PROVIDER_DOCUMENTATION_UNSIGNED: { advisory: "documentation" },
  VITALS_MISSING: { advisory: "documentation" },
  VITALS_STALE: { advisory: "documentation" },
  NURSING_HANDOFF_INCOMPLETE: { advisory: "documentation" },
  ADMISSION_DOCUMENTATION_INCOMPLETE: { advisory: "documentation" },
  PROVIDER_DISPOSITION_INCOMPLETE: { advisory: "documentation" },
  DISCHARGE_INSTRUCTIONS_MISSING: { advisory: "documentation" },
  DISCHARGE_RETURN_PRECAUTIONS_MISSING: { advisory: "documentation" },
  DISCHARGE_FOLLOW_UP_MISSING: { advisory: "documentation" },
  DISCHARGE_INSTRUCTIONS_NOT_GIVEN: { advisory: "documentation" },
};

/**
 * Roles that may acknowledge pending clinical items and close.
 *
 * MEDUI.D4C.7K extends D4C.7J: Facility ADMIN is authorized to acknowledge and close.
 * PROVIDER (+ aliases), RN, ADMIN, and MEDORA_SUPER_ADMIN share CLOSE_ENCOUNTER.
 * PHARMACY / BILLING / FRONT_DESK / LAB / RADIOLOGY / technicians remain denied.
 * Authoritative check: `canCloseEncounter` (D4C.7K) — keep these lists for audit/docs.
 */
export const D4C7J_ACK_ALLOWED_ROLES = [
  "PROVIDER",
  "PHYSICIAN",
  "DOCTOR",
  "MD",
  "ATTENDING",
  "RESIDENT",
  "NP",
  "PA",
  "RN",
  "ADMIN",
  "MEDORA_SUPER_ADMIN",
] as const;

export const D4C7J_ACK_DENIED_ROLES = [
  "FRONT_DESK",
  "LAB",
  "RADIOLOGY",
  "PHARMACY",
  "BILLING",
  "MEDICATION_REVIEWER",
  "MEDICATION_ADMIN",
  "PATIENT_CARE_TECH",
  "MA",
] as const;

function normalizeRoles(roleCodes: readonly string[] | null | undefined): string[] {
  return (roleCodes ?? [])
    .map((r) => String(r ?? "").trim().toUpperCase())
    .filter((r) => r.length > 0);
}

/** Delegates to D4C.7K CLOSE_ENCOUNTER so advisory acknowledgement stays one authority. */
export function canAcknowledgeD4c7jClosure(roleCodes: readonly string[] | null | undefined): boolean {
  // Lazy import pattern avoided — keep sync and mirror CLOSE_ENCOUNTER allow-list.
  const roles = normalizeRoles(roleCodes);
  if (roles.length === 0) return false;
  return roles.some((r) => (D4C7J_ACK_ALLOWED_ROLES as readonly string[]).includes(r));
}

/** True when the acknowledgement is only permitted under support/emergency policy (audited). */
export function isD4c7jSupportOverrideOnly(roleCodes: readonly string[] | null | undefined): boolean {
  const roles = normalizeRoles(roleCodes);
  if (!roles.includes("MEDORA_SUPER_ADMIN")) return false;
  return !roles.some(
    (r) => r !== "MEDORA_SUPER_ADMIN" && (D4C7J_ACK_ALLOWED_ROLES as readonly string[]).includes(r)
  );
}

export function totalD4c7jPending(summary: D4c7jPendingSummary): number {
  return D4C7J_ADVISORY_CATEGORIES.reduce((sum, key) => sum + (Number(summary[key]) || 0), 0);
}

/** Close request fields understood by the enterprise close contract (incl. legacy aliases). */
export type D4c7jCloseAcknowledgementInput = {
  acknowledgePendingClinicalItems?: boolean;
  acknowledgementVersion?: string;
  acknowledgementReason?: string;
  clientRequestId?: string;
  /** D4C.7F alias — still honoured so already-deployed clients keep working. */
  acknowledgePendingItems?: boolean;
  /** Pre-D4C.7J disposition-safety alias (ED / hospital surfaces). */
  acknowledgeDispositionSafety?: boolean;
  pendingItemsOverrideReason?: string;
};

export type D4c7jResolvedAcknowledgement = {
  acknowledged: boolean;
  acknowledgementVersion: string;
  acknowledgementReason: string;
  clientRequestId: string | null;
  /** Which request property carried the acknowledgement (observability, not authorization). */
  source: "d4c7j" | "d4c7f" | "dispositionSafety" | "none";
};

export function resolveD4c7jAcknowledgement(
  input: D4c7jCloseAcknowledgementInput | null | undefined
): D4c7jResolvedAcknowledgement {
  const source: D4c7jResolvedAcknowledgement["source"] =
    input?.acknowledgePendingClinicalItems === true
      ? "d4c7j"
      : input?.acknowledgePendingItems === true
        ? "d4c7f"
        : input?.acknowledgeDispositionSafety === true
          ? "dispositionSafety"
          : "none";
  const version = input?.acknowledgementVersion?.trim();
  const reason = input?.acknowledgementReason?.trim() || input?.pendingItemsOverrideReason?.trim();
  const clientRequestId = input?.clientRequestId?.trim();
  return {
    acknowledged: source !== "none",
    acknowledgementVersion: version && version.length > 0 ? version : D4C7J_ACKNOWLEDGEMENT_VERSION,
    acknowledgementReason: reason && reason.length > 0 ? reason : D4C7J_ACKNOWLEDGEMENT_REASON,
    clientRequestId: clientRequestId && clientRequestId.length > 0 ? clientRequestId : null,
    source,
  };
}

export type D4c7jAdvisoryClassification = {
  pendingSummary: D4c7jPendingSummary;
  pendingTotal: number;
  advisoryCategories: D4c7jAdvisoryCategory[];
  priorityCategories: D4c7jPriorityCategory[];
  requiresAcknowledgement: boolean;
  /** D4C.7J invariant: clinical work never permanently blocks an authorized provider. */
  clinicalBlockers: never[];
};

/**
 * Fold legacy readiness output (pending counts + blocker codes + documentation deficiencies)
 * into the single D4C.7J advisory classification used by both preflight and close.
 */
export function classifyD4c7jClosureAdvisory(input: {
  pendingSummary?: Partial<D4c7jPendingSummary> | null;
  blockerCodes?: readonly string[] | null;
  documentationDeficiencyCount?: number | null;
}): D4c7jAdvisoryClassification {
  const summary: D4c7jPendingSummary = { ...EMPTY_D4C7J_PENDING_SUMMARY };
  for (const key of D4C7J_ADVISORY_CATEGORIES) {
    const raw = Number(input.pendingSummary?.[key] ?? 0);
    summary[key] = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  }

  const priority = new Set<D4c7jPriorityCategory>();
  for (const code of input.blockerCodes ?? []) {
    const mapped = D4C7J_BLOCKER_CODE_CLASSIFICATION[String(code ?? "").trim().toUpperCase()];
    if (!mapped) continue;
    if (mapped.priority) priority.add(mapped.priority);
    if (mapped.advisory && summary[mapped.advisory] === 0) summary[mapped.advisory] = 1;
  }

  const deficiencies = Number(input.documentationDeficiencyCount ?? 0);
  if (Number.isFinite(deficiencies) && deficiencies > 0) {
    summary.documentation = Math.max(summary.documentation, Math.floor(deficiencies));
  }

  const pendingTotal = totalD4c7jPending(summary);
  const advisoryCategories = D4C7J_ADVISORY_CATEGORIES.filter((key) => summary[key] > 0);
  const priorityCategories = D4C7J_PRIORITY_CATEGORIES.filter((key) => priority.has(key));

  return {
    pendingSummary: summary,
    pendingTotal,
    advisoryCategories: [...advisoryCategories],
    priorityCategories: [...priorityCategories],
    requiresAcknowledgement: pendingTotal > 0 || priorityCategories.length > 0,
    clinicalBlockers: [],
  };
}

export type D4c7jClosePreflight = {
  encounterId: string;
  currentStatus: string;
  pending: D4c7jPendingSummary;
  pendingTotal: number;
  advisoryCategories: D4c7jAdvisoryCategory[];
  priorityCategories: D4c7jPriorityCategory[];
  requiresAcknowledgement: boolean;
  acknowledgementVersion: typeof D4C7J_ACKNOWLEDGEMENT_VERSION;
  canCloseAfterAcknowledgement: boolean;
  /** Present and always empty — no clinical item may block provider closure. */
  clinicalBlockers: never[];
};

export function projectD4c7jClosePreflight(input: {
  encounterId: string;
  currentStatus: string;
  classification: D4c7jAdvisoryClassification;
  roleCodes?: readonly string[] | null;
}): D4c7jClosePreflight {
  const { classification } = input;
  return {
    encounterId: input.encounterId,
    currentStatus: input.currentStatus,
    pending: { ...classification.pendingSummary },
    pendingTotal: classification.pendingTotal,
    advisoryCategories: [...classification.advisoryCategories],
    priorityCategories: [...classification.priorityCategories],
    requiresAcknowledgement: classification.requiresAcknowledgement,
    acknowledgementVersion: D4C7J_ACKNOWLEDGEMENT_VERSION,
    canCloseAfterAcknowledgement: canAcknowledgeD4c7jClosure(input.roleCodes),
    clinicalBlockers: [],
  };
}

export type D4c7jCloseResult = {
  encounterId: string;
  previousStatus: string;
  status: "CLOSED";
  closedAt: string | null;
  closedByUserId: string | null;
  pendingClinicalItemsPreserved: true;
  pendingSummary: D4c7jPendingSummary;
  priorityCategories: D4c7jPriorityCategory[];
  acknowledged: boolean;
  acknowledgementVersion: string | null;
  idempotent: boolean;
  updatedAt: string | null;
  version: number | null;
};

export function projectD4c7jCloseResult(input: {
  encounterId: string;
  previousStatus: string;
  closedAt?: string | Date | null;
  closedByUserId?: string | null;
  pendingSummary?: Partial<D4c7jPendingSummary> | null;
  priorityCategories?: readonly D4c7jPriorityCategory[] | null;
  acknowledged?: boolean;
  acknowledgementVersion?: string | null;
  idempotent?: boolean;
  updatedAt?: string | Date | null;
  version?: number | null;
}): D4c7jCloseResult {
  const summary: D4c7jPendingSummary = { ...EMPTY_D4C7J_PENDING_SUMMARY };
  for (const key of D4C7J_ADVISORY_CATEGORIES) {
    const raw = Number(input.pendingSummary?.[key] ?? 0);
    summary[key] = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  }
  const toIso = (v: string | Date | null | undefined): string | null => {
    if (!v) return null;
    return v instanceof Date ? v.toISOString() : String(v);
  };
  return {
    encounterId: input.encounterId,
    previousStatus: input.previousStatus,
    status: "CLOSED",
    closedAt: toIso(input.closedAt),
    closedByUserId: input.closedByUserId ?? null,
    pendingClinicalItemsPreserved: true,
    pendingSummary: summary,
    priorityCategories: [...(input.priorityCategories ?? [])],
    acknowledged: input.acknowledged === true,
    acknowledgementVersion: input.acknowledgementVersion ?? null,
    idempotent: input.idempotent === true,
    updatedAt: toIso(input.updatedAt),
    version: typeof input.version === "number" ? input.version : null,
  };
}

/** PHI-safe audit metadata for the single ENCOUNTER_CLOSE event. */
export function buildD4c7jCloseAuditMetadata(input: {
  previousStatus: string;
  classification: D4c7jAdvisoryClassification;
  acknowledgement: D4c7jResolvedAcknowledgement;
  actorRoleCodes?: readonly string[] | null;
  pendingItemIds?: readonly string[] | null;
  workflowStateBeforeClose?: string | null;
}): Record<string, unknown> {
  const { classification, acknowledgement } = input;
  const meta: Record<string, unknown> = {
    previousStatus: input.previousStatus,
    newStatus: "CLOSED",
    actorRole: [...(input.actorRoleCodes ?? [])],
    pendingItemCounts: { ...classification.pendingSummary },
    pendingItemCategories: [...classification.advisoryCategories],
    priorityWarningCategories: [...classification.priorityCategories],
    pendingClinicalItemsPreserved: true,
  };
  if (input.workflowStateBeforeClose) {
    meta.workflowStateBeforeClose = input.workflowStateBeforeClose;
  }
  if (acknowledgement.acknowledged) {
    meta.pendingItemsOverride = true;
    meta.advisoryAcknowledged = true;
    meta.acknowledgementVersion = acknowledgement.acknowledgementVersion;
    meta.acknowledgementReason = acknowledgement.acknowledgementReason;
    meta.acknowledgementSource = acknowledgement.source;
    if (acknowledgement.clientRequestId) meta.clientRequestId = acknowledgement.clientRequestId;
  }
  const ids = (input.pendingItemIds ?? []).filter((v) => typeof v === "string" && v.trim());
  if (ids.length > 0) meta.pendingItemIds = [...ids];
  return meta;
}

/** Explicit client mutation states — one preflight, one close, no implicit retry. */
export const D4C7J_CLIENT_STATES = [
  "IDLE",
  "PREFLIGHT_LOADING",
  "AWAITING_ACKNOWLEDGEMENT",
  "CLOSING",
  "CLOSED",
  "ERROR",
] as const;

export type D4c7jClientState = (typeof D4C7J_CLIENT_STATES)[number];

/** Forbidden duplicate closure authorities (audit guard — enterprise close path only). */
export const D4C7J_FORBIDDEN_CLOSE_AUTHORITY_NAMES = [
  "ClinicEncounterCloseController",
  "ClinicEncounterCloseService",
  "closeClinicEncounter",
  "ClinicCloseOverrideEndpoint",
  "DentalEncounterCloseService",
] as const;

export function assertNoForbiddenD4c7jCloseAuthority(name: string): boolean {
  const n = String(name ?? "").trim();
  if (!n) return true;
  return !(D4C7J_FORBIDDEN_CLOSE_AUTHORITY_NAMES as readonly string[]).some(
    (forbidden) => n === forbidden || n.includes(forbidden)
  );
}
