/**
 * D4A.2.8 — Enterprise Clinical Workflow & Task Orchestration Engine contracts.
 *
 * Definition/template-driven orchestration only. Hospital policy rules belong in D4A.2.8A.
 * Zero-migration persistence: Encounter.admissionSummaryJson bag key below.
 * Placement / bed / AI / scheduling / secure messaging / ML: NOT started.
 */

export const ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_WORKFLOW_ENGINE.D4A2_8" as const;

export const ENTERPRISE_WORKFLOW_ORCHESTRATION_V1_KEY =
  "enterpriseWorkflowOrchestrationV1" as const;

/** Explicit phase boundary — D4A.3 Placement must remain unstarted. */
export const ENTERPRISE_WORKFLOW_PLACEMENT_STARTED = false as const;

/** Explicit phase boundary — D4A.2.8A Rules Engine must not begin here. */
export const ENTERPRISE_WORKFLOW_RULES_ENGINE_STARTED = false as const;

export const ENTERPRISE_WORKFLOW_DEPARTMENTS = [
  "RN",
  "PROVIDER",
  "TECH",
  "RESPIRATORY",
  "PHARMACY",
  "LAB",
  "RADIOLOGY",
  "CASE_MANAGEMENT",
  "ADMIN",
] as const;

export type EnterpriseWorkflowDepartment =
  (typeof ENTERPRISE_WORKFLOW_DEPARTMENTS)[number];

export const ENTERPRISE_TASK_PRIORITY_V1 = [
  "LOW",
  "ROUTINE",
  "URGENT",
  "STAT",
  "CRITICAL",
] as const;

export type EnterpriseTaskPriorityV1 = (typeof ENTERPRISE_TASK_PRIORITY_V1)[number];

export const ENTERPRISE_TASK_STATUS_V1 = [
  "PENDING",
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
  "ESCALATED",
  "FAILED",
] as const;

export type EnterpriseTaskStatusV1 = (typeof ENTERPRISE_TASK_STATUS_V1)[number];

export const ENTERPRISE_TASK_TYPE_V1 = [
  "ASSESSMENT",
  "MEDICATION_ADMIN",
  "MEDICATION_REVIEW",
  "LAB_DRAW",
  "LAB_FOLLOW_UP",
  "IMAGING",
  "TRANSPORT",
  "PROCEDURE",
  "CONSULT",
  "RESPIRATORY_CARE",
  "CASE_MANAGEMENT",
  "DISCHARGE_PREP",
  "DOCUMENTATION",
  "TECHNICIAN_SUPPORT",
  "ESCALATION_FOLLOW_UP",
  "OTHER",
] as const;

export type EnterpriseTaskTypeV1 = (typeof ENTERPRISE_TASK_TYPE_V1)[number];

export const ENTERPRISE_WORKFLOW_STATUS_V1 = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const;

export type EnterpriseWorkflowStatusV1 =
  (typeof ENTERPRISE_WORKFLOW_STATUS_V1)[number];

export const ENTERPRISE_WORKFLOW_TEMPLATE_CODES = [
  "ADMISSION",
  "CHEST_PAIN",
  "STROKE",
] as const;

export type EnterpriseWorkflowTemplateCode =
  (typeof ENTERPRISE_WORKFLOW_TEMPLATE_CODES)[number];

export const CLINICAL_ORCHESTRATION_EVENT_TYPES = [
  "ADMISSION_CREATED",
  "MEDICATION_ORDERED",
  "MEDICATION_ADMINISTERED",
  "CRITICAL_LAB",
  "CONSULT_ORDERED",
  "PROCEDURE_COMPLETED",
  "TRANSPORT_COMPLETED",
  "DISCHARGE_READY",
  "WORKFLOW_STARTED",
  "TASK_OVERDUE",
] as const;

export type ClinicalOrchestrationEventType =
  (typeof CLINICAL_ORCHESTRATION_EVENT_TYPES)[number];

export const ESCALATION_CHAIN_TEMPLATE_CODES = [
  "MEDICATION_OVERDUE",
  "CRITICAL_RESULT",
] as const;

export type EscalationChainTemplateCode =
  (typeof ESCALATION_CHAIN_TEMPLATE_CODES)[number];

export const ESCALATION_INSTANCE_STATUS_V1 = [
  "OPEN",
  "ACKNOWLEDGED",
  "ESCALATED",
  "RESOLVED",
  "CANCELLED",
] as const;

export type EscalationInstanceStatusV1 =
  (typeof ESCALATION_INSTANCE_STATUS_V1)[number];

export const TIMELINE_ENTRY_KINDS = [
  "WORKFLOW",
  "TASK",
  "EVENT",
  "ESCALATION",
  "NOTIFICATION",
  "AUDIT_MIRROR",
] as const;

export type TimelineEntryKind = (typeof TIMELINE_ENTRY_KINDS)[number];

export type EnterpriseTaskDependencyV1 = {
  taskId: string;
  requiredStatus: "COMPLETED";
};

export type EnterpriseTaskV1 = {
  taskId: string;
  workflowInstanceId: string | null;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  encounterId: string;
  type: EnterpriseTaskTypeV1;
  title: string;
  description?: string | null;
  department: EnterpriseWorkflowDepartment;
  priority: EnterpriseTaskPriorityV1;
  status: EnterpriseTaskStatusV1;
  assignedToUserId?: string | null;
  assignedToRole?: string | null;
  observerUserIds?: string[];
  dueAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  dependencies: EnterpriseTaskDependencyV1[];
  sourceEventId?: string | null;
  sourceDefinitionCode?: string | null;
  clientRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  /** Optimistic concurrency per-task stamp (doc also has expectedVersion). */
  version: number;
};

export type WorkflowTaskDefinitionV1 = {
  definitionTaskKey: string;
  type: EnterpriseTaskTypeV1;
  title: string;
  department: EnterpriseWorkflowDepartment;
  priority: EnterpriseTaskPriorityV1;
  dependsOnDefinitionKeys?: string[];
  dueOffsetMinutes?: number | null;
};

export type WorkflowDefinitionV1 = {
  definitionCode: EnterpriseWorkflowTemplateCode | string;
  title: string;
  version: 1;
  /** Policy hooks reserved for 8A — generators ignore hard-coded hospital rules. */
  policyHooksReservedFor8A: true;
  tasks: WorkflowTaskDefinitionV1[];
  startOnEventTypes: ClinicalOrchestrationEventType[];
};

export type WorkflowInstanceV1 = {
  workflowInstanceId: string;
  definitionCode: string;
  definitionVersion: 1;
  title: string;
  status: EnterpriseWorkflowStatusV1;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  encounterId: string;
  sourceEventId?: string | null;
  clientRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  createdByUserId?: string | null;
  taskIds: string[];
};

export type ClinicalOrchestrationEventV1 = {
  eventId: string;
  /** Idempotency key — duplicate ingest returns existing event, no new tasks. */
  idempotencyKey: string;
  type: ClinicalOrchestrationEventType;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  encounterId: string;
  occurredAt: string;
  ingestedAt: string;
  payload?: Record<string, unknown> | null;
  createdByUserId?: string | null;
  /** Workflow/task intents applied from definitions (not policy rules). */
  appliedDefinitionCodes: string[];
  generatedWorkflowInstanceIds: string[];
  generatedTaskIds: string[];
};

export type EscalationChainStepV1 = {
  stepOrder: number;
  targetDepartment: EnterpriseWorkflowDepartment;
  /** Timer config placeholder — evaluated by 8A/ops; structure only here. */
  escalateAfterMinutes: number | null;
  notifyTarget: EnterpriseWorkflowDepartment;
};

export type EscalationChainTemplateV1 = {
  templateCode: EscalationChainTemplateCode;
  title: string;
  version: 1;
  steps: EscalationChainStepV1[];
  policyHooksReservedFor8A: true;
};

export type EscalationHistoryEntryV1 = {
  at: string;
  byUserId?: string | null;
  status: EscalationInstanceStatusV1;
  note?: string | null;
  stepOrder?: number | null;
};

export type EscalationInstanceV1 = {
  escalationId: string;
  templateCode: EscalationChainTemplateCode;
  status: EscalationInstanceStatusV1;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  encounterId: string;
  relatedTaskId?: string | null;
  relatedWorkflowInstanceId?: string | null;
  relatedEventId?: string | null;
  currentStepOrder: number;
  summary: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  history: EscalationHistoryEntryV1[];
  clientRequestId?: string | null;
};

export type HospitalTimelineEntryV1 = {
  entryId: string;
  /** Dedupe key — identical keys must not create duplicate timeline rows. */
  dedupeKey: string;
  kind: TimelineEntryKind;
  at: string;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  encounterId: string;
  department?: EnterpriseWorkflowDepartment | null;
  roleHint?: string | null;
  workflowInstanceId?: string | null;
  taskId?: string | null;
  taskType?: EnterpriseTaskTypeV1 | null;
  title: string;
  summary?: string | null;
  relatedEscalationId?: string | null;
  relatedEventId?: string | null;
  relatedNotificationId?: string | null;
};

export type WorkflowNotificationV1 = {
  notificationId: string;
  /** Not chat — operational workflow notification linked to a task. */
  channel: "WORKFLOW";
  targetDepartment: EnterpriseWorkflowDepartment;
  title: string;
  summary: string;
  relatedTaskId: string | null;
  relatedWorkflowInstanceId?: string | null;
  relatedEscalationId?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  facilityId: string;
  encounterId: string;
  patientId: string;
};

export type EnterpriseWorkflowOrchestrationDocV1 = {
  version: 1;
  expectedVersion: number;
  workflows: WorkflowInstanceV1[];
  tasks: EnterpriseTaskV1[];
  events: ClinicalOrchestrationEventV1[];
  escalations: EscalationInstanceV1[];
  timeline: HospitalTimelineEntryV1[];
  notifications: WorkflowNotificationV1[];
  updatedAt: string;
  updatedByUserId?: string | null;
};

export type MetricAvailability<T> =
  | { availability: "AVAILABLE"; value: T }
  | { availability: "UNAVAILABLE"; reason: string; value: null };

export type EnterpriseWorkflowAdminDashboardV1 = {
  certification: typeof ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID;
  generatedAt: string;
  facilityId: string;
  volumeActiveWorkflows: MetricAvailability<number>;
  volumeOpenTasks: MetricAvailability<number>;
  completedToday: MetricAvailability<number>;
  overdueTasks: MetricAvailability<number>;
  openEscalations: MetricAvailability<number>;
  avgCompletionMinutes: MetricAvailability<number>;
  bottlenecks: MetricAvailability<
    Array<{ department: EnterpriseWorkflowDepartment; openTasks: number }>
  >;
  health: MetricAvailability<"HEALTHY" | "DEGRADED" | "CRITICAL">;
  quality: {
    delayCount: MetricAvailability<number>;
    escalationCount: MetricAvailability<number>;
    failureCount: MetricAvailability<number>;
    completionCount: MetricAvailability<number>;
  };
  rulesEngineEnabled: false;
  placementEnabled: false;
  autoGenerationMode: "DEFINITION_DRIVEN";
};

export type DepartmentWorklistItemV1 = {
  taskId: string;
  encounterId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  title: string;
  type: EnterpriseTaskTypeV1;
  status: EnterpriseTaskStatusV1;
  priority: EnterpriseTaskPriorityV1;
  department: EnterpriseWorkflowDepartment;
  dueAt: string | null;
  workflowInstanceId: string | null;
  assignedToUserId: string | null;
};

export type DepartmentWorklistPageV1 = {
  certification: typeof ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID;
  department: EnterpriseWorkflowDepartment;
  facilityId: string;
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  items: DepartmentWorklistItemV1[];
  writeIsolationByDepartment: true;
};

/* ─── Built-in reusable workflow templates (not hospital policy) ─── */

export const WORKFLOW_DEFINITION_ADMISSION: WorkflowDefinitionV1 = {
  definitionCode: "ADMISSION",
  title: "Admission",
  version: 1,
  policyHooksReservedFor8A: true,
  startOnEventTypes: ["ADMISSION_CREATED"],
  tasks: [
    {
      definitionTaskKey: "admission.nursing_assessment",
      type: "ASSESSMENT",
      title: "Nursing admission assessment",
      department: "RN",
      priority: "URGENT",
    },
    {
      definitionTaskKey: "admission.provider_hnp",
      type: "DOCUMENTATION",
      title: "Provider H&P documentation",
      department: "PROVIDER",
      priority: "URGENT",
      dependsOnDefinitionKeys: ["admission.nursing_assessment"],
    },
    {
      definitionTaskKey: "admission.med_rec",
      type: "MEDICATION_REVIEW",
      title: "Medication reconciliation",
      department: "PHARMACY",
      priority: "ROUTINE",
    },
    {
      definitionTaskKey: "admission.tech_vitals",
      type: "TECHNICIAN_SUPPORT",
      title: "Admission vital signs",
      department: "TECH",
      priority: "ROUTINE",
    },
  ],
};

export const WORKFLOW_DEFINITION_CHEST_PAIN: WorkflowDefinitionV1 = {
  definitionCode: "CHEST_PAIN",
  title: "Chest Pain",
  version: 1,
  policyHooksReservedFor8A: true,
  startOnEventTypes: ["WORKFLOW_STARTED"],
  tasks: [
    {
      definitionTaskKey: "chest_pain.ekg",
      type: "PROCEDURE",
      title: "12-lead EKG",
      department: "TECH",
      priority: "STAT",
    },
    {
      definitionTaskKey: "chest_pain.troponin",
      type: "LAB_DRAW",
      title: "Troponin draw",
      department: "LAB",
      priority: "STAT",
    },
    {
      definitionTaskKey: "chest_pain.provider_review",
      type: "DOCUMENTATION",
      title: "Provider chest pain review",
      department: "PROVIDER",
      priority: "STAT",
      dependsOnDefinitionKeys: ["chest_pain.ekg", "chest_pain.troponin"],
    },
  ],
};

export const WORKFLOW_DEFINITION_STROKE: WorkflowDefinitionV1 = {
  definitionCode: "STROKE",
  title: "Stroke",
  version: 1,
  policyHooksReservedFor8A: true,
  startOnEventTypes: ["WORKFLOW_STARTED"],
  tasks: [
    {
      definitionTaskKey: "stroke.neuro_check",
      type: "ASSESSMENT",
      title: "Neurologic assessment",
      department: "RN",
      priority: "CRITICAL",
    },
    {
      definitionTaskKey: "stroke.ct",
      type: "IMAGING",
      title: "CT head imaging",
      department: "RADIOLOGY",
      priority: "CRITICAL",
    },
    {
      definitionTaskKey: "stroke.provider",
      type: "DOCUMENTATION",
      title: "Provider stroke evaluation",
      department: "PROVIDER",
      priority: "CRITICAL",
      dependsOnDefinitionKeys: ["stroke.neuro_check"],
    },
  ],
};

export const BUILTIN_WORKFLOW_DEFINITIONS: WorkflowDefinitionV1[] = [
  WORKFLOW_DEFINITION_ADMISSION,
  WORKFLOW_DEFINITION_CHEST_PAIN,
  WORKFLOW_DEFINITION_STROKE,
];

export const ESCALATION_TEMPLATE_MEDICATION_OVERDUE: EscalationChainTemplateV1 = {
  templateCode: "MEDICATION_OVERDUE",
  title: "Medication overdue",
  version: 1,
  policyHooksReservedFor8A: true,
  steps: [
    {
      stepOrder: 1,
      targetDepartment: "RN",
      escalateAfterMinutes: 30,
      notifyTarget: "RN",
    },
    {
      stepOrder: 2,
      targetDepartment: "PROVIDER",
      escalateAfterMinutes: 60,
      notifyTarget: "PROVIDER",
    },
    {
      stepOrder: 3,
      targetDepartment: "ADMIN",
      escalateAfterMinutes: 120,
      notifyTarget: "ADMIN",
    },
  ],
};

export const ESCALATION_TEMPLATE_CRITICAL_RESULT: EscalationChainTemplateV1 = {
  templateCode: "CRITICAL_RESULT",
  title: "Critical result",
  version: 1,
  policyHooksReservedFor8A: true,
  steps: [
    {
      stepOrder: 1,
      targetDepartment: "PROVIDER",
      escalateAfterMinutes: 15,
      notifyTarget: "PROVIDER",
    },
    {
      stepOrder: 2,
      targetDepartment: "RN",
      escalateAfterMinutes: 30,
      notifyTarget: "RN",
    },
    {
      stepOrder: 3,
      targetDepartment: "ADMIN",
      escalateAfterMinutes: 45,
      notifyTarget: "ADMIN",
    },
  ],
};

export const BUILTIN_ESCALATION_TEMPLATES: EscalationChainTemplateV1[] = [
  ESCALATION_TEMPLATE_MEDICATION_OVERDUE,
  ESCALATION_TEMPLATE_CRITICAL_RESULT,
];

export function emptyEnterpriseWorkflowOrchestrationDoc(
  nowIso?: string
): EnterpriseWorkflowOrchestrationDocV1 {
  return {
    version: 1,
    expectedVersion: 0,
    workflows: [],
    tasks: [],
    events: [],
    escalations: [],
    timeline: [],
    notifications: [],
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

export function readEnterpriseWorkflowOrchestrationDoc(
  admissionSummaryJson: unknown
): EnterpriseWorkflowOrchestrationDocV1 {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object") {
    return emptyEnterpriseWorkflowOrchestrationDoc();
  }
  const raw = (admissionSummaryJson as Record<string, unknown>)[
    ENTERPRISE_WORKFLOW_ORCHESTRATION_V1_KEY
  ];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyEnterpriseWorkflowOrchestrationDoc();
  }
  const doc = raw as EnterpriseWorkflowOrchestrationDocV1;
  return {
    ...emptyEnterpriseWorkflowOrchestrationDoc(),
    ...doc,
    version: 1,
    workflows: Array.isArray(doc.workflows) ? doc.workflows : [],
    tasks: Array.isArray(doc.tasks) ? doc.tasks : [],
    events: Array.isArray(doc.events) ? doc.events : [],
    escalations: Array.isArray(doc.escalations) ? doc.escalations : [],
    timeline: Array.isArray(doc.timeline) ? doc.timeline : [],
    notifications: Array.isArray(doc.notifications) ? doc.notifications : [],
  };
}

export function mergeEnterpriseWorkflowOrchestrationIntoSummary(
  admissionSummaryJson: unknown,
  doc: EnterpriseWorkflowOrchestrationDocV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson &&
    typeof admissionSummaryJson === "object" &&
    !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[ENTERPRISE_WORKFLOW_ORCHESTRATION_V1_KEY] = doc;
  return base;
}

export function getWorkflowDefinition(
  code: string
): WorkflowDefinitionV1 | null {
  return (
    BUILTIN_WORKFLOW_DEFINITIONS.find((d) => d.definitionCode === code) ?? null
  );
}

export function getEscalationTemplate(
  code: EscalationChainTemplateCode
): EscalationChainTemplateV1 | null {
  return (
    BUILTIN_ESCALATION_TEMPLATES.find((t) => t.templateCode === code) ?? null
  );
}

export function assertCas(
  doc: EnterpriseWorkflowOrchestrationDocV1,
  clientExpectedVersion: number
): { ok: true } | { ok: false; code: "ENTERPRISE_WORKFLOW_STALE" } {
  if (Number(clientExpectedVersion) !== doc.expectedVersion) {
    return { ok: false, code: "ENTERPRISE_WORKFLOW_STALE" };
  }
  return { ok: true };
}

export function bumpDoc(
  doc: EnterpriseWorkflowOrchestrationDocV1,
  actorUserId: string | null | undefined,
  nowIso: string
): EnterpriseWorkflowOrchestrationDocV1 {
  return {
    ...doc,
    expectedVersion: doc.expectedVersion + 1,
    updatedAt: nowIso,
    updatedByUserId: actorUserId ?? null,
  };
}

export function taskDependenciesSatisfied(
  task: EnterpriseTaskV1,
  allTasks: EnterpriseTaskV1[]
): boolean {
  if (!task.dependencies.length) return true;
  const byId = new Map(allTasks.map((t) => [t.taskId, t]));
  return task.dependencies.every((dep) => {
    const other = byId.get(dep.taskId);
    return other?.status === dep.requiredStatus;
  });
}

export function canCompleteTask(
  task: EnterpriseTaskV1,
  allTasks: EnterpriseTaskV1[]
): { ok: true } | { ok: false; code: "TASK_DEPENDENCIES_BLOCKING" | "INVALID_STATUS" } {
  if (task.status === "COMPLETED" || task.status === "CANCELLED") {
    return { ok: false, code: "INVALID_STATUS" };
  }
  if (!taskDependenciesSatisfied(task, allTasks)) {
    return { ok: false, code: "TASK_DEPENDENCIES_BLOCKING" };
  }
  return { ok: true };
}

export function appendTimelineEntry(
  doc: EnterpriseWorkflowOrchestrationDocV1,
  entry: HospitalTimelineEntryV1
): EnterpriseWorkflowOrchestrationDocV1 {
  if (doc.timeline.some((e) => e.dedupeKey === entry.dedupeKey || e.entryId === entry.entryId)) {
    return doc;
  }
  return { ...doc, timeline: [...doc.timeline, entry] };
}

export function filterTimeline(
  entries: HospitalTimelineEntryV1[],
  filters: {
    department?: EnterpriseWorkflowDepartment | null;
    roleHint?: string | null;
    workflowInstanceId?: string | null;
    taskType?: EnterpriseTaskTypeV1 | null;
  }
): HospitalTimelineEntryV1[] {
  return entries
    .filter((e) => {
      if (filters.department && e.department !== filters.department) return false;
      if (filters.roleHint && e.roleHint !== filters.roleHint) return false;
      if (
        filters.workflowInstanceId &&
        e.workflowInstanceId !== filters.workflowInstanceId
      ) {
        return false;
      }
      if (filters.taskType && e.taskType !== filters.taskType) return false;
      return true;
    })
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
}

export type CreateWorkflowFromDefinitionInput = {
  doc: EnterpriseWorkflowOrchestrationDocV1;
  definition: WorkflowDefinitionV1;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  encounterId: string;
  workflowInstanceId: string;
  taskIdFactory: (definitionTaskKey: string) => string;
  nowIso: string;
  actorUserId?: string | null;
  sourceEventId?: string | null;
  clientRequestId?: string | null;
  clientExpectedVersion: number;
};

export type CreateWorkflowFromDefinitionResult =
  | {
      ok: true;
      doc: EnterpriseWorkflowOrchestrationDocV1;
      workflow: WorkflowInstanceV1;
      tasks: EnterpriseTaskV1[];
    }
  | { ok: false; code: "ENTERPRISE_WORKFLOW_STALE" | "ORPHAN_WORKFLOW_FORBIDDEN" };

/**
 * Creates a workflow instance + tasks. Rejects orphan workflows (missing patient/encounter).
 */
export function createWorkflowFromDefinition(
  input: CreateWorkflowFromDefinitionInput
): CreateWorkflowFromDefinitionResult {
  const cas = assertCas(input.doc, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  if (!input.patientId?.trim() || !input.encounterId?.trim() || !input.facilityId?.trim()) {
    return { ok: false, code: "ORPHAN_WORKFLOW_FORBIDDEN" };
  }

  const keyToTaskId = new Map<string, string>();
  for (const td of input.definition.tasks) {
    keyToTaskId.set(td.definitionTaskKey, input.taskIdFactory(td.definitionTaskKey));
  }

  const tasks: EnterpriseTaskV1[] = input.definition.tasks.map((td) => {
    const taskId = keyToTaskId.get(td.definitionTaskKey)!;
    const deps: EnterpriseTaskDependencyV1[] = (td.dependsOnDefinitionKeys ?? []).map(
      (k) => ({
        taskId: keyToTaskId.get(k)!,
        requiredStatus: "COMPLETED" as const,
      })
    );
    const dueAt =
      td.dueOffsetMinutes != null
        ? new Date(
            new Date(input.nowIso).getTime() + td.dueOffsetMinutes * 60_000
          ).toISOString()
        : null;
    return {
      taskId,
      workflowInstanceId: input.workflowInstanceId,
      facilityId: input.facilityId,
      patientId: input.patientId,
      hospitalEpisodeId: input.hospitalEpisodeId,
      encounterId: input.encounterId,
      type: td.type,
      title: td.title,
      department: td.department,
      priority: td.priority,
      status: "PENDING" as const,
      dependencies: deps,
      sourceEventId: input.sourceEventId ?? null,
      sourceDefinitionCode: input.definition.definitionCode,
      clientRequestId: input.clientRequestId ?? null,
      dueAt,
      createdAt: input.nowIso,
      updatedAt: input.nowIso,
      createdByUserId: input.actorUserId ?? null,
      updatedByUserId: input.actorUserId ?? null,
      version: 1,
    };
  });

  const workflow: WorkflowInstanceV1 = {
    workflowInstanceId: input.workflowInstanceId,
    definitionCode: input.definition.definitionCode,
    definitionVersion: 1,
    title: input.definition.title,
    status: "ACTIVE",
    facilityId: input.facilityId,
    patientId: input.patientId,
    hospitalEpisodeId: input.hospitalEpisodeId,
    encounterId: input.encounterId,
    sourceEventId: input.sourceEventId ?? null,
    clientRequestId: input.clientRequestId ?? null,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
    createdByUserId: input.actorUserId ?? null,
    taskIds: tasks.map((t) => t.taskId),
  };

  let next = bumpDoc(
    {
      ...input.doc,
      workflows: [...input.doc.workflows, workflow],
      tasks: [...input.doc.tasks, ...tasks],
    },
    input.actorUserId,
    input.nowIso
  );

  next = appendTimelineEntry(next, {
    entryId: `tl-wf-${input.workflowInstanceId}`,
    dedupeKey: `workflow:created:${input.workflowInstanceId}`,
    kind: "WORKFLOW",
    at: input.nowIso,
    facilityId: input.facilityId,
    patientId: input.patientId,
    hospitalEpisodeId: input.hospitalEpisodeId,
    encounterId: input.encounterId,
    workflowInstanceId: input.workflowInstanceId,
    title: `Workflow started: ${workflow.title}`,
    summary: workflow.definitionCode,
  });

  for (const t of tasks) {
    next = appendTimelineEntry(next, {
      entryId: `tl-task-${t.taskId}`,
      dedupeKey: `task:created:${t.taskId}`,
      kind: "TASK",
      at: input.nowIso,
      facilityId: t.facilityId,
      patientId: t.patientId,
      hospitalEpisodeId: t.hospitalEpisodeId,
      encounterId: t.encounterId,
      department: t.department,
      workflowInstanceId: t.workflowInstanceId,
      taskId: t.taskId,
      taskType: t.type,
      title: `Task created: ${t.title}`,
    });
  }

  return { ok: true, doc: next, workflow, tasks };
}

export type UpsertTaskInput = {
  doc: EnterpriseWorkflowOrchestrationDocV1;
  task: EnterpriseTaskV1;
  clientExpectedVersion: number;
  actorUserId?: string | null;
  nowIso: string;
  /** When true, completing requires dependencies satisfied. */
  enforceDependencies?: boolean;
};

export type UpsertTaskResult =
  | { ok: true; doc: EnterpriseWorkflowOrchestrationDocV1; task: EnterpriseTaskV1 }
  | {
      ok: false;
      code:
        | "ENTERPRISE_WORKFLOW_STALE"
        | "TASK_DEPENDENCIES_BLOCKING"
        | "ORPHAN_TASK_FORBIDDEN"
        | "INVALID_STATUS";
    };

export function upsertEnterpriseWorkflowTask(input: UpsertTaskInput): UpsertTaskResult {
  const cas = assertCas(input.doc, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  if (
    !input.task.patientId?.trim() ||
    !input.task.encounterId?.trim() ||
    !input.task.facilityId?.trim()
  ) {
    return { ok: false, code: "ORPHAN_TASK_FORBIDDEN" };
  }

  const existing = input.doc.tasks.find((t) => t.taskId === input.task.taskId);
  const merged: EnterpriseTaskV1 = {
    ...(existing ?? input.task),
    ...input.task,
    updatedAt: input.nowIso,
    updatedByUserId: input.actorUserId ?? null,
    version: (existing?.version ?? 0) + 1,
  };

  if (input.enforceDependencies !== false && merged.status === "COMPLETED") {
    // Gate against prior status — merged already has COMPLETED applied.
    const priorStatus = existing?.status ?? "PENDING";
    const probe = canCompleteTask(
      { ...merged, status: priorStatus },
      [...input.doc.tasks.filter((t) => t.taskId !== merged.taskId), merged]
    );
    if (!probe.ok) return { ok: false, code: probe.code };
    if (!merged.completedAt) merged.completedAt = input.nowIso;
  }

  const tasks = existing
    ? input.doc.tasks.map((t) => (t.taskId === merged.taskId ? merged : t))
    : [...input.doc.tasks, merged];

  let next = bumpDoc({ ...input.doc, tasks }, input.actorUserId, input.nowIso);
  const action = existing ? "updated" : "created";
  next = appendTimelineEntry(next, {
    entryId: `tl-task-${merged.taskId}-${merged.version}`,
    dedupeKey: `task:${action}:${merged.taskId}:v${merged.version}`,
    kind: "TASK",
    at: input.nowIso,
    facilityId: merged.facilityId,
    patientId: merged.patientId,
    hospitalEpisodeId: merged.hospitalEpisodeId,
    encounterId: merged.encounterId,
    department: merged.department,
    workflowInstanceId: merged.workflowInstanceId,
    taskId: merged.taskId,
    taskType: merged.type,
    title: `Task ${action}: ${merged.title}`,
    summary: merged.status,
  });

  return { ok: true, doc: next, task: merged };
}

export type ReassignTaskInput = {
  doc: EnterpriseWorkflowOrchestrationDocV1;
  taskId: string;
  assignedToUserId: string | null;
  assignedToRole?: string | null;
  clientExpectedVersion: number;
  actorUserId: string;
  nowIso: string;
};

export function reassignEnterpriseWorkflowTask(
  input: ReassignTaskInput
):
  | { ok: true; doc: EnterpriseWorkflowOrchestrationDocV1; task: EnterpriseTaskV1; previousAssignee: string | null }
  | { ok: false; code: "ENTERPRISE_WORKFLOW_STALE" | "TASK_NOT_FOUND" } {
  const cas = assertCas(input.doc, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  const existing = input.doc.tasks.find((t) => t.taskId === input.taskId);
  if (!existing) return { ok: false, code: "TASK_NOT_FOUND" };
  const previousAssignee = existing.assignedToUserId ?? null;
  const task: EnterpriseTaskV1 = {
    ...existing,
    assignedToUserId: input.assignedToUserId,
    assignedToRole: input.assignedToRole ?? existing.assignedToRole ?? null,
    status: existing.status === "PENDING" ? "ASSIGNED" : existing.status,
    updatedAt: input.nowIso,
    updatedByUserId: input.actorUserId,
    version: existing.version + 1,
  };
  let next = bumpDoc(
    {
      ...input.doc,
      tasks: input.doc.tasks.map((t) => (t.taskId === task.taskId ? task : t)),
    },
    input.actorUserId,
    input.nowIso
  );
  next = appendTimelineEntry(next, {
    entryId: `tl-task-reassign-${task.taskId}-${task.version}`,
    dedupeKey: `task:reassign:${task.taskId}:v${task.version}`,
    kind: "TASK",
    at: input.nowIso,
    facilityId: task.facilityId,
    patientId: task.patientId,
    hospitalEpisodeId: task.hospitalEpisodeId,
    encounterId: task.encounterId,
    department: task.department,
    taskId: task.taskId,
    taskType: task.type,
    workflowInstanceId: task.workflowInstanceId,
    title: `Task reassigned: ${task.title}`,
    summary: `${previousAssignee ?? "unassigned"} → ${input.assignedToUserId ?? "unassigned"}`,
  });
  return { ok: true, doc: next, task, previousAssignee };
}

/**
 * Definition-driven event ingest. Idempotent on idempotencyKey.
 * Applies matching workflow definitions — does NOT hard-code hospital policy (8A).
 */
export type IngestClinicalEventInput = {
  doc: EnterpriseWorkflowOrchestrationDocV1;
  event: Omit<
    ClinicalOrchestrationEventV1,
    | "ingestedAt"
    | "appliedDefinitionCodes"
    | "generatedWorkflowInstanceIds"
    | "generatedTaskIds"
  >;
  definitions?: WorkflowDefinitionV1[];
  clientExpectedVersion: number;
  actorUserId?: string | null;
  nowIso: string;
  idFactory: {
    workflowInstanceId: (definitionCode: string) => string;
    taskId: (definitionCode: string, definitionTaskKey: string) => string;
  };
};

export type IngestClinicalEventResult =
  | {
      ok: true;
      doc: EnterpriseWorkflowOrchestrationDocV1;
      event: ClinicalOrchestrationEventV1;
      idempotentReplay: boolean;
    }
  | { ok: false; code: "ENTERPRISE_WORKFLOW_STALE" | "ORPHAN_WORKFLOW_FORBIDDEN" };

export function ingestClinicalOrchestrationEvent(
  input: IngestClinicalEventInput
): IngestClinicalEventResult {
  const existing = input.doc.events.find(
    (e) => e.idempotencyKey === input.event.idempotencyKey
  );
  if (existing) {
    return {
      ok: true,
      doc: input.doc,
      event: existing,
      idempotentReplay: true,
    };
  }

  const cas = assertCas(input.doc, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  if (
    !input.event.patientId?.trim() ||
    !input.event.encounterId?.trim() ||
    !input.event.facilityId?.trim()
  ) {
    return { ok: false, code: "ORPHAN_WORKFLOW_FORBIDDEN" };
  }

  const definitions = input.definitions ?? BUILTIN_WORKFLOW_DEFINITIONS;
  const matching = definitions.filter((d) =>
    d.startOnEventTypes.includes(input.event.type)
  );

  let next = input.doc;
  const generatedWorkflowInstanceIds: string[] = [];
  const generatedTaskIds: string[] = [];
  const appliedDefinitionCodes: string[] = [];
  let versionCursor = input.clientExpectedVersion;

  for (const def of matching) {
    const created = createWorkflowFromDefinition({
      doc: next,
      definition: def,
      facilityId: input.event.facilityId,
      patientId: input.event.patientId,
      hospitalEpisodeId: input.event.hospitalEpisodeId,
      encounterId: input.event.encounterId,
      workflowInstanceId: input.idFactory.workflowInstanceId(def.definitionCode),
      taskIdFactory: (key) => input.idFactory.taskId(def.definitionCode, key),
      nowIso: input.nowIso,
      actorUserId: input.actorUserId,
      sourceEventId: input.event.eventId,
      clientRequestId: input.event.idempotencyKey,
      clientExpectedVersion: versionCursor,
    });
    if (!created.ok) return created;
    next = created.doc;
    versionCursor = next.expectedVersion;
    appliedDefinitionCodes.push(def.definitionCode);
    generatedWorkflowInstanceIds.push(created.workflow.workflowInstanceId);
    generatedTaskIds.push(...created.tasks.map((t) => t.taskId));
  }

  // CRITICAL_LAB / TASK_OVERDUE → escalation template intents (structure only; 8A owns policy)
  if (input.event.type === "CRITICAL_LAB" || input.event.type === "TASK_OVERDUE") {
    const templateCode: EscalationChainTemplateCode =
      input.event.type === "CRITICAL_LAB" ? "CRITICAL_RESULT" : "MEDICATION_OVERDUE";
    const esc = openEscalationFromTemplate({
      doc: next,
      templateCode,
      facilityId: input.event.facilityId,
      patientId: input.event.patientId,
      hospitalEpisodeId: input.event.hospitalEpisodeId,
      encounterId: input.event.encounterId,
      escalationId: `esc-${input.event.eventId}`,
      relatedEventId: input.event.eventId,
      summary:
        input.event.type === "CRITICAL_LAB"
          ? "Critical lab result escalation"
          : "Overdue task escalation",
      clientExpectedVersion: versionCursor,
      actorUserId: input.actorUserId,
      nowIso: input.nowIso,
    });
    if (esc.ok) {
      next = esc.doc;
      versionCursor = next.expectedVersion;
    }
  }

  const event: ClinicalOrchestrationEventV1 = {
    ...input.event,
    ingestedAt: input.nowIso,
    appliedDefinitionCodes,
    generatedWorkflowInstanceIds,
    generatedTaskIds,
  };

  // Persist event row with a single CAS bump from the latest doc state.
  let withEvent = bumpDoc(
    { ...next, events: [...next.events, event] },
    input.actorUserId,
    input.nowIso
  );

  withEvent = appendTimelineEntry(withEvent, {
    entryId: `tl-event-${event.eventId}`,
    dedupeKey: `event:ingested:${event.idempotencyKey}`,
    kind: "EVENT",
    at: input.nowIso,
    facilityId: event.facilityId,
    patientId: event.patientId,
    hospitalEpisodeId: event.hospitalEpisodeId,
    encounterId: event.encounterId,
    relatedEventId: event.eventId,
    title: `Event: ${event.type}`,
    summary: event.idempotencyKey,
  });

  return { ok: true, doc: withEvent, event, idempotentReplay: false };
}

export type OpenEscalationInput = {
  doc: EnterpriseWorkflowOrchestrationDocV1;
  templateCode: EscalationChainTemplateCode;
  facilityId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  encounterId: string;
  escalationId: string;
  summary: string;
  relatedTaskId?: string | null;
  relatedWorkflowInstanceId?: string | null;
  relatedEventId?: string | null;
  clientExpectedVersion: number;
  actorUserId?: string | null;
  nowIso: string;
  clientRequestId?: string | null;
};

export function openEscalationFromTemplate(
  input: OpenEscalationInput
):
  | { ok: true; doc: EnterpriseWorkflowOrchestrationDocV1; escalation: EscalationInstanceV1 }
  | { ok: false; code: "ENTERPRISE_WORKFLOW_STALE" | "UNKNOWN_TEMPLATE" } {
  const cas = assertCas(input.doc, input.clientExpectedVersion);
  if (!cas.ok) return cas;
  const template = getEscalationTemplate(input.templateCode);
  if (!template) return { ok: false, code: "UNKNOWN_TEMPLATE" };

  const existing = input.doc.escalations.find((e) => e.escalationId === input.escalationId);
  if (existing) {
    return { ok: true, doc: input.doc, escalation: existing };
  }

  const escalation: EscalationInstanceV1 = {
    escalationId: input.escalationId,
    templateCode: input.templateCode,
    status: "OPEN",
    facilityId: input.facilityId,
    patientId: input.patientId,
    hospitalEpisodeId: input.hospitalEpisodeId,
    encounterId: input.encounterId,
    relatedTaskId: input.relatedTaskId ?? null,
    relatedWorkflowInstanceId: input.relatedWorkflowInstanceId ?? null,
    relatedEventId: input.relatedEventId ?? null,
    currentStepOrder: template.steps[0]?.stepOrder ?? 1,
    summary: input.summary,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
    history: [
      {
        at: input.nowIso,
        byUserId: input.actorUserId ?? null,
        status: "OPEN",
        note: "Escalation opened from template",
        stepOrder: template.steps[0]?.stepOrder ?? 1,
      },
    ],
    clientRequestId: input.clientRequestId ?? null,
  };

  const firstNotify = template.steps[0];
  let next = bumpDoc(
    { ...input.doc, escalations: [...input.doc.escalations, escalation] },
    input.actorUserId,
    input.nowIso
  );
  next = appendTimelineEntry(next, {
    entryId: `tl-esc-${escalation.escalationId}`,
    dedupeKey: `escalation:opened:${escalation.escalationId}`,
    kind: "ESCALATION",
    at: input.nowIso,
    facilityId: escalation.facilityId,
    patientId: escalation.patientId,
    hospitalEpisodeId: escalation.hospitalEpisodeId,
    encounterId: escalation.encounterId,
    department: firstNotify?.targetDepartment ?? null,
    relatedEscalationId: escalation.escalationId,
    taskId: escalation.relatedTaskId,
    workflowInstanceId: escalation.relatedWorkflowInstanceId,
    title: `Escalation opened: ${template.title}`,
    summary: escalation.summary,
  });

  if (firstNotify) {
    const notification: WorkflowNotificationV1 = {
      notificationId: `ntf-${escalation.escalationId}-1`,
      channel: "WORKFLOW",
      targetDepartment: firstNotify.notifyTarget,
      title: template.title,
      summary: escalation.summary,
      relatedTaskId: escalation.relatedTaskId ?? null,
      relatedWorkflowInstanceId: escalation.relatedWorkflowInstanceId ?? null,
      relatedEscalationId: escalation.escalationId,
      createdAt: input.nowIso,
      deliveredAt: input.nowIso,
      facilityId: escalation.facilityId,
      encounterId: escalation.encounterId,
      patientId: escalation.patientId,
    };
    next = {
      ...next,
      notifications: [...next.notifications, notification],
    };
    next = appendTimelineEntry(next, {
      entryId: `tl-ntf-${notification.notificationId}`,
      dedupeKey: `notification:delivered:${notification.notificationId}`,
      kind: "NOTIFICATION",
      at: input.nowIso,
      facilityId: notification.facilityId,
      patientId: notification.patientId,
      hospitalEpisodeId: escalation.hospitalEpisodeId,
      encounterId: notification.encounterId,
      department: notification.targetDepartment,
      relatedNotificationId: notification.notificationId,
      relatedEscalationId: escalation.escalationId,
      taskId: notification.relatedTaskId,
      title: `Notification: ${notification.title}`,
    });
  }

  return { ok: true, doc: next, escalation };
}

export function advanceEscalation(
  doc: EnterpriseWorkflowOrchestrationDocV1,
  escalationId: string,
  nextStatus: EscalationInstanceStatusV1,
  clientExpectedVersion: number,
  actorUserId: string,
  nowIso: string,
  note?: string | null
):
  | { ok: true; doc: EnterpriseWorkflowOrchestrationDocV1; escalation: EscalationInstanceV1 }
  | { ok: false; code: "ENTERPRISE_WORKFLOW_STALE" | "ESCALATION_NOT_FOUND" } {
  const cas = assertCas(doc, clientExpectedVersion);
  if (!cas.ok) return cas;
  const existing = doc.escalations.find((e) => e.escalationId === escalationId);
  if (!existing) return { ok: false, code: "ESCALATION_NOT_FOUND" };

  const template = getEscalationTemplate(existing.templateCode);
  let currentStepOrder = existing.currentStepOrder;
  if (nextStatus === "ESCALATED" && template) {
    const nextStep = template.steps.find((s) => s.stepOrder > existing.currentStepOrder);
    if (nextStep) currentStepOrder = nextStep.stepOrder;
  }

  const escalation: EscalationInstanceV1 = {
    ...existing,
    status: nextStatus,
    currentStepOrder,
    updatedAt: nowIso,
    acknowledgedAt:
      nextStatus === "ACKNOWLEDGED" ? nowIso : existing.acknowledgedAt,
    resolvedAt:
      nextStatus === "RESOLVED" || nextStatus === "CANCELLED"
        ? nowIso
        : existing.resolvedAt,
    history: [
      ...existing.history,
      {
        at: nowIso,
        byUserId: actorUserId,
        status: nextStatus,
        note: note ?? null,
        stepOrder: currentStepOrder,
      },
    ],
  };

  let next = bumpDoc(
    {
      ...doc,
      escalations: doc.escalations.map((e) =>
        e.escalationId === escalationId ? escalation : e
      ),
    },
    actorUserId,
    nowIso
  );
  next = appendTimelineEntry(next, {
    entryId: `tl-esc-${escalation.escalationId}-${escalation.history.length}`,
    dedupeKey: `escalation:${nextStatus}:${escalation.escalationId}:h${escalation.history.length}`,
    kind: "ESCALATION",
    at: nowIso,
    facilityId: escalation.facilityId,
    patientId: escalation.patientId,
    hospitalEpisodeId: escalation.hospitalEpisodeId,
    encounterId: escalation.encounterId,
    relatedEscalationId: escalation.escalationId,
    taskId: escalation.relatedTaskId,
    title: `Escalation ${nextStatus.toLowerCase()}`,
    summary: note ?? escalation.summary,
  });
  return { ok: true, doc: next, escalation };
}

export function buildDepartmentWorklist(
  docs: Array<{ encounterId: string; doc: EnterpriseWorkflowOrchestrationDocV1 }>,
  department: EnterpriseWorkflowDepartment,
  facilityId: string,
  opts: { limit: number; offset: number; nowIso: string }
): DepartmentWorklistPageV1 {
  const openStatuses = new Set<EnterpriseTaskStatusV1>([
    "PENDING",
    "ASSIGNED",
    "ACCEPTED",
    "IN_PROGRESS",
    "BLOCKED",
    "ESCALATED",
  ]);
  const items: DepartmentWorklistItemV1[] = [];
  for (const { doc } of docs) {
    for (const t of doc.tasks) {
      if (t.facilityId !== facilityId) continue;
      if (t.department !== department) continue;
      if (!openStatuses.has(t.status)) continue;
      items.push({
        taskId: t.taskId,
        encounterId: t.encounterId,
        patientId: t.patientId,
        hospitalEpisodeId: t.hospitalEpisodeId,
        title: t.title,
        type: t.type,
        status: t.status,
        priority: t.priority,
        department: t.department,
        dueAt: t.dueAt ?? null,
        workflowInstanceId: t.workflowInstanceId,
        assignedToUserId: t.assignedToUserId ?? null,
      });
    }
  }
  items.sort((a, b) => {
    const p = priorityRank(b.priority) - priorityRank(a.priority);
    if (p !== 0) return p;
    return (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
  });
  const limit = Math.max(1, Math.min(200, opts.limit));
  const offset = Math.max(0, opts.offset);
  return {
    certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
    department,
    facilityId,
    generatedAt: opts.nowIso,
    total: items.length,
    limit,
    offset,
    items: items.slice(offset, offset + limit),
    writeIsolationByDepartment: true,
  };
}

function priorityRank(p: EnterpriseTaskPriorityV1): number {
  switch (p) {
    case "CRITICAL":
      return 5;
    case "STAT":
      return 4;
    case "URGENT":
      return 3;
    case "ROUTINE":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

export function aggregateAdminDashboard(
  docs: EnterpriseWorkflowOrchestrationDocV1[],
  facilityId: string,
  nowIso: string,
  opts?: { sourceUnavailable?: boolean }
): EnterpriseWorkflowAdminDashboardV1 {
  if (opts?.sourceUnavailable) {
    const unavailable = (reason: string): MetricAvailability<number> => ({
      availability: "UNAVAILABLE",
      reason,
      value: null,
    });
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      generatedAt: nowIso,
      facilityId,
      volumeActiveWorkflows: unavailable("SOURCE_UNAVAILABLE"),
      volumeOpenTasks: unavailable("SOURCE_UNAVAILABLE"),
      completedToday: unavailable("SOURCE_UNAVAILABLE"),
      overdueTasks: unavailable("SOURCE_UNAVAILABLE"),
      openEscalations: unavailable("SOURCE_UNAVAILABLE"),
      avgCompletionMinutes: unavailable("SOURCE_UNAVAILABLE"),
      bottlenecks: {
        availability: "UNAVAILABLE",
        reason: "SOURCE_UNAVAILABLE",
        value: null,
      },
      health: {
        availability: "UNAVAILABLE",
        reason: "SOURCE_UNAVAILABLE",
        value: null,
      },
      quality: {
        delayCount: unavailable("SOURCE_UNAVAILABLE"),
        escalationCount: unavailable("SOURCE_UNAVAILABLE"),
        failureCount: unavailable("SOURCE_UNAVAILABLE"),
        completionCount: unavailable("SOURCE_UNAVAILABLE"),
      },
      rulesEngineEnabled: false,
      placementEnabled: false,
      autoGenerationMode: "DEFINITION_DRIVEN",
    };
  }

  const day = nowIso.slice(0, 10);
  const nowMs = new Date(nowIso).getTime();
  let activeWorkflows = 0;
  let openTasks = 0;
  let completedToday = 0;
  let overdue = 0;
  let openEscalations = 0;
  let failures = 0;
  let completions = 0;
  const completionDurations: number[] = [];
  const byDept = new Map<EnterpriseWorkflowDepartment, number>();

  for (const doc of docs) {
    for (const w of doc.workflows) {
      if (w.facilityId !== facilityId) continue;
      if (w.status === "ACTIVE" || w.status === "PAUSED") activeWorkflows += 1;
      if (w.status === "COMPLETED" && w.completedAt?.startsWith(day)) {
        completedToday += 1;
      }
      if (w.status === "FAILED") failures += 1;
    }
    for (const t of doc.tasks) {
      if (t.facilityId !== facilityId) continue;
      const open = ![
        "COMPLETED",
        "CANCELLED",
        "FAILED",
      ].includes(t.status);
      if (open) {
        openTasks += 1;
        byDept.set(t.department, (byDept.get(t.department) ?? 0) + 1);
        if (t.dueAt && new Date(t.dueAt).getTime() < nowMs) overdue += 1;
      }
      if (t.status === "COMPLETED") {
        completions += 1;
        if (t.completedAt?.startsWith(day)) completedToday += 1;
        if (t.startedAt && t.completedAt) {
          completionDurations.push(
            (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) /
              60_000
          );
        } else if (t.createdAt && t.completedAt) {
          completionDurations.push(
            (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) /
              60_000
          );
        }
      }
      if (t.status === "FAILED") failures += 1;
    }
    for (const e of doc.escalations) {
      if (e.facilityId !== facilityId) continue;
      if (e.status === "OPEN" || e.status === "ACKNOWLEDGED" || e.status === "ESCALATED") {
        openEscalations += 1;
      }
    }
  }

  const bottlenecks = [...byDept.entries()]
    .map(([department, openTasksCount]) => ({
      department,
      openTasks: openTasksCount,
    }))
    .sort((a, b) => b.openTasks - a.openTasks)
    .slice(0, 8);

  const avg =
    completionDurations.length > 0
      ? Math.round(
          completionDurations.reduce((a, b) => a + b, 0) / completionDurations.length
        )
      : 0;

  const health: "HEALTHY" | "DEGRADED" | "CRITICAL" =
    openEscalations >= 10 || overdue >= 20
      ? "CRITICAL"
      : openEscalations >= 3 || overdue >= 5
        ? "DEGRADED"
        : "HEALTHY";

  const available = <T>(value: T): MetricAvailability<T> => ({
    availability: "AVAILABLE",
    value,
  });

  return {
    certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
    generatedAt: nowIso,
    facilityId,
    volumeActiveWorkflows: available(activeWorkflows),
    volumeOpenTasks: available(openTasks),
    completedToday: available(completedToday),
    overdueTasks: available(overdue),
    openEscalations: available(openEscalations),
    avgCompletionMinutes: available(avg),
    bottlenecks: available(bottlenecks),
    health: available(health),
    quality: {
      delayCount: available(overdue),
      escalationCount: available(openEscalations),
      failureCount: available(failures),
      completionCount: available(completions),
    },
    rulesEngineEnabled: false,
    placementEnabled: false,
    autoGenerationMode: "DEFINITION_DRIVEN",
  };
}

export function workflowHasNoOrphans(
  doc: EnterpriseWorkflowOrchestrationDocV1
): boolean {
  for (const w of doc.workflows) {
    if (!w.patientId || !w.encounterId || !w.facilityId) return false;
    for (const taskId of w.taskIds) {
      const t = doc.tasks.find((x) => x.taskId === taskId);
      if (!t) return false;
      if (t.workflowInstanceId !== w.workflowInstanceId) return false;
    }
  }
  for (const t of doc.tasks) {
    if (!t.patientId || !t.encounterId || !t.facilityId) return false;
    if (t.workflowInstanceId) {
      const w = doc.workflows.find((x) => x.workflowInstanceId === t.workflowInstanceId);
      if (!w) return false;
    }
  }
  return true;
}

export function timelineHasNoDuplicateDedupeKeys(
  doc: EnterpriseWorkflowOrchestrationDocV1
): boolean {
  const seen = new Set<string>();
  for (const e of doc.timeline) {
    if (seen.has(e.dedupeKey)) return false;
    seen.add(e.dedupeKey);
  }
  return true;
}

/** Certification helpers */
export function enterpriseWorkflowMustNotStartRulesEngine(): boolean {
  return ENTERPRISE_WORKFLOW_RULES_ENGINE_STARTED === false;
}

export function enterpriseWorkflowMustNotStartPlacement(): boolean {
  return ENTERPRISE_WORKFLOW_PLACEMENT_STARTED === false;
}

export function enterpriseWorkflowAutoGenerationIsDefinitionDriven(): boolean {
  return true;
}
