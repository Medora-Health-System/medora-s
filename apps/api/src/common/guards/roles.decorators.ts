import { SetMetadata } from "@nestjs/common";
import type { MsppRoleCode, RoleCode } from "@prisma/client";

/** Metadata: route param name holding patient UUID (e.g. `id` on `/patients/:id/...`). */
export const BREAK_GLASS_PATIENT_PARAM_KEY = "breakGlassPatientParam";

export const AllowBreakGlassForPatientParam = (paramName = "id") =>
  SetMetadata(BREAK_GLASS_PATIENT_PARAM_KEY, paramName);

/**
 * Metadata key for optional MSPP roles (used by `RolesGuard`).
 * Kept in this file (no PrismaService / guard) to avoid circular CommonJS loads
 * where controllers import decorators before `roles.guard.js` finishes initializing.
 */
export const MSPP_ROLES_KEY = "msppRoles";

export const RequireRoles = (...roles: RoleCode[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata("roles", roles, descriptor.value);
      Reflect.defineMetadata(MSPP_ROLES_KEY, [] as MsppRoleCode[], descriptor.value);
    } else {
      Reflect.defineMetadata("roles", roles, target);
      Reflect.defineMetadata(MSPP_ROLES_KEY, [] as MsppRoleCode[], target);
    }
  };
};

/**
 * Facility-scoped access: user must have an active `UserRole` at the facility.
 * Authorization if either:
 * - `UserRole.role` is one of `clinical` (Medora clinical / desk roles), or
 * - `UserRole` exists at facility and user has an active MSPP assignment whose role is in `mspp`.
 */
export const RequireClinicalOrMspp = (clinical: RoleCode[], mspp: MsppRoleCode[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata("roles", clinical, descriptor.value);
      Reflect.defineMetadata(MSPP_ROLES_KEY, mspp, descriptor.value);
    } else {
      Reflect.defineMetadata("roles", clinical, target);
      Reflect.defineMetadata(MSPP_ROLES_KEY, mspp, target);
    }
  };
};
