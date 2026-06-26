import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  MedicationMarAction,
  MedicationOrderLifecycleStatus,
  OrderEventOrderType,
  OrderEventType,
  OrderItemLifecycleState,
  OrderPriority,
  OrderStatus,
  RoleCode,
  type Prisma,
} from "@prisma/client";
import {
  medicationOrderLifecycleAllowsEdit,
  medicationOrderLifecycleAllowsHold,
  medicationOrderLifecycleAllowsResume,
  medicationOrderLifecycleBlocksMutation,
  resolveMedicationOrderItemFrequencyCode,
  type MedicationOrderDiscontinueAndReorderDto,
  type MedicationOrderDiscontinueDto,
  type MedicationOrderEditDto,
  type MedicationOrderHoldDto,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  assertEncounterNotSigned,
  assertEncounterOpenForClinicalMutation,
} from "../encounters/encounter-sign-lock.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { isMedicationAdministerChart } from "../common/workflow/order-item-action-guards.util";
import { getMedicationSchedulingFeatureFlagsFromEnv } from "../medication-scheduling/medication-scheduling-feature-flags.util";
import { maybeCreateMedicationOrderScheduleForOrderItem } from "../medication-scheduling/medication-order-schedule.persistence";
import { expandMedicationDosesForScheduleInTransaction } from "../medication-dose/medication-dose-expansion.service";
import { cascadeMedicationOrderLifecycleInTransaction } from "./medication-order-lifecycle-cascade.util";
import { buildOrderItemCreateInput, stripUndefinedKeys } from "./orders.types";

type LifecycleOrderItemRow = {
  id: string;
  orderId: string;
  catalogItemId: string | null;
  catalogItemType: string;
  manualLabel: string | null;
  quantity: number | null;
  notes: string | null;
  strength: string | null;
  route: string | null;
  frequencyCode: string | null;
  medicationFulfillmentIntent: string | null;
  intendedAdministrationAt: Date | null;
  medicationLifecycleStatus: MedicationOrderLifecycleStatus | null;
  medicationLifecycleAt: Date | null;
  lifecycleState: OrderItemLifecycleState;
  status: OrderStatus;
  order: {
    id: string;
    encounterId: string;
    facilityId: string;
    type: string;
    status: OrderStatus;
    priority: OrderPriority;
    encounter: {
      id: string;
      status: string;
      providerDocumentationStatus: string | null;
      patientId: string;
    };
  };
};

@Injectable()
export class MedicationOrderLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async discontinueOrderItem(
    facilityId: string,
    orderItemId: string,
    dto: MedicationOrderDiscontinueDto,
    requestorRoleCodes: RoleCode[],
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const item = await this.loadMedicationOrderItem(facilityId, orderItemId);
    this.assertLifecycleMutationAllowed(item, userId, requestorRoleCodes);

    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException("Le motif est requis.");
    const effectiveAt = dto.effectiveAt ?? new Date();

    await this.assertNoActiveInfusionBlockingDiscontinue(facilityId, orderItemId);

    const previousValues = this.snapshotOrderItemValues(item);

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          medicationLifecycleStatus: "DISCONTINUED",
          medicationLifecycleAt: effectiveAt,
          medicationLifecycleByUserId: userId,
          medicationLifecycleReason: reason,
          medicationLifecycleNote: dto.note?.trim() || null,
        },
      });

      if (isMedicationAdministerChart(item)) {
        await cascadeMedicationOrderLifecycleInTransaction(tx, {
          facilityId,
          orderItemIds: [orderItemId],
          effectiveAt,
          reason,
          performedByUserId: userId,
          lifecycleStatus: "DISCONTINUED",
        });
      }

      await this.writeOrderEvent(tx, {
        facilityId,
        encounterId: item.order.encounterId,
        orderId: item.orderId,
        orderType: item.order.type,
        eventType: OrderEventType.DISCONTINUED,
        performedByUserId: userId,
        note: reason,
        metadata: {
          orderItemId,
          lifecycleStatus: "DISCONTINUED",
          effectiveAt: effectiveAt.toISOString(),
          reason,
          note: dto.note?.trim() || null,
          previousValues,
        },
      });
    });

    await this.audit.log(AuditAction.ORDER_CANCEL, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: item.order.encounter.patientId,
      encounterId: item.order.encounterId,
      orderId: item.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
      metadata: {
        lifecycleAction: "DISCONTINUED",
        reason,
        effectiveAt: effectiveAt.toISOString(),
        previousValues,
      },
    });

    return this.prisma.orderItem.findFirstOrThrow({ where: { id: orderItemId } });
  }

  async holdOrderItem(
    facilityId: string,
    orderItemId: string,
    dto: MedicationOrderHoldDto,
    requestorRoleCodes: RoleCode[],
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const item = await this.loadMedicationOrderItem(facilityId, orderItemId);
    this.assertLifecycleMutationAllowed(item, userId, requestorRoleCodes);
    const status = item.medicationLifecycleStatus ?? "ACTIVE";
    if (!medicationOrderLifecycleAllowsHold(status)) {
      throw new ConflictException("Cette ordonnance ne peut pas être suspendue.");
    }

    const reason = dto.reason.trim();
    const effectiveAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          medicationLifecycleStatus: "ON_HOLD",
          medicationLifecycleAt: effectiveAt,
          medicationLifecycleByUserId: userId,
          medicationLifecycleReason: reason,
          medicationLifecycleNote: dto.note?.trim() || null,
        },
      });

      if (isMedicationAdministerChart(item)) {
        await cascadeMedicationOrderLifecycleInTransaction(tx, {
          facilityId,
          orderItemIds: [orderItemId],
          effectiveAt,
          reason,
          performedByUserId: userId,
          lifecycleStatus: "ON_HOLD",
        });
      }

      await this.writeOrderEvent(tx, {
        facilityId,
        encounterId: item.order.encounterId,
        orderId: item.orderId,
        orderType: item.order.type,
        eventType: OrderEventType.ON_HOLD,
        performedByUserId: userId,
        note: reason,
        metadata: {
          orderItemId,
          lifecycleStatus: "ON_HOLD",
          effectiveAt: effectiveAt.toISOString(),
          reason,
          note: dto.note?.trim() || null,
        },
      });
    });

    await this.audit.log(AuditAction.ORDER_CANCEL, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: item.order.encounter.patientId,
      encounterId: item.order.encounterId,
      orderId: item.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
      metadata: { lifecycleAction: "ON_HOLD", reason },
    });

    return this.prisma.orderItem.findFirstOrThrow({ where: { id: orderItemId } });
  }

  async resumeOrderItem(
    facilityId: string,
    orderItemId: string,
    requestorRoleCodes: RoleCode[],
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const item = await this.loadMedicationOrderItem(facilityId, orderItemId);
    this.assertLifecycleMutationAllowed(item, userId, requestorRoleCodes);
    const status = item.medicationLifecycleStatus ?? "ACTIVE";
    if (!medicationOrderLifecycleAllowsResume(status)) {
      throw new ConflictException("Seules les ordonnances suspendues peuvent être reprises.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          medicationLifecycleStatus: "ACTIVE",
          medicationLifecycleAt: new Date(),
          medicationLifecycleByUserId: userId,
          medicationLifecycleReason: null,
          medicationLifecycleNote: null,
        },
      });

      await this.writeOrderEvent(tx, {
        facilityId,
        encounterId: item.order.encounterId,
        orderId: item.orderId,
        orderType: item.order.type,
        eventType: OrderEventType.RESUMED,
        performedByUserId: userId,
        metadata: { orderItemId, lifecycleStatus: "ACTIVE" },
      });
    });

    await this.audit.log(AuditAction.ORDER_CANCEL, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: item.order.encounter.patientId,
      encounterId: item.order.encounterId,
      orderId: item.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
      metadata: { lifecycleAction: "RESUMED" },
    });

    return this.prisma.orderItem.findFirstOrThrow({ where: { id: orderItemId } });
  }

  async editOrderItem(
    facilityId: string,
    orderItemId: string,
    dto: MedicationOrderEditDto,
    requestorRoleCodes: RoleCode[],
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const item = await this.loadMedicationOrderItem(facilityId, orderItemId);
    this.assertLifecycleMutationAllowed(item, userId, requestorRoleCodes);
    const status = item.medicationLifecycleStatus ?? "ACTIVE";
    if (!medicationOrderLifecycleAllowsEdit(status)) {
      throw new ConflictException("Cette ordonnance ne peut plus être modifiée.");
    }

    const adminCount = await this.countPerformedAdministrations(orderItemId);
    const previousValues = this.snapshotOrderItemValues(item);
    const effectiveAt = dto.effectiveAt ?? new Date();

    if (adminCount === 0) {
      return this.editOrderItemInPlace({
        facilityId,
        item,
        dto,
        userId,
        effectiveAt,
        previousValues,
        ip,
        userAgent,
      });
    }

    return this.editOrderItemViaSupersede({
      facilityId,
      item,
      dto,
      userId,
      effectiveAt,
      previousValues,
      requestorRoleCodes,
      ip,
      userAgent,
    });
  }

  async discontinueAndReorder(
    facilityId: string,
    orderItemId: string,
    dto: MedicationOrderDiscontinueAndReorderDto,
    requestorRoleCodes: RoleCode[],
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const item = await this.loadMedicationOrderItem(facilityId, orderItemId);
    this.assertLifecycleMutationAllowed(item, userId, requestorRoleCodes);

    const reason = dto.reason.trim();
    const effectiveAt = dto.effectiveAt ?? new Date();
    await this.assertNoActiveInfusionBlockingDiscontinue(facilityId, orderItemId);

    const previousValues = this.snapshotOrderItemValues(item);
    const replacementInput = buildOrderItemCreateInput(
      {
        catalogItemType: "MEDICATION",
        catalogItemId: dto.replacement.catalogItemId ?? item.catalogItemId ?? undefined,
        manualLabel: dto.replacement.manualLabel ?? item.manualLabel ?? undefined,
        quantity: dto.replacement.quantity ?? item.quantity ?? undefined,
        strength: dto.replacement.strength ?? item.strength ?? undefined,
        route: (dto.replacement.route ?? item.route ?? undefined) as never,
        frequencyCode: resolveMedicationOrderItemFrequencyCode({
          frequencyCode: dto.replacement.frequencyCode ?? item.frequencyCode ?? undefined,
          directionsSig: dto.replacement.notes ?? item.notes ?? undefined,
        }) as never,
        notes: dto.replacement.notes ?? item.notes ?? undefined,
        medicationFulfillmentIntent:
          dto.replacement.medicationFulfillmentIntent ??
          (item.medicationFulfillmentIntent as "ADMINISTER_CHART" | "PHARMACY_DISPENSE" | undefined) ??
          "ADMINISTER_CHART",
        intendedAdministrationAt:
          dto.replacement.intendedAdministrationAt ?? item.intendedAdministrationAt ?? undefined,
      },
      "MEDICATION"
    );

    const replacement = await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          medicationLifecycleStatus: "SUPERSEDED",
          medicationLifecycleAt: effectiveAt,
          medicationLifecycleByUserId: userId,
          medicationLifecycleReason: reason,
          medicationLifecycleNote: dto.note?.trim() || null,
        },
      });

      if (isMedicationAdministerChart(item)) {
        await cascadeMedicationOrderLifecycleInTransaction(tx, {
          facilityId,
          orderItemIds: [orderItemId],
          effectiveAt,
          reason,
          performedByUserId: userId,
          lifecycleStatus: "SUPERSEDED",
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          facilityId,
          encounterId: item.order.encounterId,
          patientId: item.order.encounter.patientId,
          type: "MEDICATION",
          status: OrderStatus.PLACED,
          priority: item.order.priority,
          orderedBy: userId,
          items: {
            create: [
              stripUndefinedKeys({
                ...replacementInput,
                status: OrderStatus.PLACED,
                lifecycleState: OrderItemLifecycleState.ORDERED,
                medicationLifecycleStatus: "ACTIVE" as MedicationOrderLifecycleStatus,
                replacesOrderItemId: orderItemId,
              }),
            ],
          },
        },
        include: { items: true },
      });

      const replacementItem = createdOrder.items[0];
      if (!replacementItem) {
        throw new BadRequestException("Impossible de créer l'ordonnance de remplacement.");
      }

      await this.persistScheduleForItem(tx, {
        facilityId,
        encounterId: item.order.encounterId,
        orderId: createdOrder.id,
        orderItem: replacementItem,
        userId,
      });

      await this.writeOrderEvent(tx, {
        facilityId,
        encounterId: item.order.encounterId,
        orderId: item.orderId,
        orderType: item.order.type,
        eventType: OrderEventType.SUPERSEDED,
        performedByUserId: userId,
        note: reason,
        metadata: {
          orderItemId,
          replacementOrderItemId: replacementItem.id,
          replacementOrderId: createdOrder.id,
          effectiveAt: effectiveAt.toISOString(),
          reason,
          previousValues,
          newValues: this.snapshotOrderItemValues(replacementItem),
        },
      });

      await this.writeOrderEvent(tx, {
        facilityId,
        encounterId: item.order.encounterId,
        orderId: createdOrder.id,
        orderType: "MEDICATION",
        eventType: OrderEventType.CREATED,
        performedByUserId: userId,
        metadata: {
          lifecycleAction: "DISCONTINUE_AND_REORDER",
          replacesOrderItemId: orderItemId,
          previousOrderItemId: orderItemId,
        },
      });

      return replacementItem;
    });

    await this.audit.log(AuditAction.ORDER_CANCEL, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: item.order.encounter.patientId,
      encounterId: item.order.encounterId,
      orderId: item.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
      metadata: {
        lifecycleAction: "DISCONTINUE_AND_REORDER",
        replacementOrderItemId: replacement.id,
        reason,
      },
    });

    return { previousOrderItemId: orderItemId, replacementOrderItem: replacement };
  }

  private async editOrderItemInPlace(input: {
    facilityId: string;
    item: LifecycleOrderItemRow;
    dto: MedicationOrderEditDto;
    userId: string;
    effectiveAt: Date;
    previousValues: Prisma.InputJsonValue;
    ip?: string;
    userAgent?: string;
  }) {
    const patch = this.buildEditPatch(input.dto, input.item);
    const orderItemId = input.item.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          ...patch,
          medicationLifecycleStatus: "ACTIVE",
          medicationLifecycleAt: input.effectiveAt,
          medicationLifecycleByUserId: input.userId,
          medicationLifecycleReason: input.dto.reason,
          medicationLifecycleNote: input.dto.note?.trim() || null,
        },
      });

      if (isMedicationAdministerChart(input.item) && patch.frequencyCode) {
        await tx.medicationOrderSchedule.updateMany({
          where: {
            facilityId: input.facilityId,
            orderItemId,
            scheduleStatus: { notIn: ["CANCELLED", "SUPERSEDED"] },
          },
          data: {
            scheduleStatus: "CANCELLED",
            cancelledAt: input.effectiveAt,
            cancelledByUserId: input.userId,
            cancelReason: input.dto.reason,
          },
        });

        const updated = await tx.orderItem.findFirstOrThrow({ where: { id: orderItemId } });
        await this.persistScheduleForItem(tx, {
          facilityId: input.facilityId,
          encounterId: input.item.order.encounterId,
          orderId: input.item.orderId,
          orderItem: updated,
          userId: input.userId,
        });
      }

      await this.writeOrderEvent(tx, {
        facilityId: input.facilityId,
        encounterId: input.item.order.encounterId,
        orderId: input.item.orderId,
        orderType: input.item.order.type,
        eventType: OrderEventType.MODIFIED,
        performedByUserId: input.userId,
        note: input.dto.reason,
        metadata: {
          orderItemId,
          lifecycleAction: "EDIT_IN_PLACE",
          previousValues: input.previousValues,
          newValues: this.snapshotOrderItemValues({
            ...input.item,
            ...patch,
          }),
          effectiveAt: input.effectiveAt.toISOString(),
        },
      });
    });

    await this.audit.log(AuditAction.ORDER_CANCEL, "ORDER_ITEM", {
      userId: input.userId,
      facilityId: input.facilityId,
      patientId: input.item.order.encounter.patientId,
      encounterId: input.item.order.encounterId,
      orderId: input.item.orderId,
      entityId: orderItemId,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: { lifecycleAction: "EDIT_IN_PLACE", previousValues: input.previousValues },
    });

    return this.prisma.orderItem.findFirstOrThrow({ where: { id: orderItemId } });
  }

  private async editOrderItemViaSupersede(input: {
    facilityId: string;
    item: LifecycleOrderItemRow;
    dto: MedicationOrderEditDto;
    userId: string;
    effectiveAt: Date;
    previousValues: Prisma.InputJsonValue;
    requestorRoleCodes: RoleCode[];
    ip?: string;
    userAgent?: string;
  }) {
    const replacementDto: MedicationOrderDiscontinueAndReorderDto = {
      reason: input.dto.reason,
      note: input.dto.note,
      effectiveAt: input.effectiveAt,
      replacement: {
        catalogItemId: input.item.catalogItemId ?? undefined,
        manualLabel: input.item.manualLabel ?? undefined,
        quantity: input.item.quantity ?? undefined,
        strength: input.dto.strength ?? input.item.strength ?? undefined,
        route: input.dto.route ?? input.item.route ?? undefined,
        frequencyCode: input.dto.frequencyCode ?? input.item.frequencyCode ?? undefined,
        notes: input.dto.notes ?? input.item.notes ?? undefined,
        medicationFulfillmentIntent:
          (input.item.medicationFulfillmentIntent as "ADMINISTER_CHART" | "PHARMACY_DISPENSE" | undefined) ??
          "ADMINISTER_CHART",
        intendedAdministrationAt:
          input.dto.intendedAdministrationAt ?? input.item.intendedAdministrationAt ?? undefined,
      },
    };

    const result = await this.discontinueAndReorder(
      input.facilityId,
      input.item.id,
      replacementDto,
      input.requestorRoleCodes,
      input.userId,
      input.ip,
      input.userAgent
    );

    await this.prisma.$transaction(async (tx) => {
      await this.writeOrderEvent(tx, {
        facilityId: input.facilityId,
        encounterId: input.item.order.encounterId,
        orderId: input.item.orderId,
        orderType: input.item.order.type,
        eventType: OrderEventType.MODIFIED,
        performedByUserId: input.userId,
        note: input.dto.reason,
        metadata: {
          orderItemId: input.item.id,
          lifecycleAction: "EDIT_SUPERSEDED",
          replacementOrderItemId: result.replacementOrderItem.id,
          previousValues: input.previousValues,
        },
      });
    });

    return result.replacementOrderItem;
  }

  private buildEditPatch(dto: MedicationOrderEditDto, item: LifecycleOrderItemRow) {
    const resolvedFrequency = dto.frequencyCode
      ? resolveMedicationOrderItemFrequencyCode({
          frequencyCode: dto.frequencyCode,
          directionsSig: dto.notes ?? item.notes,
        })
      : undefined;
    return stripUndefinedKeys({
      ...(dto.strength !== undefined ? { strength: dto.strength.trim() || null } : {}),
      ...(dto.route !== undefined ? { route: dto.route.trim() || null } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      ...(resolvedFrequency ? { frequencyCode: resolvedFrequency } : {}),
      ...(dto.intendedAdministrationAt !== undefined
        ? { intendedAdministrationAt: dto.intendedAdministrationAt }
        : {}),
    });
  }

  private async persistScheduleForItem(
    tx: Prisma.TransactionClient,
    input: {
      facilityId: string;
      encounterId: string;
      orderId: string;
      orderItem: {
        id: string;
        catalogItemId: string | null;
        frequencyCode: string | null;
        route: string | null;
        manualLabel: string | null;
      };
      userId: string;
    }
  ) {
    const catalog =
      input.orderItem.catalogItemId != null
        ? await tx.catalogMedication.findFirst({
            where: { id: input.orderItem.catalogItemId },
            select: {
              id: true,
              code: true,
              genericName: true,
              therapeuticClass: true,
              administrationType: true,
              displayNameEn: true,
              displayNameFr: true,
              requiresDoubleSign: true,
              route: true,
              name: true,
            },
          })
        : null;

    const scheduleResult = await maybeCreateMedicationOrderScheduleForOrderItem(tx, {
      facilityId: input.facilityId,
      encounterId: input.encounterId,
      orderId: input.orderId,
      orderItemId: input.orderItem.id,
      frequencyCode: input.orderItem.frequencyCode,
      route: input.orderItem.route,
      manualLabel: input.orderItem.manualLabel,
      catalogMedication: catalog,
      createdByUserId: input.userId,
      featureFlags: getMedicationSchedulingFeatureFlagsFromEnv(),
    });

    if (scheduleResult.created && scheduleResult.scheduleId) {
      await expandMedicationDosesForScheduleInTransaction(tx, {
        medicationOrderScheduleId: scheduleResult.scheduleId,
        featureFlags: getMedicationSchedulingFeatureFlagsFromEnv(),
      });
    }
  }

  private async loadMedicationOrderItem(
    facilityId: string,
    orderItemId: string
  ): Promise<LifecycleOrderItemRow> {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      include: {
        order: {
          include: {
            encounter: {
              select: {
                id: true,
                status: true,
                providerDocumentationStatus: true,
                patientId: true,
              },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException("Order item not found");
    if (item.catalogItemType !== "MEDICATION") {
      throw new BadRequestException("Seules les lignes médicament supportent ce flux.");
    }
    return item as LifecycleOrderItemRow;
  }

  private assertLifecycleMutationAllowed(
    item: LifecycleOrderItemRow,
    userId: string,
    requestorRoleCodes: RoleCode[]
  ) {
    if (!userId) throw new ForbiddenException("Authentification requise.");
    if (!requestorRoleCodes.some((r) => r === "PROVIDER" || r === "ADMIN")) {
      throw new ForbiddenException("Seul un prescripteur peut modifier l'ordonnance.");
    }
    if (item.order.encounter.status !== "OPEN") {
      throw new BadRequestException("La visite doit être ouverte.");
    }
    assertEncounterOpenForClinicalMutation(item.order.encounter);
    assertEncounterNotSigned(item.order.encounter);
    assertParentOrderNotCancelled(item.order.status);
    const lifecycle = item.medicationLifecycleStatus ?? "ACTIVE";
    if (medicationOrderLifecycleBlocksMutation(lifecycle)) {
      throw new ConflictException("Cette ordonnance est déjà arrêtée.");
    }
  }

  private async assertNoActiveInfusionBlockingDiscontinue(
    facilityId: string,
    orderItemId: string
  ) {
    const active = await this.prisma.medicationDoseInstance.findFirst({
      where: {
        facilityId,
        orderItemId,
        doseStatus: "IN_PROGRESS",
        infusionSessionId: { not: null },
      },
      select: { id: true },
    });
    if (active) {
      throw new ConflictException(
        "Une perfusion est en cours. Arrêtez la perfusion avant d'arrêter l'ordonnance."
      );
    }
  }

  private async countPerformedAdministrations(orderItemId: string): Promise<number> {
    return this.prisma.medicationAdministration.count({
      where: {
        orderItemId,
        OR: [
          { marAction: MedicationMarAction.administered },
          { marAction: MedicationMarAction.md_changed },
          { infusionPhase: "INFUSION_START" },
        ],
      },
    });
  }

  private snapshotOrderItemValues(item: {
    frequencyCode?: string | null;
    strength?: string | null;
    route?: string | null;
    notes?: string | null;
    quantity?: number | null;
    intendedAdministrationAt?: Date | null;
  }): Prisma.InputJsonValue {
    return {
      frequencyCode: item.frequencyCode ?? null,
      strength: item.strength ?? null,
      route: item.route ?? null,
      notes: item.notes ?? null,
      quantity: item.quantity ?? null,
      intendedAdministrationAt: item.intendedAdministrationAt?.toISOString() ?? null,
    };
  }

  private async writeOrderEvent(
    tx: Prisma.TransactionClient,
    input: {
      facilityId: string;
      encounterId: string;
      orderId: string;
      orderType: string;
      eventType: OrderEventType;
      performedByUserId: string;
      note?: string;
      metadata?: Prisma.InputJsonValue;
    }
  ) {
    await tx.orderEvent.create({
      data: {
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        orderId: input.orderId,
        orderType: input.orderType as OrderEventOrderType,
        eventType: input.eventType,
        performedByUserId: input.performedByUserId,
        performedAt: new Date(),
        roleSnapshot: "PROVIDER",
        note: input.note?.trim() || undefined,
        metadata: input.metadata,
      },
    });
  }
}
