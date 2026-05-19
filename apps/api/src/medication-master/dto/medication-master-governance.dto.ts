import { z } from "zod";

export const medicationMasterGovernanceFacilityQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
});

export const medicationMasterGovernanceWarningsQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
  code: z.string().optional(),
  severity: z.enum(["critical", "warning", "info"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const medicationMasterGovernanceUnmappedQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const medicationMasterGovernanceDuplicatesQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
  kind: z.enum(["ndc11", "genericName", "strengthDisplay", "stagingCode"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type MedicationMasterGovernanceFacilityQuery = z.infer<
  typeof medicationMasterGovernanceFacilityQuerySchema
>;
export type MedicationMasterGovernanceWarningsQuery = z.infer<
  typeof medicationMasterGovernanceWarningsQuerySchema
>;
export type MedicationMasterGovernanceUnmappedQuery = z.infer<
  typeof medicationMasterGovernanceUnmappedQuerySchema
>;
export type MedicationMasterGovernanceDuplicatesQuery = z.infer<
  typeof medicationMasterGovernanceDuplicatesQuerySchema
>;
