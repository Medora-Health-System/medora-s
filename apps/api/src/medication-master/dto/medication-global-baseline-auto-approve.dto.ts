import { z } from "zod";
import { MEDICATION_BASELINE_SOURCES } from "../medication-baseline.constants";

export const medicationGlobalBaselineAutoApproveBodySchema = z.object({
  dryRun: z.boolean().optional().default(true),
  source: z.enum(MEDICATION_BASELINE_SOURCES).default("PRIORITY_ER_INVENTORY"),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  facilityId: z.string().uuid().optional(),
  adminNote: z.string().trim().min(3).max(500).optional(),
});

export type MedicationGlobalBaselineAutoApproveBody = z.infer<
  typeof medicationGlobalBaselineAutoApproveBodySchema
>;
