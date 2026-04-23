import { z } from "zod";
import { isProcedureCodeLikeForSystem, PROCEDURE_INVALID_CODE_FORMAT } from "@medora/shared";

export const appendProcedureCaptureDtoSchema = z
  .object({
    billingProcedureCodeId: z.string().uuid().optional(),
    manualNonCatalog: z.boolean().optional(),
    code: z.string().trim().max(32).optional(),
    codeSystem: z.enum(["CPT", "HCPCS"]).optional(),
    description: z.string().trim().max(2000).optional(),
    modifiers: z.array(z.string().trim().max(8)).max(8).optional(),
    units: z.number().int().min(1).max(999999).optional(),
  })
  .superRefine((data, ctx) => {
    const cat = data.billingProcedureCodeId?.trim();
    const manual = data.manualNonCatalog === true;
    if (cat && manual) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "billingProcedureCodeId and manualNonCatalog cannot be used together",
        path: ["manualNonCatalog"],
      });
    }
    if (cat) return;
    if (manual) {
      if (!data.code?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "code is required when manualNonCatalog is true", path: ["code"] });
        return;
      }
      if (!data.codeSystem) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "codeSystem is required when manualNonCatalog is true", path: ["codeSystem"] });
        return;
      }
      const c = data.code.trim();
      if (!isProcedureCodeLikeForSystem(c, data.codeSystem)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: PROCEDURE_INVALID_CODE_FORMAT,
          path: ["code"],
        });
      }
      return;
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either billingProcedureCodeId or manualNonCatalog with code is required",
      path: ["billingProcedureCodeId"],
    });
  });

export type AppendProcedureCaptureDto = z.infer<typeof appendProcedureCaptureDtoSchema>;
