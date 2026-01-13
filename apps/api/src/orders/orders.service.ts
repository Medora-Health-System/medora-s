import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { OrderCreateDto, OrderUpdateDto } from "@medora/shared";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async create(encounterId: string, facilityId: string, data: OrderCreateDto, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await (this.prisma as any).encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: { patient: true },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.status !== "OPEN") {
      throw new BadRequestException("Can only create orders for open encounters");
    }

    const order = await (this.prisma as any).order.create({
      data: {
        encounterId,
        facilityId,
        patientId: encounter.patientId,
        type: data.type,
        priority: data.priority || "ROUTINE",
        notes: data.notes,
        orderedBy: userId,
        items: {
          create: data.items.map((item) => ({
            catalogItemId: item.catalogItemId,
            catalogItemType: item.catalogItemType,
            quantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: true,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log("ORDER_CREATE", "ORDER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      orderId: order.id,
      entityId: order.id,
      ip,
      userAgent,
      metadata: { type: data.type, itemCount: data.items.length },
    });

    return order;
  }

  async findByEncounter(encounterId: string, facilityId: string, userId?: string, ip?: string, userAgent?: string) {
    const orders = await (this.prisma as any).order.findMany({
      where: { encounterId, facilityId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    });

    await this.audit.log("ORDER_CREATE", "ORDER", {
      userId,
      facilityId,
      encounterId,
      ip,
      userAgent,
    });

    return orders;
  }

  async update(facilityId: string, id: string, data: OrderUpdateDto, userId?: string, ip?: string, userAgent?: string) {
    const order = await (this.prisma as any).order.findFirst({
      where: { id, facilityId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log("ORDER_CREATE", "ORDER", {
      userId,
      facilityId,
      patientId: order.patientId,
      encounterId: order.encounterId,
      orderId: order.id,
      entityId: order.id,
      ip,
      userAgent,
    });

    return updated;
  }

  async cancel(facilityId: string, id: string, userId?: string, ip?: string, userAgent?: string) {
    const order = await (this.prisma as any).order.findFirst({
      where: { id, facilityId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.status === "CANCELLED") {
      throw new BadRequestException("Order already cancelled");
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        items: true,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log("ORDER_CANCEL", "ORDER", {
      userId,
      facilityId,
      patientId: order.patientId,
      encounterId: order.encounterId,
      orderId: order.id,
      entityId: order.id,
      ip,
      userAgent,
    });

    return updated;
  }
}

