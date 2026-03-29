import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditAction } from "@prisma/client";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

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
      // Don't fail the request if audit logging fails
      console.error("Audit log error:", error);
    }
  }
}
