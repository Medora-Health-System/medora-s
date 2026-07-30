/**
 * MEDUI.D4C.7K — Enterprise encounter lifecycle authority (close / reopen / timeline).
 *
 * One policy resolver for CLOSE_ENCOUNTER and REOPEN_ENCOUNTER. Extends D4C.7J advisory
 * closure — does not replace it. Operational status remains Encounter.status (OPEN|CLOSED|…).
 * REOPENED is a first-class transition event, not a durable worklist status.
 */

export const D4C7K_CERTIFICATION_ID = "MEDUI.D4C.7K" as const;

/** Typed enterprise lifecycle permissions (code-defined; no seed required). */
export const ENCOUNTER_LIFECYCLE_PERMISSIONS = {
  VIEW_ENCOUNTER: "VIEW_ENCOUNTER",
  EDIT_ENCOUNTER: "EDIT_ENCOUNTER",
  CLOSE_ENCOUNTER: "CLOSE_ENCOUNTER",
  REOPEN_ENCOUNTER: "REOPEN_ENCOUNTER",
  /** Future-facing only — not operational in D4C.7K. */
  VOID_ENCOUNTER: "VOID_ENCOUNTER",
  /** Future-facing only — not operational in D4C.7K. */
  ARCHIVE_ENCOUNTER: "ARCHIVE_ENCOUNTER",
} as const;

export type EncounterLifecyclePermission =
  (typeof ENCOUNTER_LIFECYCLE_PERMISSIONS)[keyof typeof ENCOUNTER_LIFECYCLE_PERMISSIONS];

export const D4C7K_CLOSE_CODES = {
  UNAUTHORIZED: "ENCOUNTER_CLOSE_UNAUTHORIZED",
  FACILITY_SCOPE: "ENCOUNTER_FACILITY_SCOPE_VIOLATION",
} as const;

export const D4C7K_REOPEN_CODES = {
  UNAUTHORIZED: "ENCOUNTER_REOPEN_UNAUTHORIZED",
  NOT_CLOSED: "ENCOUNTER_NOT_CLOSED",
  ALREADY_OPEN: "ENCOUNTER_ALREADY_OPEN",
  INVALID_TRANSITION: "ENCOUNTER_INVALID_LIFECYCLE_TRANSITION",
  VERSION_CONFLICT: "ENCOUNTER_LIFECYCLE_VERSION_CONFLICT",
  REASON_REQUIRED: "ENCOUNTER_REOPEN_REASON_REQUIRED",
  FACILITY_SCOPE: "ENCOUNTER_FACILITY_SCOPE_VIOLATION",
  IDEMPOTENCY_CONFLICT: "ENCOUNTER_REOPEN_IDEMPOTENCY_CONFLICT",
  PROJECTION_WARNING: "ENCOUNTER_REOPEN_PROJECTION_WARNING",
  BILLING_PRESERVED: "ENCOUNTER_BILLING_STATE_PRESERVED",
} as const;

export type D4c7kReopenCode = (typeof D4C7K_REOPEN_CODES)[keyof typeof D4C7K_REOPEN_CODES];

/** Append-only lifecycle transition types (timeline). */
export const ENCOUNTER_LIFECYCLE_TRANSITION_TYPES = [
  "ENCOUNTER_CREATED",
  "ENCOUNTER_ASSIGNED",
  "ENCOUNTER_TRANSFERRED",
  "OBSERVATION_STARTED",
  "ADMISSION_STARTED",
  "DISCHARGED",
  "ENCOUNTER_CLOSED",
  "ENCOUNTER_REOPENED",
  "ENCOUNTER_CLOSED_AGAIN",
  "ENCOUNTER_CANCELLED",
] as const;

export type EncounterLifecycleTransitionType =
  (typeof ENCOUNTER_LIFECYCLE_TRANSITION_TYPES)[number];

/**
 * RoleCode values that may CLOSE (including D4C.7J acknowledgement).
 * Provider aliases normalize through the same RoleCode system used elsewhere.
 */
export const D4C7K_CLOSE_ROLE_CODES = [
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

/** Facility ADMIN + platform operator only — Provider/RN never get reopen by default. */
export const D4C7K_REOPEN_ROLE_CODES = ["ADMIN", "MEDORA_SUPER_ADMIN"] as const;

export const D4C7K_MIN_REOPEN_REASON_LENGTH = 3;
export const D4C7K_MAX_REOPEN_REASON_LENGTH = 500;

/** Forbidden duplicate lifecycle authorities (certification guard). */
export const D4C7K_FORBIDDEN_LIFECYCLE_AUTHORITY_NAMES = [
  "ClinicCloseService",
  "EdCloseService",
  "HospitalCloseService",
  "InpatientCloseService",
  "DentalCloseService",
  "ClinicEncounterReopenService",
  "EdEncounterReopenService",
] as const;

function normalizeRoles(roleCodes: readonly string[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of roleCodes ?? []) {
    const r = String(raw ?? "")
      .trim()
      .toUpperCase();
    if (!r || seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  return out;
}

export function normalizeEncounterLifecycleRoleCodes(
  roleCodes: readonly string[] | null | undefined
): string[] {
  return normalizeRoles(roleCodes);
}

export function hasEncounterLifecyclePermission(
  permission: EncounterLifecyclePermission,
  roleCodes: readonly string[] | null | undefined
): boolean {
  const roles = normalizeRoles(roleCodes);
  if (roles.length === 0) return false;
  switch (permission) {
    case ENCOUNTER_LIFECYCLE_PERMISSIONS.CLOSE_ENCOUNTER:
      return roles.some((r) => (D4C7K_CLOSE_ROLE_CODES as readonly string[]).includes(r));
    case ENCOUNTER_LIFECYCLE_PERMISSIONS.REOPEN_ENCOUNTER:
      return roles.some((r) => (D4C7K_REOPEN_ROLE_CODES as readonly string[]).includes(r));
    case ENCOUNTER_LIFECYCLE_PERMISSIONS.VIEW_ENCOUNTER:
    case ENCOUNTER_LIFECYCLE_PERMISSIONS.EDIT_ENCOUNTER:
      return roles.some((r) =>
        ["PROVIDER", "PHYSICIAN", "DOCTOR", "MD", "ATTENDING", "RESIDENT", "NP", "PA", "RN", "ADMIN", "MEDORA_SUPER_ADMIN"].includes(
          r
        )
      );
    case ENCOUNTER_LIFECYCLE_PERMISSIONS.VOID_ENCOUNTER:
    case ENCOUNTER_LIFECYCLE_PERMISSIONS.ARCHIVE_ENCOUNTER:
      return false;
    default:
      return false;
  }
}

export function canCloseEncounter(roleCodes: readonly string[] | null | undefined): boolean {
  return hasEncounterLifecyclePermission(
    ENCOUNTER_LIFECYCLE_PERMISSIONS.CLOSE_ENCOUNTER,
    roleCodes
  );
}

export function canReopenEncounter(roleCodes: readonly string[] | null | undefined): boolean {
  return hasEncounterLifecyclePermission(
    ENCOUNTER_LIFECYCLE_PERMISSIONS.REOPEN_ENCOUNTER,
    roleCodes
  );
}

/** True when close/reopen is only under platform support policy (audited). */
export function isD4c7kPlatformSupportOverrideOnly(
  roleCodes: readonly string[] | null | undefined
): boolean {
  const roles = normalizeRoles(roleCodes);
  if (!roles.includes("MEDORA_SUPER_ADMIN")) return false;
  return !roles.some((r) => r === "ADMIN" || r === "PROVIDER" || r === "RN");
}

export function validateReopenReason(reason: string | null | undefined): {
  ok: boolean;
  normalized: string;
  code?: typeof D4C7K_REOPEN_CODES.REASON_REQUIRED;
} {
  const normalized = String(reason ?? "").trim();
  if (normalized.length < D4C7K_MIN_REOPEN_REASON_LENGTH) {
    return { ok: false, normalized, code: D4C7K_REOPEN_CODES.REASON_REQUIRED };
  }
  if (normalized.length > D4C7K_MAX_REOPEN_REASON_LENGTH) {
    return { ok: false, normalized: normalized.slice(0, D4C7K_MAX_REOPEN_REASON_LENGTH), code: D4C7K_REOPEN_CODES.REASON_REQUIRED };
  }
  return { ok: true, normalized };
}

/**
 * Care-setting → active workspace target after reopen.
 * Thin projection adapter — not a separate lifecycle engine.
 */
export function resolveReopenWorkspaceTarget(input: {
  encounterType: string | null | undefined;
  careSetting?: string | null;
  workflowState?: string | null;
}): {
  workspaceTarget: string;
  careSetting: string;
  queryInvalidationKeys: string[];
} {
  const type = String(input.encounterType ?? "")
    .trim()
    .toUpperCase();
  const careHint = String(input.careSetting ?? "")
    .trim()
    .toUpperCase();
  const wf = String(input.workflowState ?? "")
    .trim()
    .toUpperCase();

  if (careHint === "DENTAL" || careHint.includes("DENTAL")) {
    return {
      workspaceTarget: "/app/dental",
      careSetting: "DENTAL",
      queryInvalidationKeys: ["dental-care", "encounter"],
    };
  }
  if (type === "INPATIENT" || careHint === "INPATIENT" || careHint === "HOSPITAL") {
    return {
      workspaceTarget: "/app/hospital-care/census",
      careSetting: "INPATIENT",
      queryInvalidationKeys: ["hospital-census", "inpatient", "encounter"],
    };
  }
  if (careHint === "OBSERVATION" || wf.includes("OBSERVATION")) {
    return {
      workspaceTarget: "/app/hospital-care/census",
      careSetting: "OBSERVATION",
      queryInvalidationKeys: ["observation", "hospital-census", "encounter"],
    };
  }
  if (type === "EMERGENCY" || type === "URGENT_CARE" || careHint === "ED" || careHint === "FSED") {
    return {
      workspaceTarget: "/app",
      careSetting: type === "URGENT_CARE" ? "URGENT_CARE" : "ED",
      queryInvalidationKeys: ["trackboard", "encounter"],
    };
  }
  // OUTPATIENT / Clinic Care default
  return {
    workspaceTarget: "/app/clinic-care",
    careSetting: "AMBULATORY",
    queryInvalidationKeys: ["clinic-care", "clinic-care-trackboard", "encounter"],
  };
}

/**
 * Whether an enterprise close should also write dischargedAt.
 *
 * Ownership boundary: the lifecycle authority owns status / closedAt / closedByUserId.
 * `dischargedAt` belongs to the discharge workflows (ED, observation, inpatient, ambulatory
 * discharge payload). A generic close — including EMERGENCY or INPATIENT encounters closed
 * without an explicit discharge workflow — must never write dischargedAt by encounter type.
 */
export function shouldSetDischargedAtOnEnterpriseClose(input: {
  encounterType?: string | null;
  hasExplicitDischargePayload: boolean;
  forceDischargedAt?: boolean;
}): boolean {
  if (input.forceDischargedAt === true) return true;
  return input.hasExplicitDischargePayload === true;
}

/**
 * Audit / timeline context for a lifecycle action performed by an authoritative Medora
 * platform administrator inside an explicit facility context.
 *
 * No email or account identity is resolved here: the API layer resolves the platform
 * principal through the shared platform-principal resolver and passes the decision in.
 */
export type D4c7kPlatformActionContext = {
  platformPrincipal: boolean;
  /** True when the platform principal acted without a facility-scoped UserRole. */
  crossFacilitySupportAction: boolean;
  facilityContextId: string;
  supportOverride: boolean;
};

export function buildD4c7kPlatformActionContext(input: {
  facilityId: string;
  platformPrincipal?: boolean;
  hasFacilityMembership?: boolean;
  actorRoleCodes?: readonly string[] | null;
}): D4c7kPlatformActionContext {
  const platformPrincipal = input.platformPrincipal === true;
  return {
    platformPrincipal,
    crossFacilitySupportAction: platformPrincipal && input.hasFacilityMembership !== true,
    facilityContextId: String(input.facilityId ?? ""),
    supportOverride: isD4c7kPlatformSupportOverrideOnly(input.actorRoleCodes),
  };
}

export function resolveCloseLifecycleTransitionType(reopenCount: number): EncounterLifecycleTransitionType {
  return reopenCount > 0 ? "ENCOUNTER_CLOSED_AGAIN" : "ENCOUNTER_CLOSED";
}

export function assertNoForbiddenD4c7kLifecycleAuthority(name: string): boolean {
  const n = String(name ?? "").trim();
  if (!n) return true;
  return !(D4C7K_FORBIDDEN_LIFECYCLE_AUTHORITY_NAMES as readonly string[]).some(
    (forbidden) => n === forbidden || n.includes(forbidden)
  );
}

export type D4c7kReopenResult = {
  encounterId: string;
  previousStatus: string;
  status: "OPEN";
  transitionType: "ENCOUNTER_REOPENED";
  reopenedAt: string;
  reopenedByUserId: string | null;
  version: number;
  careSetting: string;
  facilityId: string;
  projectionRestored: true;
  workspaceTarget: string;
  idempotent: boolean;
  warnings: string[];
  roomAssignmentRestored: false;
  bedAssignmentRestored: false;
  billingReopened: false;
  prescriptionsUnlocked: false;
  signedDocumentationUnlocked: false;
};

export function projectD4c7kReopenResult(input: {
  encounterId: string;
  previousStatus: string;
  reopenedAt: string | Date;
  reopenedByUserId?: string | null;
  version: number;
  facilityId: string;
  encounterType?: string | null;
  careSetting?: string | null;
  workflowState?: string | null;
  idempotent?: boolean;
  warnings?: readonly string[];
}): D4c7kReopenResult {
  const target = resolveReopenWorkspaceTarget({
    encounterType: input.encounterType,
    careSetting: input.careSetting,
    workflowState: input.workflowState,
  });
  const reopenedAt =
    input.reopenedAt instanceof Date ? input.reopenedAt.toISOString() : String(input.reopenedAt);
  return {
    encounterId: input.encounterId,
    previousStatus: input.previousStatus,
    status: "OPEN",
    transitionType: "ENCOUNTER_REOPENED",
    reopenedAt,
    reopenedByUserId: input.reopenedByUserId ?? null,
    version: input.version,
    careSetting: target.careSetting,
    facilityId: input.facilityId,
    projectionRestored: true,
    workspaceTarget: target.workspaceTarget,
    idempotent: input.idempotent === true,
    warnings: [...(input.warnings ?? [])],
    roomAssignmentRestored: false,
    bedAssignmentRestored: false,
    billingReopened: false,
    prescriptionsUnlocked: false,
    signedDocumentationUnlocked: false,
  };
}
