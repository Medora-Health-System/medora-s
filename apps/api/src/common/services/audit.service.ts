import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditAction } from "@prisma/client";

const DEFAULT_AUDIT_FAILURE_MODE = "best_effort";

function serializeErrorForAudit(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  return { message: String(error) };
}

@Injectable()
export class AuditService {
  private readonly auditFailureMode: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.auditFailureMode =
      this.config.get<string>("AUDIT_FAILURE_MODE")?.trim() || DEFAULT_AUDIT_FAILURE_MODE;
  }

  async log(
    action: AuditAction,
    entityType: string,
    options: {
      userId?: string;
      facilityId?: string;
      patientId?: string;
      encounterId?: string;
      orderId?: string;
      entityId?: string;
      ip?: string;
      userAgent?: string;
      metadata?: any;
    }
  ) {
    try {
      await this.prisma.auditLog.create({
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
            ...(options.metadata || {}),
            ...(options.encounterId ? { encounterId: options.encounterId } : {}),
            ...(options.orderId ? { orderId: options.orderId } : {}),
          },
        },
      });
    } catch (error) {
      const err = serializeErrorForAudit(error);
      const payload = {
        event: "AUDIT_LOG_WRITE_FAILED",
        severity: "critical",
        auditFailureMode: this.auditFailureMode,
        action,
        entityType,
        entityId: options.entityId ?? null,
        userId: options.userId ?? null,
        facilityId: options.facilityId ?? null,
        patientId: options.patientId ?? null,
        encounterId: options.encounterId ?? null,
        orderId: options.orderId ?? null,
        ip: options.ip ?? null,
        userAgent: options.userAgent ?? null,
        errorMessage: err.message,
        ...(err.stack ? { errorStack: err.stack } : {}),
      };
      // Operational hook: single-line grep + JSON for aggregators (no extra deps).
      console.error("AUDIT_LOG_WRITE_FAILED", JSON.stringify(payload));
    }
  }
}
