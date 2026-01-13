import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, OrderStatus } from "@prisma/client";

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async updateResult(
    orderItemId: string,
    facilityId: string,
    data: {
      resultData?: any;
      resultText?: string;
      criticalValue?: boolean;
    },
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          facilityId,
        },
      },
      include: {
        order: {
          include: {
            encounter: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    const result = await this.prisma.result.upsert({
      where: { orderItemId },
      update: {
        resultData: data.resultData,
        resultText: data.resultText,
        criticalValue: data.criticalValue ?? false,
        verifiedByUserId: userId,
        verifiedAt: data.resultText || data.resultData ? new Date() : undefined,
      },
      create: {
        orderItemId,
        facilityId,
        resultData: data.resultData,
        resultText: data.resultText,
        criticalValue: data.criticalValue ?? false,
        verifiedByUserId: userId,
        verifiedAt: data.resultText || data.resultData ? new Date() : undefined,
      },
    });

    // Update order item status to RESULTED if result is entered
    if (data.resultText || data.resultData) {
      await this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: { status: OrderStatus.RESULTED },
      });
    }

    await this.audit.log(AuditAction.RESULT_VERIFY, "RESULT", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: result.id,
      ip,
      userAgent,
      metadata: { criticalValue: data.criticalValue, orderItemId },
    });

    return result;
  }

  async setCriticalFlag(
    orderItemId: string,
    facilityId: string,
    critical: boolean,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          facilityId,
        },
        catalogItemType: "LAB_TEST", // Only lab can set critical
      },
      include: {
        order: {
          include: {
            encounter: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Order item not found or not a lab test");
    }

    const result = await this.prisma.result.upsert({
      where: { orderItemId },
      update: {
        criticalValue: critical,
      },
      create: {
        orderItemId,
        facilityId,
        criticalValue: critical,
      },
    });

    await this.audit.log(AuditAction.CRITICAL_FLAG, "RESULT", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: result.id,
      ip,
      userAgent,
      metadata: { criticalValue: critical, orderItemId },
    });

    return result;
  }
}

