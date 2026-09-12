import { z } from "zod";

/**
 * AI-specific audit action names.
 *
 * Phase 1A stores these in metadata only, using existing AuditAction values in
 * the database. A future migration may promote these to first-class Prisma
 * AuditAction enum values.
 */
export const AiAuditAction = z.enum([
  "AI_REVIEW_REQUESTED",
  "AI_REVIEW_COMPLETED",
  "AI_REVIEW_FAILED",
  "AI_SUGGESTION_DISPLAYED",
  "AI_SUGGESTION_OPENED",
  "AI_SUGGESTION_DISMISSED",
  "AI_SUGGESTION_HELPFUL",
  "AI_SUGGESTION_NOT_HELPFUL",
]);

export type AiAuditAction = z.infer<typeof AiAuditAction>;

/**
 * PHI-safe metadata for AI audit events.
 *
 * Intentionally excludes raw prompts, raw model responses, chart narrative,
 * patient identifiers, credentials, tokens, and MFA secrets.
 */
export const AiAuditMetadata = z.object({
  aiAction: AiAuditAction,
  facilityId: z.string().optional(),
  encounterId: z.string().optional(),
  snapshotVersion: z.string().max(255).optional(),
  suggestionId: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
  provider: z.string().max(100).optional(),
});

export type AiAuditMetadata = z.infer<typeof AiAuditMetadata>;
