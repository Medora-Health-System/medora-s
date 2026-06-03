import { randomUUID } from "node:crypto";
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  AuditAction,
  MedicationAdministrationInfusionPhase,
  MedicationMarAction,
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
import {
  assertEncounterNotSigned,
  assertEncounterOpenForClinicalMutation,
} from "../encounters/encounter-sign-lock.util";
import { queueMedoraAlert } from "../common/logging/medoraAlert";
import { logError as medoraLogError } from "../common/logging/medoraLogger";
import {
  assertAckOrStartActor,
  assertCareProcedureEffectiveTimeActor,
  assertCompleteActorForItem,
  assertDepartmentRoleForItem,
  isMedicationAdministerChart,
} from "../common/workflow/order-item-action-guards.util";
import type {
  CareProcedureEffectiveClinicalTimeDto,
  MedicationInfusionStartDto,
  MedicationInfusionStopDto,
  OrderCancelDto,
  OrderCreateDto,
  OrderItemCompleteWithClinicalTimeDto,
  OrderUpdateDto,
} from "@medora/shared";
import {
  OBSERVATION_ORDER_TEMPLATE_ID,
  buildOrderItemCandidate,
  deltaMinutesBetween,
  isCareProcedureOrderItem,
  orderItemStatusEligibleForBillingCapture,
  parseCareProcedureEffectiveClinicalTimeIso,
  toCareProcedureEffectiveClinicalTimeIsoUtc,
  validateCareProcedureEffectiveClinicalTime,
  type CareProcedureEffectiveTimeValidationCode,
} from "@medora/shared";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import { tryEnterpriseProcedureBillableReviewEvent } from "../billing/enterprise-procedure-billable-review.util";
import { buildOrderItemDisplayLabelEn, buildOrderItemDisplayLabelFr, isMedicationInfusionCandidate } from "@medora/shared";
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
import {
  loadOrderMedicationCatalogMaps,
  ORDER_MEDICATION_CATALOG_SELECT,
  resolveOrderMedicationCatalogRow,
  type OrderMedicationCatalogRow,
} from "./order-medication-catalog-resolve.util";
import { assertOrderCreateClinicalSafety } from "./order-safety.guard";
import { ORDER_ITEM_RESULT_LIST_SELECT } from "./order-item-result.select";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { MedicationAdministrationService } from "../medication-administration/medication-administration.service";
import {
  attachMedicationSafetyGovernanceToOrderItem,
  loadLatestPharmacyVerificationByOrderItemId,
  loadMedicationSafetyGovernanceByCatalogId,
  loadPharmacyVerificationDetailsByOrderItemId,
} from "../medication-safety/medication-safety-governance-read.util";
import {
  loadMedicationInfusionClassificationContext,
  buildMedicationInfusionCandidateInputFromOrderItem,
} from "../common/medication/medication-infusion-candidate-from-order-item.util";
import {
  buildInfusionPerformerIdentitySnapshotFromDbParts,
  resolvePerformedByDisplayNameFromOrderEvent,
  type InfusionPerformerIdentitySnapshot,
} from "./infusion-performer-identity-snapshot.util";
import {
  resolveOrderCancelPolicyActor,
  type CancelPolicyActor,
} from "./order-cancel-policy.util";
import {
  assertOrderItemCancelAllowedByPerformedWork,
  assertOrderItemCancelAllowedByState,
} from "./order-cancel-state.util";

const ordersLog = createStructuredLogger("OrdersService");

type OrderAuthority = {
  source: string | null;
  readbackConfirmed?: boolean;
  protocolName?: string;
};

type OrderAuthorityOrder = {
  id: string;
  source?: string | null;
};

type OrderCreatedByDisplay = {
  userId: string;
  name: string;
  role: string | null;
  at: Date | string;
};

type OrderLastActionDisplay = {
  action: string;
  name: string;
  role: string | null;
  at: Date | string;
};

type OrderAttributionOrder = {
  id: string;
  facilityId: string;
  orderedBy?: string | null;
  createdAt: Date | string;
};

function prismaErrorCode(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err && typeof (err as { code?: unknown }).code === "string"
    ? (err as { code: string }).code
    : undefined;
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

const CATALOG_MEDICATION_ENRICHMENT_SELECT = ORDER_MEDICATION_CATALOG_SELECT;

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
    private readonly audit: AuditService,
    private readonly medicationAdministration: MedicationAdministrationService
  ) {}

  private authorityFromCreatedEvent(
    order: OrderAuthorityOrder,
    metadata: Prisma.JsonValue | null | undefined
  ): OrderAuthority {
    const authority: OrderAuthority = { source: order.source ?? null };
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return authority;
    }

    const meta = metadata as Record<string, unknown>;
    if (typeof meta.source === "string" && meta.source.trim()) {
      authority.source = meta.source.trim();
    }
    if (typeof meta.readbackConfirmed === "boolean") {
      authority.readbackConfirmed = meta.readbackConfirmed;
    }
    if (typeof meta.protocolName === "string" && meta.protocolName.trim()) {
      authority.protocolName = meta.protocolName.trim();
    }
    return authority;
  }

  async attachAuthorityToOrders<T extends OrderAuthorityOrder>(orders: T[]): Promise<Array<T & { authority: OrderAuthority }>> {
    if (orders.length === 0) return [] as Array<T & { authority: OrderAuthority }>;

    const ids = [...new Set(orders.map((o) => o.id).filter(Boolean))];
    const events = await this.prisma.orderEvent.findMany({
      where: {
        orderId: { in: ids },
        eventType: OrderEventType.CREATED,
      },
      orderBy: { performedAt: "asc" },
      select: {
        orderId: true,
        metadata: true,
      },
    });
    const metadataByOrderId = new Map<string, Prisma.JsonValue | null>();
    for (const event of events) {
      if (!metadataByOrderId.has(event.orderId)) {
        metadataByOrderId.set(event.orderId, event.metadata);
      }
    }

    return orders.map((order) => ({
      ...order,
      authority: this.authorityFromCreatedEvent(order, metadataByOrderId.get(order.id)),
    }));
  }

  private roleKey(facilityId: string, userId: string): string {
    return `${facilityId}:${userId}`;
  }

  private actionFromOrderEvent(event: {
    eventType: OrderEventType;
    metadata: Prisma.JsonValue | null;
  }): string | null {
    if (event.eventType === OrderEventType.CANCELLED) return "CANCELLED";

    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : {};

    if (event.eventType === OrderEventType.STARTED) {
      return metadata.lifecycleOutcome === "ACKNOWLEDGED" ? "ACKNOWLEDGED" : null;
    }

    if (event.eventType !== OrderEventType.COMPLETED) return null;

    if (metadata.lifecycleOutcome === "ACKNOWLEDGED") return "ACKNOWLEDGED";
    if (metadata.lifecycleOutcome === "RESULTED") return "RESULTED";
    if (metadata.lifecycleOutcome === "VERIFIED") return "RESULTED";
    if (metadata.marAction === "administered" || typeof metadata.medicationAdministrationId === "string") {
      return "ADMINISTERED";
    }

    return "COMPLETED";
  }

  async attachAttributionToOrders<T extends OrderAttributionOrder>(
    orders: T[]
  ): Promise<Array<T & { createdByDisplay: OrderCreatedByDisplay | null; lastActionDisplay: OrderLastActionDisplay | null }>> {
    if (orders.length === 0) {
      return [] as Array<T & { createdByDisplay: OrderCreatedByDisplay | null; lastActionDisplay: OrderLastActionDisplay | null }>;
    }

    const orderIds = [...new Set(orders.map((o) => o.id).filter(Boolean))];
    const creatorIds = [...new Set(orders.map((o) => o.orderedBy).filter((id): id is string => Boolean(id)))];
    const facilityIds = [...new Set(orders.map((o) => o.facilityId).filter(Boolean))];

    const [creatorRows, creatorRoleRows, actionEvents] = await Promise.all([
      creatorIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      creatorIds.length && facilityIds.length
        ? this.prisma.userRole.findMany({
            where: {
              userId: { in: creatorIds },
              facilityId: { in: facilityIds },
              isActive: true,
            },
            include: { role: { select: { code: true } } },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      orderIds.length
        ? this.prisma.orderEvent.findMany({
            where: {
              orderId: { in: orderIds },
              eventType: { in: [OrderEventType.CANCELLED, OrderEventType.COMPLETED, OrderEventType.STARTED] },
            },
            orderBy: { performedAt: "desc" },
            select: {
              orderId: true,
              eventType: true,
              performedAt: true,
              roleSnapshot: true,
              metadata: true,
              performedBy: { select: { firstName: true, lastName: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const creatorById = new Map(creatorRows.map((u) => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()]));
    const roleByUserFacility = new Map<string, string>();
    for (const row of creatorRoleRows) {
      const key = this.roleKey(row.facilityId, row.userId);
      const current = roleByUserFacility.get(key);
      const next = row.role.code;
      roleByUserFacility.set(key, current ? `${current}|${next}` : next);
    }

    const lastActionByOrderId = new Map<string, OrderLastActionDisplay>();
    for (const event of actionEvents) {
      if (lastActionByOrderId.has(event.orderId)) continue;
      const action = this.actionFromOrderEvent(event);
      if (!action) continue;
      const name = `${event.performedBy.firstName ?? ""} ${event.performedBy.lastName ?? ""}`.trim();
      lastActionByOrderId.set(event.orderId, {
        action,
        name,
        role: event.roleSnapshot ?? null,
        at: event.performedAt,
      });
    }

    return orders.map((order) => {
      const creatorName = order.orderedBy ? creatorById.get(order.orderedBy) : null;
      const createdByDisplay =
        order.orderedBy && creatorName
          ? {
              userId: order.orderedBy,
              name: creatorName,
              role: roleByUserFacility.get(this.roleKey(order.facilityId, order.orderedBy)) ?? null,
              at: order.createdAt,
            }
          : null;
      /** Phase 15F-D — order placer is not performer; omit last action until a terminal OrderEvent exists. */
      const lastActionDisplay = lastActionByOrderId.get(order.id) ?? null;

      return {
        ...order,
        createdByDisplay,
        lastActionDisplay,
      };
    });
  }

  async listProviderDirectory(facilityId: string): Promise<Array<{ id: string; name: string; email: string }>> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: {
            facilityId,
            isActive: true,
            role: { code: { in: [RoleCode.PROVIDER, RoleCode.ADMIN] } },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return users.map((user) => ({
      id: user.id,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      email: user.email,
    }));
  }

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
    const codes = roles.flatMap((r) => (r.role ? [r.role.code] : []));
    const unique = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
    if (unique.length === 0) return "UNKNOWN";
    return unique.join("|");
  }

  /**
   * User + facility roles at action time for infusion OrderEvent / AuditLog metadata (legal snapshot).
   */
  private async loadInfusionPerformerIdentitySnapshot(
    facilityId: string,
    userId: string,
    requestorRoleCodes: RoleCode[],
    tx?: Prisma.TransactionClient
  ): Promise<InfusionPerformerIdentitySnapshot> {
    const db = tx ?? this.prisma;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const urs = await db.userRole.findMany({
      where: { facilityId, userId, isActive: true },
      include: { role: { select: { code: true, name: true } } },
    });
    const roleRows = urs.flatMap((r) =>
      r.role ? [{ code: r.role.code, name: r.role.name }] : []
    );
    return buildInfusionPerformerIdentitySnapshotFromDbParts({
      userId,
      user,
      roleRows,
      requestorRoleCodesFallback: requestorRoleCodes,
    });
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
    /** When set, skips an extra role query (e.g. infusion identity snapshot already loaded). */
    roleSnapshotOverride?: string;
  }) {
    const roleSnapshot =
      input.roleSnapshotOverride ??
      (await this.buildRoleSnapshot(
        input.facilityId,
        input.performedByUserId,
        input.tx
      ));
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
      include: { patient: true, triage: { select: { vitalsJson: true } } },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.status !== "OPEN") {
      throw new BadRequestException("Can only create orders for open encounters");
    }

    assertEncounterNotSigned(encounter);

    await assertOrderCreateClinicalSafety(this.prisma, {
      encounterId,
      facilityId,
      data,
      encounterVitals: encounter.vitals,
      encounterNursingAssessment: encounter.nursingAssessment,
      triageVitalsJson: encounter.triage?.vitalsJson ?? null,
    });

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

    const orderSource = data.orderSource ?? "PROVIDER_ORDER";
    const orderAuthorityMetadata = stripUndefinedKeys({
      source:
        data.protocolName?.trim() === OBSERVATION_ORDER_TEMPLATE_ID
          ? "OBSERVATION_TEMPLATE_ORDER"
          : orderSource,
      readbackConfirmed: data.readbackConfirmed,
      protocolName: data.protocolName?.trim() || undefined,
      ...(data.observationTemplateItemId?.trim()
        ? { templateItemId: data.observationTemplateItemId.trim() }
        : {}),
      ...(data.observationTemplateGroupId?.trim()
        ? { observationTemplateGroupId: data.observationTemplateGroupId.trim() }
        : {}),
      ...(data.observationTemplateItemId?.trim() && data.items[0]?.manualLabel?.trim()
        ? { lineLabelFr: data.items[0]!.manualLabel!.trim() }
        : {}),
      ...(data.type === "MEDICATION" && data.safetyAcknowledgedMedicationAllergies === true
        ? { safetyAcknowledgedMedicationAllergies: true as const }
        : {}),
    });

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
        source: orderSource,
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
          metadata: { type: data.type, itemCount: data.items.length, ...orderAuthorityMetadata },
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
            metadata: orderAuthorityMetadata,
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
      medoraLogError("order_create_failed", {
        userId: userId ?? null,
        encounterId,
        facilityId,
        action: "order.create",
        orderType: data.type,
        itemCount: data.items.length,
        errorName: err instanceof Error ? err.name : typeof err,
        errorCode: typeof code === "string" ? code : undefined,
      });
      if (!(err instanceof HttpException)) {
        queueMedoraAlert({
          event: "order_create_failed",
          severity: "critical",
          userId: userId ?? undefined,
          encounterId,
          facilityId,
        });
      }
      throw err;
    }

    const [enrichedCreated] = await this.enrichOrderItemsForDisplaySafe([order as unknown as OrderWithItems]);
    const [withAuthority] = await this.attachAuthorityToOrders([enrichedCreated]);
    const [withAttribution] = await this.attachAttributionToOrders([withAuthority]);
    return withAttribution;
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
    const withResults = await this.attachResultsToOrderItemsSafe(enriched, { facilityId, encounterId });
    const withResultLabels = await this.attachEnteredByDisplayOnOrdersSafe(withResults, { facilityId, encounterId });
    const withCancellation = await this.attachCancellationDisplayOnOrdersSafe(withResultLabels, { facilityId, encounterId });
    const withOrderedBy = await this.attachOrderedByDisplayOnOrdersSafe(withCancellation, { facilityId, encounterId });
    const withAuthority = await this.attachAuthorityToOrders(withOrderedBy);
    return this.attachAttributionToOrders(withAuthority);
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
        performedByDisplayName: resolvePerformedByDisplayNameFromOrderEvent(
          event.metadata,
          `${event.performedBy.firstName} ${event.performedBy.lastName}`.trim()
        ),
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

  private ordersWithNullResults(orders: OrderWithEnrichedItems[]): OrderWithEnrichedItems[] {
    return orders.map((order) => ({
      ...order,
      items: (order.items || []).map((item) => ({
        ...item,
        result: null,
      })),
    })) as OrderWithEnrichedItems[];
  }

  private logReadEnrichmentWarning(
    event: string,
    err: unknown,
    context: { facilityId: string; encounterId: string; orderCount: number; itemCount: number }
  ) {
    ordersLog.warn(event, {
      facilityId: context.facilityId,
      encounterId: context.encounterId,
      orderCount: context.orderCount,
      itemCount: context.itemCount,
      errorName: err instanceof Error ? err.name : typeof err,
      errorCode: prismaErrorCode(err),
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }

  private async attachResultsToOrderItemsSafe(
    orders: OrderWithEnrichedItems[],
    context: { facilityId: string; encounterId: string }
  ): Promise<OrderWithEnrichedItems[]> {
    const itemIds = [
      ...new Set(orders.flatMap((order) => (order.items || []).map((item) => item.id)).filter(Boolean)),
    ];
    if (itemIds.length === 0) {
      return orders;
    }

    try {
      const results = await this.prisma.result.findMany({
        where: {
          facilityId: context.facilityId,
          orderItemId: { in: itemIds },
        },
        select: ORDER_ITEM_RESULT_LIST_SELECT,
      });
      const resultByItemId = new Map(results.map((result) => [result.orderItemId, result]));
      return orders.map((order) => ({
        ...order,
        items: (order.items || []).map((item) => ({
          ...item,
          result: resultByItemId.get(item.id) ?? null,
        })),
      })) as OrderWithEnrichedItems[];
    } catch (err) {
      this.logReadEnrichmentWarning("order_result_enrichment_failed_fallback", err, {
        ...context,
        orderCount: orders.length,
        itemCount: itemIds.length,
      });
      return this.ordersWithNullResults(orders);
    }
  }

  private async attachEnteredByDisplayOnOrdersSafe(
    orders: OrderWithEnrichedItems[],
    context: { facilityId: string; encounterId: string }
  ): Promise<OrderWithEnrichedItems[]> {
    try {
      return await this.attachEnteredByDisplayOnOrders(orders);
    } catch (err) {
      this.logReadEnrichmentWarning("order_result_user_display_enrichment_failed_fallback", err, {
        ...context,
        orderCount: orders.length,
        itemCount: orders.reduce((sum, order) => sum + (order.items || []).length, 0),
      });
      return orders;
    }
  }

  private async attachCancellationDisplayOnOrdersSafe(
    orders: OrderWithEnrichedItems[],
    context: { facilityId: string; encounterId: string }
  ): Promise<OrderWithEnrichedItems[]> {
    try {
      return await this.attachCancellationDisplayOnOrders(orders);
    } catch (err) {
      this.logReadEnrichmentWarning("order_cancellation_display_enrichment_failed_fallback", err, {
        ...context,
        orderCount: orders.length,
        itemCount: orders.reduce((sum, order) => sum + (order.items || []).length, 0),
      });
      return orders;
    }
  }

  private async attachOrderedByDisplayOnOrdersSafe(
    orders: OrderWithEnrichedItems[],
    context: { facilityId: string; encounterId: string }
  ): Promise<OrderWithEnrichedItems[]> {
    try {
      return await this.attachOrderedByDisplayOnOrders(orders);
    } catch (err) {
      this.logReadEnrichmentWarning("order_ordered_by_display_enrichment_failed_fallback", err, {
        ...context,
        orderCount: orders.length,
        itemCount: orders.reduce((sum, order) => sum + (order.items || []).length, 0),
      });
      return orders;
    }
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
    const [withAuthority] = await this.attachAuthorityToOrders([withCancel]);
    const [withAttribution] = await this.attachAttributionToOrders([withAuthority]);
    return withAttribution;
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

  async enrichOrderItemsForDisplay(orders: OrderWithItems[]): Promise<OrderWithEnrichedItems[]> {
    const labIds = new Set<string>();
    const imgIds = new Set<string>();
    const medicationOrderItemIds: string[] = [];
    const medicationLines: Array<{
      catalogItemId?: string | null;
      medicationProductId?: string | null;
      catalogItemType?: string;
    }> = [];
    for (const order of orders) {
      for (const it of order.items || []) {
        if (it.catalogItemType === "LAB_TEST" && it.catalogItemId) labIds.add(it.catalogItemId);
        if (it.catalogItemType === "IMAGING_STUDY" && it.catalogItemId) imgIds.add(it.catalogItemId);
        if (it.catalogItemType === "MEDICATION") {
          medicationLines.push(it);
          medicationOrderItemIds.push(it.id);
        }
      }
    }

    const medicationMaps = await loadOrderMedicationCatalogMaps(this.prisma, medicationLines);
    const medIdList = [...medicationMaps.byCatalogId.keys()];
    const [labs, imgs, governanceByCatalogId, pharmacyByOrderItemId, pharmacyDetailsByOrderItemId] =
      await Promise.all([
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
      medIdList.length
        ? loadMedicationSafetyGovernanceByCatalogId(this.prisma, medIdList)
        : Promise.resolve(new Map()),
      medicationOrderItemIds.length
        ? loadLatestPharmacyVerificationByOrderItemId(this.prisma, medicationOrderItemIds)
        : Promise.resolve(new Map()),
      medicationOrderItemIds.length
        ? loadPharmacyVerificationDetailsByOrderItemId(this.prisma, medicationOrderItemIds)
        : Promise.resolve(new Map()),
    ]);

    const labMap = new Map(labs.map((c) => [c.id, c]));
    const imgMap = new Map(imgs.map((c) => [c.id, c]));

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
        const catalogMedication: OrderMedicationCatalogRow | null | undefined =
          it.catalogItemType === "MEDICATION"
            ? resolveOrderMedicationCatalogRow(it, medicationMaps)
            : undefined;
        const labelIn = {
          catalogItemType: String(it.catalogItemType),
          manualLabel: it.manualLabel,
          manualSecondaryText: it.manualSecondaryText,
          strength: it.strength,
          enterpriseProcedureId: it.enterpriseProcedureId,
        };
        const enriched = {
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
        return attachMedicationSafetyGovernanceToOrderItem(
          enriched,
          governanceByCatalogId,
          pharmacyByOrderItemId,
          pharmacyDetailsByOrderItemId
        );
      }),
    })) as OrderWithEnrichedItems[];
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

    assertEncounterOpenForClinicalMutation(order.encounter);
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

  private buildCancelAuditMetadata(input: {
    cancelScope: "ORDER" | "ORDER_ITEM";
    orderId: string;
    orderItemId?: string;
    previousStatus?: string;
    nextStatus?: string;
    orderType: string;
    cancelPolicyActor: CancelPolicyActor;
    requestorRoleCodes: RoleCode[];
    orderSource: string | null;
    reasonCode: string;
  }): Record<string, unknown> {
    return {
      cancelScope: input.cancelScope,
      orderId: input.orderId,
      ...(input.orderItemId ? { orderItemId: input.orderItemId } : {}),
      ...(input.previousStatus ? { previousStatus: input.previousStatus } : {}),
      ...(input.nextStatus ? { nextStatus: input.nextStatus } : {}),
      orderType: input.orderType,
      cancelPolicyActor: input.cancelPolicyActor,
      requestorRoles: input.requestorRoleCodes,
      orderSource: input.orderSource,
      reasonCode: input.reasonCode,
    };
  }

  private assertCanCancelOrder(
    order: {
      type: string;
      orderedBy: string | null;
      source: string | null;
      items: Array<{ catalogItemType: string }>;
    },
    encounter: {
      physicianAssignedUserId: string | null;
      nurseAssignedUserId: string | null;
    },
    requestorRoleCodes: RoleCode[],
    userId: string
  ): CancelPolicyActor {
    return resolveOrderCancelPolicyActor(
      {
        order,
        allItemCatalogTypes: order.items.map((item) => item.catalogItemType),
        encounter,
      },
      requestorRoleCodes,
      userId
    );
  }

  /** Single-line cancel authority — LAB/RADIOLOGY apply when this line's catalog type matches. */
  private assertCanCancelOrderItem(
    order: {
      type: string;
      orderedBy: string | null;
      source: string | null;
    },
    item: { catalogItemType: string; lifecycleState: OrderItemLifecycleState },
    encounter: {
      physicianAssignedUserId: string | null;
      nurseAssignedUserId: string | null;
    },
    requestorRoleCodes: RoleCode[],
    userId: string
  ): CancelPolicyActor {
    return resolveOrderCancelPolicyActor(
      {
        order,
        catalogItemType: item.catalogItemType,
        lifecycleState: item.lifecycleState,
        encounter,
      },
      requestorRoleCodes,
      userId
    );
  }

  async cancel(
    facilityId: string,
    id: string,
    dto: OrderCancelDto,
    requestorRoleCodes: RoleCode[],
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise pour annuler une commande.");
    }

    const order = await this.prisma.order.findFirst({
      where: { id, facilityId },
      include: {
        encounter: true,
        items: { select: { catalogItemType: true, lifecycleState: true, status: true } },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    assertEncounterOpenForClinicalMutation(order.encounter);
    assertEncounterNotSigned(order.encounter);

    const createdEv = await this.prisma.orderEvent.findFirst({
      where: { orderId: id, eventType: OrderEventType.CREATED },
      orderBy: { performedAt: "asc" },
      select: { metadata: true },
    });
    const createdMeta =
      createdEv?.metadata && typeof createdEv.metadata === "object" && !Array.isArray(createdEv.metadata)
        ? (createdEv.metadata as Record<string, unknown>)
        : null;
    const protocolName =
      typeof createdMeta?.protocolName === "string" ? createdMeta.protocolName.trim() : "";
    if (protocolName === OBSERVATION_ORDER_TEMPLATE_ID) {
      const activeLines = order.items.filter(
        (it) =>
          it.lifecycleState !== OrderItemLifecycleState.CANCELLED &&
          it.lifecycleState !== OrderItemLifecycleState.REVIEWED
      );
      if (activeLines.length > 1) {
        throw new BadRequestException(
          "Ce lot d'ordres observation comporte plusieurs lignes actives. Annulez chaque ligne séparément."
        );
      }
    }

    assertCanTransition(order.status, "CANCELLED");

    const cancelPolicyActor = this.assertCanCancelOrder(
      order,
      {
        physicianAssignedUserId: order.encounter.physicianAssignedUserId,
        nurseAssignedUserId: order.encounter.nurseAssignedUserId,
      },
      requestorRoleCodes,
      userId
    );

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
          ...(dto.cancellationDetails?.trim()
            ? { cancellationDetails: dto.cancellationDetails.trim() }
            : {}),
          cancelPolicyActor,
          requestorRoles: requestorRoleCodes,
          orderSource: order.source,
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
      metadata: this.buildCancelAuditMetadata({
        cancelScope: "ORDER",
        orderId: order.id,
        previousStatus: order.status,
        nextStatus: OrderStatus.CANCELLED,
        orderType: order.type,
        cancelPolicyActor,
        requestorRoleCodes,
        orderSource: order.source,
        reasonCode: reason,
      }),
    });

    const [enriched] = await this.enrichOrderItemsForDisplaySafe([updated as unknown as OrderWithItems]);
    const [withSig] = await this.attachEnteredByDisplayOnOrders([enriched]);
    const [withCancelDisplay] = await this.attachCancellationDisplayOnOrders([withSig]);
    const [withAuthority] = await this.attachAuthorityToOrders([withCancelDisplay]);
    const [withAttribution] = await this.attachAttributionToOrders([withAuthority]);
    return withAttribution;
  }

  async cancelOrder(
    facilityId: string,
    orderId: string,
    dto: OrderCancelDto,
    requestorRoleCodes: RoleCode[],
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    return this.cancel(facilityId, orderId, dto, requestorRoleCodes, userId, ip, userAgent);
  }

  /**
   * Cancels a single {@link OrderItem} on an otherwise active parent {@link Order}.
   * When every non-REVIEWED line is CANCELLED, parent order is moved to CANCELLED with this request’s reason.
   */
  async cancelOrderItem(
    facilityId: string,
    orderItemId: string,
    dto: OrderCancelDto,
    requestorRoleCodes: RoleCode[],
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise pour annuler une ligne.");
    }

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

    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);

    if (orderItem.lifecycleState === OrderItemLifecycleState.CANCELLED) {
      return orderItem;
    }

    assertOrderItemCancelAllowedByState(orderItem);

    const encounterCtx = {
      physicianAssignedUserId: orderItem.order.encounter.physicianAssignedUserId,
      nurseAssignedUserId: orderItem.order.encounter.nurseAssignedUserId,
    };

    const cancelPolicyActor = this.assertCanCancelOrderItem(
      orderItem.order,
      {
        catalogItemType: orderItem.catalogItemType,
        lifecycleState: orderItem.lifecycleState,
      },
      encounterCtx,
      requestorRoleCodes,
      userId
    );

    const reason = dto.cancellationReason.trim();
    if (!reason) {
      throw new BadRequestException("Le motif d'annulation est requis.");
    }

    const medicationAdministrationCount =
      orderItem.order.type === "MEDICATION" || orderItem.catalogItemType === "MEDICATION"
        ? await this.prisma.medicationAdministration.count({
            where: {
              orderItemId,
              OR: [
                { marAction: MedicationMarAction.administered },
                { marAction: MedicationMarAction.md_changed },
                { infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_START },
              ],
            },
          })
        : 0;

    assertOrderItemCancelAllowedByPerformedWork(orderItem, {
      orderType: orderItem.order.type,
      medicationAdministrationCount,
    });

    const previousStatus = orderItem.status;

    const now = new Date();
    let statusPatch: OrderStatus | undefined;
    try {
      assertCanTransition(orderItem.status, OrderStatus.CANCELLED);
      statusPatch = OrderStatus.CANCELLED;
    } catch {
      statusPatch = undefined;
    }
    const lifecycleState = applyLifecycleWithStatus(orderItem.lifecycleState, OrderStatus.CANCELLED);

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          lifecycleState,
          ...(statusPatch ? { status: statusPatch } : {}),
        },
      });

      await this.writeOrderEvent({
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        eventType: OrderEventType.CANCELLED,
        performedByUserId: userId,
        note: reason,
        metadata: {
          cancelScope: "ORDER_ITEM",
          orderItemId,
          cancellationReason: reason,
          ...(dto.cancellationDetails?.trim()
            ? { cancellationDetails: dto.cancellationDetails.trim() }
            : {}),
          cancelPolicyActor,
          requestorRoles: requestorRoleCodes,
          orderSource: orderItem.order.source,
          orderDomain: orderItem.order.type,
        },
        tx,
      });

      const parentId = orderItem.orderId;
      const siblings = await tx.orderItem.findMany({ where: { orderId: parentId } });
      const allNonReviewedCancelled = siblings.every(
        (it) =>
          it.lifecycleState === OrderItemLifecycleState.REVIEWED ||
          it.lifecycleState === OrderItemLifecycleState.CANCELLED
      );

      if (allNonReviewedCancelled) {
        const parent = await tx.order.findFirst({ where: { id: parentId } });
        if (parent && parent.status !== OrderStatus.CANCELLED) {
          assertCanTransition(parent.status, OrderStatus.CANCELLED);
          await tx.order.update({
            where: { id: parentId },
            data: {
              status: OrderStatus.CANCELLED,
              cancelledAt: now,
              cancelledByUserId: userId,
              cancellationReason: reason,
            },
          });
        }
      }
    });

    await this.audit.log(AuditAction.ORDER_CANCEL, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
      metadata: this.buildCancelAuditMetadata({
        cancelScope: "ORDER_ITEM",
        orderId: orderItem.orderId,
        orderItemId,
        previousStatus,
        nextStatus: OrderStatus.CANCELLED,
        orderType: orderItem.order.type,
        cancelPolicyActor,
        requestorRoleCodes,
        orderSource: orderItem.order.source,
        reasonCode: reason,
      }),
    });

    return this.prisma.orderItem.findFirstOrThrow({ where: { id: orderItemId } });
  }

  private observationTemplateOrderEventExtras(
    orderType: string,
    createdMeta: unknown,
    manualLabel: string | null | undefined
  ): { lineLabelFr?: string; source?: "OBSERVATION_TEMPLATE_ORDER" } {
    const protocolName =
      createdMeta && typeof createdMeta === "object" && !Array.isArray(createdMeta)
        ? (createdMeta as { protocolName?: unknown }).protocolName
        : null;
    if (orderType !== "CARE" || protocolName !== OBSERVATION_ORDER_TEMPLATE_ID) {
      return {};
    }
    const lineLabelFr = manualLabel?.trim() || undefined;
    return {
      ...(lineLabelFr ? { lineLabelFr } : {}),
      source: "OBSERVATION_TEMPLATE_ORDER",
    };
  }

  /**
   * RN/provider acknowledgment only — does not complete the line, bill, or set performedBy.
   * `acknowledgedBy` (event actor) must not be treated as clinical performer for billing.
   */
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
            orderEvents: {
              where: { eventType: OrderEventType.CREATED },
              orderBy: { performedAt: "asc" },
              take: 1,
              select: { metadata: true },
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    assertAckOrStartActor(orderItem, requestorRoleCodes);

    if (orderItem.status === OrderStatus.ACKNOWLEDGED) {
      return orderItem;
    }

    if (
      orderItem.lifecycleState === OrderItemLifecycleState.CANCELLED ||
      orderItem.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException("Cette ligne est annulée ; l'accusé de réception n'est pas possible.");
    }

    const createdMeta = orderItem.order.orderEvents[0]?.metadata;
    const protocolName =
      createdMeta && typeof createdMeta === "object" && !Array.isArray(createdMeta)
        ? (createdMeta as { protocolName?: unknown }).protocolName
        : null;
    const templateExtras = this.observationTemplateOrderEventExtras(
      orderItem.order.type,
      createdMeta,
      orderItem.manualLabel
    );

    assertCanTransition(orderItem.status, OrderStatus.ACKNOWLEDGED);

    const lifecycleState = applyLifecycleWithStatus(
      orderItem.lifecycleState,
      OrderStatus.ACKNOWLEDGED
    );

    if (!userId) {
      throw new ForbiddenException("Authentification requise pour accuser réception d'une ligne.");
    }

    const lineLabelFr = orderItem.manualLabel?.trim() || undefined;
    const ackDedupeKey = `order-item-ack:${orderItemId}`;

    const systemNow = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const existingAckEvent = await tx.orderEvent.findFirst({
        where: {
          orderId: orderItem.orderId,
          eventType: OrderEventType.STARTED,
          metadata: {
            path: ["dedupeKey"],
            equals: ackDedupeKey,
          } as Prisma.JsonFilter,
        },
      });

      const row = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: OrderStatus.ACKNOWLEDGED,
          lifecycleState,
          ...(orderItem.catalogItemType === "LAB_TEST" && !orderItem.documentedReceivedAt
            ? { documentedReceivedAt: systemNow }
            : {}),
        },
      });

      if (!existingAckEvent) {
        await this.writeOrderEvent({
          facilityId,
          encounterId: orderItem.order.encounterId,
          orderId: orderItem.orderId,
          orderType: orderItem.order.type,
          eventType: OrderEventType.STARTED,
          performedByUserId: userId,
          metadata: {
            orderItemId,
            lifecycleOutcome: "ACKNOWLEDGED",
            dedupeKey: ackDedupeKey,
            ...templateExtras,
          },
          tx,
        });
      }
      return row;
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
            orderEvents: {
              where: { eventType: OrderEventType.CREATED },
              orderBy: { performedAt: "asc" },
              take: 1,
              select: { metadata: true },
            },
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    assertAckOrStartActor(orderItem, requestorRoleCodes);

    if (
      orderItem.lifecycleState === OrderItemLifecycleState.CANCELLED ||
      orderItem.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException("Cette ligne est annulée ; le démarrage n'est pas possible.");
    }

    assertCanTransition(orderItem.status, OrderStatus.IN_PROGRESS);

    const lifecycleState = applyLifecycleWithStatus(
      orderItem.lifecycleState,
      OrderStatus.IN_PROGRESS
    );

    if (!userId) {
      throw new ForbiddenException("Authentification requise pour démarrer une ligne.");
    }

    const createdMeta = orderItem.order.orderEvents[0]?.metadata;
    const templateExtras = this.observationTemplateOrderEventExtras(
      orderItem.order.type,
      createdMeta,
      orderItem.manualLabel
    );
    const startDedupeKey = `order-item-start:${orderItemId}`;

    const systemNow = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const existingStart = await tx.orderEvent.findFirst({
        where: {
          orderId: orderItem.orderId,
          eventType: OrderEventType.STARTED,
          metadata: { path: ["dedupeKey"], equals: startDedupeKey } as Prisma.JsonFilter,
        },
      });

      const row = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: OrderStatus.IN_PROGRESS,
          lifecycleState,
          ...(orderItem.catalogItemType === "LAB_TEST" && !orderItem.documentedCollectedAt
            ? { documentedCollectedAt: systemNow }
            : {}),
          ...(orderItem.catalogItemType === "IMAGING_STUDY" && !orderItem.documentedPerformedAt
            ? { documentedPerformedAt: systemNow }
            : {}),
        },
      });
      if (!existingStart) {
        await this.writeOrderEvent({
          facilityId,
          encounterId: orderItem.order.encounterId,
          orderId: orderItem.orderId,
          orderType: orderItem.order.type,
          eventType: OrderEventType.STARTED,
          performedByUserId: userId,
          metadata: {
            orderItemId,
            dedupeKey: startDedupeKey,
            ...templateExtras,
          },
          tx,
        });
      }
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

  private parseEffectiveClinicalTimeIso(iso: string): Date {
    const d = parseCareProcedureEffectiveClinicalTimeIso(iso);
    if (!d) {
      throw new BadRequestException("Date ou heure clinique invalide.");
    }
    return d;
  }

  private careProcedureEffectiveTimeValidationMessage(code: CareProcedureEffectiveTimeValidationCode): string {
    switch (code) {
      case "FUTURE_TIME":
        return "L'heure clinique ne peut pas être dans le futur.";
      case "BEFORE_ENCOUNTER":
        return "L'heure clinique ne peut pas précéder l'arrivée du patient.";
      case "REASON_TOO_SHORT_FOR_LARGE_BACKDATE":
        return "Un motif détaillé (au moins 15 caractères) est requis lorsque l'heure clinique précède de plus de 24 h l'heure documentée.";
      case "REASON_REQUIRED":
        return "Un motif est requis pour cet ajustement d'heure clinique.";
      default:
        return "Heure clinique invalide.";
    }
  }

  private encounterAnchorAt(encounter: { createdAt: Date; admittedAt: Date | null }): Date {
    if (encounter.admittedAt && encounter.admittedAt.getTime() < encounter.createdAt.getTime()) {
      return encounter.admittedAt;
    }
    return encounter.createdAt;
  }

  async completeOrderItem(
    facilityId: string,
    orderItemId: string,
    requestorRoleCodes: RoleCode[],
    userId?: string,
    ip?: string,
    userAgent?: string,
    completeOptions?: OrderItemCompleteWithClinicalTimeDto
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
            orderEvents: {
              where: { eventType: OrderEventType.CREATED },
              orderBy: { performedAt: "asc" },
              take: 1,
              select: { metadata: true },
            },
          },
        },
        pharmacyDispenseRecord: { select: { id: true } },
      },
    });

    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }

    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);

    if (
      orderItem.lifecycleState === OrderItemLifecycleState.CANCELLED ||
      orderItem.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException("Cette ligne est annulée ; la complétion n'est pas possible.");
    }

    if (isMedicationAdministerChart(orderItem)) {
      throw new BadRequestException(
        "Cette ligne est destinée à l'administration infirmière ; utilisez la fin d'administration au lit."
      );
    }
    if (
      orderItem.catalogItemType === "MEDICATION" &&
      orderItem.medicationFulfillmentIntent === "PHARMACY_DISPENSE" &&
      !orderItem.pharmacyDispenseRecord
    ) {
      throw new BadRequestException(
        "Cette ligne doit être dispensée par la pharmacie avant d'être terminée."
      );
    }
    assertCompleteActorForItem(orderItem, requestorRoleCodes);
    assertCanTransition(orderItem.status, OrderStatus.COMPLETED);

    const lifecycleState = applyLifecycleWithStatus(
      orderItem.lifecycleState,
      OrderStatus.COMPLETED
    );

    if (!userId) {
      throw new ForbiddenException("Authentification requise pour terminer une ligne.");
    }

    const systemNow = new Date();
    let effectiveAt = systemNow;
    let reasonTrim: string | null = null;
    const isCareProcedure = isCareProcedureOrderItem(
      orderItem.catalogItemType,
      orderItem.order.type
    );
    if (completeOptions?.effectiveClinicalTime?.trim()) {
      if (!isCareProcedure) {
        throw new BadRequestException(
          "L'heure clinique rétroactive ne s'applique qu'aux ordres de soins / procédures."
        );
      }
      effectiveAt = this.parseEffectiveClinicalTimeIso(completeOptions.effectiveClinicalTime);
      reasonTrim = completeOptions.reason?.trim() || null;
      const validation = validateCareProcedureEffectiveClinicalTime({
        effectiveClinicalTime: effectiveAt,
        now: systemNow,
        encounterAnchorAt: this.encounterAnchorAt(orderItem.order.encounter),
        orderCreatedAt: orderItem.order.createdAt,
        orderItemCreatedAt: orderItem.createdAt,
        documentedCompletedAt: null,
        adjustmentVersion: 0,
        reason: reasonTrim,
      });
      if (!validation.ok) {
        throw new BadRequestException(this.careProcedureEffectiveTimeValidationMessage(validation.code));
      }
    }

    const createdMeta = orderItem.order.orderEvents[0]?.metadata;
    const templateExtras = this.observationTemplateOrderEventExtras(
      orderItem.order.type,
      createdMeta,
      orderItem.manualLabel
    );

    const eventMetadata: Prisma.InputJsonValue = isCareProcedure
      ? {
          orderItemId,
          effectiveClinicalTime: toCareProcedureEffectiveClinicalTimeIsoUtc(effectiveAt),
          originalSystemTime: toCareProcedureEffectiveClinicalTimeIsoUtc(systemNow),
          ...templateExtras,
        }
      : { orderItemId, ...templateExtras };

    const itemUpdateData: Prisma.OrderItemUpdateInput = {
      status: OrderStatus.COMPLETED,
      lifecycleState,
      ...(isCareProcedure
        ? {
            documentedCompletedAt: systemNow,
            effectiveClinicalAt: effectiveAt,
            effectiveClinicalAtSetAt: systemNow,
            effectiveClinicalAtSetByUserId: userId,
            effectiveClinicalAtReason: reasonTrim,
            effectiveClinicalAtVersion: 0,
            completedAt: effectiveAt,
          }
        : {}),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.orderItem.update({
        where: { id: orderItemId },
        data: itemUpdateData,
      });
      await this.writeOrderEvent({
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        eventType: OrderEventType.COMPLETED,
        performedByUserId: userId,
        metadata: eventMetadata,
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

    /** Completion only — acknowledgement does not bill. `performedBy` is the COMPLETED event actor. */
    if (isCareProcedure && orderItemStatusEligibleForBillingCapture(OrderStatus.COMPLETED)) {
      const completedAtIso =
        updated.completedAt instanceof Date && !Number.isNaN(updated.completedAt.getTime())
          ? updated.completedAt.toISOString()
          : systemNow.toISOString();
      await appendBillingCaptureCandidate(
        this.prisma,
        orderItem.order.encounterId,
        facilityId,
        buildOrderItemCandidate({
          orderItemId,
          orderId: orderItem.orderId,
          encounterId: orderItem.order.encounterId,
          patientId: orderItem.order.encounter.patientId,
          facilityId,
          orderType: orderItem.order.type,
          catalogItemType: orderItem.catalogItemType,
          manualLabel: orderItem.manualLabel,
          quantity: orderItem.quantity,
          completedAtIso,
          createdByUserId: userId ?? null,
        })
      );
      void tryEnterpriseProcedureBillableReviewEvent(this.prisma, {
        facilityId,
        orderItemId,
      });
    }

    return updated;
  }

  /**
   * Post-hoc correction of effective clinical time for completed CARE / procedure lines only.
   * System documented time (`documentedCompletedAt` + COMPLETED `OrderEvent.performedAt`) is never mutated.
   *
   * Phase 15F-A visibility: Orders tab only. ClinicalTimeline / patient chart timeline / chart export
   * integration deferred (15F-D / 15G). Append-only OrderEvent.performedAt + audit metadata preserve corrections.
   */
  async setCareProcedureEffectiveClinicalTime(
    facilityId: string,
    orderItemId: string,
    orderId: string | undefined,
    dto: CareProcedureEffectiveClinicalTimeDto,
    requestorRoleCodes: RoleCode[],
    userId: string,
    ip?: string,
    userAgent?: string,
    source: "ORDERS_TAB" | "ER_ORDERS_PANEL" = "ORDERS_TAB"
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
    if (orderId && orderItem.orderId !== orderId) {
      throw new BadRequestException("La ligne n'appartient pas à cette commande.");
    }

    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);

    if (!isCareProcedureOrderItem(orderItem.catalogItemType, orderItem.order.type)) {
      throw new BadRequestException(
        "Seuls les ordres de soins / procédures (CARE) permettent l'ajustement d'heure clinique."
      );
    }

    if (orderItem.catalogItemType === "MEDICATION") {
      throw new BadRequestException("Les lignes médicamenteuses ne peuvent pas être ajustées ici.");
    }
    if (orderItem.catalogItemType === "LAB_TEST" || orderItem.order.type === "LAB") {
      throw new BadRequestException("Les lignes de laboratoire ne peuvent pas être ajustées ici.");
    }
    if (orderItem.catalogItemType === "IMAGING_STUDY" || orderItem.order.type === "IMAGING") {
      throw new BadRequestException("Les lignes d'imagerie ne peuvent pas être ajustées ici.");
    }

    if (orderItem.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException("La ligne doit être terminée avant d'ajuster l'heure clinique.");
    }

    assertCareProcedureEffectiveTimeActor(requestorRoleCodes);

    const systemNow = new Date();
    const effectiveAt = this.parseEffectiveClinicalTimeIso(dto.effectiveClinicalTime);
    const reasonTrim = dto.reason?.trim() || null;
    const documentedAt =
      orderItem.documentedCompletedAt ??
      orderItem.completedAt ??
      orderItem.updatedAt;

    const validation = validateCareProcedureEffectiveClinicalTime({
      effectiveClinicalTime: effectiveAt,
      now: systemNow,
      encounterAnchorAt: this.encounterAnchorAt(orderItem.order.encounter),
      orderCreatedAt: orderItem.order.createdAt,
      orderItemCreatedAt: orderItem.createdAt,
      documentedCompletedAt: documentedAt,
      adjustmentVersion: orderItem.effectiveClinicalAtVersion,
      reason: reasonTrim,
    });
    if (!validation.ok) {
      throw new BadRequestException(this.careProcedureEffectiveTimeValidationMessage(validation.code));
    }

    const previousEffective = orderItem.effectiveClinicalAt;
    const originalSystemTime = orderItem.documentedCompletedAt ?? documentedAt;
    const effectiveAtUtc = new Date(toCareProcedureEffectiveClinicalTimeIsoUtc(effectiveAt));

    const updated = await this.prisma.$transaction(async (tx) => {
      return tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          effectiveClinicalAt: effectiveAtUtc,
          effectiveClinicalAtSetAt: systemNow,
          effectiveClinicalAtSetByUserId: userId,
          effectiveClinicalAtReason: reasonTrim,
          effectiveClinicalAtVersion: { increment: 1 },
          completedAt: effectiveAtUtc,
          ...(orderItem.documentedCompletedAt
            ? {}
            : { documentedCompletedAt: originalSystemTime }),
        },
      });
    });

    await this.audit.log(AuditAction.CARE_PROCEDURE_EFFECTIVE_TIME_ADJUSTED, "ORDER_ITEM", {
      userId,
      facilityId,
      patientId: orderItem.order.encounter.patientId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      entityId: orderItemId,
      ip,
      userAgent,
      metadata: {
        orderId: orderItem.orderId,
        orderItemId,
        encounterId: orderItem.order.encounterId,
        previousEffectiveClinicalTime: previousEffective
          ? toCareProcedureEffectiveClinicalTimeIsoUtc(previousEffective)
          : null,
        newEffectiveClinicalTime: toCareProcedureEffectiveClinicalTimeIsoUtc(effectiveAtUtc),
        originalSystemTime: toCareProcedureEffectiveClinicalTimeIsoUtc(originalSystemTime),
        reasonProvided: Boolean(reasonTrim),
        deltaMinutes: deltaMinutesBetween(effectiveAtUtc, documentedAt),
        source,
      },
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

    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
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

  private parseMedicationInfusionOrderEventMeta(metadata: Prisma.JsonValue | null): {
    infusionScope?: string;
    infusionAction?: string;
    orderItemId?: string;
    infusionSessionKey?: string;
    infusionStartedAt?: string;
    infusionStoppedAt?: string;
    durationMinutes?: number;
    route?: string;
    source?: string;
    medicationAdministrationId?: string;
  } | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const m = metadata as Record<string, unknown>;
    if (m.infusionScope !== "MEDICATION_INFUSION") return null;
    const num = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : undefined;
    return {
      infusionScope: String(m.infusionScope),
      infusionAction: typeof m.infusionAction === "string" ? m.infusionAction : undefined,
      orderItemId: typeof m.orderItemId === "string" ? m.orderItemId : undefined,
      infusionSessionKey: typeof m.infusionSessionKey === "string" ? m.infusionSessionKey : undefined,
      infusionStartedAt: typeof m.infusionStartedAt === "string" ? m.infusionStartedAt : undefined,
      infusionStoppedAt: typeof m.infusionStoppedAt === "string" ? m.infusionStoppedAt : undefined,
      durationMinutes: num(m.durationMinutes),
      route: typeof m.route === "string" ? m.route : undefined,
      source: typeof m.source === "string" ? m.source : undefined,
      medicationAdministrationId:
        typeof m.medicationAdministrationId === "string" ? m.medicationAdministrationId : undefined,
    };
  }

  /**
   * Replays infusion-tagged OrderEvents for the order to find an unmatched START for this order line.
   */
  private findActiveMedicationInfusionSession(
    orderItemId: string,
    events: Array<{ eventType: OrderEventType; metadata: Prisma.JsonValue | null }>
  ): { sessionKey: string; startedAt: Date; route: string } | null {
    let active: { sessionKey: string; startedAt: Date; route: string } | null = null;
    for (const ev of events) {
      const m = this.parseMedicationInfusionOrderEventMeta(ev.metadata);
      if (!m || m.orderItemId !== orderItemId) continue;
      if (m.infusionAction === "START" && m.infusionSessionKey && m.infusionStartedAt) {
        const startedAt = new Date(m.infusionStartedAt);
        if (!Number.isNaN(startedAt.getTime())) {
          active = {
            sessionKey: m.infusionSessionKey,
            startedAt,
            route: m.route?.trim() ?? "",
          };
        }
      } else if (m.infusionAction === "STOP" && m.infusionSessionKey && active?.sessionKey === m.infusionSessionKey) {
        active = null;
      }
    }
    return active;
  }

  /**
   * IVPB / infusion — OrderItem → IN_PROGRESS, infusion START OrderEvent, and in-progress MAR (Phase 15F-B.1).
   * Billing and line completion occur only on STOP.
   */
  async startMedicationInfusion(
    facilityId: string,
    orderItemId: string,
    dto: MedicationInfusionStartDto,
    requestorRoleCodes: RoleCode[],
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      include: {
        order: { include: { encounter: { include: { patient: true } } } },
      },
    });
    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }
    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    if (orderItem.catalogItemType !== "MEDICATION") {
      throw new BadRequestException("Seules les lignes de médicament supportent la perfusion IV.");
    }
    if (!isMedicationAdministerChart(orderItem)) {
      throw new BadRequestException(
        "La perfusion IV documentée ici concerne uniquement les médicaments administrés au lit (ADMINISTER_CHART)."
      );
    }
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    if (!userId) {
      throw new ForbiddenException("Authentification requise pour démarrer une perfusion.");
    }
    if (orderItem.status === OrderStatus.COMPLETED || orderItem.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Ligne déjà terminée ou annulée.");
    }

    const { resolvedRoute, catalog } = await loadMedicationInfusionClassificationContext(this.prisma, orderItem);
    const candidateInput = buildMedicationInfusionCandidateInputFromOrderItem(orderItem, catalog, resolvedRoute);
    if (!isMedicationInfusionCandidate(candidateInput)) {
      throw new BadRequestException(
        "Cette ligne n’est pas éligible à la perfusion (voie / libellé). Utilisez l’administration au lit habituelle."
      );
    }
    const routeResolved = (resolvedRoute ?? "").trim() || (candidateInput.route ?? "").trim() || "IV";

    const infusionEvents = await this.prisma.orderEvent.findMany({
      where: { orderId: orderItem.orderId },
      orderBy: { performedAt: "asc" },
      select: { eventType: true, metadata: true },
    });
    if (this.findActiveMedicationInfusionSession(orderItemId, infusionEvents)) {
      throw new BadRequestException("Une perfusion est déjà en cours pour cette ligne.");
    }

    const infusionSessionKey = randomUUID();
    const infusionStartedAt = new Date();
    const startedIso = infusionStartedAt.toISOString();
    const identitySnapshot = await this.loadInfusionPerformerIdentitySnapshot(
      facilityId,
      userId,
      requestorRoleCodes
    );

    const startMetaRaw: Record<string, unknown> = {
      infusionScope: "MEDICATION_INFUSION",
      infusionAction: "START",
      orderItemId,
      infusionSessionKey,
      infusionStartedAt: startedIso,
      route: routeResolved,
      source: "IV_INFUSION",
      ...(dto.notes?.trim() ? { note: dto.notes.trim() } : {}),
      ...identitySnapshot,
    };
    const startMeta = stripUndefinedDeep(startMetaRaw) as Prisma.InputJsonValue;

    await this.prisma.$transaction(async (tx) => {
      if (orderItem.status !== OrderStatus.IN_PROGRESS) {
        assertCanTransition(orderItem.status, OrderStatus.IN_PROGRESS);
        const lifecycleState = applyLifecycleWithStatus(orderItem.lifecycleState, OrderStatus.IN_PROGRESS);
        await tx.orderItem.update({
          where: { id: orderItemId },
          data: { status: OrderStatus.IN_PROGRESS, lifecycleState },
        });
      }
      await this.writeOrderEvent({
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderId: orderItem.orderId,
        orderType: orderItem.order.type,
        eventType: OrderEventType.STARTED,
        performedByUserId: userId,
        metadata: startMeta,
        roleSnapshotOverride: identitySnapshot.performedByRoleSnapshot,
        tx,
      });
    });

    const startMar = await this.medicationAdministration.createInfusionStartMar(
      orderItem.order.encounterId,
      facilityId,
      userId,
      {
        orderItemId,
        infusionSessionKey,
        startedAt: infusionStartedAt,
        route: routeResolved,
        notes: dto.notes,
      }
    );

    const startMetaWithMar: Record<string, unknown> = {
      ...startMetaRaw,
      medicationAdministrationId: startMar.id,
    };
    const startMetaLinked = stripUndefinedDeep(startMetaWithMar) as Prisma.InputJsonValue;

    await this.patchInfusionOrderEventMedicationAdministrationId({
      orderId: orderItem.orderId,
      infusionSessionKey,
      infusionAction: "START",
      medicationAdministrationId: startMar.id,
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
      critical: true,
      metadata: startMetaLinked,
    });

    const refreshed = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      include: { order: true },
    });
    if (!refreshed) {
      throw new NotFoundException("Order item not found");
    }
    return refreshed;
  }

  /** Attach MAR id to infusion OrderEvent metadata after START MAR row is created (idempotent). */
  private async patchInfusionOrderEventMedicationAdministrationId(input: {
    orderId: string;
    infusionSessionKey: string;
    infusionAction: "START" | "STOP";
    medicationAdministrationId: string;
  }) {
    const events = await this.prisma.orderEvent.findMany({
      where: {
        orderId: input.orderId,
        eventType:
          input.infusionAction === "START" ? OrderEventType.STARTED : OrderEventType.COMPLETED,
      },
      orderBy: { performedAt: "desc" },
      take: 20,
      select: { id: true, metadata: true },
    });
    const match = events.find((ev) => {
      const m = ev.metadata as Record<string, unknown> | null;
      return (
        m?.infusionScope === "MEDICATION_INFUSION" &&
        m?.infusionAction === input.infusionAction &&
        m?.infusionSessionKey === input.infusionSessionKey
      );
    });
    if (!match) return;
    const prior = (match.metadata as Record<string, unknown> | null) ?? {};
    if (prior.medicationAdministrationId === input.medicationAdministrationId) return;
    const merged = stripUndefinedDeep({
      ...prior,
      medicationAdministrationId: input.medicationAdministrationId,
    }) as Prisma.InputJsonValue;
    await this.prisma.orderEvent.update({
      where: { id: match.id },
      data: { metadata: merged },
    });
  }

  /**
   * IVPB / infusion — Phase 1: terminal MAR administered + line completion + infusion STOP OrderEvent/audit.
   * Billing runs only inside MedicationAdministrationService.create when marAction is administered.
   */
  async stopMedicationInfusion(
    facilityId: string,
    orderItemId: string,
    dto: MedicationInfusionStopDto,
    requestorRoleCodes: RoleCode[],
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      include: {
        order: { include: { encounter: { include: { patient: true } } } },
      },
    });
    if (!orderItem) {
      throw new NotFoundException("Order item not found");
    }
    assertEncounterOpenForClinicalMutation(orderItem.order.encounter);
    assertEncounterNotSigned(orderItem.order.encounter);
    assertParentOrderNotCancelled(orderItem.order.status);
    if (orderItem.catalogItemType !== "MEDICATION") {
      throw new BadRequestException("Seules les lignes de médicament supportent la perfusion IV.");
    }
    if (!isMedicationAdministerChart(orderItem)) {
      throw new BadRequestException(
        "La perfusion IV documentée ici concerne uniquement les médicaments administrés au lit (ADMINISTER_CHART)."
      );
    }
    assertAckOrStartActor(orderItem, requestorRoleCodes);
    if (!userId) {
      throw new ForbiddenException("Authentification requise pour arrêter une perfusion.");
    }
    if (orderItem.status === OrderStatus.COMPLETED || orderItem.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Ligne déjà terminée ou annulée.");
    }

    const { resolvedRoute, catalog } = await loadMedicationInfusionClassificationContext(this.prisma, orderItem);
    const candidateInput = buildMedicationInfusionCandidateInputFromOrderItem(orderItem, catalog, resolvedRoute);
    if (!isMedicationInfusionCandidate(candidateInput)) {
      throw new BadRequestException(
        "Cette ligne n’est pas éligible à la perfusion (voie / libellé). Utilisez l’administration au lit habituelle."
      );
    }
    const routeResolved = (resolvedRoute ?? "").trim() || (candidateInput.route ?? "").trim() || "IV";

    const infusionEvents = await this.prisma.orderEvent.findMany({
      where: { orderId: orderItem.orderId },
      orderBy: { performedAt: "asc" },
      select: { eventType: true, metadata: true },
    });
    const active = this.findActiveMedicationInfusionSession(orderItemId, infusionEvents);
    if (!active) {
      throw new BadRequestException("Aucune perfusion en cours pour cette ligne.");
    }

    const stoppedAt = dto.stoppedAt ?? new Date();
    if (Number.isNaN(stoppedAt.getTime())) {
      throw new BadRequestException("Horodatage d’arrêt invalide.");
    }
    if (stoppedAt.getTime() < active.startedAt.getTime()) {
      throw new BadRequestException("L’heure d’arrêt ne peut pas précéder le début de perfusion.");
    }
    const durationMinutes = Math.max(
      0,
      Math.floor((stoppedAt.getTime() - active.startedAt.getTime()) / 60_000)
    );

    const autoNote = `Perfusion IV terminée — durée : ${durationMinutes} min`;
    const notesCombined = [autoNote, dto.notes?.trim()].filter(Boolean).join("\n\n");

    const routeForMar =
      orderItem.route?.trim() || active.route.trim() || routeResolved || undefined;

    const alreadyStopped = await this.prisma.orderEvent.findFirst({
      where: {
        facilityId,
        orderId: orderItem.orderId,
        eventType: OrderEventType.COMPLETED,
        AND: [
          { metadata: { path: ["infusionScope"], equals: "MEDICATION_INFUSION" } as Prisma.JsonFilter },
          { metadata: { path: ["infusionAction"], equals: "STOP" } as Prisma.JsonFilter },
          { metadata: { path: ["orderItemId"], equals: orderItemId } as Prisma.JsonFilter },
        ],
      },
    });
    if (alreadyStopped) {
      throw new BadRequestException("Infusion already stopped");
    }

    /**
     * If the terminal MAR row was persisted but the infusion STOP OrderEvent failed afterward
     * (e.g. billing append conflict, network), a retry would hit the MAR duplicate window guard.
     * Recover by writing the STOP event + audit only, reusing the existing MAR and timestamps.
     */
    const TERMINAL_INFUSION_MAR_NOTE_PREFIX = "Perfusion IV terminée";
    const orphanTerminalMar = await this.prisma.medicationAdministration.findFirst({
      where: {
        facilityId,
        encounterId: orderItem.order.encounterId,
        orderItemId,
        marAction: MedicationMarAction.administered,
        administeredAt: { gte: active.startedAt },
        notes: { startsWith: TERMINAL_INFUSION_MAR_NOTE_PREFIX },
      },
      orderBy: { administeredAt: "desc" },
    });
    if (orphanTerminalMar) {
      const stopLinkedToOrphan = await this.prisma.orderEvent.findFirst({
        where: {
          facilityId,
          orderId: orderItem.orderId,
          eventType: OrderEventType.COMPLETED,
          AND: [
            { metadata: { path: ["infusionScope"], equals: "MEDICATION_INFUSION" } as Prisma.JsonFilter },
            { metadata: { path: ["infusionAction"], equals: "STOP" } as Prisma.JsonFilter },
            {
              metadata: { path: ["medicationAdministrationId"], equals: orphanTerminalMar.id } as Prisma.JsonFilter,
            },
          ],
        },
      });
      if (!stopLinkedToOrphan) {
        const recoveredStoppedAt =
          orphanTerminalMar.administeredAt instanceof Date
            ? orphanTerminalMar.administeredAt
            : new Date(orphanTerminalMar.administeredAt);
        if (Number.isNaN(recoveredStoppedAt.getTime())) {
          throw new BadRequestException("Horodatage d’arrêt invalide.");
        }
        if (recoveredStoppedAt.getTime() < active.startedAt.getTime()) {
          throw new BadRequestException("L’heure d’arrêt ne peut pas précéder le début de perfusion.");
        }
        const recoveredDurationMinutes = Math.max(
          0,
          Math.floor((recoveredStoppedAt.getTime() - active.startedAt.getTime()) / 60_000)
        );
        const identitySnapshotRecover = await this.loadInfusionPerformerIdentitySnapshot(
          facilityId,
          userId,
          requestorRoleCodes
        );
        const startedIsoRecover = active.startedAt.toISOString();
        const stoppedIsoRecover = recoveredStoppedAt.toISOString();
        const stopMetaRecoverRaw: Record<string, unknown> = {
          infusionScope: "MEDICATION_INFUSION",
          infusionAction: "STOP",
          orderItemId,
          medicationAdministrationId: orphanTerminalMar.id,
          infusionSessionKey: active.sessionKey,
          infusionStartedAt: startedIsoRecover,
          infusionStoppedAt: stoppedIsoRecover,
          durationMinutes: recoveredDurationMinutes,
          route: routeResolved,
          source: "IV_INFUSION",
          ...identitySnapshotRecover,
        };
        const stopMetaRecover = stripUndefinedDeep(stopMetaRecoverRaw) as Prisma.InputJsonValue;
        await this.writeOrderEvent({
          facilityId,
          encounterId: orderItem.order.encounterId,
          orderId: orderItem.orderId,
          orderType: orderItem.order.type,
          eventType: OrderEventType.COMPLETED,
          performedByUserId: userId,
          metadata: stopMetaRecover,
          roleSnapshotOverride: identitySnapshotRecover.performedByRoleSnapshot,
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
          critical: true,
          metadata: stopMetaRecover,
        });
        const refreshedRecover = await this.prisma.orderItem.findFirst({
          where: { id: orderItemId, order: { facilityId } },
          include: { order: true },
        });
        return {
          orderItem: refreshedRecover,
          medicationAdministration: orphanTerminalMar,
          durationMinutes: recoveredDurationMinutes,
        };
      }
    }

    const identitySnapshot = await this.loadInfusionPerformerIdentitySnapshot(
      facilityId,
      userId,
      requestorRoleCodes
    );

    const stoppedIso = stoppedAt.toISOString();
    const startedIso = active.startedAt.toISOString();

    const marRow = await this.medicationAdministration.create(
      orderItem.order.encounterId,
      facilityId,
      userId,
      {
        orderItemId,
        marAction: "administered",
        administeredAt: stoppedAt,
        ...(routeForMar ? { route: routeForMar } : {}),
        notes: notesCombined,
        safetyAcknowledgedMedicationAllergies: dto.safetyAcknowledgedMedicationAllergies,
      },
      {
        allowAdministeredForInfusionTerminal: true,
        skipAutoMedicationCatalogBilling: true,
        skipDuplicateAdministeredWindowCheck: true,
        infusionMar: {
          infusionSessionKey: active.sessionKey,
          infusionPhase: "INFUSION_STOP",
        },
        infusionBillingEvidence: {
          infusionSessionKey: active.sessionKey,
          infusionStartedAtIso: startedIso,
          infusionStoppedAtIso: stoppedIso,
          infusionDurationMinutes: durationMinutes,
          orderItemId,
        },
      }
    );

    const stopMetaRaw: Record<string, unknown> = {
      infusionScope: "MEDICATION_INFUSION",
      infusionAction: "STOP",
      orderItemId,
      medicationAdministrationId: marRow.id,
      infusionSessionKey: active.sessionKey,
      infusionStartedAt: startedIso,
      infusionStoppedAt: stoppedIso,
      durationMinutes,
      route: routeResolved,
      source: "IV_INFUSION",
      ...identitySnapshot,
    };
    const stopMeta = stripUndefinedDeep(stopMetaRaw) as Prisma.InputJsonValue;

    await this.writeOrderEvent({
      facilityId,
      encounterId: orderItem.order.encounterId,
      orderId: orderItem.orderId,
      orderType: orderItem.order.type,
      eventType: OrderEventType.COMPLETED,
      performedByUserId: userId,
      metadata: stopMeta,
      roleSnapshotOverride: identitySnapshot.performedByRoleSnapshot,
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
      critical: true,
      metadata: stopMeta,
    });

    const refreshed = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      include: { order: true },
    });
    return { orderItem: refreshed, medicationAdministration: marRow, durationMinutes };
  }
}
