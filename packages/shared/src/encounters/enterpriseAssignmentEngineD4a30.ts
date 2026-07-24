/**
 * D4A.3.0 / D4A.3.0-H1 — Enterprise Hospital Assignment Engine (shared contracts).
 *
 * Care-setting context: EMERGENCY | OBSERVATION | INPATIENT.
 * - EMERGENCY ownership lives in Encounter physician/nurse columns via Nest ED adapter
 *   (not this bag). Shared hospital helpers never read ED columns as active hospital team.
 * - OBSERVATION / INPATIENT use an independent JSON bag (workflow + clinical sections).
 *
 * Clinical ownership (attending) is separate from workflow shift assignments.
 * Assignment never grants chart access — operational workload only.
 *
 * Board TECHNICIAN category is authorized by RoleCode PATIENT_CARE_TECH only —
 * never LAB / RADIOLOGY.
 */

import {
  HOSPITAL_PATIENT_CARE_TECH_ROLE_CODES,
  HOSPITAL_TECH_EXCLUDED_ANCILLARY_ROLE_CODES,
} from "../constants/roles.js";

export const ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE.D4A3_0" as const;

export const ENTERPRISE_HOSPITAL_ASSIGNMENT_BAG_KEY = "enterpriseHospitalAssignmentV1" as const;

/** Care settings the shared engine supports (stable dimension). */
export type EnterpriseAssignmentCareSetting = "EMERGENCY" | "OBSERVATION" | "INPATIENT";

/** Roles displayed on Hospital boards (canonical board categories — not ancillary). */
export type EnterpriseHospitalBoardAssignmentRole = "PROVIDER" | "NURSE" | "TECHNICIAN";

export const HOSPITAL_BOARD_ASSIGNMENT_ROLES: readonly EnterpriseHospitalBoardAssignmentRole[] = [
  "PROVIDER",
  "NURSE",
  "TECHNICIAN",
] as const;

/**
 * Workflow shift slots (operational). Phase 1 mutates PRIMARY_* / PATIENT_CARE_TECH;
 * COVERING / BREAK / CHARGE are modeled so covering never overwrites attending or primary.
 */
export type EnterpriseWorkflowAssignmentSlot =
  | "PRIMARY_PROVIDER"
  | "COVERING_PROVIDER"
  | "PRIMARY_RN"
  | "BREAK_RN"
  | "CHARGE_RN"
  | "PATIENT_CARE_TECH";

export const ENTERPRISE_WORKFLOW_ASSIGNMENT_SLOTS: readonly EnterpriseWorkflowAssignmentSlot[] = [
  "PRIMARY_PROVIDER",
  "COVERING_PROVIDER",
  "PRIMARY_RN",
  "BREAK_RN",
  "CHARGE_RN",
  "PATIENT_CARE_TECH",
] as const;

/** Map board category ↔ primary workflow slot. */
export const BOARD_ROLE_TO_PRIMARY_WORKFLOW: Record<
  EnterpriseHospitalBoardAssignmentRole,
  EnterpriseWorkflowAssignmentSlot
> = {
  PROVIDER: "PRIMARY_PROVIDER",
  NURSE: "PRIMARY_RN",
  TECHNICIAN: "PATIENT_CARE_TECH",
};

export const PRIMARY_WORKFLOW_TO_BOARD_ROLE: Partial<
  Record<EnterpriseWorkflowAssignmentSlot, EnterpriseHospitalBoardAssignmentRole>
> = {
  PRIMARY_PROVIDER: "PROVIDER",
  PRIMARY_RN: "NURSE",
  PATIENT_CARE_TECH: "TECHNICIAN",
};

/** Ancillary roles — departmental dashboards later; never on hospital boards. */
export const HOSPITAL_BOARD_EXCLUDED_ASSIGNMENT_ROLES = [
  "PHARMACIST",
  "RESPIRATORY",
  "CASE_MANAGER",
  "SOCIAL_WORK",
  "DIETITIAN",
  "PT",
  "OT",
  "SPEECH",
  "IMAGING",
  "LABORATORY",
  "LAB",
  "RADIOLOGY",
] as const;

export type EnterpriseAssignmentSource = "SELF_ASSIGN" | "REASSIGN" | "UNASSIGN" | "SYSTEM_INIT";

export type EnterpriseAssignmentSlotV1 = {
  userId: string;
  assignedAt: string;
  source: EnterpriseAssignmentSource;
  displayName?: string | null;
};

/** Clinical care-team membership — attending ownership (not shift covering). */
export type EnterpriseClinicalCareTeamV1 = {
  attendingProviderUserId: string | null;
  attendingProviderDisplayName: string | null;
};

/**
 * Board display policy (deliberate):
 * - Provider column → PRIMARY_PROVIDER workflow (covering never replaces)
 * - Nurse column → PRIMARY_RN (break/charge never replace)
 * - Technician column → PATIENT_CARE_TECH
 * - Clinical attending shown separately when set (does not replace board Provider)
 */
export const HOSPITAL_BOARD_DISPLAY_POLICY = {
  providerShows: "PRIMARY_PROVIDER" as const,
  nurseShows: "PRIMARY_RN" as const,
  technicianShows: "PATIENT_CARE_TECH" as const,
  coveringDoesNotOverwriteAttending: true,
  coveringDoesNotOverwritePrimaryProvider: true,
  breakChargeDoNotReplacePrimaryRn: true,
} as const;

export type EnterpriseHospitalAssignmentBagV1 = {
  v: 1;
  /** Always hospital lane — never copies ED columns. */
  careSetting: "OBSERVATION" | "INPATIENT";
  clinical: EnterpriseClinicalCareTeamV1;
  workflow: Partial<Record<EnterpriseWorkflowAssignmentSlot, EnterpriseAssignmentSlotV1 | null>>;
  /**
   * Board projection mirror synced from primary workflow slots.
   * Retained for census/board backward compatibility.
   */
  slots: Partial<Record<EnterpriseHospitalBoardAssignmentRole, EnterpriseAssignmentSlotV1 | null>>;
  history: Array<{
    at: string;
    role:
      | EnterpriseHospitalBoardAssignmentRole
      | EnterpriseWorkflowAssignmentSlot
      | "CLINICAL_ATTENDING";
    action: "ASSIGN" | "UNASSIGN" | "REASSIGN";
    actorUserId: string;
    previousUserId: string | null;
    nextUserId: string | null;
    source: EnterpriseAssignmentSource;
  }>;
};

export function emptyClinicalCareTeam(): EnterpriseClinicalCareTeamV1 {
  return {
    attendingProviderUserId: null,
    attendingProviderDisplayName: null,
  };
}

export function emptyHospitalAssignmentBag(
  careSetting: "OBSERVATION" | "INPATIENT"
): EnterpriseHospitalAssignmentBagV1 {
  return {
    v: 1,
    careSetting,
    clinical: emptyClinicalCareTeam(),
    workflow: {
      PRIMARY_PROVIDER: null,
      COVERING_PROVIDER: null,
      PRIMARY_RN: null,
      BREAK_RN: null,
      CHARGE_RN: null,
      PATIENT_CARE_TECH: null,
    },
    slots: {
      PROVIDER: null,
      NURSE: null,
      TECHNICIAN: null,
    },
    history: [],
  };
}

function parseSlot(raw: unknown): EnterpriseAssignmentSlotV1 | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const userId = String((raw as { userId?: unknown }).userId ?? "").trim();
  const assignedAt = String((raw as { assignedAt?: unknown }).assignedAt ?? "").trim();
  if (!userId || !assignedAt) return null;
  return {
    userId,
    assignedAt,
    source: ((raw as { source?: string }).source as EnterpriseAssignmentSource) || "SELF_ASSIGN",
    displayName:
      typeof (raw as { displayName?: unknown }).displayName === "string"
        ? (raw as { displayName: string }).displayName
        : null,
  };
}

function syncBoardSlotsFromWorkflow(
  workflow: EnterpriseHospitalAssignmentBagV1["workflow"]
): EnterpriseHospitalAssignmentBagV1["slots"] {
  return {
    PROVIDER: workflow.PRIMARY_PROVIDER ?? null,
    NURSE: workflow.PRIMARY_RN ?? null,
    TECHNICIAN: workflow.PATIENT_CARE_TECH ?? null,
  };
}

/**
 * Normalize legacy bags that only had `slots` into clinical + workflow shape.
 * Never invents ED column data.
 */
export function normalizeHospitalAssignmentBag(
  bag: EnterpriseHospitalAssignmentBagV1
): EnterpriseHospitalAssignmentBagV1 {
  const workflow: EnterpriseHospitalAssignmentBagV1["workflow"] = {
    PRIMARY_PROVIDER: bag.workflow?.PRIMARY_PROVIDER ?? bag.slots?.PROVIDER ?? null,
    COVERING_PROVIDER: bag.workflow?.COVERING_PROVIDER ?? null,
    PRIMARY_RN: bag.workflow?.PRIMARY_RN ?? bag.slots?.NURSE ?? null,
    BREAK_RN: bag.workflow?.BREAK_RN ?? null,
    CHARGE_RN: bag.workflow?.CHARGE_RN ?? null,
    PATIENT_CARE_TECH: bag.workflow?.PATIENT_CARE_TECH ?? bag.slots?.TECHNICIAN ?? null,
  };
  return {
    v: 1,
    careSetting: bag.careSetting,
    clinical: {
      attendingProviderUserId: bag.clinical?.attendingProviderUserId ?? null,
      attendingProviderDisplayName: bag.clinical?.attendingProviderDisplayName ?? null,
    },
    workflow,
    slots: syncBoardSlotsFromWorkflow(workflow),
    history: Array.isArray(bag.history) ? bag.history : [],
  };
}

export function readHospitalAssignmentBag(admissionSummaryJson: unknown): EnterpriseHospitalAssignmentBagV1 | null {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object" || Array.isArray(admissionSummaryJson)) {
    return null;
  }
  const bag = (admissionSummaryJson as Record<string, unknown>)[ENTERPRISE_HOSPITAL_ASSIGNMENT_BAG_KEY];
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
  const o = bag as Record<string, unknown>;
  if (o.v !== 1) return null;
  const careSetting = o.careSetting === "OBSERVATION" || o.careSetting === "INPATIENT" ? o.careSetting : null;
  if (!careSetting) return null;

  const slotsRaw = o.slots && typeof o.slots === "object" && !Array.isArray(o.slots) ? (o.slots as Record<string, unknown>) : {};
  const workflowRaw =
    o.workflow && typeof o.workflow === "object" && !Array.isArray(o.workflow)
      ? (o.workflow as Record<string, unknown>)
      : {};
  const clinicalRaw =
    o.clinical && typeof o.clinical === "object" && !Array.isArray(o.clinical)
      ? (o.clinical as Record<string, unknown>)
      : {};

  const slots: EnterpriseHospitalAssignmentBagV1["slots"] = {};
  for (const role of HOSPITAL_BOARD_ASSIGNMENT_ROLES) {
    slots[role] = parseSlot(slotsRaw[role]);
  }

  const workflow: EnterpriseHospitalAssignmentBagV1["workflow"] = {};
  for (const slot of ENTERPRISE_WORKFLOW_ASSIGNMENT_SLOTS) {
    workflow[slot] = parseSlot(workflowRaw[slot]);
  }

  return normalizeHospitalAssignmentBag({
    v: 1,
    careSetting,
    clinical: {
      attendingProviderUserId:
        typeof clinicalRaw.attendingProviderUserId === "string"
          ? clinicalRaw.attendingProviderUserId.trim() || null
          : null,
      attendingProviderDisplayName:
        typeof clinicalRaw.attendingProviderDisplayName === "string"
          ? clinicalRaw.attendingProviderDisplayName
          : null,
    },
    workflow,
    slots,
    history: Array.isArray(o.history) ? (o.history as EnterpriseHospitalAssignmentBagV1["history"]) : [],
  });
}

export function mergeHospitalAssignmentBagIntoSummary(
  admissionSummaryJson: unknown,
  bag: EnterpriseHospitalAssignmentBagV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson && typeof admissionSummaryJson === "object" && !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[ENTERPRISE_HOSPITAL_ASSIGNMENT_BAG_KEY] = normalizeHospitalAssignmentBag(bag);
  return base;
}

/**
 * Ensure hospital bag exists and is empty of active workflow/board slots (history may remain).
 * Used at admission / receiving create — never copies ED physician/nurse IDs.
 * Clinical attending is cleared on seed (Placement may set later — intentional boundary).
 */
export function ensureEmptyHospitalAssignmentOnAdmission(
  admissionSummaryJson: unknown,
  careSetting: "OBSERVATION" | "INPATIENT"
): Record<string, unknown> {
  const existing = readHospitalAssignmentBag(admissionSummaryJson);
  if (existing) {
    return mergeHospitalAssignmentBagIntoSummary(admissionSummaryJson, {
      ...existing,
      careSetting,
      clinical: emptyClinicalCareTeam(),
      workflow: {
        PRIMARY_PROVIDER: null,
        COVERING_PROVIDER: null,
        PRIMARY_RN: null,
        BREAK_RN: null,
        CHARGE_RN: null,
        PATIENT_CARE_TECH: null,
      },
      slots: { PROVIDER: null, NURSE: null, TECHNICIAN: null },
    });
  }
  return mergeHospitalAssignmentBagIntoSummary(
    admissionSummaryJson,
    emptyHospitalAssignmentBag(careSetting)
  );
}

/** Set clinical attending without touching workflow primary/covering slots. */
export function applyClinicalAttendingMutation(
  bag: EnterpriseHospitalAssignmentBagV1,
  input: {
    actorUserId: string;
    attendingProviderUserId: string | null;
    attendingProviderDisplayName?: string | null;
    at?: string;
  }
): EnterpriseHospitalAssignmentBagV1 {
  const normalized = normalizeHospitalAssignmentBag(bag);
  const at = input.at ?? new Date().toISOString();
  const previousUserId = normalized.clinical.attendingProviderUserId;
  const nextUserId = input.attendingProviderUserId?.trim() || null;
  if (previousUserId === nextUserId) return normalized;
  const action = !nextUserId ? ("UNASSIGN" as const) : previousUserId ? ("REASSIGN" as const) : ("ASSIGN" as const);
  return {
    ...normalized,
    clinical: {
      attendingProviderUserId: nextUserId,
      attendingProviderDisplayName: nextUserId
        ? (input.attendingProviderDisplayName ?? null)
        : null,
    },
    history: [
      ...normalized.history,
      {
        at,
        role: "CLINICAL_ATTENDING",
        action,
        actorUserId: input.actorUserId,
        previousUserId,
        nextUserId,
        source: "SYSTEM_INIT",
      },
    ],
  };
}

export function applyHospitalWorkflowAssignmentMutation(
  bag: EnterpriseHospitalAssignmentBagV1,
  input: {
    slot: EnterpriseWorkflowAssignmentSlot;
    actorUserId: string;
    nextUserId: string | null;
    source: EnterpriseAssignmentSource;
    displayName?: string | null;
    at?: string;
  }
): EnterpriseHospitalAssignmentBagV1 {
  const normalized = normalizeHospitalAssignmentBag(bag);
  const at = input.at ?? new Date().toISOString();
  const previous = normalized.workflow[input.slot] ?? null;
  const previousUserId = previous?.userId ?? null;
  const nextUserId = input.nextUserId?.trim() || null;

  if (previousUserId === nextUserId) {
    return normalized;
  }

  const action =
    !nextUserId ? ("UNASSIGN" as const) : previousUserId ? ("REASSIGN" as const) : ("ASSIGN" as const);

  const nextWorkflow = { ...normalized.workflow };
  nextWorkflow[input.slot] = nextUserId
    ? {
        userId: nextUserId,
        assignedAt: at,
        source: input.source,
        displayName: input.displayName ?? null,
      }
    : null;

  // Covering / break / charge never mutate clinical attending or primary board mirrors.
  const nextClinical = { ...normalized.clinical };

  return {
    ...normalized,
    clinical: nextClinical,
    workflow: nextWorkflow,
    slots: syncBoardSlotsFromWorkflow(nextWorkflow),
    history: [
      ...normalized.history,
      {
        at,
        role: input.slot,
        action,
        actorUserId: input.actorUserId,
        previousUserId,
        nextUserId,
        source: input.source,
      },
    ],
  };
}

/**
 * Board-role mutation (Phase 1 API) — writes primary workflow slot only.
 * PROVIDER → PRIMARY_PROVIDER; NURSE → PRIMARY_RN; TECHNICIAN → PATIENT_CARE_TECH.
 */
export function applyHospitalAssignmentMutation(
  bag: EnterpriseHospitalAssignmentBagV1,
  input: {
    role: EnterpriseHospitalBoardAssignmentRole;
    actorUserId: string;
    nextUserId: string | null;
    source: EnterpriseAssignmentSource;
    displayName?: string | null;
    at?: string;
  }
): EnterpriseHospitalAssignmentBagV1 {
  return applyHospitalWorkflowAssignmentMutation(bag, {
    slot: BOARD_ROLE_TO_PRIMARY_WORKFLOW[input.role],
    actorUserId: input.actorUserId,
    nextUserId: input.nextUserId,
    source: input.source,
    displayName: input.displayName,
    at: input.at,
  });
}

/** Board display projection — hospital bag primary workflow only (never ED columns). */
export type HospitalBoardAssignmentProjection = {
  providerUserId: string | null;
  providerName: string | null;
  nurseUserId: string | null;
  nurseName: string | null;
  technicianUserId: string | null;
  technicianName: string | null;
  providerUnassigned: boolean;
  nurseUnassigned: boolean;
  technicianUnassigned: boolean;
  /** Clinical attending — separate from board Provider (PRIMARY_PROVIDER). */
  clinicalAttendingUserId: string | null;
  clinicalAttendingName: string | null;
  coveringProviderUserId: string | null;
  coveringProviderName: string | null;
};

export function projectHospitalBoardAssignments(
  bag: EnterpriseHospitalAssignmentBagV1 | null
): HospitalBoardAssignmentProjection {
  const normalized = bag ? normalizeHospitalAssignmentBag(bag) : null;
  const provider = normalized?.workflow.PRIMARY_PROVIDER ?? null;
  const nurse = normalized?.workflow.PRIMARY_RN ?? null;
  const tech = normalized?.workflow.PATIENT_CARE_TECH ?? null;
  const covering = normalized?.workflow.COVERING_PROVIDER ?? null;
  return {
    providerUserId: provider?.userId ?? null,
    providerName: provider?.displayName ?? null,
    nurseUserId: nurse?.userId ?? null,
    nurseName: nurse?.displayName ?? null,
    technicianUserId: tech?.userId ?? null,
    technicianName: tech?.displayName ?? null,
    providerUnassigned: !provider?.userId,
    nurseUnassigned: !nurse?.userId,
    technicianUnassigned: !tech?.userId,
    clinicalAttendingUserId: normalized?.clinical.attendingProviderUserId ?? null,
    clinicalAttendingName: normalized?.clinical.attendingProviderDisplayName ?? null,
    coveringProviderUserId: covering?.userId ?? null,
    coveringProviderName: covering?.displayName ?? null,
  };
}

export type EnterpriseMyPatientsFilterContext = {
  currentUserId: string;
  roles: readonly string[];
  /** Optional — hospital filters ignore EMERGENCY (ED uses its own adapter). */
  careSetting?: EnterpriseAssignmentCareSetting;
};

export type EnterpriseAssignableEncounter = {
  providerUserId?: string | null;
  nurseUserId?: string | null;
  technicianUserId?: string | null;
  /** Optional workflow extras for My Patients (covering / break / charge). */
  coveringProviderUserId?: string | null;
  breakNurseUserId?: string | null;
  chargeNurseUserId?: string | null;
};

export function isHospitalPatientCareTechMembership(roles: readonly string[]): boolean {
  const normalized = roles.map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean);
  // LAB / RADIOLOGY never authorize hospital care-tech membership by themselves.
  return normalized.some((c) =>
    (HOSPITAL_PATIENT_CARE_TECH_ROLE_CODES as readonly string[]).includes(c)
  );
}

export function isAncillaryLabOrRadiologyRole(roles: readonly string[]): boolean {
  const normalized = roles.map((r) => String(r ?? "").trim().toUpperCase()).filter(Boolean);
  return normalized.some((c) =>
    (HOSPITAL_TECH_EXCLUDED_ANCILLARY_ROLE_CODES as readonly string[]).includes(c)
  );
}

/**
 * Operational ownership filter for hospital workflow assignments.
 * My Patients = any matching workflow slot for the active user's role(s).
 * Does not use ED columns; does not treat LAB/RAD as care-tech.
 */
export function isEncounterAssignedToCurrentUserEnterprise(
  encounter: EnterpriseAssignableEncounter,
  ctx: EnterpriseMyPatientsFilterContext
): boolean {
  if (ctx.careSetting === "EMERGENCY") {
    // ED ownership is not resolved from hospital bag helpers.
    return false;
  }
  const userId = String(ctx.currentUserId ?? "").trim();
  if (!userId) return false;
  const providerId = String(encounter.providerUserId ?? "").trim();
  const coveringId = String(encounter.coveringProviderUserId ?? "").trim();
  const nurseId = String(encounter.nurseUserId ?? "").trim();
  const breakId = String(encounter.breakNurseUserId ?? "").trim();
  const chargeId = String(encounter.chargeNurseUserId ?? "").trim();
  const techId = String(encounter.technicianUserId ?? "").trim();
  const roles = ctx.roles.map((r) => String(r ?? "").trim().toUpperCase());
  const isNurse = roles.includes("RN");
  const isProvider = roles.includes("PROVIDER");
  const isTech = isHospitalPatientCareTechMembership(roles);
  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  if (isAdmin) {
    return (
      providerId === userId ||
      coveringId === userId ||
      nurseId === userId ||
      breakId === userId ||
      chargeId === userId ||
      techId === userId
    );
  }
  const matches: boolean[] = [];
  if (isProvider) {
    matches.push(providerId === userId || coveringId === userId);
  }
  if (isNurse) {
    matches.push(nurseId === userId || breakId === userId || chargeId === userId);
  }
  if (isTech) {
    matches.push(techId === userId);
  }
  if (matches.length === 0) return false;
  return matches.some(Boolean);
}

export function filterMyPatientsEncountersEnterprise<T extends EnterpriseAssignableEncounter>(
  encounters: readonly T[],
  ctx: EnterpriseMyPatientsFilterContext
): T[] {
  if (!String(ctx.currentUserId ?? "").trim()) return [];
  return encounters.filter((e) => isEncounterAssignedToCurrentUserEnterprise(e, ctx));
}

export function filterUnassignedHospitalEncountersEnterprise<T extends EnterpriseAssignableEncounter>(
  encounters: readonly T[],
  role: EnterpriseHospitalBoardAssignmentRole
): T[] {
  return encounters.filter((e) => {
    if (role === "PROVIDER") return !String(e.providerUserId ?? "").trim();
    if (role === "NURSE") return !String(e.nurseUserId ?? "").trim();
    return !String(e.technicianUserId ?? "").trim();
  });
}

export function resolveHospitalCareSettingFromEncounter(input: {
  type?: string | null;
  admissionSummaryJson?: unknown;
}): "OBSERVATION" | "INPATIENT" | null {
  const bag = readHospitalAssignmentBag(input.admissionSummaryJson);
  if (bag) return bag.careSetting;
  const t = String(input.type ?? "").toUpperCase();
  if (t === "INPATIENT") {
    const summary = input.admissionSummaryJson;
    if (summary && typeof summary === "object" && !Array.isArray(summary)) {
      const req = String((summary as Record<string, unknown>).requestedEncounterType ?? "").toUpperCase();
      if (req === "OBSERVATION" || req.includes("OBS")) return "OBSERVATION";
    }
    return "INPATIENT";
  }
  if (t === "EMERGENCY") return null;
  return null;
}

/** Stable engine dimensions for future units (MS/ICU/Tele/…/Peds) — one engine, unit as dimension. */
export type EnterpriseAssignmentEngineDimensions = {
  encounterId: string;
  facilityId: string;
  careSetting: EnterpriseAssignmentCareSetting;
  unitCode?: string | null;
  role: EnterpriseHospitalBoardAssignmentRole | EnterpriseWorkflowAssignmentSlot;
  userId: string;
  status: "ASSIGNED" | "UNASSIGNED";
};
