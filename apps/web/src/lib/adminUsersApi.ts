/**
 * Admin user management — calls Next.js `/api/admin/*`, which proxies to Nest `admin/*`.
 * UserRole rows link users to roles per facility (see Prisma `UserRole`).
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

async function adminApiFetch(
  path: string,
  options: RequestInit & { facilityId?: string } = {}
): Promise<unknown> {
  const { facilityId: providedFacilityId, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers && typeof fetchOptions.headers === "object" && !(fetchOptions.headers instanceof Headers)
      ? (fetchOptions.headers as Record<string, string>)
      : {}),
  };
  if (providedFacilityId) {
    headers["x-facility-id"] = providedFacilityId;
  }

  const response = await fetch(`${ADMIN_API_BASE}${path}`, {
    method: fetchOptions.method ?? "GET",
    headers,
    credentials: "include",
    ...(fetchOptions.body !== undefined && { body: fetchOptions.body }),
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
    throw new Error(
      normalizeUserFacingError(message) || `La requête a échoué (${response.status}).`
    );
  }

  return await parseApiResponse(response);
}

export type AdminUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  /** Au moins un rôle actif pour l’établissement courant. */
  facilityAccessActive: boolean;
  roles: string[];
  rolesInactive?: string[];
};

export async function fetchAdminUsers(facilityId: string): Promise<{ items: AdminUserRow[] }> {
  return adminApiFetch("/users", { facilityId }) as Promise<{ items: AdminUserRow[] }>;
}

/** POST /admin/users */
export async function createAdminUser(
  facilityId: string,
  body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    facilityId: string;
    roles: string[];
    isActive?: boolean;
  }
): Promise<AdminUserRow> {
  return adminApiFetch("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<AdminUserRow>;
}

/** PATCH /admin/users/:id — profil */
export async function patchAdminUserProfile(
  facilityId: string,
  userId: string,
  body: { firstName?: string; lastName?: string; email?: string }
): Promise<AdminUserRow> {
  return adminApiFetch(`/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<AdminUserRow>;
}

/** PATCH /admin/users/:id/roles */
export async function patchAdminUserRoles(
  facilityId: string,
  userId: string,
  body: { facilityId: string; roles: string[] }
): Promise<AdminUserRow> {
  return adminApiFetch(`/users/${userId}/roles`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<AdminUserRow>;
}

/** PATCH /admin/users/:id/status */
export async function patchAdminUserStatus(
  facilityId: string,
  userId: string,
  body: { isActive: boolean }
): Promise<AdminUserRow> {
  return adminApiFetch(`/users/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<AdminUserRow>;
}
