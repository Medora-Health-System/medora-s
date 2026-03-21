import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const RECENT_ENCOUNTERS = 5;
const RECENT_DISPENSES = 20;
const RECENT_MEDICATION_ORDERS = 20;

@Injectable()
export class PharmacyDispenseService {
  constructor(private readonly prisma: PrismaService) {}

  /** Minimal patient summary for pharmacy: identity, encounter refs, medication orders, recent dispenses, prescriber when available. */
  async getPatientSummary(patientId: string, facilityId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        dob: true,
        sexAtBirth: true,
      },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const [encounters, medicationOrders, recentDispenses] = await Promise.all([
      this.prisma.encounter.findMany({
        where: { patientId, facilityId },
        orderBy: { createdAt: "desc" },
        take: RECENT_ENCOUNTERS,
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: {
          patientId,
          facilityId,
          type: "MEDICATION",
          status: { in: ["PENDING", "PLACED", "ACKNOWLEDGED", "IN_PROGRESS", "COMPLETED"] },
        },
        orderBy: { createdAt: "desc" },
        take: RECENT_MEDICATION_ORDERS,
        select: {
          id: true,
          encounterId: true,
          status: true,
          createdAt: true,
          prescriberName: true,
          prescriberLicense: true,
          prescriberContact: true,
          items: {
            where: { catalogItemType: "MEDICATION" },
            select: {
              id: true,
              catalogItemId: true,
              manualLabel: true,
              manualSecondaryText: true,
              quantity: true,
              strength: true,
              refillCount: true,
              notes: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.medicationDispense.findMany({
        where: { patientId, facilityId },
        orderBy: { dispensedAt: "desc" },
        take: RECENT_DISPENSES,
        select: {
          id: true,
          encounterId: true,
          quantityDispensed: true,
          dosageInstructions: true,
          dispensedAt: true,
          catalogMedication: { select: { code: true, name: true, displayNameFr: true } },
        },
      }),
    ]);

    const catalogIds = new Set<string>();
    for (const o of medicationOrders) {
      for (const it of o.items) {
        if (it.catalogItemId) catalogIds.add(it.catalogItemId);
      }
    }
    const catalog =
      catalogIds.size > 0
        ? await this.prisma.catalogMedication.findMany({
            where: { id: { in: [...catalogIds] } },
            select: { id: true, code: true, name: true, displayNameFr: true, strength: true, dosageForm: true, route: true },
          })
        : [];
    const catalogMap = new Map(catalog.map((c) => [c.id, c]));

    return {
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dob: patient.dob?.toISOString().slice(0, 10) ?? null,
        sexAtBirth: patient.sexAtBirth,
      },
      encounters: encounters.map((e) => ({
        id: e.id,
        type: e.type,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
      medicationOrders: medicationOrders.map((o) => ({
        id: o.id,
        encounterId: o.encounterId,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        prescriberName: o.prescriberName ?? undefined,
        prescriberLicense: o.prescriberLicense ?? undefined,
        prescriberContact: o.prescriberContact ?? undefined,
        items: o.items.map((it) => ({
          id: it.id,
          catalogItemId: it.catalogItemId,
          manualLabel: it.manualLabel ?? undefined,
          manualSecondaryText: it.manualSecondaryText ?? undefined,
          quantity: it.quantity,
          strength: it.strength ?? undefined,
          refillCount: it.refillCount ?? undefined,
          notes: it.notes ?? undefined,
          status: it.status,
          catalogMedication: it.catalogItemId ? catalogMap.get(it.catalogItemId) ?? undefined : undefined,
        })),
      })),
      recentDispenses: recentDispenses.map((d) => ({
        id: d.id,
        encounterId: d.encounterId,
        quantityDispensed: d.quantityDispensed,
        dosageInstructions: d.dosageInstructions ?? undefined,
        dispensedAt: d.dispensedAt.toISOString(),
        catalogMedication: d.catalogMedication
          ? { code: d.catalogMedication.code, name: d.catalogMedication.name, displayNameFr: d.catalogMedication.displayNameFr ?? undefined }
          : undefined,
      })),
    };
  }

  /** Dispense context for one encounter: identity, encounter, medication orders, prescriber. No chart documentation. */
  async getDispenseContext(encounterId: string, facilityId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dob: true,
            sexAtBirth: true,
          },
        },
      },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const orders = await this.prisma.order.findMany({
      where: { encounterId, facilityId, type: "MEDICATION" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        prescriberName: true,
        prescriberLicense: true,
        prescriberContact: true,
        items: {
          where: { catalogItemType: "MEDICATION" },
          select: {
            id: true,
            catalogItemId: true,
            manualLabel: true,
            manualSecondaryText: true,
            quantity: true,
            strength: true,
            refillCount: true,
            notes: true,
            status: true,
          },
        },
      },
    });

    const catalogIds = new Set<string>();
    for (const o of orders) {
      for (const it of o.items) {
        if (it.catalogItemId) catalogIds.add(it.catalogItemId);
      }
    }
    const catalog =
      catalogIds.size > 0
        ? await this.prisma.catalogMedication.findMany({
            where: { id: { in: [...catalogIds] } },
            select: { id: true, code: true, name: true, displayNameFr: true, strength: true, dosageForm: true, route: true },
          })
        : [];
    const catalogMap = new Map(catalog.map((c) => [c.id, c]));

    return {
      encounter: {
        id: encounter.id,
        type: encounter.type,
        status: encounter.status,
        createdAt: encounter.createdAt.toISOString(),
      },
      patient: encounter.patient
        ? {
            id: encounter.patient.id,
            mrn: encounter.patient.mrn,
            firstName: encounter.patient.firstName,
            lastName: encounter.patient.lastName,
            dob: encounter.patient.dob?.toISOString().slice(0, 10) ?? null,
            sexAtBirth: encounter.patient.sexAtBirth,
          }
        : undefined,
      medicationOrders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        prescriberName: o.prescriberName ?? undefined,
        prescriberLicense: o.prescriberLicense ?? undefined,
        prescriberContact: o.prescriberContact ?? undefined,
        items: o.items.map((it) => ({
          id: it.id,
          catalogItemId: it.catalogItemId,
          manualLabel: it.manualLabel ?? undefined,
          manualSecondaryText: it.manualSecondaryText ?? undefined,
          quantity: it.quantity,
          strength: it.strength ?? undefined,
          refillCount: it.refillCount ?? undefined,
          notes: it.notes ?? undefined,
          status: it.status,
          catalogMedication: it.catalogItemId ? catalogMap.get(it.catalogItemId) ?? undefined : undefined,
        })),
      })),
    };
  }
}
