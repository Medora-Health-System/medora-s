import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, type OrderItem } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { MedicationAdministrationCreateDto } from "@medora/shared";
import { buildMedicationAdministrationCandidate, normalizeNdc } from "@medora/shared";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import { tryAutoMedicationAdministrationBilling } from "../billing/billing-auto-append.util";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";

@Injectable()
export class MedicationAdministrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Stable French medication label for MAR — aligned with `OrdersService.displayLabelFrForItem`
   * for MEDICATION lines, then row-level fallbacks if needed.
   */
  private medicationLabelSnapshotFromMedicationOrderItem(
    item: OrderItem,
    catalogMedication: { displayNameFr: string | null; name: string | null; strength: string | null } | null
  ): string {
    const manual = item.manualLabel?.trim();
    const manualSec = item.manualSecondaryText?.trim();
    const manualLine = manual ? (manualSec ? `${manual} — ${manualSec}` : manual) : "";

    const base = catalogMedication?.displayNameFr?.trim() || catalogMedication?.name?.trim() || null;
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

    return this.prisma.medicationAdministration.findMany({
      where: { encounterId, facilityId },
      orderBy: { administeredAt: "desc" },
      include: {
        administeredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
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
    let catalogMedication: {
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
        include: { order: true },
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
      if (item.catalogItemId) {
        catalogMedication = await this.prisma.catalogMedication.findUnique({
          where: { id: item.catalogItemId },
          select: {
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
      return row;
    });

    const atIso =
      created.administeredAt instanceof Date
        ? created.administeredAt.toISOString()
        : new Date().toISOString();
    const medLabel = created.medicationLabelSnapshot?.trim() || "Medication";
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

    return created;
  }
}
