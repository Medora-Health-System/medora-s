import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  loadOrderMedicationCatalogMaps,
  resolveOrderMedicationCatalogRow,
  type OrderMedicationCatalogRow,
} from "../orders/order-medication-catalog-resolve.util";
import { parseFhirReference, parseLogicalId } from "./fhir-protocol";
import { FhirSearchService, searchBundle } from "./fhir-search";

const MEDORA_MEDICATION_SYSTEM = "https://medora.app/fhir/CodeSystem/medication-catalog";
const NDC_SYSTEM = "http://hl7.org/fhir/sid/ndc";
const ADMIN_BATCH_SIZE = 200;

export const MEDICATION_REQUEST_STATUS = {
  DRAFT: "draft",
  PENDING: "active",
  PLACED: "active",
  SIGNED: "active",
  ACKNOWLEDGED: "active",
  IN_PROGRESS: "active",
  RESULTED: "completed",
  VERIFIED: "completed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const satisfies Record<OrderStatus, string>;

export type FhirMedicationRequestStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "draft";

export type FhirMedicationAdministrationStatus =
  | "in-progress"
  | "not-done"
  | "completed"
  | "unknown";

export function medicationRequestStatus(status: OrderStatus): FhirMedicationRequestStatus {
  const mapped = MEDICATION_REQUEST_STATUS[status] as FhirMedicationRequestStatus | undefined;
  if (!mapped) throw new Error("Unmapped medication order status");
  return mapped;
}

export function medicationRequestOrderStatuses(status: string): OrderStatus[] {
  if (!["active", "completed", "cancelled", "draft"].includes(status)) {
    throw new BadRequestException("Unsupported MedicationRequest status");
  }
  return Object.values(OrderStatus).filter(
    (candidate) => MEDICATION_REQUEST_STATUS[candidate] === status,
  );
}

export function medicationAdministrationStatus(row: {
  marAction?: unknown;
  infusionPhase?: unknown;
}): FhirMedicationAdministrationStatus {
  const phase = String(row.infusionPhase ?? "").toUpperCase();
  if (phase === "INFUSION_START") return "in-progress";
  if (phase === "INFUSION_STOP") return "completed";
  const action = String(row.marAction ?? "").toLowerCase();
  if (action === "administered") return "completed";
  if (["refused", "held", "missed", "not_available"].includes(action)) return "not-done";
  return "unknown";
}

function medicationLabel(item: any, catalog: OrderMedicationCatalogRow | null): string {
  return (
    item?.manualLabel?.trim?.() ||
    catalog?.displayNameEn?.trim() ||
    catalog?.genericName?.trim() ||
    catalog?.name?.trim() ||
    catalog?.code?.trim() ||
    "Medication"
  );
}

function requestMedicationConcept(item: any, catalog: OrderMedicationCatalogRow | null) {
  const text = medicationLabel(item, catalog);
  return {
    ...(catalog?.code
      ? {
          coding: [
            {
              system: MEDORA_MEDICATION_SYSTEM,
              code: catalog.code,
              display: text,
            },
          ],
        }
      : {}),
    text,
  };
}

function administrationMedicationConcept(row: any, item: any, catalog: OrderMedicationCatalogRow | null) {
  const text = row.medicationLabelSnapshot?.trim?.() || medicationLabel(item, catalog);
  const ndc = typeof row.ndc11Snapshot === "string" && /^\d{11}$/.test(row.ndc11Snapshot)
    ? row.ndc11Snapshot
    : null;
  return {
    ...(ndc
      ? { coding: [{ system: NDC_SYSTEM, code: ndc, display: text }] }
      : catalog?.code
        ? { coding: [{ system: MEDORA_MEDICATION_SYSTEM, code: catalog.code, display: text }] }
        : {}),
    text,
  };
}

function iso(value: unknown): string | undefined {
  if (!(value instanceof Date) && typeof value !== "string") return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function positiveNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function mapMedicationRequest(row: any, catalog: OrderMedicationCatalogRow | null) {
  const order = row.order;
  const strength = typeof row.strength === "string" ? row.strength.trim() : "";
  const directions = typeof row.notes === "string" ? row.notes.trim() : "";
  const instructionText = [strength, directions].filter(Boolean).join(" — ");
  const route = typeof row.route === "string" ? row.route.trim() : "";
  const frequency = typeof row.frequencyCode === "string" ? row.frequencyCode.trim() : "";
  const repeats = positiveNumber(row.refillCount);
  const quantity = positiveNumber(row.quantity);
  return {
    resourceType: "MedicationRequest",
    id: row.id,
    status: medicationRequestStatus(row.status),
    intent: "order",
    medicationCodeableConcept: requestMedicationConcept(row, catalog),
    subject: { reference: `Patient/${order.patientId}` },
    ...(order.encounterId ? { encounter: { reference: `Encounter/${order.encounterId}` } } : {}),
    ...(iso(order.createdAt) ? { authoredOn: iso(order.createdAt) } : {}),
    ...(order.orderedByUserId
      ? { requester: { reference: `Practitioner/${order.orderedByUserId}` } }
      : {}),
    ...(instructionText || route || frequency
      ? {
          dosageInstruction: [
            {
              ...(instructionText ? { text: instructionText } : {}),
              ...(route ? { route: { text: route } } : {}),
              ...(frequency ? { timing: { code: { text: frequency } } } : {}),
            },
          ],
        }
      : {}),
    ...(repeats !== undefined || quantity !== undefined
      ? {
          dispenseRequest: {
            ...(repeats !== undefined ? { numberOfRepeatsAllowed: repeats } : {}),
            ...(quantity !== undefined ? { quantity: { value: quantity } } : {}),
          },
        }
      : {}),
  };
}

export function mapMedicationAdministration(
  row: any,
  catalog: OrderMedicationCatalogRow | null,
) {
  const item = row.orderItem ?? null;
  const effective = iso(row.effectiveAdministeredAt) ?? iso(row.administeredAt);
  const doseValue = positiveNumber(row.doseValue) ?? positiveNumber(row.administeredQuantity);
  const doseUnit =
    (typeof row.doseUnit === "string" && row.doseUnit.trim()) ||
    (typeof row.quantityUnit === "string" && row.quantityUnit.trim()) ||
    "";
  const route = typeof row.route === "string" ? row.route.trim() : "";
  const action = String(row.marAction ?? "").toLowerCase();
  return {
    resourceType: "MedicationAdministration",
    id: row.id,
    status: medicationAdministrationStatus(row),
    medicationCodeableConcept: administrationMedicationConcept(row, item, catalog),
    subject: { reference: `Patient/${row.patientId}` },
    context: { reference: `Encounter/${row.encounterId}` },
    ...(row.orderItemId ? { request: { reference: `MedicationRequest/${row.orderItemId}` } } : {}),
    ...(effective ? { effectiveDateTime: effective } : {}),
    ...(row.administeredByUserId
      ? { performer: [{ actor: { reference: `Practitioner/${row.administeredByUserId}` } }] }
      : {}),
    ...(route || doseValue !== undefined
      ? {
          dosage: {
            ...(route ? { route: { text: route } } : {}),
            ...(doseValue !== undefined
              ? { dose: { value: doseValue, ...(doseUnit ? { unit: doseUnit } : {}) } }
              : {}),
          },
        }
      : {}),
    ...(["refused", "held", "missed", "not_available"].includes(action)
      ? { statusReason: [{ text: action.replaceAll("_", " ") }] }
      : {}),
  };
}

function sameReferencePair(a?: string, b?: string): string | undefined {
  if (a && b && a !== b) return "__mismatch__";
  return a ?? b;
}

@Injectable()
export class FhirMedicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: FhirSearchService,
  ) {}

  async readRequest(facilityId: string, rawId: string) {
    const id = parseLogicalId(rawId);
    const row = await this.prisma.orderItem.findFirst({
      where: { id, catalogItemType: "MEDICATION", order: { facilityId } },
      include: { order: true },
    });
    if (!row) throw new NotFoundException("MedicationRequest not found");
    const maps = await loadOrderMedicationCatalogMaps(this.prisma, [row]);
    return mapMedicationRequest(row, resolveOrderMedicationCatalogRow(row, maps));
  }

  async findRequests(facilityId: string, query: Record<string, unknown>) {
    const parsed = this.search.parse(query, [
      "_id",
      "patient",
      "subject",
      "encounter",
      "status",
      "intent",
      "_count",
      "_cursor",
    ]);
    const v = parsed.values;
    const patient = sameReferencePair(
      v.patient ? parseFhirReference(v.patient, "Patient").id : undefined,
      v.subject ? parseFhirReference(v.subject, "Patient").id : undefined,
    );
    if (patient === "__mismatch__") {
      return searchBundle(this.search.baseUrl(), "MedicationRequest", query, [], false);
    }
    const encounter = v.encounter ? parseFhirReference(v.encounter, "Encounter").id : undefined;
    if (v.intent && v.intent !== "order") throw new BadRequestException("Unsupported MedicationRequest intent");
    const statuses = v.status ? medicationRequestOrderStatuses(v.status) : undefined;
    const id = v._id ? parseLogicalId(v._id) : undefined;
    const rows = await this.prisma.orderItem.findMany({
      where: {
        id: id ?? (parsed.cursor ? { gt: parsed.cursor } : undefined),
        catalogItemType: "MEDICATION",
        ...(statuses ? { status: { in: statuses } } : {}),
        order: {
          facilityId,
          ...(patient ? { patientId: patient } : {}),
          ...(encounter ? { encounterId: encounter } : {}),
        },
      },
      include: { order: true },
      orderBy: { id: "asc" },
      take: parsed.count + 1,
    });
    const maps = await loadOrderMedicationCatalogMaps(this.prisma, rows);
    const resources = rows.slice(0, parsed.count).map((row) =>
      mapMedicationRequest(row, resolveOrderMedicationCatalogRow(row, maps)),
    );
    return searchBundle(
      this.search.baseUrl(),
      "MedicationRequest",
      query,
      resources,
      rows.length > parsed.count,
    );
  }

  async readAdministration(facilityId: string, rawId: string) {
    const id = parseLogicalId(rawId);
    const row = await this.prisma.medicationAdministration.findFirst({
      where: { id, facilityId },
      include: { orderItem: true },
    });
    if (!row) throw new NotFoundException("MedicationAdministration not found");
    const items = row.orderItem ? [row.orderItem] : [];
    const maps = await loadOrderMedicationCatalogMaps(this.prisma, items);
    const catalog = row.orderItem ? resolveOrderMedicationCatalogRow(row.orderItem, maps) : null;
    return mapMedicationAdministration(row, catalog);
  }

  async findAdministrations(facilityId: string, query: Record<string, unknown>) {
    const parsed = this.search.parse(query, [
      "_id",
      "patient",
      "subject",
      "encounter",
      "request",
      "status",
      "_count",
      "_cursor",
    ]);
    const v = parsed.values;
    const patient = sameReferencePair(
      v.patient ? parseFhirReference(v.patient, "Patient").id : undefined,
      v.subject ? parseFhirReference(v.subject, "Patient").id : undefined,
    );
    if (patient === "__mismatch__") {
      return searchBundle(this.search.baseUrl(), "MedicationAdministration", query, [], false);
    }
    const encounter = v.encounter ? parseFhirReference(v.encounter, "Encounter").id : undefined;
    const requestId = v.request ? parseFhirReference(v.request, "MedicationRequest").id : undefined;
    const allowedStatuses: FhirMedicationAdministrationStatus[] = [
      "in-progress",
      "not-done",
      "completed",
      "unknown",
    ];
    if (v.status && !allowedStatuses.includes(v.status as FhirMedicationAdministrationStatus)) {
      throw new BadRequestException("Unsupported MedicationAdministration status");
    }
    const id = v._id ? parseLogicalId(v._id) : undefined;
    const matches: any[] = [];
    let cursor = parsed.cursor;

    while (matches.length <= parsed.count) {
      const rows = await this.prisma.medicationAdministration.findMany({
        where: {
          facilityId,
          ...(id ? { id } : cursor ? { id: { gt: cursor } } : {}),
          ...(patient ? { patientId: patient } : {}),
          ...(encounter ? { encounterId: encounter } : {}),
          ...(requestId ? { orderItemId: requestId } : {}),
        },
        include: { orderItem: true },
        orderBy: { id: "asc" },
        take: id ? 1 : ADMIN_BATCH_SIZE,
      });
      if (!rows.length) break;
      const items = rows.flatMap((row) => (row.orderItem ? [row.orderItem] : []));
      const maps = await loadOrderMedicationCatalogMaps(this.prisma, items);
      for (const row of rows) {
        const catalog = row.orderItem
          ? resolveOrderMedicationCatalogRow(row.orderItem, maps)
          : null;
        const resource = mapMedicationAdministration(row, catalog);
        if (v.status && resource.status !== v.status) continue;
        matches.push(resource);
        if (matches.length > parsed.count) break;
      }
      if (id || matches.length > parsed.count || rows.length < ADMIN_BATCH_SIZE) break;
      cursor = rows.at(-1)!.id;
    }

    const page = matches.slice(0, parsed.count);
    return searchBundle(
      this.search.baseUrl(),
      "MedicationAdministration",
      query,
      page,
      matches.length > parsed.count,
    );
  }
}
