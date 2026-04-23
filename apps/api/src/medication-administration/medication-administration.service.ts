import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  MedicationMarAction,
  OrderEventOrderType,
  OrderEventType,
  OrderStatus,
  type OrderItem,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { MarClinicalAction, MedicationAdministrationCreateDto } from "@medora/shared";
import {
  buildMedicationAdministrationCandidate,
  deriveMarClinicalActionFromNotes,
  normalizeNdc,
  resolveMedicationMarActionFromStorage,
} from "@medora/shared";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import { tryAutoMedicationAdministrationBilling } from "../billing/billing-auto-append.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";

/** MAR may close a medication line from these statuses (bedside chart path; avoids strict PLACED→COMPLETED graph gap). */
const MAR_MEDICATION_LINE_PRE_CLOSE_STATUSES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.PENDING,
  OrderStatus.ACKNOWLEDGED,
  OrderStatus.IN_PROGRESS,
];

@Injectable()
export class MedicationAdministrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private mapOrderTypeToOrderEventType(orderType: string): OrderEventOrderType {
    if (orderType === "LAB") return OrderEventOrderType.LAB;
    if (orderType === "IMAGING") return OrderEventOrderType.IMAGING;
    if (orderType === "MEDICATION") return OrderEventOrderType.MEDICATION;
    if (orderType === "CARE") return OrderEventOrderType.PROCEDURE;
    throw new BadRequestException("Type de commande invalide pour audit.");
  }

  private assertMedicationLineCloseableViaMar(status: OrderStatus) {
    if (!MAR_MEDICATION_LINE_PRE_CLOSE_STATUSES.includes(status)) {
      throw new BadRequestException(
        "Statut de ligne médicamenteuse incompatible avec l'enregistrement MAR (déjà terminée ou annulée)."
      );
    }
  }

  private async writeMarOrderEventIfNeeded(
    tx: Prisma.TransactionClient,
    input: {
      facilityId: string;
      orderId: string;
      encounterId: string;
      orderType: string;
      orderItemId: string;
      medicationAdministrationId: string;
      marAction: MarClinicalAction;
      performedByUserId: string;
    }
  ): Promise<void> {
    const dedupeKey = `mar-lifecycle:${input.medicationAdministrationId}`;
    const existingByDedupe = await tx.orderEvent.findFirst({
      where: {
        orderId: input.orderId,
        eventType: OrderEventType.COMPLETED,
        metadata: {
          path: ["dedupeKey"],
          equals: dedupeKey,
        } as Prisma.JsonFilter,
      },
    });
    if (existingByDedupe) return;
    const existingByAdminId = await tx.orderEvent.findFirst({
      where: {
        orderId: input.orderId,
        eventType: OrderEventType.COMPLETED,
        metadata: {
          path: ["medicationAdministrationId"],
          equals: input.medicationAdministrationId,
        } as Prisma.JsonFilter,
      },
    });
    if (existingByAdminId) return;
    const roleSnapshot = await this.buildRoleSnapshotTx(
      tx,
      input.facilityId,
      input.performedByUserId
    );
    await tx.orderEvent.create({
      data: {
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        orderId: input.orderId,
        orderType: this.mapOrderTypeToOrderEventType(input.orderType),
        eventType: OrderEventType.COMPLETED,
        performedByUserId: input.performedByUserId,
        performedAt: new Date(),
        roleSnapshot,
        metadata: {
          dedupeKey,
          orderItemId: input.orderItemId,
          medicationAdministrationId: input.medicationAdministrationId,
          marAction: input.marAction,
          source: "MEDICATION_ADMINISTRATION_SERVICE",
        } as Prisma.InputJsonValue,
      },
    });
  }

  private toPrismaMarAction(action: MarClinicalAction): MedicationMarAction {
    switch (action) {
      case "administered":
        return MedicationMarAction.administered;
      case "refused":
        return MedicationMarAction.refused;
      case "not_available":
        return MedicationMarAction.not_available;
      case "md_changed":
        return MedicationMarAction.md_changed;
      default:
        return MedicationMarAction.administered;
    }
  }

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
    if (unique.length === 0) return "UNKNOWN";
    return unique.join("|");
  }

  /**
   * Stable medication label for MAR / audit — prefers `displayNameEn` when set, then `name` / `displayNameFr` (Phase B additive).
   */
  private medicationLabelSnapshotFromMedicationOrderItem(
    item: OrderItem,
    catalogMedication: {
      displayNameEn: string | null;
      displayNameFr: string | null;
      name: string | null;
      strength: string | null;
    } | null
  ): string {
    const manual = item.manualLabel?.trim();
    const manualSec = item.manualSecondaryText?.trim();
    const manualLine = manual ? (manualSec ? `${manual} — ${manualSec}` : manual) : "";

    const base =
      catalogMedication?.displayNameEn?.trim() ||
      catalogMedication?.name?.trim() ||
      catalogMedication?.displayNameFr?.trim() ||
      null;
    if (base) {
      const str = (item.strength ?? catalogMedication?.strength)?.trim();
      return str ? `${base} ${str}` : base;
    }
    if (manualLine) return manualLine;
    const fromRow = [item.strength, item.notes]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .find((s) => s.length > 0);
    if (fromRow) return fromRow;
    return "Médicament (libellé indisponible)";
  }

  async findByEncounter(encounterId: string, facilityId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const rows = await this.prisma.medicationAdministration.findMany({
      where: { encounterId, facilityId },
      orderBy: { administeredAt: "desc" },
      include: {
        administeredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      marAction: resolveMedicationMarActionFromStorage({
        marAction: r.marAction ?? null,
        notes: r.notes,
      }),
    }));
  }

  async create(
    encounterId: string,
    facilityId: string,
    administeredByUserId: string,
    data: MedicationAdministrationCreateDto
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(encounter);
    if (encounter.status !== "OPEN") {
      throw new BadRequestException("La consultation doit être ouverte pour enregistrer une administration.");
    }

    let orderItemId: string | null = data.orderItemId ?? null;
    let medicationLabelSnapshot: string | null = null;
    let orderIdForAudit: string | undefined;
    let linkedMedicationLine: (OrderItem & { order: { id: string; encounterId: string; type: string; status: string } }) | null =
      null;
    let catalogMedication: {
      displayNameEn: string | null;
      displayNameFr: string | null;
      name: string | null;
      strength: string | null;
      ndc11: string | null;
      ndcDisplay: string | null;
      billingUnitType: string | null;
    } | null = null;
    if (orderItemId) {
      const item = await this.prisma.orderItem.findFirst({
        where: { id: orderItemId },
        include: { order: { select: { id: true, encounterId: true, facilityId: true, type: true, status: true } } },
      });
      if (!item) {
        throw new BadRequestException("Ligne d'ordre introuvable.");
      }
      if (item.order.encounterId !== encounterId) {
        throw new BadRequestException("La ligne n'appartient pas à cette consultation.");
      }
      if (item.order.facilityId !== facilityId) {
        throw new BadRequestException("Établissement invalide pour cette ligne.");
      }
      if (item.catalogItemType !== "MEDICATION") {
        throw new BadRequestException("La ligne doit être un médicament.");
      }
      assertParentOrderNotCancelled(item.order.status);
      linkedMedicationLine = item as OrderItem & {
        order: { id: string; encounterId: string; facilityId: string; type: string; status: string };
      };
      if (item.catalogItemId) {
        catalogMedication = await this.prisma.catalogMedication.findUnique({
          where: { id: item.catalogItemId },
          select: {
            displayNameEn: true,
            displayNameFr: true,
            name: true,
            strength: true,
            ndc11: true,
            ndcDisplay: true,
            billingUnitType: true,
          },
        });
      }
      medicationLabelSnapshot = this.medicationLabelSnapshotFromMedicationOrderItem(item, catalogMedication);
      orderIdForAudit = item.order.id;
    }

    const normalizedInputNdc = data.ndc?.trim() ? normalizeNdc(data.ndc) : null;
    if (normalizedInputNdc && !normalizedInputNdc.ok) {
      throw new BadRequestException("INVALID_NDC_FORMAT");
    }

    const doseValue = data.doseValue ?? null;
    const doseUnit = data.doseUnit?.trim() || null;
    const administeredQuantity = data.administeredQuantity ?? null;
    const billingQuantity = data.billingQuantity ?? administeredQuantity ?? null;
    const quantityUnit = data.quantityUnit?.trim() || null;
    const ndc11Snapshot = normalizedInputNdc?.ok
      ? normalizedInputNdc.ndc11
      : catalogMedication?.ndc11?.trim() || null;
    const ndcDisplaySnapshot = normalizedInputNdc?.ok
      ? normalizedInputNdc.ndcDisplay
      : catalogMedication?.ndcDisplay?.trim() || null;
    const candidateQuantityUnit = quantityUnit || catalogMedication?.billingUnitType?.trim() || null;

    const marActionResolved: MarClinicalAction =
      data.marAction ?? deriveMarClinicalActionFromNotes(data.notes);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.medicationAdministration.create({
        data: {
          facilityId,
          patientId: encounter.patientId,
          encounterId,
          orderItemId,
          medicationLabelSnapshot,
          route: data.route?.trim() ? data.route.trim() : null,
          doseValue,
          doseUnit,
          administeredQuantity,
          billingQuantity,
          quantityUnit: candidateQuantityUnit,
          ndc11Snapshot,
          ndcDisplaySnapshot,
          administeredAt: data.administeredAt ?? new Date(),
          administeredByUserId,
          marAction: this.toPrismaMarAction(marActionResolved),
          notes: data.notes?.trim() ? data.notes.trim() : null,
        },
        include: {
          administeredBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      await this.audit.log(AuditAction.CREATE, "MEDICATION_ADMINISTRATION", {
        userId: administeredByUserId,
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        entityId: row.id,
        ...(orderIdForAudit ? { orderId: orderIdForAudit } : {}),
        critical: true,
        tx,
      });

      const line = linkedMedicationLine;
      if (line && line.catalogItemType === "MEDICATION") {
        /**
         * Orders dashboard: `OrderItem.status === COMPLETED` means “terminal / not open” for all MAR outcomes.
         * Clinical outcome (administered vs refused, etc.) is `MedicationAdministration.marAction` + OrderEvent metadata.
         */
        if (line.status !== OrderStatus.COMPLETED && line.status !== OrderStatus.CANCELLED) {
          this.assertMedicationLineCloseableViaMar(line.status);
          const lifecycleState = applyLifecycleWithStatus(line.lifecycleState, OrderStatus.COMPLETED);
          await tx.orderItem.update({
            where: { id: line.id },
            data: {
              status: OrderStatus.COMPLETED,
              lifecycleState,
              completedAt: new Date(),
              completedByUserId: administeredByUserId,
            },
          });
        }
        await this.writeMarOrderEventIfNeeded(tx, {
          facilityId,
          orderId: line.orderId,
          encounterId: line.order.encounterId,
          orderType: line.order.type,
          orderItemId: line.id,
          medicationAdministrationId: row.id,
          marAction: marActionResolved,
          performedByUserId: administeredByUserId,
        });
      }

      return row;
    });

    const atIso =
      created.administeredAt instanceof Date
        ? created.administeredAt.toISOString()
        : new Date().toISOString();
    const medLabel = created.medicationLabelSnapshot?.trim() || "Medication";
    if (marActionResolved === "administered") {
      await appendBillingCaptureCandidate(
        this.prisma,
        encounterId,
        facilityId,
        buildMedicationAdministrationCandidate({
          administrationId: created.id,
          encounterId,
          patientId: encounter.patientId,
          facilityId,
          medicationLabel: medLabel,
          atIso,
          ndc11: created.ndc11Snapshot,
          ndcDisplay: created.ndcDisplaySnapshot,
          doseValue: created.doseValue != null ? Number(created.doseValue) : null,
          doseUnit: created.doseUnit,
          administeredQuantity:
            created.administeredQuantity != null ? Number(created.administeredQuantity) : null,
          billingQuantity: created.billingQuantity != null ? Number(created.billingQuantity) : null,
          quantityUnit: created.quantityUnit,
          createdByUserId: administeredByUserId,
        })
      );

      void tryAutoMedicationAdministrationBilling(this.prisma, {
        facilityId,
        medicationAdministrationId: created.id,
      });
    }

    return created;
  }
}
