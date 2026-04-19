import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import { AuditAction } from "@prisma/client";
import { createStructuredLogger } from "../logging/structured-logger";
import { PrismaService } from "../../prisma/prisma.service";

const DEFAULT_AUDIT_FAILURE_MODE = "best_effort";

/** Returned in response body when audit persistence fails in fail-closed mode (critical actions only). */
export const AUDIT_WRITE_FAILED_BLOCKED_ACTION = "AUDIT_WRITE_FAILED_BLOCKED_ACTION" as const;

export type AuditLogInput = {
  userId?: string;
  facilityId?: string;
  patientId?: string;
  encounterId?: string;
  orderId?: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: unknown;
  /**
   * Legally / clinically significant mutations. When `AUDIT_FAILURE_MODE=fail_closed`, failure to
   * persist the audit row aborts the request. Non-critical logs (VIEW, CHART_ACCESS, etc.) omit this.
   */
  critical?: boolean;
  /** When set, write via this client so audit is part of the same `prisma.$transaction` as the clinical write. */
  tx?: Prisma.TransactionClient;
};

@Injectable()
export class AuditService {
  private readonly failClosed: boolean;
  private readonly structuredLog = createStructuredLogger("AuditService");

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    const raw = this.config.get<string>("AUDIT_FAILURE_MODE")?.trim() || DEFAULT_AUDIT_FAILURE_MODE;
    this.failClosed = raw === "fail_closed";
  }

  async log(action: AuditAction, entityType: string, input: AuditLogInput = {}) {
    const { critical = false, tx, ...options } = input;
    const db = tx ?? this.prisma;

    try {
      await db.auditLog.create({
        data: {
          action,
          entityType,
          entityId: options.entityId,
          userId: options.userId,
          facilityId: options.facilityId,
          patientId: options.patientId,
          encounterId: options.encounterId,
          orderId: options.orderId,
          ip: options.ip,
          userAgent: options.userAgent,
          metadata: {
            ...((options.metadata || {}) as Record<string, unknown>),
            ...(options.encounterId ? { encounterId: options.encounterId } : {}),
            ...(options.orderId ? { orderId: options.orderId } : {}),
          },
        },
      });
    } catch (error) {
      this.structuredLog.error("audit_log_write_failed", {
        auditFailureMode: this.failClosed ? "fail_closed" : "best_effort",
        critical,
        action: String(action),
        entityType,
        entityId: options.entityId ?? null,
        userId: options.userId ?? null,
        facilityId: options.facilityId ?? null,
        hasPatientId: !!options.patientId,
        hasEncounterId: !!options.encounterId,
        hasOrderId: !!options.orderId,
        errorName: error instanceof Error ? error.name : "unknown",
      });

      /** Same DB transaction as clinical write: must abort so Prisma rolls back the mutation. */
      if (tx) {
        throw error instanceof Error ? error : new Error(String(error));
      }

      if (this.failClosed && critical) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            code: AUDIT_WRITE_FAILED_BLOCKED_ACTION,
            message: AUDIT_WRITE_FAILED_BLOCKED_ACTION,
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    }
  }
}
