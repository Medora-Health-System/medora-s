import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, OrderItem, OrderPriority, OrderStatus, RoleCode, type Prisma } from "@prisma/client";
import { assertCanTransition } from "../common/workflow/status.transitions";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import type { OrderCancelDto, OrderCreateDto, OrderUpdateDto } from "@medora/shared";
import {
  buildOrderItemCreateInput,
  stripUndefinedDeep,
  stripUndefinedKeys,
  type CatalogImagingStudyEnrichment,
  type CatalogLabTestEnrichment,
  type CatalogMedicationEnrichment,
  type OrderWithEnrichedItems,
  type OrderWithItems,
} from "./orders.types";

/** Logs diagnostic (BigInt → string) — uniquement pour inspection Prisma. */
function jsonSafeForOrderCreateLog(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
  } catch {
    return String(value);
  }
}

function splitOrderCreateForLog(data: Prisma.OrderCreateInput): {
  parentPayload: Record<string, unknown>;
  nestedItemsPayload: unknown[];
} {
  const { items, ...rest } = data as Record<string, unknown>;
  let nestedItemsPayload: unknown[] = [];
  if (
    items &&
    typeof items === "object" &&
    items !== null &&
    "create" in items &&
    Array.isArray((items as { create: unknown[] }).create)
  ) {
    nestedItemsPayload = (items as { create: unknown[] }).create;
  }
  return { parentPayload: rest, nestedItemsPayload };
}

/**
 * TEMPORARY — retirer ce repli une fois la migration appliquée en base
 * (`OrderItem.manualLabel`, `OrderItem.manualSecondaryText`, ex. `20260322120000_order_item_manual_entries`
 * ou `20260322150000_order_item_manual_columns_repair`) et `prisma migrate deploy` exécuté.
 *
 * Si la base n’a pas encore ces colonnes (P2022), définir `MEDORA_ORDER_ITEM_MANUAL_COLUMNS=0` :
 * on n’envoie pas `manualLabel` / `manualSecondaryText` à Prisma et on fusionne leur texte dans `notes`
 * pour ne pas perdre les saisies manuelles en attendant la migration.
 * Par défaut (variable absente ou ≠ 0/false) : comportement normal (colonnes utilisées).
 */
function isOrderItemManualColumnsAvailable(): boolean {
  const v = process.env.MEDORA_ORDER_ITEM_MANUAL_COLUMNS;
  if (v === undefined || v === "") return true;
  const lower = v.trim().toLowerCase();
  return lower !== "0" && lower !== "false";
}

function applyTemporaryOrderItemManualColumnFallback(data: Prisma.OrderCreateInput): Prisma.OrderCreateInput {
  if (isOrderItemManualColumnsAvailable()) return data;
  const items = data.items;
  if (!items || typeof items !== "object" || !("create" in items)) return data;
  const create = (items as { create: unknown }).create;
  if (!Array.isArray(create)) return data;

  const nextCreate = create.map((row) => {
    if (!row || typeof row !== "object") return row;
    const r = row as Record<string, unknown>;
    const ml = r.manualLabel;
    const ms = r.manualSecondaryText;
    const labelStr = ml != null && String(ml).trim() ? String(ml).trim() : "";
    const secStr = ms != null && String(ms).trim() ? String(ms).trim() : "";
    const prevNotes = r.notes != null && String(r.notes).trim() ? String(r.notes) : "";
    const { manualLabel: _ml, manualSecondaryText: _ms, ...rest } = r;
    if (!labelStr && !secStr) {
      return rest;
    }
    const manualBlock = [labelStr, secStr].filter(Boolean).join(" — ");
    const mergedNotes = [manualBlock, prevNotes].filter(Boolean).join("\n\n");
    return { ...rest, notes: mergedNotes || undefined };
  });

  return { ...data, items: { create: nextCreate } } as Prisma.OrderCreateInput;
}

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
  if (catalogItemType === "CARE") {
    if (!admin && !roleCodes.includes(RoleCode.RN)) {
      throw new ForbiddenException("Rôle infirmier requis pour cette action.");
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

    const orderCreateDataRaw = {
      ...stripUndefinedKeys({
        encounterId,
        facilityId,
        patientId: encounter.patientId,
        type: data.type,
        status: OrderStatus.PLACED,
        priority: data.priority || "ROUTINE",
        notes: data.notes?.trim() || undefined,
        orderedBy: userId,
        prescriberName: data.prescriberName?.trim() || undefined,
        prescriberLicense: data.prescriberLicense?.trim() || undefined,
        prescriberContact: data.prescriberContact?.trim() || undefined,
      } as Record<string, unknown>),
      items: {
        create: data.items.map((item) => ({
          ...buildOrderItemCreateInput(item, data.type),
          status: OrderStatus.PLACED,
        })),
      },
    } as Prisma.OrderCreateInput;

    let orderCreateData = stripUndefinedDeep(orderCreateDataRaw) as Prisma.OrderCreateInput;
    orderCreateData = applyTemporaryOrderItemManualColumnFallback(orderCreateData);
    orderCreateData = stripUndefinedDeep(orderCreateData) as Prisma.OrderCreateInput;

    const { parentPayload, nestedItemsPayload } = splitOrderCreateForLog(orderCreateData);
    console.error("[order.create] Prisma payload (before create)", {
      encounterId,
      facilityId,
      orderType: data.type,
      parentPayload: jsonSafeForOrderCreateLog(parentPayload),
      nestedItemsPayload: jsonSafeForOrderCreateLog(nestedItemsPayload),
    });

    let order;
    try {
      order = await this.prisma.order.create({
        data: orderCreateData,
        include: {
          items: true,
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        },
      });
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code?: unknown }).code : undefined;
      const meta = err && typeof err === "object" && "meta" in err ? (err as { meta?: unknown }).meta : undefined;
      console.error("[order.create] Prisma order.create failed", {
        encounterId,
        facilityId,
        orderType: data.type,
        name: err instanceof Error ? err.name : typeof err,
        message: err instanceof Error ? err.message : String(err),
        ...(typeof code === "string" ? { code } : {}),
        ...(meta !== undefined ? { meta } : {}),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }

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
            pharmacyDispenseRecord: {
              select: {
                id: true,
                dispensedAt: true,
                dispensedBy: { select: { firstName: true, lastName: true } },
              },
            },
            medicationAdministrations: {
              orderBy: { administeredAt: "desc" },
              take: 1,
              select: {
                administeredAt: true,
                administeredBy: { select: { firstName: true, lastName: true } },
              },
            },
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
    const withResultLabels = await this.attachEnteredByDisplayOnOrders(enriched);
    const withCancellation = await this.attachCancellationDisplayOnOrders(withResultLabels);
    return this.attachOrderedByDisplayOnOrders(withCancellation);
  }

  /**
   * Ajoute `orderedByDisplayFr` sur chaque commande à partir de `Order.orderedBy` (user id).
   */
  async attachOrderedByDisplayOnOrders(orders: OrderWithEnrichedItems[]): Promise<OrderWithEnrichedItems[]> {
    const ids = [...new Set(orders.map((o) => o.orderedBy).filter((x): x is string => Boolean(x)))];
    if (ids.length === 0) {
      return orders;
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    const umap = new Map(users.map((u) => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()]));
    return orders.map((o) => {
      if (!o.orderedBy) {
        return o;
      }
      return {
        ...o,
        orderedByDisplayFr: umap.get(o.orderedBy) ?? null,
      };
    }) as OrderWithEnrichedItems[];
  }

  /**
   * Ajoute `cancelledByDisplayFr` à partir de `Order.cancelledByUserId` (annulation commande entière).
   */
  async attachCancellationDisplayOnOrders(orders: OrderWithEnrichedItems[]): Promise<OrderWithEnrichedItems[]> {
    const ids = [...new Set(orders.map((o) => o.cancelledByUserId).filter((x): x is string => Boolean(x)))];
    if (ids.length === 0) {
      return orders;
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    const umap = new Map(users.map((u) => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()]));
    return orders.map((o) => ({
      ...o,
      cancelledByDisplayFr: o.cancelledByUserId ? umap.get(o.cancelledByUserId) ?? null : null,
    })) as OrderWithEnrichedItems[];
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
            pharmacyDispenseRecord: {
              select: {
                id: true,
                dispensedAt: true,
                dispensedBy: { select: { firstName: true, lastName: true } },
              },
            },
            medicationAdministrations: {
              orderBy: { administeredAt: "desc" },
              take: 1,
              select: {
                administeredAt: true,
                administeredBy: { select: { firstName: true, lastName: true } },
              },
            },
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
    const [withCancel] = await this.attachCancellationDisplayOnOrders([withSig]);
    return withCancel;
  }

  /**
   * Libellé affiché par ligne — aligné sur le client (`orderItemDisplayFr`) :
   * catalogue (displayNameFr / name) d’abord si référence catalogue, puis saisie manuelle, puis repli FR.
   */
  private displayLabelFrForItem(
    it: OrderItem,
    catalogLabTest: CatalogLabTestEnrichment | null | undefined,
    catalogImagingStudy: CatalogImagingStudyEnrichment | null | undefined,
    catalogMedication: CatalogMedicationEnrichment | null | undefined
  ): string {
    const manual = it.manualLabel?.trim();
    const manualSec = it.manualSecondaryText?.trim();
    const manualLine = manual ? (manualSec ? `${manual} — ${manualSec}` : manual) : "";

    if (it.catalogItemType === "LAB_TEST") {
      const fr = catalogLabTest?.displayNameFr?.trim();
      const n = catalogLabTest?.name?.trim();
      if (fr) return fr;
      if (n) return n;
      if (manualLine) return manualLine;
      return "Analyse (libellé indisponible)";
    }
    if (it.catalogItemType === "IMAGING_STUDY") {
      const fr = catalogImagingStudy?.displayNameFr?.trim();
      const n = catalogImagingStudy?.name?.trim();
      const base = fr || n;
      if (base) {
        const mod = catalogImagingStudy?.modality?.trim();
        return mod ? `${base} (${mod})` : base;
      }
      if (manualLine) return manualLine;
      return "Imagerie (libellé indisponible)";
    }
    if (it.catalogItemType === "MEDICATION") {
      const base =
        catalogMedication?.displayNameFr?.trim() || catalogMedication?.name?.trim() || null;
      if (base) {
        const str = (it.strength ?? catalogMedication?.strength)?.trim();
        return str ? `${base} ${str}` : base;
      }
      if (manualLine) return manualLine;
      return "Médicament (libellé indisponible)";
    }
    if (manualLine) return manualLine;
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

  async cancel(
    facilityId: string,
    id: string,
    dto: OrderCancelDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise pour annuler une commande.");
    }

    const order = await this.prisma.order.findFirst({
      where: { id, facilityId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    assertCanTransition(order.status, "CANCELLED");

    const reason = dto.cancellationReason.trim();
    if (!reason) {
      throw new BadRequestException("Le motif d'annulation est requis.");
    }

    const now = new Date();

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledByUserId: userId,
        cancellationReason: reason,
      },
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
      metadata: { cancellationReason: reason },
    });

    const [enriched] = await this.enrichOrderItemsForDisplay([updated as unknown as OrderWithItems]);
    const [withSig] = await this.attachEnteredByDisplayOnOrders([enriched]);
    const [withCancelDisplay] = await this.attachCancellationDisplayOnOrders([withSig]);
    return withCancelDisplay;
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

    assertParentOrderNotCancelled(orderItem.order.status);
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

    assertParentOrderNotCancelled(orderItem.order.status);
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

    assertParentOrderNotCancelled(orderItem.order.status);
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

    assertParentOrderNotCancelled(orderItem.order.status);
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
