import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { PatientPortalRepository } from "./persistence/patient-portal.repository";

export type PatientPortalAuditInput = {
  portalAccountId?: string | null;
  sessionId?: string | null;
  facilityId?: string | null;
  patientId?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  critical?: boolean;
};

@Injectable()
export class PatientPortalAuditService {
  private readonly log = createStructuredLogger("PatientPortalAuditService");
  private readonly failClosed: boolean;

  constructor(
    private readonly repo: PatientPortalRepository,
    config: ConfigService
  ) {
    this.failClosed = config.get<string>("PATIENT_PORTAL_AUDIT_FAILURE_MODE") === "fail_closed";
  }

  async record(action: string, entityType: string, input: PatientPortalAuditInput = {}): Promise<void> {
    try {
      await this.repo.writeAudit({
        id: randomUUID(),
        portalAccountId: input.portalAccountId,
        sessionId: input.sessionId,
        facilityId: input.facilityId,
        patientId: input.patientId,
        action,
        entityType,
        entityId: input.entityId,
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: input.metadata,
      });
    } catch (error) {
      this.log.error("patient_portal_audit_write_failed", {
        action,
        entityType,
        portalAccountId: input.portalAccountId ?? null,
        facilityId: input.facilityId ?? null,
        hasPatientId: !!input.patientId,
        critical: input.critical === true,
        errorName: error instanceof Error ? error.name : "unknown",
      });
      if (this.failClosed && input.critical === true) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            code: "PATIENT_PORTAL_AUDIT_WRITE_FAILED",
            message: "PATIENT_PORTAL_AUDIT_WRITE_FAILED",
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    }
  }
}
