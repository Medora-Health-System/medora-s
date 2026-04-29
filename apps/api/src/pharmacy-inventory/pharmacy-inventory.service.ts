import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MedicationCatalogService } from "../medication-catalog/medication-catalog.service";
import {
  AuditAction,
  MedicationFulfillmentIntent,
  OrderEventOrderType,
  OrderEventType,
  OrderStatus,
  type Prisma,
} from "@prisma/client";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";
import type {
  CreateInventoryItemDto,
  ReceiveStockDto,
  AdjustStockDto,
  DispenseMedicationDto,
  ListInventoryFiltersDto,
  RecordOrderDispenseDto,
} from "./dto";
import { buildMedicationDispenseCandidate, normalizeNdc } from "@medora/shared";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";

const inventoryItemInclude = {
  catalogMedication: {
    select: {
      id: true,
      code: true,
      name: true,
      displayNameFr: true,
      genericName: true,
      strength: true,
      dosageForm: true,
      route: true,
    },
  },
  facility: { select: { id: true, code: true, name: true } },
};

@Injectable()
export class PharmacyInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly catalogUsage: MedicationCatalogService
  ) {}

  private async buildRoleSnapshotTx(
    tx: Prisma.TransactionClient,
    facilityId: string,
    userId: string
  ): Promise<string> {
    const roles = await tx.userRole.findMany({
      where: { facilityId, userId, isActive: true },
      include: { role: { select: { code: true } } },
    });
    const unique = [...new Set(roles.map((r) => r.role.code))];
    return unique.length > 0 ? unique.join("|") : "UNKNOWN";
  }

  async listCatalogMedications() {
    return this.prisma.catalogMedication.findMany({
      where: { isActive: true },
      orderBy: [{ sortPriority: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        displayNameFr: true,
        genericName: true,
        strength: true,
        dosageForm: true,
        route: true,
        ndc11: true,
        ndcDisplay: true,
        billingUnitType: true,
      },
    });
  }

  async createInventoryItem(
    facilityId: string,
    dto: CreateInventoryItemDto,
    userId?: string
  ) {
    const catalog = await this.prisma.catalogMedication.findFirst({
      where: { id: dto.catalogMedicationId, isActive: true },
    });
    if (!catalog) {
      throw new NotFoundException("Catalog medication not found or inactive");
    }

    const item = await this.prisma.inventoryItem.create({
      data: {
        facilityId,
        catalogMedicationId: dto.catalogMedicationId,
        sku: dto.sku,
        lotNumber: dto.lotNumber ?? undefined,
        expirationDate: dto.expirationDate ?? undefined,
        quantityOnHand: dto.quantityOnHand ?? 0,
        reorderLevel: dto.reorderLevel ?? 0,
        unit: dto.unit ?? undefined,
      },
      include: inventoryItemInclude,
    });
    await this.catalogUsage.recordInventoryAdd(facilityId, dto.catalogMedicationId);
    return item;
  }

  async listInventoryItems(
    facilityId: string,
    filters: ListInventoryFiltersDto
  ) {
    const where: any = { facilityId };

    if (filters.activeOnly) {
      where.isActive = true;
    }

    if (filters.medicationNameOrCode?.trim()) {
      const q = filters.medicationNameOrCode.trim();
      where.catalogMedication = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    const take = filters.limit ?? 100;
    const skip = filters.offset ?? 0;

    if (filters.expirationBefore) {
      where.expirationDate = { lte: filters.expirationBefore };
    }

    if (filters.lowStockOnly) {
      const all = await this.prisma.inventoryItem.findMany({
        where,
        orderBy: [{ catalogMedication: { name: "asc" } }, { sku: "asc" }],
        include: inventoryItemInclude,
      });
      const filtered = all.filter((i) => i.quantityOnHand <= i.reorderLevel);
      return {
        items: filtered.slice(skip, skip + take),
        total: filtered.length,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        take,
        skip,
        orderBy: [{ catalogMedication: { name: "asc" } }, { sku: "asc" }],
        include: inventoryItemInclude,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return { items, total };
  }

  async getInventoryItemById(facilityId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, facilityId },
      include: inventoryItemInclude,
    });
    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }
    return item;
  }

  async receiveStock(
    facilityId: string,
    inventoryItemId: string,
    dto: ReceiveStockDto,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, facilityId },
      include: { catalogMedication: true },
    });
    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }
    if (!item.isActive) {
      throw new BadRequestException("Cannot receive stock for inactive item");
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityOnHand: { increment: dto.quantity } },
        include: inventoryItemInclude,
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          inventoryItemId,
          facilityId,
          type: "RECEIPT",
          quantity: dto.quantity,
          performedByUserId: userId,
          notes: dto.notes ?? undefined,
        },
      }),
    ]);

    return updated;
  }

  async adjustStock(
    facilityId: string,
    inventoryItemId: string,
    dto: AdjustStockDto,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, facilityId },
    });
    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }

    const newQuantity = item.quantityOnHand + dto.quantity;
    if (newQuantity < 0) {
      throw new BadRequestException(
        `Adjustment would result in negative quantity (current: ${item.quantityOnHand}, adjustment: ${dto.quantity})`
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityOnHand: newQuantity },
        include: inventoryItemInclude,
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          inventoryItemId,
          facilityId,
          type: "ADJUSTMENT",
          quantity: dto.quantity,
          performedByUserId: userId,
          notes: dto.notes ?? undefined,
        },
      }),
    ]);

    return updated;
  }

  async dispenseMedication(
    facilityId: string,
    dto: DispenseMedicationDto,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, facilityId },
      include: { catalogMedication: true },
    });
    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }
    if (!item.isActive) {
      throw new BadRequestException("Cannot dispense from inactive inventory item");
    }
    if (item.quantityOnHand < dto.quantityDispensed) {
      throw new BadRequestException(
        `Insufficient quantity. On hand: ${item.quantityOnHand}, requested: ${dto.quantityDispensed}`
      );
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: {
        id: dto.encounterId,
        facilityId,
        patientId: dto.patientId,
      },
    });
    if (!encounter) {
      throw new BadRequestException("Encounter not found or does not match patient/facility");
    }

    assertEncounterNotSigned(encounter);

    const result = await this.prisma.$transaction(async (tx) => {
      const normalizedInputNdc = dto.ndc?.trim() ? normalizeNdc(dto.ndc) : null;
      if (normalizedInputNdc && !normalizedInputNdc.ok) {
        throw new BadRequestException("INVALID_NDC_FORMAT");
      }
      const quantityUnit = dto.quantityUnit?.trim() || item.catalogMedication.billingUnitType?.trim() || null;
      const billingQuantity = dto.billingQuantity ?? dto.quantityDispensed;
      const updated = await tx.inventoryItem.update({
        where: { id: dto.inventoryItemId },
        data: { quantityOnHand: { decrement: dto.quantityDispensed } },
        include: inventoryItemInclude,
      });

      if (updated.quantityOnHand < 0) {
        throw new BadRequestException(
          `Insufficient quantity (concurrent dispense). On hand after dispense would be ${updated.quantityOnHand}. Please retry with a lower quantity.`
        );
      }

      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: dto.inventoryItemId,
          facilityId,
          type: "DISPENSE",
          quantity: -dto.quantityDispensed,
          performedByUserId: userId,
          patientId: dto.patientId,
          encounterId: dto.encounterId,
          notes: dto.notes ?? undefined,
        },
      });

      const dispense = await tx.medicationDispense.create({
        data: {
          patientId: dto.patientId,
          encounterId: dto.encounterId,
          facilityId,
          catalogMedicationId: item.catalogMedicationId,
          inventoryItemId: dto.inventoryItemId,
          quantityDispensed: dto.quantityDispensed,
          doseValue: dto.doseValue ?? null,
          doseUnit: dto.doseUnit?.trim() || null,
          billingQuantity,
          quantityUnit,
          ndc11Snapshot: normalizedInputNdc?.ok ? normalizedInputNdc.ndc11 : item.catalogMedication.ndc11,
          ndcDisplaySnapshot:
            normalizedInputNdc?.ok ? normalizedInputNdc.ndcDisplay : item.catalogMedication.ndcDisplay,
          dosageInstructions: dto.dosageInstructions ?? undefined,
          dispensedByUserId: userId,
          notes: dto.notes ?? undefined,
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          encounter: { select: { id: true } },
          catalogMedication: { select: { id: true, code: true, name: true } },
          inventoryItem: { select: { id: true, sku: true, lotNumber: true } },
        },
      });

      await this.audit.log(AuditAction.MEDICATION_DISPENSED, "MEDICATION_DISPENSE", {
        userId,
        facilityId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        entityId: dispense.id,
        ip,
        userAgent,
        metadata: {
          inventoryItemId: dto.inventoryItemId,
          quantityDispensed: dto.quantityDispensed,
          medicationCode: item.catalogMedication.code,
        },
        critical: true,
        tx,
      });

      return { updated, dispense };
    });

    await this.catalogUsage.recordDispense(facilityId, item.catalogMedicationId);

    const medName =
      result.dispense.catalogMedication?.name?.trim() ||
      item.catalogMedication.displayNameFr?.trim() ||
      item.catalogMedication.code;
    const dispAt =
      result.dispense.createdAt instanceof Date
        ? result.dispense.createdAt.toISOString()
        : new Date().toISOString();
    await appendBillingCaptureCandidate(
      this.prisma,
      dto.encounterId,
      facilityId,
      buildMedicationDispenseCandidate({
        dispenseId: result.dispense.id,
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        facilityId,
        quantity: dto.quantityDispensed,
        medicationLabel: medName,
        atIso: dispAt,
        ndc11: result.dispense.ndc11Snapshot,
        ndcDisplay: result.dispense.ndcDisplaySnapshot,
        doseValue: result.dispense.doseValue != null ? Number(result.dispense.doseValue) : null,
        doseUnit: result.dispense.doseUnit,
        billingQuantity: result.dispense.billingQuantity != null ? Number(result.dispense.billingQuantity) : null,
        quantityUnit: result.dispense.quantityUnit,
        createdByUserId: userId ?? null,
      })
    );

    return result.dispense;
  }

  /** Document outpatient / discharge dispensing from a pharmacy worklist line (no stock movement). */
  async recordDispenseFromOrderItem(
    facilityId: string,
    dto: RecordOrderDispenseDto,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: dto.orderItemId,
        order: { facilityId, type: "MEDICATION" },
      },
      include: {
        order: {
          include: {
            encounter: true,
          },
        },
      },
    });
    if (!orderItem) {
      throw new NotFoundException("Ligne d'ordonnance introuvable.");
    }
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    if (orderItem.catalogItemType !== "MEDICATION") {
      throw new BadRequestException("La ligne doit être un médicament.");
    }
    if (orderItem.medicationFulfillmentIntent === MedicationFulfillmentIntent.ADMINISTER_CHART) {
      throw new BadRequestException("Cette ligne est destinée à l'administration au lit, pas à la pharmacie.");
    }
    const existing = await this.prisma.medicationDispense.findUnique({
      where: { orderItemId: orderItem.id },
    });
    if (existing) {
      throw new BadRequestException("Une dispensation est déjà enregistrée pour cette ligne.");
    }

    const manualSnap = orderItem.manualLabel?.trim() || null;
    if (!orderItem.catalogItemId && !manualSnap) {
      throw new BadRequestException("Ligne sans référence catalogue ni libellé manuel.");
    }

    const normalizedInputNdc = dto.ndc?.trim() ? normalizeNdc(dto.ndc) : null;
    if (normalizedInputNdc && !normalizedInputNdc.ok) {
      throw new BadRequestException("INVALID_NDC_FORMAT");
    }

    let orderCatalogMedication: { ndc11: string | null; ndcDisplay: string | null; billingUnitType: string | null } | null = null;
    if (orderItem.catalogItemId) {
      orderCatalogMedication = await this.prisma.catalogMedication.findUnique({
        where: { id: orderItem.catalogItemId },
        select: { ndc11: true, ndcDisplay: true, billingUnitType: true },
      });
    }
    const quantityUnit = dto.quantityUnit?.trim() || orderCatalogMedication?.billingUnitType?.trim() || null;
    const billingQuantity = dto.billingQuantity ?? dto.quantityDispensed;

    const dispense = await this.prisma.$transaction(async (tx) => {
      const d = await tx.medicationDispense.create({
        data: {
          patientId: orderItem.order.patientId,
          encounterId: orderItem.order.encounterId,
          facilityId,
          catalogMedicationId: orderItem.catalogItemId,
          manualMedicationLabel: !orderItem.catalogItemId ? manualSnap : null,
          inventoryItemId: null,
          orderItemId: orderItem.id,
          quantityDispensed: dto.quantityDispensed,
          doseValue: dto.doseValue ?? null,
          doseUnit: dto.doseUnit?.trim() || null,
          billingQuantity,
          quantityUnit,
          ndc11Snapshot: normalizedInputNdc?.ok ? normalizedInputNdc.ndc11 : orderCatalogMedication?.ndc11 || null,
          ndcDisplaySnapshot:
            normalizedInputNdc?.ok
              ? normalizedInputNdc.ndcDisplay
              : orderCatalogMedication?.ndcDisplay || null,
          dosageInstructions: dto.dosageInstructions ?? undefined,
          notes: dto.notes ?? undefined,
          dispensedByUserId: userId,
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          encounter: { select: { id: true } },
          catalogMedication: { select: { id: true, code: true, name: true, displayNameFr: true } },
        },
      });
      if (orderItem.status !== OrderStatus.COMPLETED && orderItem.status !== OrderStatus.CANCELLED) {
        const lifecycleState = applyLifecycleWithStatus(orderItem.lifecycleState, OrderStatus.COMPLETED);
        await tx.orderItem.update({
          where: { id: orderItem.id },
          data: {
            status: OrderStatus.COMPLETED,
            lifecycleState,
            completedAt: new Date(),
            completedByUserId: userId,
          },
        });
      }
      const roleSnapshot = await this.buildRoleSnapshotTx(tx, facilityId, userId);
      await tx.orderEvent.create({
        data: {
          facilityId,
          encounterId: orderItem.order.encounterId,
          orderId: orderItem.orderId,
          orderType: OrderEventOrderType.MEDICATION,
          eventType: OrderEventType.COMPLETED,
          performedByUserId: userId,
          performedAt: new Date(),
          roleSnapshot,
          metadata: {
            orderItemId: orderItem.id,
            medicationDispenseId: d.id,
            lifecycleOutcome: "DISPENSED",
            source: "PHARMACY_DISPENSE",
          } as Prisma.InputJsonValue,
        },
      });
      await this.audit.log(AuditAction.MEDICATION_DISPENSED, "MEDICATION_DISPENSE", {
        userId,
        facilityId,
        patientId: orderItem.order.patientId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        entityId: d.id,
        ip,
        userAgent,
        metadata: { orderItemId: orderItem.id, documentedOnly: true },
        critical: true,
        tx,
      });
      return d;
    });

    if (orderItem.catalogItemId) {
      await this.catalogUsage.recordDispense(facilityId, orderItem.catalogItemId);
    }

    const medName =
      dispense.catalogMedication?.name?.trim() ||
      dispense.catalogMedication?.displayNameFr?.trim() ||
      dispense.manualMedicationLabel?.trim() ||
      "Medication";
    const dispAt =
      dispense.createdAt instanceof Date ? dispense.createdAt.toISOString() : new Date().toISOString();
    await appendBillingCaptureCandidate(
      this.prisma,
      orderItem.order.encounterId,
      facilityId,
      buildMedicationDispenseCandidate({
        dispenseId: dispense.id,
        encounterId: orderItem.order.encounterId,
        patientId: orderItem.order.patientId,
        facilityId,
        quantity: dto.quantityDispensed,
        medicationLabel: medName,
        atIso: dispAt,
        ndc11: dispense.ndc11Snapshot,
        ndcDisplay: dispense.ndcDisplaySnapshot,
        doseValue: dispense.doseValue != null ? Number(dispense.doseValue) : null,
        doseUnit: dispense.doseUnit,
        billingQuantity: dispense.billingQuantity != null ? Number(dispense.billingQuantity) : null,
        quantityUnit: dispense.quantityUnit,
        createdByUserId: userId,
      })
    );

    return dispense;
  }

  async listLowStockItems(facilityId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        facilityId,
        isActive: true,
      },
      orderBy: { quantityOnHand: "asc" },
      include: inventoryItemInclude,
    });
    return items.filter((i) => i.quantityOnHand <= i.reorderLevel);
  }

  async listExpiringItems(
    facilityId: string,
    withinDays: number = 90
  ) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const items = await this.prisma.inventoryItem.findMany({
      where: {
        facilityId,
        isActive: true,
        expirationDate: { lte: cutoff, not: null },
      },
      orderBy: { expirationDate: "asc" },
      include: inventoryItemInclude,
    });
    return items;
  }
}
