import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  AuditAction,
  OrderItem,
  OrderItemLifecycleState,
  OrderEventOrderType,
  OrderEventType,
  OrderPriority,
  OrderStatus,
  RoleCode,
  type Prisma,
} from "@prisma/client";
import { assertCanTransition } from "../common/workflow/status.transitions";
import { applyLifecycleWithStatus } from "../common/workflow/order-item-lifecycle.machine";
import { assertParentOrderNotCancelled } from "../common/workflow/order-cancelled.guard";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import {
  assertAckOrStartActor,
  assertDepartmentRoleForItem,
  isMedicationAdministerChart,
} from "../common/workflow/order-item-action-guards.util";
import type { OrderCancelDto, OrderCreateDto, OrderUpdateDto } from "@medora/shared";
import { buildOrderItemDisplayLabelEn, buildOrderItemDisplayLabelFr } from "@medora/shared";
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
import { ORDER_ITEM_RESULT_LIST_SELECT } from "./order-item-result.select";
import { createStructuredLogger } from "../common/logging/structured-logger";

const ordersLog = createStructuredLogger("OrdersService");

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
  displayNameEn: true,
  displayNameFr: true,
  strength: true,
  dosageForm: true,
  route: true,
  ndc11: true,
  ndcDisplay: true,
  billingUnitType: true,
} as const;

const CATALOG_LAB_SELECT = {
  id: true,
  code: true,
  name: true,
  displayNameEn: true,
  displayNameFr: true,
  billingCodeDefault: true,
} as const;

const CATALOG_IMAGING_SELECT = {
  id: true,
  code: true,
  name: true,
  displayNameEn: true,
  displayNameFr: true,
  modality: true,
  bodyRegion: true,
} as const;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private mapOrderTypeToEventOrderType(orderType: string): OrderEventOrderType {
    if (orderType === "LAB") return OrderEventOrderType.LAB;
    if (orderType === "IMAGING") return OrderEventOrderType.IMAGING;
    if (orderType === "MEDICATION") return OrderEventOrderType.MEDICATION;
    if (orderType === "CARE") return OrderEventOrderType.PROCEDURE;
    throw new BadRequestException("Type de commande invalide pour audit.");
  }

  /** Minimal order line shape for event timeline label resolution (no Prisma join on catalog). */
  private async loadCatalogMapsForEventLabelResolution(
    items: ReadonlyArray<{ catalogItemType: string; catalogItemId: string | null }>
  ): Promise<{
    labMap: Map<string, CatalogLabTestEnrichment>;
    imgMap: Map<string, CatalogImagingStudyEnrichment>;
    medMap: Map<string, CatalogMedicationEnrichment>;
  }> {
    const labIds = new Set<string>();
    const imgIds = new Set<string>();
    const medIds = new Set<string>();
    for (const it of items) {
      if (it.catalogItemType === "LAB_TEST" && it.catalogItemId) labIds.add(it.catalogItemId);
      if (it.catalogItemType === "IMAGING_STUDY" && it.catalogItemId) imgIds.add(it.catalogItemId);
      if (it.catalogItemType === "MEDICATION" && it.catalogItemId) medIds.add(it.catalogItemId);
    }
    const [labs, imgs, meds] = await Promise.all([
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
    ]);
    return {
      labMap: new Map(labs.map((c) => [c.id, c])),
      imgMap: new Map(imgs.map((c) => [c.id, c])),
      medMap: new Map(meds.map((c) => [c.id, c])),
    };
  }

  private orderItemIdFromEventMetadataForLabels(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const m = metadata as Record<string, unknown>;
    const camel = m.orderItemId;
    const snake = m.order_item_id;
    if (typeof camel === "string" && camel.length > 0) return camel;
    if (typeof snake === "string" && snake.length > 0) return snake;
    return null;
  }

  /** One order line → locale labels (catalog maps must already include this line’s catalog ids). */
  private lineLabelsForOrderItemRow(
    row: {
      catalogItemType: string;
      catalogItemId: string | null;
      manualLabel: string | null;
      manualSecondaryText: string | null;
      strength: string | null;
    },
    labMap: Map<string, CatalogLabTestEnrichment>,
    imgMap: Map<string, CatalogImagingStudyEnrichment>,
    medMap: Map<string, CatalogMedicationEnrichment>
  ): { en: string; fr: string } {
    const labelIn = {
      catalogItemType: String(row.catalogItemType),
      manualLabel: row.manualLabel,
      manualSecondaryText: row.manualSecondaryText,
      strength: row.strength,
    };
    const catalogLabTest =
      row.catalogItemType === "LAB_TEST" && row.catalogItemId
        ? labMap.get(row.catalogItemId) ?? null
        : row.catalogItemType === "LAB_TEST"
          ? null
          : undefined;
    const catalogImagingStudy =
      row.catalogItemType === "IMAGING_STUDY" && row.catalogItemId
        ? imgMap.get(row.catalogItemId) ?? null
        : row.catalogItemType === "IMAGING_STUDY"
          ? null
          : undefined;
    const catalogMedication =
      row.catalogItemType === "MEDICATION" && row.catalogItemId
        ? medMap.get(row.catalogItemId) ?? null
        : row.catalogItemType === "MEDICATION"
          ? null
          : undefined;
    return {
      en: buildOrderItemDisplayLabelEn(labelIn, catalogLabTest, catalogImagingStudy, catalogMedication),
      fr: buildOrderItemDisplayLabelFr(labelIn, catalogLabTest, catalogImagingStudy, catalogMedication),
    };
  }

  private resolveOrderEventLineLabels(
    metadata: unknown,
    order: {
      type: string;
      items: Array<{
        id: string;
        catalogItemType: string;
        catalogItemId: string | null;
        manualLabel: string | null;
        manualSecondaryText: string | null;
        strength: string | null;
        notes: string | null;
      }>;
    },
    labMap: Map<string, CatalogLabTestEnrichment>,
    imgMap: Map<string, CatalogImagingStudyEnrichment>,
    medMap: Map<string, CatalogMedicationEnrichment>
  ): { en: string; fr: string } {
    const itemId = this.orderItemIdFromEventMetadataForLabels(metadata);
    const itemsSorted = [...(order.items ?? [])].sort((a, b) => a.id.localeCompare(b.id));

    if (itemId) {
      const row = itemsSorted.find((i) => i.id === itemId);
      if (row) return this.lineLabelsForOrderItemRow(row, labMap, imgMap, medMap);
    }

    if (!itemId && itemsSorted.length > 0) {
      const enParts: string[] = [];
      const frParts: string[] = [];
      for (const it of itemsSorted) {
        const { en, fr } = this.lineLabelsForOrderItemRow(it, labMap, imgMap, medMap);
        if (en.trim()) enParts.push(en.trim());
        if (fr.trim()) frParts.push(fr.trim());
      }
      const en = [...new Set(enParts)].join(" · ");
      const fr = [...new Set(frParts)].join(" · ");
      if (en || fr) return { en: en || order.type, fr: fr || order.type };
    }

    if (itemsSorted.length === 1) {
      return this.lineLabelsForOrderItemRow(itemsSorted[0], labMap, imgMap, medMap);
    }

    if (itemsSorted.length > 1) {
      const enParts: string[] = [];
      const frParts: string[] = [];
      for (const it of itemsSorted) {
        const { en, fr } = this.lineLabelsForOrderItemRow(it, labMap, imgMap, medMap);
        if (en.trim()) enParts.push(en.trim());
        if (fr.trim()) frParts.push(fr.trim());
      }
      const en = [...new Set(enParts)].join(" · ");
      const fr = [...new Set(frParts)].join(" · ");
      if (en || fr) return { en: en || order.type, fr: fr || order.type };
    }

    return { en: order.type, fr: order.type };
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
    const unique = [...new Set(roles.map((r) => r.role.code))];
    if (unique.length === 0) return "UNKNOWN";
    return unique.join("|");
  }

  private async writeOrderEvent(input: {
    facilityId: string;
    encounterId: string;
    orderId: string;
    orderType: string;
    eventType: OrderEventType;
    performedByUserId: string;
    note?: string;
    metadata?: Prisma.InputJsonValue;
    tx?: Prisma.TransactionClient;
  }) {
    const roleSnapshot = await this.buildRoleSnapshot(
      input.facilityId,
      input.performedByUserId,
      input.tx
    );
    const db = input.tx ?? this.prisma;
    await db.orderEvent.create({
      data: {
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        orderId: input.orderId,
        orderType: this.mapOrderTypeToEventOrderType(input.orderType),
        eventType: input.eventType,
        performedByUserId: input.performedByUserId,
        performedAt: new Date(),
        roleSnapshot,
        note: input.note?.trim() || undefined,
        metadata: input.metadata,
      },
    });
  }

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

    assertEncounterNotSigned(encounter);

    if (data.type === "LAB") {
      data.items.forEach((item, i) => {
        if (item.catalogItemType !== "LAB_TEST") return;
        const id = item.catalogItemId?.trim();
        const manual = item.manualLabel?.trim();
        if (!id && !manual) {
          this.logger.warn(
            `orders.create: LAB line index ${i} has neither catalogItemId nor manualLabel (encounterId=${encounterId})`
          );
        }
      });
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

    /** Single transaction: `order` row + `auditLog` row commit together; audit failure rolls back order (see `AuditService.log` when `tx` is set). */
    let order;
    try {
      order = await this.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: orderCreateData,
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
          orderId: created.id,
          entityId: created.id,
          ip,
          userAgent,
          metadata: { type: data.type, itemCount: data.items.length },
          critical: true,
          tx,
        });
        if (userId) {
          await this.writeOrderEvent({
            facilityId,
            encounterId,
            orderId: created.id,
            orderType: created.type,
            eventType: OrderEventType.CREATED,
            performedByUserId: userId,
            tx,
          });
        }
        return created;
      });
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code?: unknown }).code : undefined;
      ordersLog.error("order_create_failed", {
        facilityId,
        orderType: data.type,
        itemCount: data.items.length,
        errorName: err instanceof Error ? err.name : typeof err,
        errorCode: typeof code === "string" ? code : undefined,
      });
      throw err;
    }

    const [enrichedCreated] = await this.enrichOrderItemsForDisplaySafe([order as unknown as OrderWithItems]);
    return enrichedCreated;
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
            result: { select: ORDER_ITEM_RESULT_LIST_SELECT },
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

    const enriched = await this.enrichOrderItemsForDisplaySafe(orders);
    const withResultLabels = await this.attachEnteredByDisplayOnOrders(enriched);
    const withCancellation = await this.attachCancellationDisplayOnOrders(withResultLabels);
    return this.attachOrderedByDisplayOnOrders(withCancellation);
  }

  async findOrderEventsByEncounter(encounterId: string, facilityId: string) {
    const events = await this.prisma.orderEvent.findMany({
      where: { encounterId, facilityId },
      orderBy: { performedAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            type: true,
            status: true,
            cancellationReason: true,
            items: {
              select: {
                id: true,
                catalogItemType: true,
                catalogItemId: true,
                manualLabel: true,
                manualSecondaryText: true,
                strength: true,
                notes: true,
              },
            },
          },
        },
        performedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const flatItemsForCatalog: Array<{
      catalogItemType: string;
      catalogItemId: string | null;
    }> = [];
    const seenItemId = new Set<string>();
    for (const ev of events) {
      for (const it of ev.order.items) {
        if (seenItemId.has(it.id)) continue;
        seenItemId.add(it.id);
        flatItemsForCatalog.push({
          catalogItemType: it.catalogItemType,
          catalogItemId: it.catalogItemId,
        });
      }
    }
    const { labMap, imgMap, medMap } = await this.loadCatalogMapsForEventLabelResolution(flatItemsForCatalog);

    return events.map((event) => {
      const { en, fr } = this.resolveOrderEventLineLabels(event.metadata, event.order, labMap, imgMap, medMap);
      return {
        id: event.id,
        encounterId: event.encounterId,
        orderId: event.orderId,
        orderType: event.orderType,
        eventType: event.eventType,
        performedByUserId: event.performedByUserId,
        performedByDisplayName: `${event.performedBy.firstName} ${event.performedBy.lastName}`.trim(),
        performedAt: event.performedAt,
        roleSnapshot: event.roleSnapshot,
        note: event.note,
        metadata: event.metadata,
        lineLabelEn: en,
        lineLabelFr: fr,
        order: {
          id: event.order.id,
          type: event.order.type,
          status: event.order.status,
          cancellationReason: event.order.cancellationReason,
          /** @deprecated Prefer `lineLabelEn` / `lineLabelFr` (locale-aware). Kept as FR-first line for legacy clients. */
          displayName: fr,
        },
      };
    });
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
   * Ajoute `enteredByDisplayFr` / `acknowledgedByDisplayFr` sur chaque `result`
   * (département : `verifiedByUserId` ; clinicien : `acknowledgedByUserId`).
   */
  async attachEnteredByDisplayOnOrders(orders: OrderWithEnrichedItems[]): Promise<OrderWithEnrichedItems[]> {
    const verifierIds = [
      ...new Set(
        orders.flatMap((o) =>
          (o.items || []).flatMap((i) => {
            const r = i.result;
            if (!r) return [];
            const ids: string[] = [];
            if (r.verifiedByUserId) ids.push(r.verifiedByUserId);
            if (r.acknowledgedByUserId) ids.push(r.acknowledgedByUserId);
            return ids;
          })
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
              acknowledgedByDisplayFr: it.result.acknowledgedByUserId
                ? vmap.get(it.result.acknowledgedByUserId) ?? null
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
            result: { select: ORDER_ITEM_RESULT_LIST_SELECT },
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

    const [enriched] = await this.enrichOrderItemsForDisplaySafe([row as unknown as OrderWithItems]);
    const [withSig] = await this.attachEnteredByDisplayOnOrders([enriched]);
    const [withCancel] = await this.attachCancellationDisplayOnOrders([withSig]);
    return withCancel;
  }

  /**
   * Attach catalog rows for LAB_TEST, IMAGING_STUDY, and MEDICATION lines (offline-safe labels).
   */
  /**
   * Same as {@link enrichOrderItemsForDisplay} but never throws: on catalog / DB mismatch, falls back to
   * manual/type-based labels so `GET /encounters/:id/orders` stays 200.
   */
  async enrichOrderItemsForDisplaySafe(orders: OrderWithItems[]): Promise<OrderWithEnrichedItems[]> {
    try {
      return await this.enrichOrderItemsForDisplay(orders);
    } catch (err) {
      ordersLog.warn("enrich_order_items_failed_fallback_labels", {
        error: err instanceof Error ? err.message : String(err),
        orderCount: orders.length,
      });
      return this.enrichOrderItemsWithCatalogFallback(orders);
    }
  }

  private enrichOrderItemsWithCatalogFallback(orders: OrderWithItems[]): OrderWithEnrichedItems[] {
    return orders.map((order) => ({
      ...order,
      items: (order.items || []).map((it) => {
        const labelIn = {
          catalogItemType: String(it.catalogItemType),
          manualLabel: it.manualLabel,
          manualSecondaryText: it.manualSecondaryText,
          strength: it.strength,
        };
        return {
          ...it,
          catalogLabTest: null,
          catalogImagingStudy: null,
          catalogMedication: null,
          displayLabelFr: buildOrderItemDisplayLabelFr(labelIn, null, null, null),
          displayLabelEn: buildOrderItemDisplayLabelEn(labelIn, null, null, null),
        };
      }),
    })) as OrderWithEnrichedItems[];
  }

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
          const labelIn = {
            catalogItemType: String(it.catalogItemType),
            manualLabel: it.manualLabel,
            manualSecondaryText: it.manualSecondaryText,
            strength: it.strength,
          };
          return {
            ...it,
            catalogLabTest,
            catalogImagingStudy,
            catalogMedication,
            displayLabelFr: buildOrderItemDisplayLabelFr(
              labelIn,
              catalogLabTest,
              catalogImagingStudy,
              catalogMedication
            ),
            displayLabelEn: buildOrderItemDisplayLabelEn(
              labelIn,
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
    return this.enrichOrderItemsForDisplaySafe(orders);
  }

  async update(facilityId: string, id: string, data: OrderUpdateDto, userId?: string, ip?: string, userAgent?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, facilityId },
      include: { encounter: true },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    assertEncounterNotSigned(order.encounter);

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
      include: { encounter: true },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    assertEncounterNotSigned(order.encounter);

    assertCanTransition(order.status, "CANCELLED");

    const reason = dto.cancellationReason.trim();
    if (!reason) {
      throw new BadRequestException("Le motif d'annulation est requis.");
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledByUserId: userId,
          cancellationReason: reason,
        },
      });
      const items = await tx.orderItem.findMany({ where: { orderId: id } });
      for (const item of items) {
        if (item.lifecycleState === OrderItemLifecycleState.REVIEWED) {
          continue;
        }
        let statusPatch: OrderStatus | undefined;
        try {
          assertCanTransition(item.status, OrderStatus.CANCELLED);
          statusPatch = OrderStatus.CANCELLED;
        } catch {
          statusPatch = undefined;
        }
        const lifecycleState = applyLifecycleWithStatus(
          item.lifecycleState,
          OrderStatus.CANCELLED
        );
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            lifecycleState,
            ...(statusPatch ? { status: statusPatch } : {}),
          },
        });
      }
      const row = await tx.order.findFirst({
        where: { id },
        include: {
          items: true,
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        },
      });
      if (!row) {
        throw new NotFoundException("Order not found");
      }
      await this.writeOrderEvent({
        facilityId,
        encounterId: order.encounterId,
        orderId: order.id,
        orderType: order.type,
        eventType: OrderEventType.CANCELLED,
        performedByUserId: userId,
        note: reason,
        metadata: {
          cancellationReason: reason,
          orderDomain: order.type,
          orderItemCount: items.length,
        },
        tx,
      });
      return row;
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

    const [enriched] = await this.enrichOrderItemsForDisplaySafe([updated as unknown as OrderWithItems]);
    const [withSig] = await this.attachEnteredByDisplayOnOrders([enriched]);
    const [withCancelDisplay] = await this.attachCancellationDisplayOnOrders([withSig]);
    return withCancelDisplay;
  }

  async cancelOrder(
    facilityId: string,
    orderId: string,
    dto: OrderCancelDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    return this.cancel(facilityId, orderId, dto, userId, ip, userAgent);
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

    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    assertCanTransition(orderItem.status, OrderStatus.ACKNOWLEDGED);

    const lifecycleState = applyLifecycleWithStatus(
      orderItem.lifecycleState,
      OrderStatus.ACKNOWLEDGED
    );

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: OrderStatus.ACKNOWLEDGED, lifecycleState },
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

    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    assertCanTransition(orderItem.status, OrderStatus.IN_PROGRESS);

    const lifecycleState = applyLifecycleWithStatus(
      orderItem.lifecycleState,
      OrderStatus.IN_PROGRESS
    );

    if (!userId) {
      throw new ForbiddenException("Authentification requise pour démarrer une ligne.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: OrderStatus.IN_PROGRESS, lifecycleState },
      });
      await this.writeOrderEvent({
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        eventType: OrderEventType.STARTED,
        performedByUserId: userId,
        metadata: { orderItemId },
        tx,
      });
      return row;
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

    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    if (isMedicationAdministerChart(orderItem)) {
      throw new BadRequestException(
        "Cette ligne est destinée à l'administration infirmière ; utilisez la fin d'administration au lit."
      );
    }
    assertDepartmentRoleForItem(orderItem.catalogItemType, requestorRoleCodes);
    assertCanTransition(orderItem.status, OrderStatus.COMPLETED);

    const lifecycleState = applyLifecycleWithStatus(
      orderItem.lifecycleState,
      OrderStatus.COMPLETED
    );

    if (!userId) {
      throw new ForbiddenException("Authentification requise pour terminer une ligne.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: OrderStatus.COMPLETED, lifecycleState },
      });
      await this.writeOrderEvent({
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        eventType: OrderEventType.COMPLETED,
        performedByUserId: userId,
        metadata: { orderItemId },
        tx,
      });
      return row;
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

    assertEncounterNotSigned(orderItem.order.encounter);
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

    const lifecycleState = applyLifecycleWithStatus(
      orderItem.lifecycleState,
      OrderStatus.COMPLETED
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: OrderStatus.COMPLETED,
          lifecycleState,
          completedAt: new Date(),
          completedByUserId: userId,
        },
      });
      await this.writeOrderEvent({
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        eventType: OrderEventType.COMPLETED,
        performedByUserId: userId,
        metadata: { orderItemId, completedByNurse: true },
        tx,
      });
      return row;
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
