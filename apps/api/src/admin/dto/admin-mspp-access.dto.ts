import { z } from "zod";
import { MsppRoleCode } from "@prisma/client";

const msppRoleEnum = z.nativeEnum(MsppRoleCode);

export const createMsppAccessDtoSchema = z
  .object({
    email: z.string().min(1).email(),
    role: msppRoleEnum,
    geoDepartmentId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === MsppRoleCode.MSPP_VALIDATOR_DEPT) {
      if (!data.geoDepartmentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Département géographique requis pour ce rôle.",
          path: ["geoDepartmentId"],
        });
      }
    } else if (data.geoDepartmentId != null && data.geoDepartmentId !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ce rôle ne prend pas de département géographique.",
        path: ["geoDepartmentId"],
      });
    }
  });

export type CreateMsppAccessDto = z.infer<typeof createMsppAccessDtoSchema>;

export const patchMsppAccessDtoSchema = z
  .object({
    role: msppRoleEnum.optional(),
    geoDepartmentId: z.string().uuid().nullable().optional(),
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
    msppAssignmentActive: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.role === MsppRoleCode.MSPP_VALIDATOR_DEPT) {
      if (!data.geoDepartmentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Département géographique requis pour ce rôle.",
          path: ["geoDepartmentId"],
        });
      }
    } else if (data.geoDepartmentId != null && data.geoDepartmentId !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ce rôle ne prend pas de département géographique.",
        path: ["geoDepartmentId"],
      });
    }
  });

export type MsppOnboardDto = z.infer<typeof msppOnboardDtoSchema>;
