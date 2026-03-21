import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, OrderItem, OrderPriority, OrderStatus, RoleCode } from "@prisma/client";
import { assertCanTransition } from "../common/workflow/status.transitions";
import type { OrderCreateDto, OrderUpdateDto } from "@medora/shared";
import {
  buildOrderItemCreateInput,
  type CatalogImagingStudyEnrichment,
  type CatalogLabTestEnrichment,
  type CatalogMedicationEnrichment,
  type OrderWithEnrichedItems,
  type OrderWithItems,
} from "./orders.types";

const CATALOG_MEDICATION_ENRICHMENT_SELECT = {
  id: true,
  code: true,
  name: true,
  displayNameFr: true,
  strength: true,
  dosageForm: true,
  route: true,
} as const;

const CATALOG_LAB_SELECT = {
  id: true,
  code: true,
  name: true,
  displayNameFr: true,
} as const;

const CATALOG_IMAGING_SELECT = {
  id: true,
  code: true,
  name: true,
  displayNameFr: true,
  modality: true,
  bodyRegion: true,
} as const;

function assertDepartmentRoleForItem(catalogItemType: string, roleCodes: RoleCode[]) {
  const admin = roleCodes.includes(RoleCode.ADMIN);
  if (catalogItemType === "LAB_TEST") {
    if (!admin && !roleCodes.includes(RoleCode.LAB)) {
      throw new ForbiddenException("Rôle laboratoire requis pour cette action.");
    }
    return;
  }
  if (catalogItemType === "IMAGING_STUDY") {
    if (!admin && !roleCodes.includes(RoleCode.RADIOLOGY)) {
      throw new ForbiddenException("Rôle imagerie requis pour cette action.");
    }
    return;
  }
  if (catalogItemType === "MEDICATION") {
    if (!admin && !roleCodes.includes(RoleCode.PHARMACY)) {
      throw new ForbiddenException("Rôle pharmacie requis pour cette action.");
    }
    return;
  }
  throw new BadRequestException("Type de ligne d'ordre non pris en charge.");
}

function isMedicationAdministerChart(orderItem: { catalogItemType: string; medicationFulfillmentIntent: string | null }) {
  return (
    orderItem.catalogItemType === "MEDICATION" &&
    orderItem.medicationFulfillmentIntent === "ADMINISTER_CHART"
  );
}

/** Accusé / démarrage : infirmier pour médicament au lit ; sinon file départementale (labo, etc.). */
function assertAckOrStartActor(orderItem: OrderItem, roleCodes: RoleCode[]) {
  const admin = roleCodes.includes(RoleCode.ADMIN);
  if (admin) return;
  if (isMedicationAdministerChart(orderItem)) {
    if (!roleCodes.includes(RoleCode.RN)) {
      throw new ForbiddenException("Rôle infirmier requis pour cette ligne d'administration au lit.");
    }
    return;
  }
  assertDepartmentRoleForItem(orderItem.catalogItemType, roleCodes);
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async create(encounterId: string, facilityId: string, data: OrderCreateDto, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: { patient: true },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.status !== "OPEN") {
      throw new BadRequestException("Can only create orders for open encounters");
    }

    const order = await this.prisma.order.create({
      data: {
        encounterId,
        facilityId,
        patientId: encounter.patientId,
        type: data.type,
        status: OrderStatus.PLACED,
        priority: data.priority || "ROUTINE",
        notes: data.notes,
        orderedBy: userId,
        prescriberName: data.prescriberName?.trim() || undefined,
        prescriberLicense: data.prescriberLicense?.trim() || undefined,
        prescriberContact: data.prescriberContact?.trim() || undefined,
        items: {
          create: data.items.map((item) => ({
            ...buildOrderItemCreateInput(item, data.type),
            status: OrderStatus.PLACED,
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

  async findByEncounter(
    encounterId: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ): Promise<OrderWithEnrichedItems[]> {
    const orders: OrderWithItems[] = await this.prisma.order.findMany({
      where: { encounterId, facilityId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            completedByNurse: { select: { firstName: true, lastName: true } },
            result: true,
          },
        },
      },
    });

    await this.audit.log(AuditAction.ORDER_VIEW, "ORDER", {
      userId,
      facilityId,
      encounterId,
      ip,
      userAgent,
    });

    const enriched = await this.enrichOrderItemsForDisplay(orders);
    return this.attachEnteredByDisplayOnOrders(enriched);
  }

  /**
   * Ajoute `enteredByDisplayFr` sur chaque `result` à partir de `verifiedByUserId`.
   */
  async attachEnteredByDisplayOnOrders(orders: OrderWithEnrichedItems[]): Promise<OrderWithEnrichedItems[]> {
    const verifierIds = [
      ...new Set(
        orders.flatMap((o) =>
          (o.items || []).map((i) => i.result?.verifiedByUserId).filter((x): x is string => Boolean(x))
        )
      ),
    ];
    if (verifierIds.length === 0) {
      return orders;
    }
    const verifiers = await this.prisma.user.findMany({
      where: { id: { in: verifierIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const vmap = new Map(verifiers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
    return orders.map((o) => ({
      ...o,
      items: (o.items || []).map((it) => ({
        ...it,
        result: it.result
          ? {
              ...it.result,
              enteredByDisplayFr: it.result.verifiedByUserId
                ? vmap.get(it.result.verifiedByUserId) ?? null
                : null,
            }
          : null,
      })),
    })) as OrderWithEnrichedItems[];
  }

  /**
   * Détail d’une commande avec lignes enrichies (libellés catalogue) — files labo / imagerie / pharmacie.
   */
  async findOne(orderId: string, facilityId: string, userId?: string, ip?: string, userAgent?: string) {
    const row = await this.prisma.order.findFirst({
      where: { id: orderId, facilityId },
      include: {
        encounter: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dob: true } },
          },
        },
        pathwaySession: { select: { id: true, type: true, status: true } },
        items: {
          include: {
            completedByNurse: { select: { firstName: true, lastName: true } },
            result: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException("Commande introuvable");
    }

    await this.audit.log(AuditAction.ORDER_VIEW, "ORDER", {
      userId,
      facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId,
      orderId: row.id,
      entityId: row.id,
      ip,
      userAgent,
    });

    const [enriched] = await this.enrichOrderItemsForDisplay([row as unknown as OrderWithItems]);
    const [withSig] = await this.attachEnteredByDisplayOnOrders([enriched]);
    return withSig;
  }

  private displayLabelFrForItem(
    it: OrderItem,
    catalogLabTest: CatalogLabTestEnrichment | null | undefined,
    catalogImagingStudy: CatalogImagingStudyEnrichment | null | undefined,
    catalogMedication: CatalogMedicationEnrichment | null | undefined
  ): string {
    const manual = it.manualLabel?.trim();
    if (manual) {
      const sec = it.manualSecondaryText?.trim();
      return sec ? `${manual} — ${sec}` : manual;
    }
    if (it.catalogItemType === "LAB_TEST") {
      const fr = catalogLabTest?.displayNameFr?.trim();
      const n = catalogLabTest?.name?.trim();
      if (fr) return fr;
      if (n) return n;
      return "Analyse (libellé indisponible)";
    }
    if (it.catalogItemType === "IMAGING_STUDY") {
      const fr = catalogImagingStudy?.displayNameFr?.trim();
      const n = catalogImagingStudy?.name?.trim();
      if (fr) return fr;
      if (n) return n;
      return "Imagerie (libellé indisponible)";
    }
    if (it.catalogItemType === "MEDICATION") {
      const base =
        catalogMedication?.displayNameFr?.trim() ||
        catalogMedication?.name?.trim() ||
        "Médicament (libellé indisponible)";
      const str = (it.strength ?? catalogMedication?.strength)?.trim();
      return str ? `${base} ${str}` : base;
    }
    return "Article prescrit";
  }

  /**
   * Attach catalog rows for LAB_TEST, IMAGING_STUDY, and MEDICATION lines (offline-safe labels).
   */
  enrichOrderItemsForDisplay(orders: OrderWithItems[]): Promise<OrderWithEnrichedItems[]> {
    const labIds = new Set<string>();
    const imgIds = new Set<string>();
    const medIds = new Set<string>();
    for (const order of orders) {
      for (const it of order.items || []) {
        if (it.catalogItemType === "LAB_TEST" && it.catalogItemId) labIds.add(it.catalogItemId);
        if (it.catalogItemType === "IMAGING_STUDY" && it.catalogItemId) imgIds.add(it.catalogItemId);
        if (it.catalogItemType === "MEDICATION" && it.catalogItemId) medIds.add(it.catalogItemId);
      }
    }

    return Promise.all([
      labIds.size
        ? this.prisma.catalogLabTest.findMany({
            where: { id: { in: [...labIds] } },
            select: CATALOG_LAB_SELECT,
          })
        : Promise.resolve([] as CatalogLabTestEnrichment[]),
      imgIds.size
        ? this.prisma.catalogImagingStudy.findMany({
            where: { id: { in: [...imgIds] } },
            select: CATALOG_IMAGING_SELECT,
          })
        : Promise.resolve([] as CatalogImagingStudyEnrichment[]),
      medIds.size
        ? this.prisma.catalogMedication.findMany({
            where: { id: { in: [...medIds] } },
            select: CATALOG_MEDICATION_ENRICHMENT_SELECT,
          })
        : Promise.resolve([] as CatalogMedicationEnrichment[]),
    ]).then(([labs, imgs, meds]) => {
      const labMap = new Map(labs.map((c) => [c.id, c]));
      const imgMap = new Map(imgs.map((c) => [c.id, c]));
      const medMap = new Map(meds.map((c) => [c.id, c]));

      return orders.map((order) => ({
        ...order,
        items: (order.items || []).map((it) => {
          const catalogLabTest =
            it.catalogItemType === "LAB_TEST" && it.catalogItemId
              ? labMap.get(it.catalogItemId) ?? null
              : it.catalogItemType === "LAB_TEST"
                ? null
                : undefined;
          const catalogImagingStudy =
            it.catalogItemType === "IMAGING_STUDY" && it.catalogItemId
              ? imgMap.get(it.catalogItemId) ?? null
              : it.catalogItemType === "IMAGING_STUDY"
                ? null
                : undefined;
          const catalogMedication =
            it.catalogItemType === "MEDICATION" && it.catalogItemId
              ? medMap.get(it.catalogItemId) ?? null
              : it.catalogItemType === "MEDICATION"
                ? null
                : undefined;
          return {
            ...it,
            catalogLabTest,
            catalogImagingStudy,
            catalogMedication,
            displayLabelFr: this.displayLabelFrForItem(
              it as OrderItem,
              catalogLabTest,
              catalogImagingStudy,
              catalogMedication
            ),
          };
        }),
      })) as OrderWithEnrichedItems[];
    });
  }

  /** @deprecated use enrichOrderItemsForDisplay */
  enrichMedicationOrders(orders: OrderWithItems[]): Promise<OrderWithEnrichedItems[]> {
    return this.enrichOrderItemsForDisplay(orders);
  }

  async update(facilityId: string, id: string, data: OrderUpdateDto, userId?: string, ip?: string, userAgent?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, facilityId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const updateData: { status?: OrderStatus; priority?: OrderPriority; notes?: string | null } = {};
    if (data.status !== undefined) {
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
    const order = await this.prisma.order.findFirst({
      where: { id, facilityId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

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
    requestorRoleCodes: RoleCode[],
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

    assertAckOrStartActor(orderItem, requestorRoleCodes);
    assertCanTransition(orderItem.status, OrderStatus.ACKNOWLEDGED);

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
    requestorRoleCodes: RoleCode[],
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

    assertAckOrStartActor(orderItem, requestorRoleCodes);
    assertCanTransition(orderItem.status, OrderStatus.IN_PROGRESS);

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
    requestorRoleCodes: RoleCode[],
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

    if (isMedicationAdministerChart(orderItem)) {
      throw new BadRequestException(
        "Cette ligne est destinée à l'administration infirmière ; utilisez la fin d'administration au lit."
      );
    }
    assertDepartmentRoleForItem(orderItem.catalogItemType, requestorRoleCodes);
    assertCanTransition(orderItem.status, OrderStatus.COMPLETED);

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

  /**
   * RN marks in-chart medication administration (or similar) complete; does not use departmental workflow.
   */
  async nurseCompleteOrderItem(
    facilityId: string,
    orderItemId: string,
    userId: string,
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

    if (orderItem.catalogItemType !== "MEDICATION") {
      throw new BadRequestException("Seuls les médicaments peuvent être marqués comme effectués par l'infirmière.");
    }
    if (orderItem.medicationFulfillmentIntent !== "ADMINISTER_CHART") {
      throw new BadRequestException("Cette ligne est destinée à la pharmacie, pas à l'administration au lit.");
    }

    if (orderItem.status === OrderStatus.COMPLETED || orderItem.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Cette ligne ne peut plus être modifiée.");
    }

    const allowedStatusesForNurse: OrderStatus[] = [
      OrderStatus.PLACED,
      OrderStatus.PENDING,
      OrderStatus.ACKNOWLEDGED,
      OrderStatus.IN_PROGRESS,
    ];
    if (!allowedStatusesForNurse.includes(orderItem.status)) {
      throw new BadRequestException("Statut de ligne incompatible avec l'administration infirmière.");
    }

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
        completedByUserId: userId,
      },
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
      metadata: { completedByNurse: true },
    });

    return updated;
  }
}
