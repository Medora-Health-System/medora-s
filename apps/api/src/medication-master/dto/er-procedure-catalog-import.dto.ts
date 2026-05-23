import { z } from "zod";

export const erProcedureCatalogCommitBodySchema = z.object({
  facilityId: z.string().uuid(),
  note: z.string().max(2000).optional().default(""),
  confirmOrderingOnly: z.literal(true),
  confirmBillingOff: z.literal(true),
  confirmInventoryOff: z.literal(true),
});

export type ErProcedureCatalogCommitBody = z.infer<typeof erProcedureCatalogCommitBodySchema>;

export const erProcedureComplexityApproveBodySchema = z.object({
  facilityId: z.string().uuid(),
  note: z.string().min(3).max(2000),
  confirmOrderingOnly: z.literal(true),
  confirmBillingOff: z.literal(true),
});

export type ErProcedureComplexityApproveBody = z.infer<typeof erProcedureComplexityApproveBodySchema>;

export const erProcedureComplexityRejectBodySchema = z.object({
  facilityId: z.string().uuid(),
  note: z.string().min(3).max(2000),
});

export type ErProcedureComplexityRejectBody = z.infer<typeof erProcedureComplexityRejectBodySchema>;
