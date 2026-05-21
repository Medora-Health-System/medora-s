import { z } from "zod";

export const controlledCatalogMedicationCommitBodySchema = z.object({
  facilityId: z.string().uuid(),
  enableProviderOrderSearch: z.boolean().optional().default(false),
  confirmOrderSearchEnablement: z.boolean().optional().default(false),
  confirmMarRemainsOff: z.boolean().optional().default(false),
  confirmBillingRemainsOff: z.boolean().optional().default(false),
  note: z.string().max(2000).optional().default(""),
});

export type ControlledCatalogMedicationCommitBody = z.infer<
  typeof controlledCatalogMedicationCommitBodySchema
>;

export const controlledCatalogProcedureCommitBodySchema = z.object({
  facilityId: z.string().uuid().optional(),
  note: z.string().max(2000).optional().default(""),
});

export type ControlledCatalogProcedureCommitBody = z.infer<
  typeof controlledCatalogProcedureCommitBodySchema
>;
