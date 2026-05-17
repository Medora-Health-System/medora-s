import { Injectable, NotFoundException } from "@nestjs/common";
import {
  aggregateUnifiedEncounterTimeline,
  capUnifiedTimeline,
  clinicalTimelineDisplayLabelFr,
  resolveClinicalTimelineDisplayEventType,
  type UnifiedTimelineSourceRow,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 200;

function userDisplayName(u: { firstName: string | null; lastName: string | null } | null | undefined): string {
  if (!u) return "";
  return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
}

function toIso(d: Date | null | undefined): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function observationTemplateTimelineTitleFr(
  eventType: string,
  lineLabelFr: string | null,
  metadata?: Record<string, unknown> | null
): string | null {
  if (metadata?.source !== "OBSERVATION_TEMPLATE_ORDER") return null;
  const line = lineLabelFr?.trim();
  const et = eventType.toUpperCase();
  const lifecycle =
    typeof metadata.lifecycleOutcome === "string" ? metadata.lifecycleOutcome.toUpperCase() : "";
  if (et === "CREATED") {
    return line ? `${line} — prescrit (observation)` : "Ordre observation prescrit";
  }
  if (et === "STARTED" && lifecycle === "ACKNOWLEDGED") {
    return line ? `${line} — accusé réception` : "Ordre observation accusé réception";
  }
  if (et === "STARTED") {
    return line ? `${line} — en cours` : "Ordre observation démarré";
  }
  if (et === "COMPLETED") {
    return line ? `${line} — terminé` : "Ordre observation terminé";
  }
  if (et === "CANCELLED") {
    return line ? `${line} — annulé` : "Ordre observation annulé";
  }
  return null;
}

function orderEventTitleFr(
  eventType: string,
  orderType: string,
  lineLabelFr: string | null,
  metadata?: Record<string, unknown> | null
): string {
  const templateTitle = observationTemplateTimelineTitleFr(eventType, lineLabelFr, metadata);
  if (templateTitle) return templateTitle;

  const et = eventType.toUpperCase();
  const ot = orderType.toUpperCase();
  const lifecycle =
    metadata && typeof metadata.lifecycleOutcome === "string"
      ? metadata.lifecycleOutcome.toUpperCase()
      : "";
  if (et === "STARTED" && lifecycle === "ACKNOWLEDGED") {
    const line = lineLabelFr?.trim();
    return line ? `Ordre accusé réception — ${line}` : "Ordre accusé réception";
  }
  if (lineLabelFr?.trim() && et !== "STARTED") return lineLabelFr.trim();
  if (et === "CREATED") {
    if (ot === "LAB") return "Prescription laboratoire";
    if (ot === "IMAGING") return "Prescription imagerie";
    if (ot === "MEDICATION") return "Prescription médicament";
    if (ot === "CARE") return "Ordre de soins / procédure";
  }
  if (et === "COMPLETED") {
    if (ot === "LAB") return "Laboratoire — étape terminée";
    if (ot === "IMAGING") return "Imagerie — étape terminée";
    if (ot === "CARE") return "Soins / procédure terminés";
  }
  if (et === "CANCELLED") {
    const line = lineLabelFr?.trim();
    if (line && metadata?.orderItemId) return `${line} — ligne annulée`;
    return "Ordre annulé";
  }
  if (et === "STARTED" && ot === "MEDICATION") return "Perfusion démarrée";
  if (et === "STARTED" && ot === "CARE") {
    const line = lineLabelFr?.trim();
    return line ? `${line} — démarré` : "Soins / procédure démarrés";
  }
  return `Ordre — ${et}`;
}

@Injectable()
export class UnifiedEncounterTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnifiedTimeline(facilityId: string, encounterId: string, limitRaw?: number) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }

    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw!), 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const [clinicalRows, orderEvents, marRows, resultRows] = await Promise.all([
      this.prisma.encounterClinicalEvent.findMany({
        where: { encounterId, facilityId },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.orderEvent.findMany({
        where: { encounterId, facilityId },
        orderBy: { performedAt: "asc" },
        include: {
          performedBy: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, type: true } },
        },
      }),
      this.prisma.medicationAdministration.findMany({
        where: { encounterId, facilityId },
        orderBy: { administeredAt: "asc" },
        include: {
          administeredBy: { select: { id: true, firstName: true, lastName: true } },
          orderItem: { select: { id: true, orderId: true } },
        },
      }),
      this.prisma.result.findMany({
        where: {
          facilityId,
          verifiedAt: { not: null },
          orderItem: { order: { encounterId, facilityId } },
        },
        orderBy: { verifiedAt: "asc" },
        select: {
          id: true,
          orderItemId: true,
          verifiedAt: true,
          effectiveResultedAt: true,
          effectiveResultedAtVersion: true,
          effectiveFinalizedAt: true,
          effectiveFinalizedAtVersion: true,
          verifiedByUserId: true,
          orderItem: {
            select: {
              id: true,
              orderId: true,
              catalogItemType: true,
              manualLabel: true,
              order: { select: { type: true } },
            },
          },
        },
      }),
    ]);

    const sourceRows: UnifiedTimelineSourceRow[] = [];

    for (const r of clinicalRows) {
      const displayType = resolveClinicalTimelineDisplayEventType({
        eventType: r.eventType,
        payloadJson: r.payloadJson,
      });
      sourceRows.push({
        sourceKind: "ENCOUNTER_CLINICAL_EVENT",
        sourceId: r.id,
        storedEventType: r.eventType,
        documentedAtIso: r.createdAt.toISOString(),
        actorUserId: r.createdByUserId,
        actorDisplayName: userDisplayName(r.createdBy),
        titleFr: clinicalTimelineDisplayLabelFr(displayType),
        payloadJson: r.payloadJson,
      });
    }

    for (const e of orderEvents) {
      const meta = asRecord(e.metadata);
      const lineLabelFr =
        typeof meta?.lineLabelFr === "string" ? meta.lineLabelFr : null;
      sourceRows.push({
        sourceKind: "ORDER_EVENT",
        sourceId: e.id,
        storedEventType: e.eventType,
        documentedAtIso: e.performedAt.toISOString(),
        actorUserId: e.performedByUserId,
        actorDisplayName: userDisplayName(e.performedBy),
        actorRole: e.roleSnapshot,
        sourceDepartment: e.roleSnapshot,
        orderType: e.orderType,
        orderId: e.orderId,
        orderItemId:
          typeof meta?.orderItemId === "string" ? meta.orderItemId : null,
        titleFr: orderEventTitleFr(e.eventType, e.orderType, lineLabelFr, meta),
        payloadJson: e.metadata,
        dedupeKey:
          typeof meta?.dedupeKey === "string" ? meta.dedupeKey : undefined,
      });
    }

    for (const m of marRows) {
      const label = m.medicationLabelSnapshot?.trim() || "Médicament";
      const action = m.marAction?.trim() || "administered";
      sourceRows.push({
        sourceKind: "MEDICATION_ADMINISTRATION",
        sourceId: m.id,
        storedEventType: action.toUpperCase(),
        documentedAtIso: m.administeredAt.toISOString(),
        effectiveClinicalAtIso: toIso(m.effectiveAdministeredAt),
        adjustmentVersion: m.effectiveAdministeredAtVersion ?? 0,
        actorUserId: m.administeredByUserId,
        actorDisplayName: userDisplayName(m.administeredBy),
        actorRole: "RN",
        sourceDepartment: "RN",
        orderType: "MEDICATION",
        orderId: m.orderItem?.orderId ?? null,
        orderItemId: m.orderItemId,
        titleFr: `Administration — ${label}`,
        summaryFr: m.notes?.trim() || null,
        dedupeKey: `mar:${m.id}`,
      });
    }

    const verifierIds = [
      ...new Set(resultRows.map((r) => r.verifiedByUserId).filter((id): id is string => Boolean(id))),
    ];
    const verifiers =
      verifierIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: verifierIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const verifierNameById = new Map(verifiers.map((u) => [u.id, userDisplayName(u)]));

    for (const res of resultRows) {
      if (!res.verifiedAt) continue;
      const orderType = res.orderItem.order.type;
      const isImaging = orderType === "IMAGING";
      const effective = isImaging ? res.effectiveFinalizedAt : res.effectiveResultedAt;
      const version = isImaging
        ? res.effectiveFinalizedAtVersion
        : res.effectiveResultedAtVersion;
      const label =
        res.orderItem.manualLabel?.trim() ||
        res.orderItem.catalogItemType?.trim() ||
        "Résultat";
      const verifiedByName = res.verifiedByUserId
        ? verifierNameById.get(res.verifiedByUserId) ?? ""
        : "";
      sourceRows.push({
        sourceKind: "ORDER_ITEM_RESULT",
        sourceId: res.id,
        storedEventType: isImaging ? "RESULT_FINALIZED" : "RESULT_RECORDED",
        documentedAtIso: res.verifiedAt.toISOString(),
        effectiveClinicalAtIso: toIso(effective),
        adjustmentVersion: version ?? 0,
        actorUserId: res.verifiedByUserId,
        actorDisplayName: verifiedByName || null,
        sourceDepartment: isImaging ? "RADIOLOGY" : "LAB",
        orderType,
        orderId: res.orderItem.orderId,
        orderItemId: res.orderItemId,
        titleFr: isImaging ? `Résultat imagerie — ${label}` : `Résultat labo — ${label}`,
        dedupeKey: `result:${res.orderItemId}`,
      });
    }

    const aggregated = aggregateUnifiedEncounterTimeline(sourceRows, { newestFirst: true });
    const capped = capUnifiedTimeline(aggregated, limit, true);

    return {
      encounterId,
      capped: capped.capped,
      limit,
      totalBeforeDedupe: capped.totalBeforeDedupe,
      totalAfterDedupe: capped.totalAfterDedupe,
      items: capped.items,
    };
  }
}
