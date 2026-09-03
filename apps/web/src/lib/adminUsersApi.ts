/**
 * Admin user management — calls Next.js `/api/admin/*`, which proxies to Nest `admin/*`.
 * UserRole rows link users to roles per facility (see Prisma `UserRole`).
 */

import type {
  CreateAdminUserDto,
  CreateFacilityDto,
  PubliclySelectableProductUiLanguage,
} from "@medora/shared";
import type { FacilityBillingClassificationMode } from "@medora/shared";
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
    let code: string | undefined;
    let body: Record<string, unknown> | undefined;
    try {
      if (txt.trim()) {
        const json = JSON.parse(txt) as Record<string, unknown>;
        body = json;
        const msg = json?.message;
        if (typeof msg === "string") message = msg;
        else if (Array.isArray(msg)) message = msg.join(" ");
        else if (msg && typeof msg === "object" && !Array.isArray(msg)) {
          const nested = msg as Record<string, unknown>;
          if (typeof nested.message === "string") message = nested.message;
          if (typeof nested.code === "string") code = nested.code;
          body = { ...json, ...nested };
        } else if (typeof json?.error === "string") message = json.error;
        if (typeof json?.code === "string") code = json.code;
      }
    } catch {
      if (txt?.trim()) message = txt;
    }
    const err = new Error(
      normalizeUserFacingError(message, "fr") || `La requête a échoué (${response.status}).`
    ) as Error & { code?: string; body?: Record<string, unknown>; status?: number };
    err.code = code;
    err.body = body;
    err.status = response.status;
    throw err;
  }

  return await parseApiResponse(response);
}

export type AdminUserAssignmentRow = {
  facilityId: string;
  roleCode: string;
  departmentId: string | null;
  professionCode?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
};

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
  assignments?: AdminUserAssignmentRow[];
};

export type FacilityDepartmentRow = {
  id: string;
  code: string;
  name: string;
};

export async function fetchAdminFacilityDepartments(
  headerFacilityId: string,
  targetFacilityId: string
): Promise<{ items: FacilityDepartmentRow[] }> {
  return adminApiFetch(`/facilities/${targetFacilityId}/departments`, {
    method: "GET",
    facilityId: headerFacilityId,
  }) as Promise<{ items: FacilityDepartmentRow[] }>;
}

export async function fetchAdminUsers(facilityId: string): Promise<{ items: AdminUserRow[] }> {
  return adminApiFetch("/users", { facilityId }) as Promise<{ items: AdminUserRow[] }>;
}

/** POST /admin/users */
export async function createAdminUser(facilityId: string, body: CreateAdminUserDto): Promise<AdminUserRow> {
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
  body: {
    facilityId: string;
    roles?: string[];
    assignments?: {
      facilityId?: string;
      roleCode: string;
      departmentId?: string | null;
    }[];
  }
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

/** PATCH /admin/users/:id/password */
export async function patchAdminUserPassword(
  facilityId: string,
  userId: string,
  body: { newPassword: string }
): Promise<{ message: string }> {
  return adminApiFetch(`/users/${userId}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<{ message: string }>;
}

export type FacilityBillingIdentityPayload = {
  id: string;
  name: string;
  code: string;
  billingLegalName: string | null;
  billingNpi: string | null;
  taxIdEin: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingStateProvince: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  billingFacilityTypeLabel: string | null;
};

/** GET /admin/facilities/:id/billing-identity — platform principal or facility ADMIN. */
export async function fetchAdminFacilityBillingIdentity(
  headerFacilityId: string,
  targetFacilityId: string
): Promise<FacilityBillingIdentityPayload> {
  return adminApiFetch(`/facilities/${targetFacilityId}/billing-identity`, {
    method: "GET",
    facilityId: headerFacilityId,
  }) as Promise<FacilityBillingIdentityPayload>;
}

/** PATCH /admin/facilities/:id/billing-identity */
export async function patchAdminFacilityBillingIdentity(
  headerFacilityId: string,
  targetFacilityId: string,
  body: Record<string, string | null | undefined>
): Promise<FacilityBillingIdentityPayload> {
  return adminApiFetch(`/facilities/${targetFacilityId}/billing-identity`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId: headerFacilityId,
  }) as Promise<FacilityBillingIdentityPayload>;
}

export type FacilityBillingWorkflowPayload = {
  facilityId: string;
  facilityName: string;
  billingClassificationMode: FacilityBillingClassificationMode | null;
  billingSiteType: string | null;
  allowedEncounterBillingClassifications: string[];
  allowUrgentCareToEmergencyUpgrade: boolean;
  requireUcToEdPatientAcknowledgement: boolean;
  showEncounterBillingControls: boolean;
  /** MEDUI.D4C.9 — persisted vs effective projection */
  configuredMode?: FacilityBillingClassificationMode | null;
  effectiveMode?: FacilityBillingClassificationMode | null;
  source?: "EXPLICIT" | "INFERRED_FROM_EXISTING_PROFILE" | "UNRESOLVED";
};

export async function fetchAdminFacilityBillingWorkflow(
  headerFacilityId: string,
  targetFacilityId: string
): Promise<FacilityBillingWorkflowPayload> {
  return adminApiFetch(`/facilities/${targetFacilityId}/billing-workflow`, {
    method: "GET",
    facilityId: headerFacilityId,
  }) as Promise<FacilityBillingWorkflowPayload>;
}

export async function patchAdminFacilityBillingWorkflow(
  headerFacilityId: string,
  targetFacilityId: string,
  body: Record<string, unknown>
): Promise<FacilityBillingWorkflowPayload> {
  return adminApiFetch(`/facilities/${targetFacilityId}/billing-workflow`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId: headerFacilityId,
  }) as Promise<FacilityBillingWorkflowPayload>;
}

export type UserBillingIdentityPayload = {
  id: string;
  billingNpi: string | null;
  billingTaxonomyCode: string | null;
  billingNameOverride: string | null;
};

export async function fetchAdminUserBillingIdentity(
  facilityId: string,
  userId: string
): Promise<UserBillingIdentityPayload> {
  return adminApiFetch(`/users/${userId}/billing-identity`, {
    method: "GET",
    facilityId,
  }) as Promise<UserBillingIdentityPayload>;
}

export async function patchAdminUserBillingIdentity(
  facilityId: string,
  userId: string,
  body: { billingNpi?: string | null; billingTaxonomyCode?: string | null; billingNameOverride?: string | null }
): Promise<UserBillingIdentityPayload> {
  return adminApiFetch(`/users/${userId}/billing-identity`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<UserBillingIdentityPayload>;
}

export type AdminFacilityRow = {
  id: string;
  name: string;
  isActive?: boolean;
  defaultLanguage?: PubliclySelectableProductUiLanguage;
  facilityType?: string;
  serviceLines?: string[];
  facilityCareProfileJson?: unknown;
  configurationUpdatedAt?: string | null;
  enterpriseCapabilities?: unknown;
  printIdentity?: {
    displayName?: string | null;
    address?: Record<string, string | null>;
  } | null;
};

/** GET /admin/facilities — liste globale (plateforme ou ADMIN à l’établissement actif). */
export async function fetchAdminFacilities(
  facilityId?: string,
  options?: { includeInactive?: boolean }
): Promise<AdminFacilityRow[]> {
  const q = options?.includeInactive ? "?includeInactive=true" : "";
  const data = await adminApiFetch(`/facilities${q}`, {
    method: "GET",
    ...(facilityId ? { facilityId } : {}),
  });
  return Array.isArray(data) ? (data as AdminFacilityRow[]) : [];
}

/** PATCH /admin/facilities/:id/service-config — type, service lines, D4C.1/D4C.7I care profile + operational identity. */
export async function patchAdminFacilityServiceConfig(
  headerFacilityId: string,
  targetFacilityId: string,
  body: import("@medora/shared").UpdateFacilityServiceConfigDto
): Promise<AdminFacilityRow> {
  return adminApiFetch(`/facilities/${targetFacilityId}/service-config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId: headerFacilityId,
  }) as Promise<AdminFacilityRow>;
}

/** PATCH /admin/facilities/:id — activation contractuelle (compte principal plateforme uniquement côté API). */
export async function setAdminFacilityActive(
  facilityId: string,
  id: string,
  isActive: boolean
): Promise<{ id: string; name: string; isActive: boolean }> {
  return adminApiFetch(`/facilities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
    facilityId,
  }) as Promise<{ id: string; name: string; isActive: boolean }>;
}

export async function setAdminFacilityLanguage(
  facilityId: string,
  id: string,
  defaultLanguage: PubliclySelectableProductUiLanguage
): Promise<{ id: string; name: string; defaultLanguage: PubliclySelectableProductUiLanguage }> {
  return adminApiFetch(`/facilities/${id}/language`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ defaultLanguage }),
    facilityId,
  }) as Promise<{ id: string; name: string; defaultLanguage: PubliclySelectableProductUiLanguage }>;
}

/** POST /admin/facilities — crée un établissement et rattache l’admin courant (côté API). */
export async function createAdminFacility(
  facilityId: string,
  body: CreateFacilityDto
): Promise<{ id: string; name: string; defaultLanguage: PubliclySelectableProductUiLanguage }> {
  return adminApiFetch("/facilities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<{ id: string; name: string; defaultLanguage: PubliclySelectableProductUiLanguage }>;
}
