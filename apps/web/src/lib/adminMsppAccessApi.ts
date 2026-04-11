/**
 * Administration plateforme — accès MSPP national (`MsppUserRoleAssignment`).
 * Proxifié vers Nest `admin/mspp-access/*` ; ne nécessite pas `x-facility-id`.
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

async function adminApiFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers && typeof options.headers === "object" && !(options.headers instanceof Headers)
      ? (options.headers as Record<string, string>)
      : {}),
  };

  const response = await fetch(`${ADMIN_API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    ...(options.body !== undefined ? { body: options.body } : {}),
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => "");
    let message = `La requête a échoué (${response.status}).`;
    try {
      if (txt.trim()) {
        const json = JSON.parse(txt);
        if (typeof json?.message === "string") message = json.message;
        else if (Array.isArray(json?.message)) message = json.message.join(" ");
        else if (typeof json?.error === "string") message = json.error;
      }
    } catch {
      if (txt?.trim()) message = txt;
    }
    throw new Error(normalizeUserFacingError(message) || `La requête a échoué (${response.status}).`);
  }

  return await parseApiResponse(response);
}

export type MsppAccessAssignmentRow = {
  id: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  userAccountActive: boolean;
  /** True when the linked user has `canCreateFacilities` (principal) — delegated MSPP admins cannot mutate. */
  userIsPlatformPrincipal?: boolean;
  role: string;
  /** Validateur départemental : périmètre national (tous les départements géographiques). */
  allGeoDepartments: boolean;
  geoDepartmentId: string | null;
  geoDepartmentName: string | null;
  geoDepartmentCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GeoDepartmentOption = { id: string; code: string; name: string };

export async function fetchMsppAccessAssignments(): Promise<{ items: MsppAccessAssignmentRow[] }> {
  return adminApiFetch("/mspp-access/assignments") as Promise<{ items: MsppAccessAssignmentRow[] }>;
}

export async function fetchGeoDepartmentsForMspp(): Promise<{ items: GeoDepartmentOption[] }> {
  return adminApiFetch("/mspp-access/geo-departments") as Promise<{ items: GeoDepartmentOption[] }>;
}

export async function createMsppAccessAssignment(body: {
  email: string;
  role: string;
  geoDepartmentId?: string | null;
  allGeoDepartments?: boolean;
}): Promise<{ id: string }> {
  return adminApiFetch("/mspp-access/assignments", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<{ id: string }>;
}

export async function msppOnboardWizard(body: {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: string;
  geoDepartmentId?: string | null;
  allGeoDepartments?: boolean;
  msppAssignmentActive: boolean;
}): Promise<{ userId: string; assignmentId: string; userCreated: boolean }> {
  return adminApiFetch("/mspp-access/onboard", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<{ userId: string; assignmentId: string; userCreated: boolean }>;
}

export async function patchMsppAccessAssignment(
  id: string,
  body: { role?: string; geoDepartmentId?: string | null; allGeoDepartments?: boolean; isActive?: boolean }
): Promise<{ id: string }> {
  return adminApiFetch(`/mspp-access/assignments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as Promise<{ id: string }>;
}
