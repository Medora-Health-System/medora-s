import { Injectable, NotFoundException } from "@nestjs/common";
import {
  aggregateUnifiedEncounterTimeline,
  buildUnifiedClinicalEventTitle,
  buildUnifiedMarAdministrationTitle,
  buildUnifiedOrderEventTitle,
  buildUnifiedResultTitle,
  capUnifiedTimeline,
  resolveClinicalTimelineDisplayEventType,
  resolveUnifiedTimelineOrderLineLabel,
  type UnifiedTimelineSourceRow,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { loadMedicationGovernanceEncounterBundle } from "../medication-safety/medication-governance-chart.util";

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

function orderEventTitles(
  eventType: string,
  orderType: string,
  meta: Record<string, unknown> | null,
  lineLabelFr: string | null
): { titleFr: string; titleEn: string } {
  const lineEn = resolveUnifiedTimelineOrderLineLabel({
    metadata: meta,
    lineLabelFr,
    locale: "en",
  });
  const lineFr = resolveUnifiedTimelineOrderLineLabel({
    metadata: meta,
    lineLabelFr,
    locale: "fr",
  });
  return {
    titleEn: buildUnifiedOrderEventTitle({
      locale: "en",
      eventType,
      orderType,
      lineLabel: lineEn,
      metadata: meta,
    }),
    titleFr: buildUnifiedOrderEventTitle({
      locale: "fr",
      eventType,
      orderType,
      lineLabel: lineFr,
      metadata: meta,
    }),
  };
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
        titleFr: buildUnifiedClinicalEventTitle("fr", displayType),
        titleEn: buildUnifiedClinicalEventTitle("en", displayType),
        payloadJson: r.payloadJson,
      });
    }

    for (const e of orderEvents) {
      const meta = asRecord(e.metadata);
      const lineLabelFr =
        typeof meta?.lineLabelFr === "string" ? meta.lineLabelFr : null;
      const { titleFr, titleEn } = orderEventTitles(e.eventType, e.orderType, meta, lineLabelFr);
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
        titleFr,
        titleEn,
        payloadJson: e.metadata,
        dedupeKey:
          typeof meta?.dedupeKey === "string" ? meta.dedupeKey : undefined,
      });
    }

    for (const m of marRows) {
      const label = m.medicationLabelSnapshot?.trim() || null;
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
        titleFr: buildUnifiedMarAdministrationTitle("fr", label),
        titleEn: buildUnifiedMarAdministrationTitle("en", label),
        summaryFr: m.notes?.trim() || null,
        dedupeKey: `mar:${m.id}`,
        displayGroup: "MEDICATION",
      });
    }

    const medicationGovernanceBundle = await loadMedicationGovernanceEncounterBundle(
      this.prisma,
      facilityId,
      encounterId,
      marRows
    );
    for (const ev of medicationGovernanceBundle.timelineEvents) {
      sourceRows.push({
        sourceKind: "MEDICATION_ADMINISTRATION",
        sourceId: ev.medicationAdministrationId ?? ev.id,
        storedEventType: ev.eventKind,
        documentedAtIso: ev.documentedAtIso,
        actorRole: "RN",
        sourceDepartment: "RN",
        orderType: "MEDICATION",
        orderItemId: ev.orderItemId,
        titleFr: ev.titleFr,
        titleEn: ev.titleEn,
        summaryFr: ev.summaryFr,
        dedupeKey: `mar-gov:${ev.id}`,
        displayGroup: "MEDICATION",
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
      const label = res.orderItem.manualLabel?.trim() || res.orderItem.catalogItemType?.trim() || null;
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
        titleFr: buildUnifiedResultTitle("fr", isImaging, label),
        titleEn: buildUnifiedResultTitle("en", isImaging, label),
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
