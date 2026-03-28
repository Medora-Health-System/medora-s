import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { OrderItem } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { MedicationAdministrationCreateDto } from "@medora/shared";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";

@Injectable()
export class MedicationAdministrationService {
  constructor(private readonly prisma: PrismaService) {}

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
      let catalogMedication: { displayNameFr: string | null; name: string | null; strength: string | null } | null =
        null;
      if (item.catalogItemId) {
        catalogMedication = await this.prisma.catalogMedication.findUnique({
          where: { id: item.catalogItemId },
          select: { displayNameFr: true, name: true, strength: true },
        });
      }
      medicationLabelSnapshot = this.medicationLabelSnapshotFromMedicationOrderItem(item, catalogMedication);
    }

    return this.prisma.medicationAdministration.create({
      data: {
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        orderItemId,
        medicationLabelSnapshot,
        administeredAt: data.administeredAt ?? new Date(),
        administeredByUserId,
        notes: data.notes?.trim() ? data.notes.trim() : null,
      },
      include: {
        administeredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
