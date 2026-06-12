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
  CONTINUOUS_FLUID_INFUSION_SCOPE,
  computeFluidVolumeFromSession,
  isContinuousFluidOrder,
  isFluidBolusOrder,
  resolveContinuousFluidSessionFromEvents,
  resolveFluidRate,
  validateContinuousFluidTransition,
  validateFluidVolumeNonNegative,
  type ContinuousFluidPauseResumeDto,
  type ContinuousFluidStartDto,
  type ContinuousFluidStopDto,
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
export class OrdersContinuousFluidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly medicationAdministration: MedicationAdministrationService
  ) {}

  private async loadFluidOrderItem(facilityId: string, orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      include: {
        order: { include: { encounter: { include: { patient: true } } } },
      },
    });
    if (!orderItem) throw new NotFoundException("Order item not found");
    return orderItem;
  }

  private assertFluidOrderEligible(
    orderItem: Awaited<ReturnType<typeof this.loadFluidOrderItem>>,
    catalogLabel: string | null,
    genericName: string | null
  ) {
    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    if (orderItem.catalogItemType !== "MEDICATION") {
      throw new BadRequestException("Seules les lignes de médicament supportent les fluides IV.");
    }
    if (!isMedicationAdministerChart(orderItem)) {
      throw new BadRequestException(
        "Les fluides IV continus concernent uniquement les médicaments administrés au lit."
      );
    }
    const fluidInput = {
      medicationLabel: catalogLabel ?? orderItem.manualLabel,
      genericName,
      directionsSig: orderItem.notes,
      route: orderItem.route,
    };
    if (isFluidBolusOrder(fluidInput)) {
      throw new BadRequestException("Utilisez l'administration bolus standard pour ce fluide.");
    }
    if (!isContinuousFluidOrder(fluidInput)) {
      throw new BadRequestException("Cette ligne n'est pas un fluide IV continu éligible.");
    }
  }

  private async fluidSessionSnapshot(orderId: string, orderItemId: string) {
    const events = await this.prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { performedAt: "asc" },
      select: { metadata: true },
    });
    return resolveContinuousFluidSessionFromEvents(orderItemId, events);
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

  private async writeFluidEvent(input: {
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

  async startContinuousFluid(
    facilityId: string,
    orderItemId: string,
    dto: ContinuousFluidStartDto,
    requestorRoleCodes: RoleCode[],
    userId?: string
  ) {
    const orderItem = await this.loadFluidOrderItem(facilityId, orderItemId);
    const catalog = resolveOrderMedicationCatalogRow(
      orderItem,
      await loadOrderMedicationCatalogMaps(this.prisma, [orderItem])
    );
    this.assertFluidOrderEligible(
      orderItem,
      catalog?.displayNameFr ?? catalog?.name ?? null,
      catalog?.genericName ?? null
    );
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    if (!userId) throw new ForbiddenException("Authentification requise.");

    const session = await this.fluidSessionSnapshot(orderItem.orderId, orderItemId);
    const validation = validateContinuousFluidTransition({
      current: session.status,
      action: "START",
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
            lifecycleState: applyLifecycleWithStatus(orderItem.lifecycleState, OrderStatus.IN_PROGRESS),
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
      await this.writeFluidEvent({
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        userId,
        eventType: OrderEventType.STARTED,
        metadata: {
          infusionScope: CONTINUOUS_FLUID_INFUSION_SCOPE,
          fluidAction: "START",
          fluidSessionKey,
          fluidActionAt: startedAt.toISOString(),
          orderItemId,
          performedByUserId: userId,
          ...(dto.bagSizeMl ? { bagSizeMl: dto.bagSizeMl } : {}),
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
      metadata: { fluidSessionKey, medicationAdministrationId: marRow.id },
    });

    const refreshedSession = await this.fluidSessionSnapshot(orderItem.orderId, orderItemId);
    const rate = resolveFluidRate(orderItem.notes);
    return {
      status: refreshedSession.status,
      fluidSessionKey,
      startedAt: startedAt.toISOString(),
      volumeInfusedMl: computeFluidVolumeFromSession({
        session: refreshedSession,
        rate,
        asOf: new Date().toISOString(),
      }),
      medicationAdministrationId: marRow.id,
    };
  }

  async pauseContinuousFluid(
    facilityId: string,
    orderItemId: string,
    dto: ContinuousFluidPauseResumeDto,
    requestorRoleCodes: RoleCode[],
    userId?: string
  ) {
    return this.writeFluidLifecycleAction(
      facilityId,
      orderItemId,
      "PAUSE",
      dto,
      requestorRoleCodes,
      userId
    );
  }

  async resumeContinuousFluid(
    facilityId: string,
    orderItemId: string,
    dto: ContinuousFluidPauseResumeDto,
    requestorRoleCodes: RoleCode[],
    userId?: string
  ) {
    return this.writeFluidLifecycleAction(
      facilityId,
      orderItemId,
      "RESUME",
      dto,
      requestorRoleCodes,
      userId
    );
  }

  private async writeFluidLifecycleAction(
    facilityId: string,
    orderItemId: string,
    action: "PAUSE" | "RESUME",
    dto: ContinuousFluidPauseResumeDto,
    requestorRoleCodes: RoleCode[],
    userId?: string
  ) {
    const orderItem = await this.loadFluidOrderItem(facilityId, orderItemId);
    const catalog = resolveOrderMedicationCatalogRow(
      orderItem,
      await loadOrderMedicationCatalogMaps(this.prisma, [orderItem])
    );
    this.assertFluidOrderEligible(
      orderItem,
      catalog?.displayNameFr ?? catalog?.name ?? null,
      catalog?.genericName ?? null
    );
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    if (!userId) throw new ForbiddenException("Authentification requise.");

    const session = await this.fluidSessionSnapshot(orderItem.orderId, orderItemId);
    const validation = validateContinuousFluidTransition({ current: session.status, action });
    if (validation) throw new BadRequestException(validation.message);

    const actionAt = dto.actionAt ?? new Date();
    if (Number.isNaN(actionAt.getTime())) {
      throw new BadRequestException("Horodatage invalide.");
    }

    await this.writeFluidEvent({
      facilityId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      orderType: orderItem.order.type,
      userId,
      eventType: OrderEventType.STARTED,
      metadata: {
        infusionScope: CONTINUOUS_FLUID_INFUSION_SCOPE,
        fluidAction: action,
        fluidSessionKey: session.sessionKey,
        fluidActionAt: actionAt.toISOString(),
        orderItemId,
        performedByUserId: userId,
        ...(dto.notes?.trim() ? { note: dto.notes.trim() } : {}),
      },
    });

    const refreshedSession = await this.fluidSessionSnapshot(orderItem.orderId, orderItemId);
    const rate = resolveFluidRate(orderItem.notes);
    return {
      status: refreshedSession.status,
      fluidSessionKey: refreshedSession.sessionKey,
      actionAt: actionAt.toISOString(),
      volumeInfusedMl: computeFluidVolumeFromSession({
        session: refreshedSession,
        rate,
        asOf: new Date().toISOString(),
      }),
    };
  }

  async stopContinuousFluid(
    facilityId: string,
    orderItemId: string,
    dto: ContinuousFluidStopDto,
    requestorRoleCodes: RoleCode[],
    userId?: string
  ) {
    const orderItem = await this.loadFluidOrderItem(facilityId, orderItemId);
    const catalog = resolveOrderMedicationCatalogRow(
      orderItem,
      await loadOrderMedicationCatalogMaps(this.prisma, [orderItem])
    );
    this.assertFluidOrderEligible(
      orderItem,
      catalog?.displayNameFr ?? catalog?.name ?? null,
      catalog?.genericName ?? null
    );
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    if (!userId) throw new ForbiddenException("Authentification requise.");

    const session = await this.fluidSessionSnapshot(orderItem.orderId, orderItemId);
    const stoppedAt = dto.stoppedAt ?? new Date();
    const validation = validateContinuousFluidTransition({
      current: session.status,
      action: "STOP",
      startedAt: session.startedAt,
      proposedAt: stoppedAt,
    });
    if (validation) throw new BadRequestException(validation.message);

    const rate = resolveFluidRate(orderItem.notes);
    const volumeInfusedMl = computeFluidVolumeFromSession({
      session: { ...session, stoppedAt: stoppedAt.toISOString(), status: "COMPLETED" },
      rate,
      asOf: stoppedAt.toISOString(),
    });
    if (!validateFluidVolumeNonNegative(volumeInfusedMl)) {
      throw new BadRequestException("Volume infusé invalide.");
    }

    const durationMs =
      session.startedAt && !Number.isNaN(stoppedAt.getTime())
        ? Math.max(0, stoppedAt.getTime() - new Date(session.startedAt).getTime())
        : 0;
    const durationLabel = formatFluidDurationShort(durationMs);
    const autoNote = `Perfusion fluide terminée — durée : ${durationLabel} — volume : ${volumeInfusedMl} mL`;
    const notesCombined = [autoNote, dto.notes?.trim()].filter(Boolean).join("\n\n");

    const marRow = await this.medicationAdministration.create(
      orderItem.order.encounterId,
      facilityId,
      userId,
      {
        orderItemId,
        marAction: "administered",
        administeredAt: stoppedAt,
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
          lifecycleState: applyLifecycleWithStatus(orderItem.lifecycleState, OrderStatus.COMPLETED),
        },
      });
    }

    await this.writeFluidEvent({
      facilityId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      orderType: orderItem.order.type,
      userId,
      eventType: OrderEventType.COMPLETED,
      metadata: {
        infusionScope: CONTINUOUS_FLUID_INFUSION_SCOPE,
        fluidAction: "STOP",
        fluidSessionKey: session.sessionKey,
        fluidActionAt: stoppedAt.toISOString(),
        infusionStoppedAt: stoppedAt.toISOString(),
        orderItemId,
        performedByUserId: userId,
        volumeInfusedMl,
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
        data: { status: "STOPPED", stoppedAt },
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
      metadata: { volumeInfusedMl, medicationAdministrationId: marRow.id },
    });

    return {
      status: "COMPLETED" as const,
      startedAt: session.startedAt,
      stoppedAt: stoppedAt.toISOString(),
      volumeInfusedMl,
      medicationAdministrationId: marRow.id,
    };
  }
}
