/**
 * D4A.2.7 — Enterprise Command Layer API client (facility from JWT).
 */

import { apiFetch } from "@/lib/apiClient";
import type {
  EnterprisePatientListKind,
  EnterpriseTrackBoardRowV1,
  EnterpriseCapacityDashboardV1,
  EnterpriseCommandTaskV1,
  EnterpriseCommandEscalationV1,
  EnterpriseCommandNotificationV1,
  EnterpriseCommandDocV1,
} from "@medora/shared";

const BASE = "/hospital-care/enterprise-command";

export type EnterpriseTrackBoardResponse = {
  certification: string;
  generatedAt: string;
  facilityId: string;
  rows: EnterpriseTrackBoardRowV1[];
  consumesClinicalSynthesis: true;
  neverLegalRecord: true;
  placementLogicEnabled: false;
};

export type EnterpriseDashboardResponse = {
  certification: string;
  generatedAt: string;
  facilityId: string;
  capacity: EnterpriseCapacityDashboardV1;
  trackBoardCount: number;
  openTasks: number;
  openEscalations: number;
  criticalAlerts: number;
  pendingConsults: number;
  pendingImaging: number;
  dischargeReady: number;
  neverEditProviderNotes: true;
  neverEditNursingDocumentation: true;
  consumesClinicalSynthesis: true;
  rowsPreview: EnterpriseTrackBoardRowV1[];
};

export type EnterpriseExecutiveResponse = {
  certification: string;
  generatedAt: string;
  facilityId: string;
  census: number;
  admissionsToday: number;
  dischargesToday: number | null;
  averageLosHours: number | null;
  capacityOccupancyPct: number | null;
  criticalAlerts: number;
  pendingConsult: number;
  pendingPlacement: number;
  transfersReady: number;
  phiMinimized: true;
  readOnly: true;
};

export async function fetchEnterpriseTrackBoard(): Promise<EnterpriseTrackBoardResponse> {
  return apiFetch(`${BASE}/track-board`);
}

export async function fetchEnterpriseCommandDashboard(): Promise<EnterpriseDashboardResponse> {
  return apiFetch(`${BASE}/dashboard`);
}

export async function fetchEnterprisePatientList(
  kind: EnterprisePatientListKind,
  q?: string
): Promise<{ kind: string; rows: EnterpriseTrackBoardRowV1[] }> {
  const qs = new URLSearchParams();
  if (q?.trim()) qs.set("q", q.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`${BASE}/patient-lists/${encodeURIComponent(kind)}${suffix}`);
}

export async function fetchEnterpriseCapacity(): Promise<{
  capacity: EnterpriseCapacityDashboardV1;
  inferredCapacity: false;
  placementLogicEnabled: false;
}> {
  return apiFetch(`${BASE}/capacity`);
}

export async function fetchEnterpriseExecutive(): Promise<EnterpriseExecutiveResponse> {
  return apiFetch(`${BASE}/executive`);
}

export async function fetchEnterprisePatientFlow(): Promise<{
  placementLogicEnabled: false;
  flow: Record<string, number | null>;
  note: string;
}> {
  return apiFetch(`${BASE}/patient-flow`);
}

export async function fetchEnterpriseAlerts(): Promise<{
  alerts: Array<{ alertType: string; encounterId: string; summary: string }>;
  neverAutoAcknowledge: true;
}> {
  return apiFetch(`${BASE}/alerts`);
}

export async function fetchEnterpriseTasks(): Promise<{
  tasks: Array<{
    encounterId: string;
    taskId: string;
    title: string;
    priority: string;
    status: string;
  }>;
}> {
  return apiFetch(`${BASE}/tasks`);
}

export async function upsertEnterpriseTask(
  encounterId: string,
  task: EnterpriseCommandTaskV1,
  expectedVersion: number
): Promise<{ commandDoc: EnterpriseCommandDocV1 }> {
  return apiFetch(`${BASE}/encounters/${encodeURIComponent(encounterId)}/tasks`, {
    method: "PUT",
    body: JSON.stringify({ task, expectedVersion }),
  });
}

export async function upsertEnterpriseEscalation(
  encounterId: string,
  escalation: EnterpriseCommandEscalationV1,
  expectedVersion: number
): Promise<{ commandDoc: EnterpriseCommandDocV1 }> {
  return apiFetch(`${BASE}/encounters/${encodeURIComponent(encounterId)}/escalations`, {
    method: "PUT",
    body: JSON.stringify({ escalation, expectedVersion }),
  });
}

export async function postEnterpriseNotification(
  encounterId: string,
  notification: EnterpriseCommandNotificationV1,
  expectedVersion: number
): Promise<{ commandDoc: EnterpriseCommandDocV1 }> {
  return apiFetch(`${BASE}/encounters/${encodeURIComponent(encounterId)}/notifications`, {
    method: "POST",
    body: JSON.stringify({ notification, expectedVersion }),
  });
}
