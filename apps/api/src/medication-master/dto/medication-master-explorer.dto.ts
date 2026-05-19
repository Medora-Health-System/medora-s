import { z } from "zod";

export const medicationMasterSearchQuerySchema = z.object({
  q: z.string().optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).optional().default(40),
  offset: z.coerce.number().int().min(0).optional().default(0),
  facilityId: z.string().uuid().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
  edFormularyOnly: z.enum(["true", "false"]).optional(),
  controlledOnly: z.enum(["true", "false"]).optional(),
  highAlertOnly: z.enum(["true", "false"]).optional(),
  infusionOnly: z.enum(["true", "false"]).optional(),
  onFormularyOnly: z.enum(["true", "false"]).optional(),
  ndcStatus: z.enum(["present", "missing", "any"]).optional().default("any"),
  administrationType: z.string().max(32).optional(),
});

export type MedicationMasterSearchQuery = z.infer<typeof medicationMasterSearchQuerySchema>;
