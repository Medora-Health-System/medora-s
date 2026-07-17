import { z } from "zod";
import {
  RXNORM_CONFLICT_OVERRIDE_REASON_VALUES,
  RXNORM_REJECTION_REASON_VALUES,
} from "@medora/shared";

const nonEmpty = z.string().trim().min(1);

export const reviewApproveBodySchema = z.object({
  candidateId: nonEmpty,
  expectedReviewVersion: z.number().int().nonnegative(),
  confirmApprove: z.literal(true),
  rationaleNotes: nonEmpty,
  conflictOverrideAcknowledged: z.boolean().optional(),
  conflictOverrideReasons: z
    .array(z.enum(RXNORM_CONFLICT_OVERRIDE_REASON_VALUES))
    .optional(),
});

export const reviewRejectBodySchema = z.object({
  candidateId: nonEmpty,
  expectedReviewVersion: z.number().int().nonnegative(),
  confirmReject: z.literal(true),
  rationaleNotes: nonEmpty,
  rejectionReasonCategory: z.enum(RXNORM_REJECTION_REASON_VALUES),
});

export const reviewDeferBodySchema = z.object({
  candidateId: nonEmpty,
  expectedReviewVersion: z.number().int().nonnegative(),
  confirmDefer: z.literal(true),
  deferredReason: nonEmpty,
});

export const reviewAssignBodySchema = z.object({
  candidateId: nonEmpty,
  expectedReviewVersion: z.number().int().nonnegative(),
  assignedToUserId: nonEmpty,
});

export const reviewRetireBodySchema = z.object({
  verifiedMappingId: nonEmpty,
  confirmRetire: z.literal(true),
  retireReason: nonEmpty,
  candidateId: z.string().trim().optional(),
});

export const reviewSupersedeBodySchema = z.object({
  candidateId: nonEmpty,
  expectedReviewVersion: z.number().int().nonnegative(),
  previousVerifiedMappingId: nonEmpty,
  confirmApprove: z.literal(true),
  rationaleNotes: nonEmpty,
  conflictOverrideAcknowledged: z.boolean().optional(),
  conflictOverrideReasons: z
    .array(z.enum(RXNORM_CONFLICT_OVERRIDE_REASON_VALUES))
    .optional(),
});

export const reviewBulkBodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "DEFER"]),
  confirmBulk: z.literal(true),
  rationaleNotes: nonEmpty,
  rejectionReasonCategory: z.enum(RXNORM_REJECTION_REASON_VALUES).optional(),
  conflictOverrideAcknowledged: z.boolean().optional(),
  conflictOverrideReasons: z
    .array(z.enum(RXNORM_CONFLICT_OVERRIDE_REASON_VALUES))
    .optional(),
  items: z
    .array(
      z.object({
        candidateId: nonEmpty,
        expectedReviewVersion: z.number().int().nonnegative(),
      })
    )
    .min(1)
    .max(50),
});

export type ReviewApproveBody = z.infer<typeof reviewApproveBodySchema>;
export type ReviewRejectBody = z.infer<typeof reviewRejectBodySchema>;
export type ReviewDeferBody = z.infer<typeof reviewDeferBodySchema>;
export type ReviewAssignBody = z.infer<typeof reviewAssignBodySchema>;
export type ReviewRetireBody = z.infer<typeof reviewRetireBodySchema>;
export type ReviewSupersedeBody = z.infer<typeof reviewSupersedeBodySchema>;
export type ReviewBulkBody = z.infer<typeof reviewBulkBodySchema>;
