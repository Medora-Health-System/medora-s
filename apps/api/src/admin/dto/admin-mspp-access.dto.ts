import { z } from "zod";
import { MsppRoleCode } from "@prisma/client";

const msppRoleEnum = z.nativeEnum(MsppRoleCode);

function refineDeptGeo(
  data: { role: MsppRoleCode; geoDepartmentId?: string | null; allGeoDepartments?: boolean },
  ctx: z.RefinementCtx
): void {
  if (data.role === MsppRoleCode.MSPP_VALIDATOR_DEPT) {
    const all = data.allGeoDepartments === true;
    const hasGeo = Boolean(data.geoDepartmentId && String(data.geoDepartmentId).trim());
    if (all && hasGeo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choisissez un département ou « tous les départements », pas les deux.",
        path: ["geoDepartmentId"],
      });
    }
    if (!all && !hasGeo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Département géographique requis, ou cochez l’accès à tous les départements.",
        path: ["geoDepartmentId"],
      });
    }
  } else {
    if (data.geoDepartmentId != null && data.geoDepartmentId !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ce rôle ne prend pas de département géographique.",
        path: ["geoDepartmentId"],
      });
    }
    if (data.allGeoDepartments === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ce rôle ne prend pas l’option tous départements.",
        path: ["allGeoDepartments"],
      });
    }
  }
}

export const createMsppAccessDtoSchema = z
  .object({
    email: z.string().min(1).email(),
    role: msppRoleEnum,
    geoDepartmentId: z.string().uuid().nullable().optional(),
    allGeoDepartments: z.boolean().optional(),
  })
  .superRefine((data, ctx) => refineDeptGeo(data, ctx));

export type CreateMsppAccessDto = z.infer<typeof createMsppAccessDtoSchema>;

export const patchMsppAccessDtoSchema = z
  .object({
    role: msppRoleEnum.optional(),
    geoDepartmentId: z.string().uuid().nullable().optional(),
    allGeoDepartments: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const keys = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined);
    if (keys.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Aucune modification." });
    }
  });

export type PatchMsppAccessDto = z.infer<typeof patchMsppAccessDtoSchema>;

/** POST /admin/mspp-access/onboard — création de compte + accès MSPP (ou liaison si courriel existant). */
export const msppOnboardDtoSchema = z
  .object({
    firstName: z.string().min(1, "Le prénom est requis.").max(120),
    lastName: z.string().min(1, "Le nom est requis.").max(120),
    email: z.string().min(1, "Le courriel est requis.").email(),
    /** Obligatoire seulement pour la création d’un nouveau compte (longueur min. vérifiée côté service). */
    password: z.string().max(128).optional(),
    role: msppRoleEnum,
    geoDepartmentId: z.string().uuid().nullable().optional(),
    allGeoDepartments: z.boolean().optional(),
    msppAssignmentActive: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => refineDeptGeo(data, ctx));

export type MsppOnboardDto = z.infer<typeof msppOnboardDtoSchema>;
