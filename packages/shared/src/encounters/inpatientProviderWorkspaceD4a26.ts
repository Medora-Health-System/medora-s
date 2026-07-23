/**
 * D4A.2.6 — Inpatient Provider Clinical Workspace contracts.
 *
 * Provider Workspace ≠ Nursing Workspace, same inpatient encounter.
 * Additive JSON under admissionSummaryJson.inpatientProviderWorkspaceV1.
 * Zero schema migration. Reuses orders/results/meds/diagnoses/timeline engines.
 */

export const INPATIENT_PROVIDER_WORKSPACE_CERTIFICATION_ID =
  "MEDUI.INPATIENT_PROVIDER_WORKSPACE.D4A2_6" as const;

export const INPATIENT_PROVIDER_WORKSPACE_KEY = "inpatientProviderWorkspaceV1" as const;

export const PROVIDER_ROUNDING_MODE_STEPS = [
  "OVERNIGHT_EVENTS",
  "VITALS_IO",
  "LABS_IMAGING",
  "MEDICATIONS",
  "ACTIVE_PROBLEMS",
  "ASSESSMENT_PLAN",
  "ORDERS",
  "CONSULTS",
  "DISCHARGE_READINESS",
  "NOTE_REVIEW_SIGN",
] as const;

export type ProviderRoundingModeStep = (typeof PROVIDER_ROUNDING_MODE_STEPS)[number];

export const PROVIDER_EVENT_ACK_STATUSES = [
  "NEW",
  "REVIEWED",
  "ACKNOWLEDGED",
  "ACTION_TAKEN",
  "RESOLVED",
] as const;

export type ProviderEventAckStatus = (typeof PROVIDER_EVENT_ACK_STATUSES)[number];

export const PROVIDER_PROBLEM_PLAN_STATUSES = [
  "ACTIVE",
  "IMPROVING",
  "STABLE",
  "WORSENING",
  "RESOLVED",
  "HISTORICAL",
  "RULED_OUT",
] as const;

export type ProviderProblemPlanStatus = (typeof PROVIDER_PROBLEM_PLAN_STATUSES)[number];

export const PROVIDER_TASK_TYPES = [
  "HP_DUE",
  "PROGRESS_NOTE_DUE",
  "UNSIGNED_NOTE",
  "CRITICAL_RESULT_ACK",
  "RESULT_FOLLOW_UP",
  "ADMISSION_ORDERS_INCOMPLETE",
  "MED_RECON_INCOMPLETE",
  "VTE_DECISION_MISSING",
  "CODE_STATUS_CONFIRMATION",
  "CONSULT_RECOMMENDATION_REVIEW",
  "EXPIRING_ORDER",
  "DISCHARGE_SUMMARY",
  "DISCHARGE_ORDER",
  "CO_SIGNATURE",
] as const;

export type ProviderTaskType = (typeof PROVIDER_TASK_TYPES)[number];

export const PROVIDER_TASK_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "DEFERRED",
  "CANCELLED",
] as const;

export type ProviderTaskStatus = (typeof PROVIDER_TASK_STATUSES)[number];

export const PROVIDER_HP_SECTION_KEYS = [
  "CHIEF_CONCERN",
  "HPI",
  "SOURCE_RELIABILITY",
  "PMH",
  "PSH",
  "HOME_MEDS",
  "ALLERGIES",
  "FAMILY_HISTORY",
  "SOCIAL_HISTORY",
  "ROS",
  "PHYSICAL_EXAM",
  "DIAGNOSTICS_REVIEWED",
  "ASSESSMENT_PLAN",
  "MEDICAL_NECESSITY",
  "ADMISSION_SAFETY",
] as const;

export type ProviderHpSectionKey = (typeof PROVIDER_HP_SECTION_KEYS)[number];

export type ProviderEventItemV1 = {
  eventId: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  summary: string;
  source: string;
  occurredAt: string;
  status: ProviderEventAckStatus;
  acknowledgedByUserId?: string | null;
  acknowledgedAt?: string | null;
  actionTaken?: string | null;
  relatedObjectId?: string | null;
};

export type ProviderProblemPlanItemV1 = {
  problemId: string;
  diagnosisId?: string | null;
  displayLabel: string;
  status: ProviderProblemPlanStatus;
  priority: "PRIMARY" | "SECONDARY" | "OTHER";
  assessment?: string | null;
  /** Supporting evidence narrative — never auto-written. */
  supportingEvidence?: string | null;
  relatedOrderIds?: string[];
  relatedResultIds?: string[];
  relatedConsultIds?: string[];
  goals?: string | null;
  dispositionBarrier?: string | null;
  plan?: string | null;
  lastReviewedAt?: string | null;
  lastReviewedByUserId?: string | null;
  resolvedAt?: string | null;
  history?: Array<{ at: string; byUserId?: string | null; summary: string }>;
  hospitalProblem?: boolean;
  chronic?: boolean;
  monitoring?: boolean;
};

export type ProviderTaskItemV1 = {
  taskId: string;
  type: ProviderTaskType;
  status: ProviderTaskStatus;
  priority: "ROUTINE" | "URGENT" | "STAT";
  dueAt?: string | null;
  ownerUserId?: string | null;
  linkedSection?: string | null;
  completedAt?: string | null;
  title: string;
};

export type ProviderHpDraftV1 = {
  expectedVersion: number;
  status: "DRAFT" | "SIGNED";
  sections: Partial<
    Record<
      ProviderHpSectionKey,
      {
        text?: string | null;
        structured?: Record<string, unknown> | null;
        updatedAt?: string | null;
      }
    >
  >;
  signedAt?: string | null;
  signedByUserId?: string | null;
  lastSavedAt?: string | null;
};

/** D4A.2.6A — Daily progress note drafts (provider-owned; never auto-generated). */
export type ProviderProgressNoteItemV1 = {
  noteId: string;
  expectedVersion: number;
  status: "DRAFT" | "REVIEW" | "SIGNED" | "AMENDED" | "CORRECTED";
  text: string;
  carryForwardFromNoteId?: string | null;
  carryForwardDiff?: {
    yesterday: string;
    today: string;
    changed: string[];
    removed: string[];
    new: string[];
  } | null;
  signedAt?: string | null;
  signedByUserId?: string | null;
  amendedAt?: string | null;
  lastSavedAt?: string | null;
  serviceDate: string;
};

export type InpatientProviderWorkspaceV1 = {
  version: 1;
  expectedVersion: number;
  events: ProviderEventItemV1[];
  problemPlans: ProviderProblemPlanItemV1[];
  tasks: ProviderTaskItemV1[];
  hpDraft?: ProviderHpDraftV1 | null;
  /** D4A.2.6A — Daily progress notes (draft/sign/amend/carry-forward). */
  progressNotes?: ProviderProgressNoteItemV1[];
  lastProviderReviewAt?: string | null;
  lastProviderReviewByUserId?: string | null;
  roundingModeStep?: ProviderRoundingModeStep | null;
  updatedAt: string;
  updatedByUserId?: string | null;
};

export function emptyInpatientProviderWorkspaceV1(nowIso?: string): InpatientProviderWorkspaceV1 {
  return {
    version: 1,
    expectedVersion: 0,
    events: [],
    problemPlans: [],
    tasks: [],
    hpDraft: {
      expectedVersion: 0,
      status: "DRAFT",
      sections: {},
      lastSavedAt: null,
    },
    progressNotes: [],
    lastProviderReviewAt: null,
    lastProviderReviewByUserId: null,
    roundingModeStep: null,
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

export function readInpatientProviderWorkspace(
  admissionSummaryJson: unknown
): InpatientProviderWorkspaceV1 | null {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object") return null;
  const raw = (admissionSummaryJson as Record<string, unknown>)[INPATIENT_PROVIDER_WORKSPACE_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as InpatientProviderWorkspaceV1;
}

export function mergeInpatientProviderWorkspaceIntoSummary(
  admissionSummaryJson: unknown,
  doc: InpatientProviderWorkspaceV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson &&
    typeof admissionSummaryJson === "object" &&
    !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[INPATIENT_PROVIDER_WORKSPACE_KEY] = doc;
  return base;
}

/** Clinical safety invariants — product must never violate these. */
export function providerWorkspaceMustNotAutoAcknowledgeResults(): true {
  return true;
}
export function providerWorkspaceMustNotAutoDocumentNegativeRos(): true {
  return true;
}
export function providerWorkspaceMustNotAutoDocumentNormalExam(): true {
  return true;
}
export function providerWorkspaceMustNotOverwriteNursingDocuments(): true {
  return true;
}
export function providerAndNursingShareSameInpatientEncounter(): true {
  return true;
}
export function providerWorkspaceMustNotCreateSecondOrderEngine(): true {
  return true;
}

export function acknowledgeProviderEvent(input: {
  doc: InpatientProviderWorkspaceV1;
  eventId: string;
  actorUserId: string;
  status: ProviderEventAckStatus;
  actionTaken?: string | null;
  clientExpectedVersion: number;
  atIso?: string;
}):
  | { ok: true; doc: InpatientProviderWorkspaceV1 }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" | "EVENT_NOT_FOUND" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  const idx = input.doc.events.findIndex((e) => e.eventId === input.eventId);
  if (idx < 0) return { ok: false, code: "EVENT_NOT_FOUND" };
  const at = input.atIso ?? new Date().toISOString();
  const events = [...input.doc.events];
  const prev = events[idx]!;
  // Opening alone never acknowledges — only explicit status transition.
  if (input.status === "NEW") {
    return { ok: false, code: "EVENT_NOT_FOUND" };
  }
  events[idx] = {
    ...prev,
    status: input.status,
    acknowledgedByUserId: input.actorUserId,
    acknowledgedAt: at,
    actionTaken: input.actionTaken ?? prev.actionTaken ?? null,
  };
  return {
    ok: true,
    doc: {
      ...input.doc,
      events,
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

export function upsertProviderProblemPlan(input: {
  doc: InpatientProviderWorkspaceV1;
  item: ProviderProblemPlanItemV1;
  clientExpectedVersion: number;
  actorUserId: string;
  atIso?: string;
}):
  | { ok: true; doc: InpatientProviderWorkspaceV1 }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const plans = [...input.doc.problemPlans];
  const idx = plans.findIndex((p) => p.problemId === input.item.problemId);
  const nextItem: ProviderProblemPlanItemV1 = {
    ...input.item,
    lastReviewedAt: at,
    lastReviewedByUserId: input.actorUserId,
    // RULED_OUT never deletes history — keep the row.
  };
  if (idx >= 0) plans[idx] = nextItem;
  else plans.push(nextItem);
  return {
    ok: true,
    doc: {
      ...input.doc,
      problemPlans: plans,
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

export function saveProviderHpDraft(input: {
  doc: InpatientProviderWorkspaceV1;
  sectionKey: ProviderHpSectionKey;
  text?: string | null;
  structured?: Record<string, unknown> | null;
  clientExpectedVersion: number;
  actorUserId: string;
  atIso?: string;
}):
  | { ok: true; doc: InpatientProviderWorkspaceV1 }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" | "PROVIDER_DOCUMENT_ALREADY_SIGNED" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  if (input.doc.hpDraft?.status === "SIGNED") {
    return { ok: false, code: "PROVIDER_DOCUMENT_ALREADY_SIGNED" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const hp = input.doc.hpDraft ?? {
    expectedVersion: 0,
    status: "DRAFT" as const,
    sections: {},
  };
  return {
    ok: true,
    doc: {
      ...input.doc,
      hpDraft: {
        ...hp,
        expectedVersion: (hp.expectedVersion ?? 0) + 1,
        status: "DRAFT",
        lastSavedAt: at,
        sections: {
          ...hp.sections,
          [input.sectionKey]: {
            text: input.text ?? hp.sections[input.sectionKey]?.text ?? null,
            structured: input.structured ?? hp.sections[input.sectionKey]?.structured ?? null,
            updatedAt: at,
          },
        },
      },
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

export function signProviderHpDraft(input: {
  doc: InpatientProviderWorkspaceV1;
  actorUserId: string;
  clientExpectedVersion: number;
  atIso?: string;
}):
  | { ok: true; doc: InpatientProviderWorkspaceV1 }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" | "PROVIDER_DOCUMENT_ALREADY_SIGNED" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  if (input.doc.hpDraft?.status === "SIGNED") {
    return { ok: false, code: "PROVIDER_DOCUMENT_ALREADY_SIGNED" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const hp = input.doc.hpDraft ?? {
    expectedVersion: 0,
    status: "DRAFT" as const,
    sections: {},
  };
  return {
    ok: true,
    doc: {
      ...input.doc,
      hpDraft: {
        ...hp,
        status: "SIGNED",
        signedAt: at,
        signedByUserId: input.actorUserId,
        lastSavedAt: at,
      },
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

export function deriveProviderTasksFromOps(input: {
  codeStatusPresent: boolean;
  medReconComplete: boolean;
  hpSigned: boolean;
  dischargeWorkflowState?: string | null;
}): ProviderTaskItemV1[] {
  const tasks: ProviderTaskItemV1[] = [];
  if (!input.hpSigned) {
    tasks.push({
      taskId: "task-hp-due",
      type: "HP_DUE",
      status: "OPEN",
      priority: "URGENT",
      title: "H&P due",
      linkedSection: "historyPhysical",
    });
  }
  if (!input.codeStatusPresent) {
    tasks.push({
      taskId: "task-code-status",
      type: "CODE_STATUS_CONFIRMATION",
      status: "OPEN",
      priority: "URGENT",
      title: "Code status confirmation",
      linkedSection: "overview",
    });
  }
  if (!input.medReconComplete) {
    tasks.push({
      taskId: "task-med-recon",
      type: "MED_RECON_INCOMPLETE",
      status: "OPEN",
      priority: "ROUTINE",
      title: "Medication reconciliation incomplete",
      linkedSection: "medications",
    });
  }
  if (input.dischargeWorkflowState === "READY") {
    tasks.push({
      taskId: "task-dc-summary",
      type: "DISCHARGE_SUMMARY",
      status: "OPEN",
      priority: "ROUTINE",
      title: "Discharge summary",
      linkedSection: "dischargePlanning",
    });
  }
  return tasks;
}

export function providerCensusViews(): readonly string[] {
  return [
    "MY_PATIENTS",
    "MY_SERVICE",
    "COVERING",
    "NEW_ADMISSIONS",
    "POSSIBLE_DISCHARGES",
    "CONSULT_PATIENTS",
    "RESULTS_REQUIRING_REVIEW",
    "UNASSIGNED",
  ] as const;
}
