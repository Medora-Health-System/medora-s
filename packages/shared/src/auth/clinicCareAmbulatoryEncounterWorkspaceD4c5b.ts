/**
 * MEDUI.D4C.5B — Unified Ambulatory Encounter Workspace contracts.
 *
 * Presentation / routing / role-tile authority only.
 * Reuses enterprise encounter shell (`/app/encounters/:id`) with
 * `workspace=ambulatory` + `section=` — no ClinicPatientChart /
 * ClinicEncounterChart / ClinicEncounterStatus / parallel clinical engines.
 *
 * Tile order (D4C.5B.3): Eval → Med Eval → Orders → Meds → Results → Dx →
 * Clinical Data → Nursing/MA → Notes → Rx → Follow-up/Checkout → Summary.
 * Rx sits near Suivi/sortie (not between Orders and Medications).
 */

import { CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY } from "./clinicCareProviderWorkspaceD4c5.js";
import type { ClinicCareStageId } from "./clinicCareTrackboardProjectionD4c2.js";

export const CLINIC_CARE_AMBULATORY_ENCOUNTER_WORKSPACE_CERTIFICATION_ID =
  "MEDUI.D4C.5B" as const;

/** Care-setting token for ambulatory workspace (presentation; not a Prisma enum). */
export const CLINIC_CARE_AMBULATORY_WORKSPACE_CARE_SETTING = "AMBULATORY" as const;

/**
 * Inline dashboard sections for Active Clinic Workspace.
 * Query: `/app/encounters/:id?workspace=ambulatory&section=<id>`
 */
export const CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS = [
  "intake",
  "medical-evaluation",
  "orders",
  "medications",
  "results",
  "diagnoses",
  "clinical-data",
  "nursing",
  "notes",
  "prescriptions",
  "follow-up",
  "summary",
] as const;

export type ClinicCareAmbulatoryWorkspaceSection =
  (typeof CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS)[number];

/** Tile abbreviations (product vision). */
export const CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_ABBREV: Record<
  ClinicCareAmbulatoryWorkspaceSection,
  string
> = {
  intake: "I",
  "medical-evaluation": "ME",
  orders: "O",
  prescriptions: "Rx",
  medications: "M",
  results: "R",
  diagnoses: "Dx",
  "clinical-data": "CD",
  nursing: "N/MA",
  notes: "N",
  "follow-up": "F",
  summary: "S",
};

/** Tile accent colors (compact operational strip). */
export const CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_ACCENT: Record<
  ClinicCareAmbulatoryWorkspaceSection,
  string
> = {
  intake: "#0d9488",
  "medical-evaluation": "#2563eb",
  orders: "#7c3aed",
  prescriptions: "#c026d3",
  medications: "#db2777",
  results: "#0891b2",
  diagnoses: "#ea580c",
  "clinical-data": "#4f46e5",
  nursing: "#059669",
  notes: "#64748b",
  "follow-up": "#0f766e",
  summary: "#334155",
};

/** i18n label key suffix per section (under clinicCareD4c5b.tiles.*). */
export const CLINIC_CARE_AMBULATORY_WORKSPACE_TILE_LABEL_KEY: Record<
  ClinicCareAmbulatoryWorkspaceSection,
  string
> = {
  intake: "clinicCareD4c5b.tiles.intake",
  "medical-evaluation": "clinicCareD4c5b.tiles.medicalEvaluation",
  orders: "clinicCareD4c5b.tiles.orders",
  prescriptions: "clinicCareD4c5b.tiles.prescriptions",
  medications: "clinicCareD4c5b.tiles.medications",
  results: "clinicCareD4c5b.tiles.results",
  diagnoses: "clinicCareD4c5b.tiles.diagnoses",
  "clinical-data": "clinicCareD4c5b.tiles.clinicalData",
  nursing: "clinicCareD4c5b.tiles.nursing",
  notes: "clinicCareD4c5b.tiles.notes",
  "follow-up": "clinicCareD4c5b.tiles.followUp",
  summary: "clinicCareD4c5b.tiles.summary",
};

const SECTION_SET = new Set<string>(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS);

const SECTION_ALIASES: Record<string, ClinicCareAmbulatoryWorkspaceSection> = {
  intake: "intake",
  triage: "intake",
  "medical-evaluation": "medical-evaluation",
  medicalevaluation: "medical-evaluation",
  "medical_evaluation": "medical-evaluation",
  clinic: "medical-evaluation",
  providermse: "medical-evaluation",
  orders: "orders",
  prescriptions: "prescriptions",
  rx: "prescriptions",
  prescription: "prescriptions",
  medications: "medications",
  mar: "medications",
  meds: "medications",
  results: "results",
  diagnoses: "diagnoses",
  diagnostics: "diagnoses",
  dx: "diagnoses",
  "clinical-data": "clinical-data",
  clinicaldata: "clinical-data",
  nursing: "nursing",
  notes: "notes",
  "follow-up": "follow-up",
  followup: "follow-up",
  disposition: "follow-up",
  checkout: "follow-up",
  summary: "summary",
  visitsummary: "summary",
};

export function parseClinicCareAmbulatoryWorkspaceSection(
  raw: string | null | undefined
): ClinicCareAmbulatoryWorkspaceSection | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (SECTION_SET.has(trimmed)) {
    return trimmed as ClinicCareAmbulatoryWorkspaceSection;
  }
  return SECTION_ALIASES[trimmed.toLowerCase()] ?? null;
}

/**
 * Map legacy encounter `tab=` query onto ambulatory workspace sections
 * so D4C.5 / D4C.6 deep-links keep working under the unified shell.
 */
export function mapEncounterTabToAmbulatoryWorkspaceSection(
  tab: string | null | undefined
): ClinicCareAmbulatoryWorkspaceSection | null {
  return parseClinicCareAmbulatoryWorkspaceSection(tab);
}

/** Active Clinic Workspace path (canonical encounter route). */
export function clinicCareAmbulatoryActiveWorkspacePath(
  encounterId: string,
  section?: ClinicCareAmbulatoryWorkspaceSection | null
): string {
  const id = encodeURIComponent(encounterId);
  const sec = section && SECTION_SET.has(section) ? section : null;
  const qs = new URLSearchParams();
  qs.set("workspace", CLINIC_CARE_AMBULATORY_WORKSPACE_QUERY);
  if (sec) qs.set("section", sec);
  return `/app/encounters/${id}?${qs.toString()}`;
}

/** Default open path from Today's Visits / provider worklist (Medical Evaluation). */
export function clinicCareAmbulatoryOpenWorkspacePath(encounterId: string): string {
  return clinicCareAmbulatoryActiveWorkspacePath(encounterId, "medical-evaluation");
}

/** Orders tile mount (D4C.6 reuse). */
export function clinicCareAmbulatoryOrdersSectionPath(encounterId: string): string {
  return clinicCareAmbulatoryActiveWorkspacePath(encounterId, "orders");
}

/** Results tile mount (D4C.6 reuse). */
export function clinicCareAmbulatoryResultsSectionPath(encounterId: string): string {
  return clinicCareAmbulatoryActiveWorkspacePath(encounterId, "results");
}

/** Expanded provider worklist groups (D4C.5B — includes waiting/ready). */
export const CLINIC_CARE_PROVIDER_QUEUE_GROUPS_D4C5B = [
  "WAITING",
  "IN_PROGRESS",
  "RESULTS_PENDING",
  "DISCHARGE_PENDING",
] as const;

export type ClinicCareProviderQueueGroupD4c5b =
  (typeof CLINIC_CARE_PROVIDER_QUEUE_GROUPS_D4C5B)[number];

/**
 * Map clinic stage → provider worklist group.
 * WAITING includes ARRIVED / intake / ready-for-provider (not yet IN_TREATMENT).
 */
export function projectClinicCareProviderQueueGroupD4c5b(
  stageId: ClinicCareStageId | string | null | undefined
): ClinicCareProviderQueueGroupD4c5b | null {
  const s = String(stageId ?? "")
    .trim()
    .toUpperCase();
  if (s === "WAITING") return "WAITING";
  if (s === "IN_PROGRESS") return "IN_PROGRESS";
  if (s === "RESULTS_PENDING") return "RESULTS_PENDING";
  if (s === "DISCHARGE_PENDING") return "DISCHARGE_PENDING";
  return null;
}

export function sortClinicCareProviderQueueGroupsD4c5b(
  groups: readonly ClinicCareProviderQueueGroupD4c5b[]
): ClinicCareProviderQueueGroupD4c5b[] {
  const order: Record<ClinicCareProviderQueueGroupD4c5b, number> = {
    WAITING: 0,
    IN_PROGRESS: 1,
    RESULTS_PENDING: 2,
    DISCHARGE_PENDING: 3,
  };
  return [...groups].sort((a, b) => order[a] - order[b]);
}

/**
 * Explicit ambulatory workflow actions over EncounterWorkflowState
 * (no ClinicEncounterStatus).
 */
export const CLINIC_CARE_AMBULATORY_WORKFLOW_ACTIONS = [
  "START_INTAKE",
  "READY_FOR_PROVIDER",
  "START_CONSULTATION",
  "MARK_IN_PROGRESS",
  "READY_FOR_CHECKOUT",
  "COMPLETE_VISIT",
] as const;

export type ClinicCareAmbulatoryWorkflowAction =
  (typeof CLINIC_CARE_AMBULATORY_WORKFLOW_ACTIONS)[number];

/** Target EncounterWorkflowState for an explicit ambulatory action (null = display-only). */
export function resolveClinicCareAmbulatoryWorkflowTarget(
  action: ClinicCareAmbulatoryWorkflowAction,
  currentWorkflowState: string | null | undefined
): string | null {
  const wf = String(currentWorkflowState ?? "")
    .trim()
    .toUpperCase();
  switch (action) {
    case "START_INTAKE":
      return wf === "ARRIVED" ? "TRIAGE" : null;
    case "READY_FOR_PROVIDER":
      return wf === "TRIAGE" ? "IN_TREATMENT" : null;
    case "START_CONSULTATION":
      if (wf === "TRIAGE") return "IN_TREATMENT";
      if (wf === "IN_TREATMENT" || wf === "RESULTS_PENDING" || wf === "DISPOSITION") {
        return wf; // already provider-active — open Medical Evaluation only
      }
      return null;
    case "MARK_IN_PROGRESS":
      return wf === "TRIAGE" ? "IN_TREATMENT" : null;
    case "READY_FOR_CHECKOUT":
      if (wf === "IN_TREATMENT" || wf === "RESULTS_PENDING") return "DISPOSITION";
      if (wf === "DISPOSITION") return "DISCHARGE_READY";
      return null;
    case "COMPLETE_VISIT":
      // MEDUI.D4C.7D — COMPLETE_VISIT invokes enterprise EncountersService.close
      // (not workflow FINALIZED alone). Sentinel consumed by Active Ambulatory Workspace.
      if (wf === "DISCHARGE_READY" || wf === "FINALIZED") {
        return "ENTERPRISE_CLOSE";
      }
      return null;
    default:
      return null;
  }
}

export function clinicCareAmbulatoryWorkflowActionLabelKey(
  action: ClinicCareAmbulatoryWorkflowAction
): string {
  switch (action) {
    case "START_INTAKE":
      return "clinicCareD4c5b.workflow.startIntake";
    case "READY_FOR_PROVIDER":
      return "clinicCareD4c5b.workflow.readyForProvider";
    case "START_CONSULTATION":
      return "clinicCareD4c5b.workflow.startConsultation";
    case "MARK_IN_PROGRESS":
      return "clinicCareD4c5b.workflow.inProgress";
    case "READY_FOR_CHECKOUT":
      return "clinicCareD4c5b.workflow.readyForCheckout";
    case "COMPLETE_VISIT":
      return "clinicCareD4c5b.workflow.completed";
    default:
      return "clinicCareD4c5b.workflow.startConsultation";
  }
}

/** Role groups for tile visibility (mirrors ED pattern, ambulatory-simpler). */
export type ClinicCareAmbulatoryWorkspaceRoleGroup =
  | "PROVIDER"
  | "RN"
  | "TECH"
  | "ADMIN"
  | "FRONT_DESK"
  | "PHARMACIST"
  | "UNKNOWN";

export function resolveClinicCareAmbulatoryWorkspaceRoleGroup(
  roleCodes: readonly string[]
): ClinicCareAmbulatoryWorkspaceRoleGroup {
  const roles = roleCodes.map((r) => r.trim().toUpperCase()).filter(Boolean);
  if (roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN")) return "ADMIN";
  if (roles.includes("PROVIDER")) return "PROVIDER";
  if (roles.includes("RN")) return "RN";
  if (roles.includes("PHARMACIST")) return "PHARMACIST";
  if (roles.includes("PATIENT_CARE_TECH") || roles.includes("TECHNICIAN")) return "TECH";
  if (roles.includes("FRONT_DESK")) return "FRONT_DESK";
  return "UNKNOWN";
}

const ALL_SECTIONS = [...CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS];

const ROLE_TILES: Record<
  ClinicCareAmbulatoryWorkspaceRoleGroup,
  readonly ClinicCareAmbulatoryWorkspaceSection[]
> = {
  ADMIN: ALL_SECTIONS,
  PROVIDER: ALL_SECTIONS,
  RN: [
    "intake",
    "orders",
    "medications",
    "results",
    "clinical-data",
    "nursing",
    "notes",
    "prescriptions",
    "follow-up",
    "summary",
  ],
  PHARMACIST: ["medications", "orders", "prescriptions", "summary"],
  TECH: ["intake", "orders", "results", "nursing", "summary"],
  FRONT_DESK: ["intake", "follow-up", "summary"],
  UNKNOWN: ["summary"],
};

/** Visible tiles for role — hide unauthorized sections (not merely CSS). */
export function getVisibleClinicCareAmbulatoryWorkspaceSections(
  roleCodes: readonly string[]
): ClinicCareAmbulatoryWorkspaceSection[] {
  const group = resolveClinicCareAmbulatoryWorkspaceRoleGroup(roleCodes);
  return [...ROLE_TILES[group]];
}

export function getDefaultClinicCareAmbulatoryWorkspaceSection(
  roleCodes: readonly string[]
): ClinicCareAmbulatoryWorkspaceSection {
  const group = resolveClinicCareAmbulatoryWorkspaceRoleGroup(roleCodes);
  switch (group) {
    case "PROVIDER":
    case "ADMIN":
      return "medical-evaluation";
    case "RN":
    case "TECH":
      return "intake";
    case "PHARMACIST":
      return "prescriptions";
    case "FRONT_DESK":
      return "follow-up";
    default:
      return "summary";
  }
}

/**
 * Route guard: whether a role may open a section.
 * Unauthorized → redirect to default visible section (not silent hide-only).
 */
export function canAccessClinicCareAmbulatoryWorkspaceSection(
  roleCodes: readonly string[],
  section: ClinicCareAmbulatoryWorkspaceSection
): boolean {
  return getVisibleClinicCareAmbulatoryWorkspaceSections(roleCodes).includes(section);
}

/**
 * ED-only / inpatient-only clinical document type ids blocked in ambulatory Clinical Data.
 * Filter only — does not fork the document engine.
 */
export const CLINIC_CARE_AMBULATORY_CLINICAL_DATA_BLOCKED_TYPE_IDS = [
  "THROMBOLYSIS",
  "ED_THROMBOLYSIS",
  "CIWA",
  "COWS",
  "TRAUMA_PRIMARY",
  "TRAUMA_SECONDARY",
  "ED_STROKE",
  "STROKE_ED",
  "BLOOD_PRODUCTS_INPATIENT",
  "MASSIVE_TRANSFUSION",
  "ED_DISPOSITION",
  "ED_TRAUMA",
] as const;

export function isAmbulatoryClinicalDataDocumentAllowed(input: {
  typeId?: string | null;
  careSettings?: readonly string[] | null;
  category?: string | null;
}): boolean {
  const typeId = String(input.typeId ?? "")
    .trim()
    .toUpperCase();
  if (
    (CLINIC_CARE_AMBULATORY_CLINICAL_DATA_BLOCKED_TYPE_IDS as readonly string[]).includes(typeId)
  ) {
    return false;
  }
  const cat = String(input.category ?? "")
    .trim()
    .toUpperCase();
  if (
    cat.includes("THROMBOLYSIS") ||
    cat.includes("TRAUMA") ||
    cat === "CIWA" ||
    cat === "COWS" ||
    cat.includes("STROKE_ED") ||
    cat.includes("BLOOD_PRODUCT")
  ) {
    return false;
  }
  const settings = (input.careSettings ?? []).map((s) => String(s).trim().toUpperCase());
  if (settings.length === 0) return true;
  const ambulatoryOk = settings.some((s) =>
    ["CLINIC", "OUTPATIENT", "URGENT_CARE", "AMBULATORY", "ALL"].includes(s)
  );
  const edOnly =
    settings.every((s) => s === "ED" || s === "EMERGENCY" || s === "INPATIENT") &&
    !ambulatoryOk;
  return !edOnly;
}

export function filterAmbulatoryClinicalDataDocuments<
  T extends {
    typeId?: string | null;
    id?: string | null;
    careSettings?: readonly string[] | null;
    category?: string | null;
  },
>(docs: readonly T[]): T[] {
  return docs.filter((d) =>
    isAmbulatoryClinicalDataDocumentAllowed({
      typeId: d.typeId ?? d.id,
      careSettings: d.careSettings,
      category: d.category,
    })
  );
}

/** Whether global Tableau de bord should be suppressed when Clinic Care owns landing. */
export function shouldSuppressGlobalDashboardForClinicCare(input: {
  clinicCareVisible: boolean;
  edVisible: boolean;
  hospitalVisible: boolean;
  ambulatoryFacility: boolean;
}): boolean {
  return (
    input.ambulatoryFacility &&
    input.clinicCareVisible &&
    !input.edVisible &&
    !input.hospitalVisible
  );
}
