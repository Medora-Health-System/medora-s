import { Injectable } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../../common/services/audit.service";
import { AiAuditAction, AiAuditMetadata } from "./ai-audit.types";

/**
 * AI-specific audit wrapper.
 *
 * Reuses the existing AuditService so there is no second audit system. Phase 1A
 * stores AI-specific action names in metadata using existing AuditAction
 * values, avoiding a database migration. A future migration may promote the
 * `AiAuditAction` values to first-class Prisma AuditAction enum entries.
 *
 * This wrapper enforces metadata-only logging: no raw prompts, no raw model
 * responses, no chart narrative, no MRN, no patient names, no credentials,
 * tokens, or MFA secrets.
 */
@Injectable()
export class AiAuditService {
  private readonly entityType = "AI_REVIEW" as const;

  constructor(private readonly audit: AuditService) {}

  async log(
    aiAction: AiAuditAction,
    metadata: AiAuditMetadata,
    actorUserId?: string
  ): Promise<void> {
    const validated = this.validateMetadata(aiAction, metadata);
    await this.audit.log(this.mapToExistingAction(aiAction), this.entityType, {
      userId: actorUserId,
      facilityId: validated.facilityId,
      patientId: undefined,
      encounterId: validated.encounterId,
      entityId: validated.suggestionId,
      metadata: validated,
    });
  }

  private validateMetadata(aiAction: AiAuditAction, metadata: AiAuditMetadata): AiAuditMetadata {
    return {
      aiAction,
      facilityId: metadata.facilityId,
      encounterId: metadata.encounterId,
      snapshotVersion: metadata.snapshotVersion,
      suggestionId: metadata.suggestionId,
      category: metadata.category,
      provider: metadata.provider,
    };
  }

  /**
   * Maps AI-specific actions to existing Prisma AuditAction values.
   * Phase 1A placeholder; replace with dedicated enum values once a migration
   * is approved.
   */
  private mapToExistingAction(aiAction: AiAuditAction): AuditAction {
    switch (aiAction) {
      case "AI_REVIEW_REQUESTED":
      case "AI_REVIEW_COMPLETED":
      case "AI_REVIEW_FAILED":
        return AuditAction.CREATE;
      case "AI_SUGGESTION_DISPLAYED":
      case "AI_SUGGESTION_OPENED":
      case "AI_SUGGESTION_DISMISSED":
      case "AI_SUGGESTION_HELPFUL":
      case "AI_SUGGESTION_NOT_HELPFUL":
      default:
        return AuditAction.VIEW;
    }
  }
}
