import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  OrderEventOrderType,
  OrderEventType,
  OrderStatus,
  RoleCode,
  type Prisma,
} from "@prisma/client";
import {
  FLUID_BOLUS_INFUSION_SCOPE,
  isFluidBolusOrder,
  parseFluidBagSizeMl,
  resolveFluidBolusSessionFromEvents,
  validateFluidBolusTransition,
  type FluidBolusCompleteDto,
  type FluidBolusStartDto,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MedicationAdministrationService } from "../medication-administration/medication-administration.service";
import {
  assertEncounterNotSigned,
  assertEncounterOpenForClinicalMutation,
} from "../encounters/encounter-sign-lock.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import {
  assertAckOrStartActor,
  isMedicationAdministerChart,
} from "../common/workflow/order-item-action-guards.util";
import { assertCanTransition } from "../common/workflow/status.transitions";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";
import { stripUndefinedDeep } from "./orders.types";
import {
  loadOrderMedicationCatalogMaps,
  resolveOrderMedicationCatalogRow,
} from "./order-medication-catalog-resolve.util";
import { formatFluidDurationShort } from "@medora/shared";

@Injectable()
export class OrdersFluidBolusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly medicationAdministration: MedicationAdministrationService
  ) {}

  private async loadOrderItem(facilityId: string, orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      include: {
        order: { include: { encounter: { include: { patient: true } } } },
      },
    });
    if (!orderItem) throw new NotFoundException("Order item not found");
    return orderItem;
  }

  private assertBolusEligible(
    orderItem: Awaited<ReturnType<typeof this.loadOrderItem>>,
    catalogLabel: string | null
  ) {
    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    if (orderItem.catalogItemType !== "MEDICATION") {
      throw new BadRequestException("Seules les lignes de médicament supportent les bolus IV.");
    }
    if (!isMedicationAdministerChart(orderItem)) {
      throw new BadRequestException(
        "Les bolus IV concernent uniquement les médicaments administrés au lit."
      );
    }
    const fluidInput = {
      medicationLabel: catalogLabel ?? orderItem.manualLabel,
      directionsSig: orderItem.notes,
      route: orderItem.route,
    };
    if (!isFluidBolusOrder(fluidInput)) {
      throw new BadRequestException("Cette ligne n'est pas un bolus IV éligible.");
    }
  }

  private async bolusSessionSnapshot(orderId: string, orderItemId: string, directionsSig: string | null) {
    const events = await this.prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { performedAt: "asc" },
      select: { metadata: true },
    });
    return resolveFluidBolusSessionFromEvents(orderItemId, events, directionsSig);
  }

  private mapOrderTypeToEventOrderType(orderType: string): OrderEventOrderType {
    if (orderType === "LAB") return OrderEventOrderType.LAB;
    if (orderType === "IMAGING") return OrderEventOrderType.IMAGING;
    if (orderType === "MEDICATION") return OrderEventOrderType.MEDICATION;
    if (orderType === "CARE") return OrderEventOrderType.PROCEDURE;
    throw new BadRequestException("Type de commande invalide pour audit.");
  }

  private async buildRoleSnapshot(
    facilityId: string,
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<string> {
    const db = tx ?? this.prisma;
    const roles = await db.userRole.findMany({
      where: { facilityId, userId, isActive: true },
      include: { role: { select: { code: true } } },
    });
    const codes = roles.flatMap((r) => (r.role ? [r.role.code] : []));
    const unique = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
    if (unique.length === 0) return "UNKNOWN";
    return unique.join("|");
  }

  private async writeBolusEvent(input: {
    facilityId: string;
    encounterId: string;
    orderId: string;
    orderType: string;
    userId: string;
    eventType: OrderEventType;
    metadata: Record<string, unknown>;
    tx?: Prisma.TransactionClient;
  }) {
    const client = input.tx ?? this.prisma;
    const roleSnapshot = await this.buildRoleSnapshot(
      input.facilityId,
      input.userId,
      input.tx
    );
    await client.orderEvent.create({
      data: {
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        orderId: input.orderId,
        orderType: this.mapOrderTypeToEventOrderType(input.orderType),
        eventType: input.eventType,
        performedByUserId: input.userId,
        performedAt: new Date(),
        roleSnapshot,
        metadata: stripUndefinedDeep(input.metadata) as Prisma.InputJsonValue,
      },
    });
  }

  async startFluidBolus(
    facilityId: string,
    orderItemId: string,
    dto: FluidBolusStartDto,
    requestorRoleCodes: RoleCode[],
    userId?: string
  ) {
    const orderItem = await this.loadOrderItem(facilityId, orderItemId);
    const catalog = resolveOrderMedicationCatalogRow(
      orderItem,
      await loadOrderMedicationCatalogMaps(this.prisma, [orderItem])
    );
    const catalogLabel = catalog?.displayNameFr ?? catalog?.name ?? null;
    this.assertBolusEligible(orderItem, catalogLabel);
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    if (!userId) throw new ForbiddenException("Authentification requise.");

    const directionsSig = orderItem.notes?.trim() || null;
    const bolusVolumeMl =
      dto.bolusVolumeMl ?? parseFluidBagSizeMl(directionsSig) ?? null;
    const session = await this.bolusSessionSnapshot(
      orderItem.orderId,
      orderItemId,
      directionsSig
    );
    const validation = validateFluidBolusTransition({
      current: session.status,
      action: "START_BOLUS",
      bolusVolumeMl,
    });
    if (validation) throw new BadRequestException(validation.message);

    const fluidSessionKey = randomUUID();
    const startedAt = dto.startedAt ?? new Date();
    if (Number.isNaN(startedAt.getTime())) {
      throw new BadRequestException("Heure de début invalide.");
    }

    await this.prisma.$transaction(async (tx) => {
      if (orderItem.status !== OrderStatus.IN_PROGRESS) {
        assertCanTransition(orderItem.status, OrderStatus.IN_PROGRESS);
        await tx.orderItem.update({
          where: { id: orderItemId },
          data: {
            status: OrderStatus.IN_PROGRESS,
            lifecycleState: applyLifecycleWithStatus(
              orderItem.lifecycleState,
              OrderStatus.IN_PROGRESS
            ),
          },
        });
      }
      await tx.infusionSession.create({
        data: {
          encounterId: orderItem.order.encounterId,
          facilityId,
          orderItemId,
          legacyInfusionSessionKey: fluidSessionKey,
          status: "IN_PROGRESS",
          startedAt,
        },
      });
      await this.writeBolusEvent({
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        userId,
        eventType: OrderEventType.STARTED,
        metadata: {
          infusionScope: FLUID_BOLUS_INFUSION_SCOPE,
          fluidAction: "START_BOLUS",
          fluidSessionKey,
          fluidActionAt: startedAt.toISOString(),
          orderItemId,
          bolusVolumeMl,
          performedByUserId: userId,
          ...(dto.notes?.trim() ? { note: dto.notes.trim() } : {}),
        },
        tx,
      });
    });

    const marRow = await this.medicationAdministration.createInfusionStartMar(
      orderItem.order.encounterId,
      facilityId,
      userId,
      {
        orderItemId,
        infusionSessionKey: fluidSessionKey,
        startedAt,
        route: orderItem.route?.trim() || "IV",
        notes: dto.notes,
      }
    );

    await this.audit.log(AuditAction.ORDER_START, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItemId,
      critical: true,
      metadata: { fluidSessionKey, bolusVolumeMl, medicationAdministrationId: marRow.id },
    });

    const refreshed = await this.bolusSessionSnapshot(
      orderItem.orderId,
      orderItemId,
      directionsSig
    );
    return {
      status: refreshed.status,
      fluidSessionKey,
      startedAt: startedAt.toISOString(),
      bolusVolumeMl,
      medicationAdministrationId: marRow.id,
    };
  }

  async completeFluidBolus(
    facilityId: string,
    orderItemId: string,
    dto: FluidBolusCompleteDto,
    requestorRoleCodes: RoleCode[],
    userId?: string
  ) {
    const orderItem = await this.loadOrderItem(facilityId, orderItemId);
    const catalog = resolveOrderMedicationCatalogRow(
      orderItem,
      await loadOrderMedicationCatalogMaps(this.prisma, [orderItem])
    );
    const catalogLabel = catalog?.displayNameFr ?? catalog?.name ?? null;
    this.assertBolusEligible(orderItem, catalogLabel);
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    if (!userId) throw new ForbiddenException("Authentification requise.");

    const directionsSig = orderItem.notes?.trim() || null;
    const session = await this.bolusSessionSnapshot(
      orderItem.orderId,
      orderItemId,
      directionsSig
    );
    const completedAt = dto.completedAt ?? new Date();
    const validation = validateFluidBolusTransition({
      current: session.status,
      action: "COMPLETE_BOLUS",
      startedAt: session.startedAt,
      proposedAt: completedAt,
    });
    if (validation) throw new BadRequestException(validation.message);

    const bolusVolumeMl = session.bolusVolumeMl ?? parseFluidBagSizeMl(directionsSig);
    const durationMs =
      session.startedAt && !Number.isNaN(completedAt.getTime())
        ? Math.max(
            0,
            completedAt.getTime() - new Date(session.startedAt).getTime()
          )
        : 0;
    const durationLabel = formatFluidDurationShort(durationMs);
    const autoNote = `Bolus IV terminé — durée : ${durationLabel} — volume : ${bolusVolumeMl ?? "?"} mL`;
    const notesCombined = [autoNote, dto.notes?.trim()].filter(Boolean).join("\n\n");

    const marRow = await this.medicationAdministration.create(
      orderItem.order.encounterId,
      facilityId,
      userId,
      {
        orderItemId,
        marAction: "administered",
        administeredAt: completedAt,
        route: orderItem.route?.trim() || "IV",
        notes: notesCombined,
      },
      {
        allowAdministeredForInfusionTerminal: true,
        skipAutoMedicationCatalogBilling: true,
        skipDuplicateAdministeredWindowCheck: true,
        infusionMar: {
          infusionSessionKey: session.sessionKey ?? "",
          infusionPhase: "INFUSION_STOP",
        },
      }
    );

    if (orderItem.status !== OrderStatus.COMPLETED) {
      assertCanTransition(orderItem.status, OrderStatus.COMPLETED);
      await this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: OrderStatus.COMPLETED,
          lifecycleState: applyLifecycleWithStatus(
            orderItem.lifecycleState,
            OrderStatus.COMPLETED
          ),
        },
      });
    }

    await this.writeBolusEvent({
      facilityId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      orderType: orderItem.order.type,
      userId,
      eventType: OrderEventType.COMPLETED,
      metadata: {
        infusionScope: FLUID_BOLUS_INFUSION_SCOPE,
        fluidAction: "COMPLETE_BOLUS",
        fluidSessionKey: session.sessionKey,
        fluidActionAt: completedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        orderItemId,
        bolusVolumeMl,
        volumeInfusedMl: bolusVolumeMl,
        performedByUserId: userId,
        ...(dto.notes?.trim() ? { note: dto.notes.trim() } : {}),
      },
    });

    if (session.sessionKey) {
      await this.prisma.infusionSession.updateMany({
        where: {
          facilityId,
          orderItemId,
          legacyInfusionSessionKey: session.sessionKey,
          status: "IN_PROGRESS",
        },
        data: { status: "STOPPED", stoppedAt: completedAt },
      });
    }

    await this.audit.log(AuditAction.ORDER_COMPLETE, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItemId,
      critical: true,
      metadata: { bolusVolumeMl, medicationAdministrationId: marRow.id },
    });

    return {
      status: "COMPLETED" as const,
      startedAt: session.startedAt,
      completedAt: completedAt.toISOString(),
      bolusVolumeMl,
      volumeInfusedMl: bolusVolumeMl,
      medicationAdministrationId: marRow.id,
    };
  }
}
