import { z } from "zod";
import {
  DUPLICATE_GOVERNANCE_STATUSES,
  type DuplicateGovernanceStatus,
} from "../priority-er-inventory-governance.util";

const governanceStatusEnum = z.enum(
  DUPLICATE_GOVERNANCE_STATUSES as [DuplicateGovernanceStatus, ...DuplicateGovernanceStatus[]]
);

export const stagingDuplicateGovernanceListQuerySchema = z.object({
  facilityId: z.string().uuid().optional(),
  batchId: z.string().min(1).optional(),
  reconciliationStatus: z.string().optional(),
  governanceStatus: governanceStatusEnum.optional(),
  filter: z
    .enum([
      "POSSIBLE_DUPLICATE",
      "EXACT_MATCH",
      "NEW_CANDIDATE",
      "REVIEW_REQUIRED",
      "PROMOTED_INACTIVE",
      "BLOCKED",
      "MISSING_NDC",
      "MISSING_BILLING",
    ])
    .optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type StagingDuplicateGovernanceListQuery = z.infer<
  typeof stagingDuplicateGovernanceListQuerySchema
>;

export const resolveStagingDuplicateBodySchema = z.object({
  facilityId: z.string().uuid().optional(),
  decision: governanceStatusEnum,
  linkedConceptId: z.string().uuid().optional(),
  linkedProductId: z.string().uuid().optional(),
  duplicateOfStagingRowId: z.string().uuid().optional(),
  note: z.string().trim().min(3).max(2000),
  confirmExactSourcePreserved: z.literal(true),
});

export type ResolveStagingDuplicateBody = z.infer<typeof resolveStagingDuplicateBodySchema>;

export const stagingDuplicateGovernanceActionBodySchema = z.object({
  facilityId: z.string().uuid().optional(),
  note: z.string().trim().min(3).max(2000),
});

export type StagingDuplicateGovernanceActionBody = z.infer<
  typeof stagingDuplicateGovernanceActionBodySchema
>;
