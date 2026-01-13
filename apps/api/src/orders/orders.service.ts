import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, OrderStatus } from "@prisma/client";
import { assertCanTransition } from "../common/workflow/status.transitions";
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

    await this.audit.log(AuditAction.ORDER_CREATE, "ORDER", {
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

    await this.audit.log(AuditAction.ORDER_VIEW, "ORDER", {
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
    if (data.status !== undefined) {
      // Validate status transition
      assertCanTransition(order.status, data.status);
      updateData.status = data.status;
    }
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

    await this.audit.log(AuditAction.ORDER_UPDATE, "ORDER", {
      userId,
      facilityId,
      patientId: order.patientId,
      encounterId: order.encounterId,
      orderId: order.id,
      entityId: order.id,
      ip,
      userAgent,
      metadata: { changes: Object.keys(data) },
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

    // Validate transition
    assertCanTransition(order.status, "CANCELLED");

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        items: true,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log(AuditAction.ORDER_CANCEL, "ORDER", {
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

  async acknowledgeOrderItem(
    facilityId: string,
    orderItemId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { facilityId },
      },
      include: {
        order: {
          include: {
            encounter: { include: { patient: true } },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    // Validate transition
    assertCanTransition(orderItem.status, OrderStatus.ACKNOWLEDGED);
    
    // Ensure department ownership: Lab can only acknowledge lab orders
    if (orderItem.catalogItemType !== "LAB_TEST") {
      throw new BadRequestException("Lab can only acknowledge lab test orders");
    }

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: OrderStatus.ACKNOWLEDGED },
    });

    await this.audit.log(AuditAction.ORDER_ACK, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
    });

    return updated;
  }

  async startOrderItem(
    facilityId: string,
    orderItemId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { facilityId },
      },
      include: {
        order: {
          include: {
            encounter: { include: { patient: true } },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    // Validate transition
    assertCanTransition(orderItem.status, OrderStatus.IN_PROGRESS);
    
    // Ensure department ownership based on catalog type
    const allowedTypes = ["LAB_TEST", "IMAGING_STUDY", "MEDICATION"];
    if (!allowedTypes.includes(orderItem.catalogItemType)) {
      throw new BadRequestException("Invalid order item type for this operation");
    }

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: OrderStatus.IN_PROGRESS },
    });

    await this.audit.log(AuditAction.ORDER_START, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
    });

    return updated;
  }

  async completeOrderItem(
    facilityId: string,
    orderItemId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { facilityId },
      },
      include: {
        order: {
          include: {
            encounter: { include: { patient: true } },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    // Validate transition
    assertCanTransition(orderItem.status, OrderStatus.COMPLETED);
    
    // Ensure department ownership based on catalog type
    const allowedTypes = ["LAB_TEST", "IMAGING_STUDY", "MEDICATION"];
    if (!allowedTypes.includes(orderItem.catalogItemType)) {
      throw new BadRequestException("Invalid order item type for this operation");
    }

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: OrderStatus.COMPLETED },
    });

    await this.audit.log(AuditAction.ORDER_COMPLETE, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
    });

    return updated;
  }
}

