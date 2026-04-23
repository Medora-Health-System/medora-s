import { Injectable } from "@nestjs/common";
import { ClaimSubmissionKind, Prisma } from "@prisma/client";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { PrismaService } from "../prisma/prisma.service";
import { scrubRecordForPersistence } from "./clearinghouse-audit.util";
import type { ClaimOperationalEventType } from "./claim-operational-event.constants";

const log = createStructuredLogger("ClaimOperationalEvent");

export type AppendClaimOperationalEventInput = {
  facilityId: string;
  encounterId?: string | null;
  submissionId?: string | null;
  batchId?: string | null;
  eventType: ClaimOperationalEventType;
  eventAt?: Date;
  claimType?: ClaimSubmissionKind | null;
  statusBefore?: string | null;
  statusAfter?: string | null;
  reasonCode?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Append-only durable audit for clearinghouse / submission operations.
 * Failures here must never affect claim lifecycle — all errors swallowed after log.
 */
@Injectable()
export class ClaimOperationalEventService {
  constructor(private readonly prisma: PrismaService) {}

  async append(input: AppendClaimOperationalEventInput): Promise<void> {
    try {
      const hasMeta = input.metadata && Object.keys(input.metadata).length > 0;
      await this.prisma.claimOperationalEvent.create({
        data: {
          facilityId: input.facilityId,
          encounterId: input.encounterId ?? null,
          submissionId: input.submissionId ?? null,
          batchId: input.batchId ?? null,
          eventType: input.eventType,
          eventAt: input.eventAt ?? new Date(),
          claimType: input.claimType ?? null,
          statusBefore: input.statusBefore ?? null,
          statusAfter: input.statusAfter ?? null,
          reasonCode: input.reasonCode ?? null,
          message: input.message ?? null,
          ...(hasMeta
            ? { metadataJson: scrubRecordForPersistence(input.metadata!) as Prisma.InputJsonValue }
            : {}),
        },
      });
    } catch (e) {
      log.log("claim_operational_event_append_failed", {
        eventType: input.eventType,
        facilityId: input.facilityId,
        submissionId: input.submissionId ?? undefined,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
