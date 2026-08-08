import { RoleCode } from "@prisma/client";

/**
 * D4SEC.1A authoritative platform authority.
 *
 * Email is deliberately absent.  Platform authority is granted only when the immutable User.id
 * resolves to an active User row which has both the existing defence-in-depth capability flag and
 * an active MEDORA_SUPER_ADMIN database assignment.  UserRole remains facility-shaped in the
 * current schema, but this decision is global; tenant-data routes must separately require and
 * validate their facility context.
 */
export type PlatformAuthorityState = {
  userId: string;
  isActive: boolean;
  canCreateFacilities: boolean;
  hasActiveSuperAdminAssignment: boolean;
};

export type PlatformAuthorityDecision = {
  granted: boolean;
  reason:
    | "GRANTED"
    | "USER_NOT_FOUND"
    | "INACTIVE_ACCOUNT"
    | "CAPABILITY_NOT_GRANTED"
    | "SUPER_ADMIN_ASSIGNMENT_REQUIRED";
};

export function resolvePlatformAuthorityState(
  state: PlatformAuthorityState | null
): PlatformAuthorityDecision {
  if (!state) return { granted: false, reason: "USER_NOT_FOUND" };
  if (!state.isActive) return { granted: false, reason: "INACTIVE_ACCOUNT" };
  if (!state.canCreateFacilities) {
    return { granted: false, reason: "CAPABILITY_NOT_GRANTED" };
  }
  if (!state.hasActiveSuperAdminAssignment) {
    return { granted: false, reason: "SUPER_ADMIN_ASSIGNMENT_REQUIRED" };
  }
  return { granted: true, reason: "GRANTED" };
}

type PlatformAuthorityStore = {
  user: {
    findUnique: (args: any) => Promise<any>;
  };
};

/** The single database-backed resolver used by guards, projections, and administration services. */
export async function resolvePlatformAuthority(
  store: PlatformAuthorityStore,
  userId: string
): Promise<PlatformAuthorityDecision> {
  const user = await store.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isActive: true,
      canCreateFacilities: true,
      userRoles: {
        where: { isActive: true, role: { code: RoleCode.MEDORA_SUPER_ADMIN } },
        select: { id: true },
        take: 1,
      },
    },
  });
  return resolvePlatformAuthorityState(
    user
      ? {
          userId: user.id,
          isActive: user.isActive,
          canCreateFacilities: user.canCreateFacilities,
          hasActiveSuperAdminAssignment: user.userRoles.length > 0,
        }
      : null
  );
}

export type PlatformPrincipalAccess = Omit<PlatformAuthorityDecision, "reason"> & {
  reason: PlatformAuthorityDecision["reason"] | "FACILITY_CONTEXT_REQUIRED";
};

/** Adds the explicit tenant-context condition required by opted-in clinical/customer routes. */
export async function resolvePlatformPrincipalAccess(
  store: PlatformAuthorityStore,
  input: { userId: string; facilityId?: string | null }
): Promise<PlatformPrincipalAccess> {
  const authority = await resolvePlatformAuthority(store, input.userId);
  if (!authority.granted) return authority;
  if (!String(input.facilityId ?? "").trim()) {
    return { granted: false, reason: "FACILITY_CONTEXT_REQUIRED" };
  }
  return authority;
}
