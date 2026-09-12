import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuditService } from "../patient-portal-audit.service";

const PATIENT_MEDICATION_ORDER_SELECT = {
  id: true,
  encounterId: true,
  status: true,
  createdAt: true,
  cancelledAt: true,
  prescriberName: true,
  items: {
    where: {
      catalogItemType: "MEDICATION",
      medicationFulfillmentIntent: "PHARMACY_DISPENSE",
    },
    select: {
      id: true,
      catalogItemId: true,
      manualLabel: true,
      manualSecondaryText: true,
      quantity: true,
      strength: true,
      route: true,
      refillCount: true,
      notes: true,
      status: true,
      completedAt: true,
      createdAt: true,
    },
  },
} as const;

@Injectable()
export class PatientMedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PatientPortalAuditService
  ) {}

  private async medicationOrders(access: PatientPortalAccessContext) {
    return this.prisma.order.findMany({
      where: {
        facilityId: access.facilityId,
        patientId: access.patientId,
        type: "MEDICATION",
      },
      select: PATIENT_MEDICATION_ORDER_SELECT,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  private async catalogMap(ids: string[]) {
    if (ids.length === 0) return new Map<string, {
      id: string;
      code: string;
      name: string;
      displayNameEn: string | null;
      displayNameFr: string | null;
      genericName: string | null;
      strength: string | null;
      dosageForm: string | null;
      route: string | null;
    }>();
    const rows = await this.prisma.catalogMedication.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        code: true,
        name: true,
        displayNameEn: true,
        displayNameFr: true,
        genericName: true,
        strength: true,
        dosageForm: true,
        route: true,
      },
    });
    return new Map(rows.map((row) => [row.id, row]));
  }

  async list(
    access: PatientPortalAccessContext,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const orders = await this.medicationOrders(access);
    const catalogIds = [...new Set(
      orders.flatMap((order) => order.items.flatMap((item) => item.catalogItemId ? [item.catalogItemId] : []))
    )];
    const catalog = await this.catalogMap(catalogIds);

    const medications = orders.flatMap((order) =>
      order.items.map((item) => {
        const med = item.catalogItemId ? catalog.get(item.catalogItemId) ?? null : null;
        return {
          id: item.id,
          orderId: order.id,
          encounterId: order.encounterId,
          orderStatus: order.status,
          itemStatus: item.status,
          orderedAt: order.createdAt.toISOString(),
          cancelledAt: order.cancelledAt?.toISOString() ?? null,
          completedAt: item.completedAt?.toISOString() ?? null,
          name: item.manualLabel?.trim() || med?.displayNameEn || med?.name || "Medication",
          genericName: med?.genericName ?? null,
          strength: item.strength ?? med?.strength ?? null,
          dosageForm: med?.dosageForm ?? null,
          route: item.route ?? med?.route ?? null,
          quantity: item.quantity,
          refillCount: item.refillCount,
          instructions: item.notes,
          prescriberName: order.prescriberName,
        };
      })
    );

    await this.audit.record("PATIENT_PORTAL_MEDICATION_LIST_VIEW", "MEDICATION_LIST", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { count: medications.length },
    });

    return { medications };
  }

  async get(
    access: PatientPortalAccessContext,
    orderItemId: string,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const orders = await this.medicationOrders(access);
    const order = orders.find((candidate) => candidate.items.some((item) => item.id === orderItemId));
    const item = order?.items.find((candidate) => candidate.id === orderItemId);
    if (!order || !item) {
      throw new NotFoundException("Medication not found");
    }
    const catalog = await this.catalogMap(item.catalogItemId ? [item.catalogItemId] : []);
    const med = item.catalogItemId ? catalog.get(item.catalogItemId) ?? null : null;

    await this.audit.record("PATIENT_PORTAL_MEDICATION_VIEW", "MEDICATION", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      entityId: item.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      id: item.id,
      orderId: order.id,
      encounterId: order.encounterId,
      orderStatus: order.status,
      itemStatus: item.status,
      orderedAt: order.createdAt.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      name: item.manualLabel?.trim() || med?.displayNameEn || med?.name || "Medication",
      genericName: med?.genericName ?? null,
      strength: item.strength ?? med?.strength ?? null,
      dosageForm: med?.dosageForm ?? null,
      route: item.route ?? med?.route ?? null,
      quantity: item.quantity,
      refillCount: item.refillCount,
      instructions: item.notes,
      prescriberName: order.prescriberName,
    };
  }
}
