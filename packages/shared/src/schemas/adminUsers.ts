import { z } from "zod";

/** Assignable roles in admin UI — align with Prisma `RoleCode`. */
export const ADMIN_ASSIGNABLE_ROLE_CODES = [
  "ADMIN",
  "PROVIDER",
  "RN",
  "PHARMACY",
  "FRONT_DESK",
  "LAB",
  "RADIOLOGY",
  "BILLING",
] as const;

export type AdminAssignableRoleCode = (typeof ADMIN_ASSIGNABLE_ROLE_CODES)[number];

export const adminUserRoleCodeSchema = z.enum(ADMIN_ASSIGNABLE_ROLE_CODES);

function uniqueRoleCodes<T extends string>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/** POST /admin/users */
export const createAdminUserDtoSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis").max(120),
  lastName: z.string().min(1, "Le nom est requis").max(120),
  email: z.string().min(1, "Le courriel est requis").email().max(320),
  password: z
    .string()
    .min(1, "Le mot de passe temporaire est requis")
    .min(8, "Le mot de passe temporaire doit contenir au moins 8 caractères")
    .max(128),
  facilityId: z.string().uuid({ message: "L’établissement est invalide." }),
  /** Compte utilisateur global (connexion impossible si false). */
  isActive: z.boolean().optional().default(true),
  roles: z
    .array(adminUserRoleCodeSchema)
    .min(1, "Au moins un rôle est requis")
    .transform((roles) => uniqueRoleCodes(roles)),
});

export type CreateAdminUserDto = z.infer<typeof createAdminUserDtoSchema>;

/** Alias for API documentation parity. */
export type CreateUserDto = CreateAdminUserDto;

/** PATCH /admin/users/:id */
export const updateAdminUserDtoSchema = z
  .object({
    firstName: z.string().min(1, "Le prénom est requis").max(120).optional(),
    lastName: z.string().min(1, "Le nom est requis").max(120).optional(),
    email: z.string().min(1, "Le courriel est requis").email().max(320).optional(),
  })
  .refine((d) => d.firstName !== undefined || d.lastName !== undefined || d.email !== undefined, {
    message: "Au moins un champ de profil est requis.",
  });

export type UpdateAdminUserDto = z.infer<typeof updateAdminUserDtoSchema>;
export type UpdateUserDto = UpdateAdminUserDto;

/** PATCH /admin/users/:id/roles */
export const updateAdminUserRolesDtoSchema = z.object({
  facilityId: z.string().uuid(),
  roles: z
    .array(adminUserRoleCodeSchema)
    .min(1, "Sélectionnez au moins un rôle")
    .transform((roles) => uniqueRoleCodes(roles)),
});

export type UpdateAdminUserRolesDto = z.infer<typeof updateAdminUserRolesDtoSchema>;
export type UpdateUserRolesDto = UpdateAdminUserRolesDto;

/** PATCH /admin/users/:id/status */
export const updateAdminUserStatusDtoSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateAdminUserStatusDto = z.infer<typeof updateAdminUserStatusDtoSchema>;
export type UpdateUserStatusDto = UpdateAdminUserStatusDto;
