/**
 * D4A.2.8 — Enterprise Workflow & Task Orchestration API client.
 * UI calls APIs only — no workflow orchestration logic in pages.
 */

import { apiFetch } from "@/lib/apiClient";
import type {
  ClinicalOrchestrationEventType,
  DepartmentWorklistPageV1,
  EnterpriseWorkflowAdminDashboardV1,
  EnterpriseWorkflowDepartment,
  EnterpriseWorkflowOrchestrationDocV1,
  EscalationChainTemplateCode,
  EscalationInstanceStatusV1,
  HospitalTimelineEntryV1,
  WorkflowDefinitionV1,
  EscalationChainTemplateV1,
  WorkflowNotificationV1,
} from "@medora/shared";

const BASE = "/hospital-care/enterprise-workflow";

export async function fetchWorkflowDefinitions(): Promise<{
  certification: string;
  definitions: WorkflowDefinitionV1[];
  escalationTemplates: EscalationChainTemplateV1[];
  rulesEngineEnabled: boolean;
  placementEnabled: false;
  autoGenerationMode: "DEFINITION_DRIVEN" | "DEFINITION_AND_RULES";
}> {
  return apiFetch(`${BASE}/definitions`);
}

export async function fetchWorkflowAdminDashboard(): Promise<EnterpriseWorkflowAdminDashboardV1> {
  return apiFetch(`${BASE}/admin/dashboard`);
}

export async function fetchDepartmentWorklist(
  department: EnterpriseWorkflowDepartment,
  opts?: { limit?: number; offset?: number }
): Promise<DepartmentWorklistPageV1> {
  const qs = new URLSearchParams();
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  if (opts?.offset != null) qs.set("offset", String(opts.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`${BASE}/worklists/${encodeURIComponent(department)}${suffix}`);
}

export async function fetchEncounterWorkflowDoc(encounterId: string): Promise<{
  certification: string;
  encounterId: string;
  patientId: string;
  hospitalEpisodeId: string | null;
  doc: EnterpriseWorkflowOrchestrationDocV1;
}> {
  return apiFetch(`${BASE}/encounters/${encodeURIComponent(encounterId)}`);
}

export async function fetchEncounterWorkflowTimeline(
  encounterId: string,
  filters?: {
    department?: string;
    roleHint?: string;
    workflowInstanceId?: string;
    taskType?: string;
  }
): Promise<{
  certification: string;
  encounterId: string;
  entries: HospitalTimelineEntryV1[];
  expectedVersion: number;
}> {
  const qs = new URLSearchParams();
  if (filters?.department) qs.set("department", filters.department);
  if (filters?.roleHint) qs.set("roleHint", filters.roleHint);
  if (filters?.workflowInstanceId) qs.set("workflowInstanceId", filters.workflowInstanceId);
  if (filters?.taskType) qs.set("taskType", filters.taskType);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(
    `${BASE}/encounters/${encodeURIComponent(encounterId)}/timeline${suffix}`
  );
}

export async function fetchEncounterWorkflowNotifications(encounterId: string): Promise<{
  certification: string;
  notifications: WorkflowNotificationV1[];
  expectedVersion: number;
}> {
  return apiFetch(
    `${BASE}/encounters/${encodeURIComponent(encounterId)}/notifications`
  );
}

export async function createEncounterWorkflow(
  encounterId: string,
  body: { definitionCode: string; expectedVersion: number; clientRequestId?: string }
) {
  return apiFetch(`${BASE}/encounters/${encodeURIComponent(encounterId)}/workflows`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function completeEncounterTask(
  encounterId: string,
  taskId: string,
  body: { expectedVersion: number }
) {
  return apiFetch(
    `${BASE}/encounters/${encodeURIComponent(encounterId)}/tasks/${encodeURIComponent(taskId)}/complete`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function ingestEncounterClinicalEvent(
  encounterId: string,
  body: {
    idempotencyKey: string;
    type: ClinicalOrchestrationEventType;
    expectedVersion: number;
  }
) {
  return apiFetch(`${BASE}/encounters/${encodeURIComponent(encounterId)}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function openEncounterEscalation(
  encounterId: string,
  body: {
    templateCode: EscalationChainTemplateCode;
    summary: string;
    expectedVersion: number;
  }
) {
  return apiFetch(`${BASE}/encounters/${encodeURIComponent(encounterId)}/escalations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function advanceEncounterEscalation(
  encounterId: string,
  escalationId: string,
  body: { status: EscalationInstanceStatusV1; expectedVersion: number; note?: string }
) {
  return apiFetch(
    `${BASE}/encounters/${encodeURIComponent(encounterId)}/escalations/${encodeURIComponent(escalationId)}/advance`,
    { method: "POST", body: JSON.stringify(body) }
  );
}
