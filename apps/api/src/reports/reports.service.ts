import { Injectable } from "@nestjs/common";
import {
  EncounterClinicalEventType,
  EncounterStatus,
  EncounterType,
  MedicationMarAction,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { EdReportsQueryDto } from "./dto/ed-reports-query.dto";
import { iso, minutesBetween, parseReportTimeBoundary } from "./ed-reports-time.util";

const MAX_ENCOUNTERS = 2500;

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvRow(cells: string[]): string {
  return `${cells.map(csvEscape).join(",")}\n`;
}

function arrivalTime(enc: { createdAt: Date; intake: { arrivalAt: Date | null } | null }): Date {
  return enc.intake?.arrivalAt ?? enc.createdAt;
}

function isEkgProcedurePayload(payload: Prisma.JsonValue): boolean {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return false;
  const p = payload as Record<string, unknown>;
  const pt = p.procedureType;
  return pt === "EKG" || pt === "ECG";
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private edVisitWhere(facilityId: string, from: Date, to: Date, providerId?: string): Prisma.EncounterWhereInput {
    const providerOr: Prisma.EncounterWhereInput | undefined = providerId
      ? { OR: [{ providerId }, { physicianAssignedUserId: providerId }] }
      : undefined;
    return {
      facilityId,
      type: { in: [EncounterType.EMERGENCY, EncounterType.URGENT_CARE] },
      ...(providerOr ?? {}),
      OR: [
        { intake: { arrivalAt: { gte: from, lte: to } } },
        {
          AND: [
            { createdAt: { gte: from, lte: to } },
            { OR: [{ intake: null }, { intake: { arrivalAt: null } }] },
          ],
        },
      ],
    };
  }

  private async loadEkgCatalogItemIds(): Promise<Set<string>> {
    const rows = await this.prisma.catalogImagingStudy.findMany({
      select: { id: true, code: true, displayNameEn: true, displayNameFr: true, searchText: true },
    });
    const re = /ekg|ecg|electrocardiogram/i;
    const ids = new Set<string>();
    for (const r of rows) {
      const blob = [r.code, r.displayNameEn, r.displayNameFr, r.searchText].filter(Boolean).join(" ");
      if (re.test(blob)) ids.add(r.id);
    }
    return ids;
  }

  private isEkgOrderItem(
    item: {
      catalogItemType: string;
      catalogItemId: string | null;
      manualLabel: string | null;
      manualSecondaryText: string | null;
    },
    ekgCatalogIds: Set<string>
  ): boolean {
    if (item.catalogItemType !== "IMAGING_STUDY") return false;
    const manual = `${item.manualLabel ?? ""} ${item.manualSecondaryText ?? ""}`;
    if (/ekg|ecg/i.test(manual)) return true;
    const cid = item.catalogItemId?.trim();
    return Boolean(cid && ekgCatalogIds.has(cid));
  }

  async doorToEkg(facilityId: string, query: EdReportsQueryDto) {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    const ekgCatalogIds = await this.loadEkgCatalogItemIds();
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);

    const encounters = await this.prisma.encounter.findMany({
      where: whereVisit,
      take: MAX_ENCOUNTERS + 1,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        patientId: true,
        createdAt: true,
        intake: { select: { arrivalAt: true } },
      },
    });
    const truncated = encounters.length > MAX_ENCOUNTERS;
    const slice = truncated ? encounters.slice(0, MAX_ENCOUNTERS) : encounters;
    const encounterIds = slice.map((e) => e.id);
    if (encounterIds.length === 0) {
      return { generatedAt: new Date().toISOString(), from: from.toISOString(), to: to.toISOString(), truncated, rows: [] };
    }

    const [orderItems, procEvents] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          catalogItemType: "IMAGING_STUDY",
          order: { encounterId: { in: encounterIds }, facilityId, cancelledAt: null },
        },
        select: {
          id: true,
          createdAt: true,
          completedAt: true,
          catalogItemType: true,
          catalogItemId: true,
          manualLabel: true,
          manualSecondaryText: true,
          order: { select: { encounterId: true, createdAt: true } },
        },
      }),
      this.prisma.encounterClinicalEvent.findMany({
        where: {
          facilityId,
          encounterId: { in: encounterIds },
          eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
        },
        select: { encounterId: true, createdAt: true, payloadJson: true },
      }),
    ]);

    const rows = slice.map((enc) => {
      const door = arrivalTime(enc);
      const ekgTimes: { t: Date; source: "IMAGING_ORDER" | "PROCEDURE_EVENT" }[] = [];
      for (const it of orderItems) {
        if (it.order.encounterId !== enc.id) continue;
        if (!this.isEkgOrderItem(it, ekgCatalogIds)) continue;
        ekgTimes.push({ t: it.createdAt, source: "IMAGING_ORDER" });
        if (it.completedAt) ekgTimes.push({ t: it.completedAt, source: "IMAGING_ORDER" });
        ekgTimes.push({ t: it.order.createdAt, source: "IMAGING_ORDER" });
      }
      for (const ev of procEvents) {
        if (ev.encounterId !== enc.id) continue;
        if (!isEkgProcedurePayload(ev.payloadJson)) continue;
        ekgTimes.push({ t: ev.createdAt, source: "PROCEDURE_EVENT" });
      }
      let best: { t: Date; source: "IMAGING_ORDER" | "PROCEDURE_EVENT" } | null = null;
      for (const x of ekgTimes) {
        if (!best || x.t.getTime() < best.t.getTime()) best = x;
      }
      const ekgAt = best?.t ?? null;
      const ekgSource = best?.source ?? null;
      return {
        encounterId: enc.id,
        patientId: enc.patientId,
        arrivalAt: iso(door),
        ekgAt: ekgAt ? iso(ekgAt) : null,
        minutes: ekgAt ? minutesBetween(door, ekgAt) : null,
        ekgSource,
      };
    });

    return { generatedAt: new Date().toISOString(), from: from.toISOString(), to: to.toISOString(), truncated, rows };
  }

  async doorToProvider(facilityId: string, query: EdReportsQueryDto) {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);

    const encounters = await this.prisma.encounter.findMany({
      where: whereVisit,
      take: MAX_ENCOUNTERS + 1,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        patientId: true,
        createdAt: true,
        providerDocumentationSignedAt: true,
        intake: { select: { arrivalAt: true } },
      },
    });
    const truncated = encounters.length > MAX_ENCOUNTERS;
    const slice = truncated ? encounters.slice(0, MAX_ENCOUNTERS) : encounters;
    const encounterIds = slice.map((e) => e.id);
    if (encounterIds.length === 0) {
      return { generatedAt: new Date().toISOString(), from: from.toISOString(), to: to.toISOString(), truncated, rows: [] };
    }

    const events = await this.prisma.encounterClinicalEvent.findMany({
      where: {
        facilityId,
        encounterId: { in: encounterIds },
        eventType: {
          in: [EncounterClinicalEventType.PROVIDER_MSE_SAVED, EncounterClinicalEventType.PROVIDER_SIGNED],
        },
      },
      select: { encounterId: true, createdAt: true, eventType: true },
      orderBy: { createdAt: "asc" },
    });
    const byEncounter = new Map<string, typeof events>();
    for (const ev of events) {
      const list = byEncounter.get(ev.encounterId) ?? [];
      list.push(ev);
      byEncounter.set(ev.encounterId, list);
    }

    const rows = slice.map((enc) => {
      const door = arrivalTime(enc);
      const list = byEncounter.get(enc.id) ?? [];
      const candidates: { t: Date; source: "MSE_SAVED" | "PROVIDER_SIGNED" | "ENCOUNTER_SIGNED" }[] = [];
      for (const ev of list) {
        if (ev.eventType === EncounterClinicalEventType.PROVIDER_MSE_SAVED) {
          candidates.push({ t: ev.createdAt, source: "MSE_SAVED" });
        } else if (ev.eventType === EncounterClinicalEventType.PROVIDER_SIGNED) {
          candidates.push({ t: ev.createdAt, source: "PROVIDER_SIGNED" });
        }
      }
      if (enc.providerDocumentationSignedAt) {
        candidates.push({ t: enc.providerDocumentationSignedAt, source: "ENCOUNTER_SIGNED" });
      }
      let best: (typeof candidates)[0] | null = null;
      for (const c of candidates) {
        if (!best || c.t.getTime() < best.t.getTime()) best = c;
      }
      const seenAt = best?.t ?? null;
      return {
        encounterId: enc.id,
        patientId: enc.patientId,
        arrivalAt: iso(door),
        providerSeenAt: seenAt ? iso(seenAt) : null,
        minutes: seenAt ? minutesBetween(door, seenAt) : null,
        source: best?.source ?? null,
      };
    });

    return { generatedAt: new Date().toISOString(), from: from.toISOString(), to: to.toISOString(), truncated, rows };
  }

  async doorToDoor(facilityId: string, query: EdReportsQueryDto) {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);

    const encounters = await this.prisma.encounter.findMany({
      where: { ...whereVisit, status: EncounterStatus.CLOSED, dischargedAt: { not: null } },
      take: MAX_ENCOUNTERS + 1,
      orderBy: { dischargedAt: "desc" },
      select: {
        id: true,
        patientId: true,
        createdAt: true,
        dischargedAt: true,
        intake: { select: { arrivalAt: true } },
      },
    });
    const truncated = encounters.length > MAX_ENCOUNTERS;
    const slice = truncated ? encounters.slice(0, MAX_ENCOUNTERS) : encounters;

    const rows = slice.map((enc) => {
      const door = arrivalTime(enc);
      const end = enc.dischargedAt!;
      return {
        encounterId: enc.id,
        patientId: enc.patientId,
        arrivalAt: iso(door),
        closedAt: iso(end),
        minutes: minutesBetween(door, end),
      };
    });

    return { generatedAt: new Date().toISOString(), from: from.toISOString(), to: to.toISOString(), truncated, rows };
  }

  async medicationAdministration(facilityId: string, query: EdReportsQueryDto) {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);

    const encounterFilter: Prisma.EncounterWhereInput = {
      facilityId,
      type: { in: [EncounterType.EMERGENCY, EncounterType.URGENT_CARE] },
      ...(query.providerId
        ? { OR: [{ providerId: query.providerId }, { physicianAssignedUserId: query.providerId }] }
        : {}),
    };

    const admins = await this.prisma.medicationAdministration.findMany({
      where: {
        facilityId,
        administeredAt: { gte: from, lte: to },
        marAction: MedicationMarAction.administered,
        encounter: encounterFilter,
      },
      take: 5000,
      orderBy: { administeredAt: "desc" },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        orderItemId: true,
        medicationLabelSnapshot: true,
        marAction: true,
        administeredAt: true,
        administeredBy: { select: { id: true, firstName: true, lastName: true } },
        orderItem: {
          select: {
            id: true,
            createdAt: true,
            manualLabel: true,
            catalogItemId: true,
            catalogItemType: true,
            order: { select: { id: true, createdAt: true, type: true } },
          },
        },
      },
    });

    const medIds = [
      ...new Set(
        admins
          .map((a) => a.orderItem?.catalogItemId)
          .filter((x): x is string => typeof x === "string" && x.length > 0)
      ),
    ];
    const medLabels = new Map<string, string>();
    if (medIds.length > 0) {
      const meds = await this.prisma.catalogMedication.findMany({
        where: { id: { in: medIds } },
        select: { id: true, code: true, displayNameFr: true, displayNameEn: true },
      });
      for (const m of meds) {
        const label = m.displayNameFr?.trim() || m.displayNameEn?.trim() || m.code;
        medLabels.set(m.id, label);
      }
    }

    const rows = admins.map((a) => {
      const oi = a.orderItem;
      const orderedAt = oi?.order.createdAt ?? oi?.createdAt ?? a.administeredAt;
      const catalogLabel = oi?.catalogItemId ? medLabels.get(oi.catalogItemId) : undefined;
      const medicationOrdered =
        catalogLabel ?? oi?.manualLabel?.trim() ?? a.medicationLabelSnapshot?.trim() ?? "MEDICATION";
      const by = `${a.administeredBy.firstName ?? ""} ${a.administeredBy.lastName ?? ""}`.trim() || a.administeredBy.id;
      const minutes = minutesBetween(orderedAt, a.administeredAt);
      return {
        administrationId: a.id,
        encounterId: a.encounterId,
        patientId: a.patientId,
        orderId: oi?.order.id ?? null,
        orderItemId: a.orderItemId,
        orderedAt: iso(orderedAt),
        medicationOrdered,
        administeredAt: iso(a.administeredAt),
        administeredByUserId: a.administeredBy.id,
        administeredByDisplay: by,
        marAction: a.marAction,
        minutesOrderToAdmin: minutes,
      };
    });

    return { generatedAt: new Date().toISOString(), from: from.toISOString(), to: to.toISOString(), truncated: false, rows };
  }

  doorToEkgCsv(payload: {
    rows: Array<{
      encounterId: string;
      patientId: string;
      arrivalAt: string | null;
      ekgAt: string | null;
      minutes: number | null;
      ekgSource: string | null;
    }>;
  }): string {
    const header = ["encounterId", "patientId", "arrivalAt", "ekgAt", "minutes", "ekgSource"];
    let out = csvRow(header);
    for (const r of payload.rows) {
      out += csvRow([
        r.encounterId,
        r.patientId,
        r.arrivalAt ?? "",
        r.ekgAt ?? "",
        r.minutes == null ? "" : String(r.minutes),
        r.ekgSource ?? "",
      ]);
    }
    return out;
  }

  doorToProviderCsv(payload: {
    rows: Array<{
      encounterId: string;
      patientId: string;
      arrivalAt: string | null;
      providerSeenAt: string | null;
      minutes: number | null;
      source: string | null;
    }>;
  }): string {
    const header = ["encounterId", "patientId", "arrivalAt", "providerSeenAt", "minutes", "source"];
    let out = csvRow(header);
    for (const r of payload.rows) {
      out += csvRow([
        r.encounterId,
        r.patientId,
        r.arrivalAt ?? "",
        r.providerSeenAt ?? "",
        r.minutes == null ? "" : String(r.minutes),
        r.source ?? "",
      ]);
    }
    return out;
  }

  doorToDoorCsv(payload: {
    rows: Array<{
      encounterId: string;
      patientId: string;
      arrivalAt: string | null;
      closedAt: string | null;
      minutes: number;
    }>;
  }): string {
    const header = ["encounterId", "patientId", "arrivalAt", "closedAt", "minutes"];
    let out = csvRow(header);
    for (const r of payload.rows) {
      out += csvRow([r.encounterId, r.patientId, r.arrivalAt ?? "", r.closedAt ?? "", String(r.minutes)]);
    }
    return out;
  }

  medicationAdministrationCsv(payload: {
    rows: Array<{
      administrationId: string;
      encounterId: string;
      patientId: string;
      orderId: string | null;
      orderItemId: string | null;
      orderedAt: string | null;
      medicationOrdered: string;
      administeredAt: string | null;
      administeredByUserId: string;
      administeredByDisplay: string;
      marAction: string | null;
      minutesOrderToAdmin: number;
    }>;
  }): string {
    const header = [
      "administrationId",
      "encounterId",
      "patientId",
      "orderId",
      "orderItemId",
      "orderedAt",
      "medicationOrdered",
      "administeredAt",
      "administeredByUserId",
      "administeredByDisplay",
      "marAction",
      "minutesOrderToAdmin",
    ];
    let out = csvRow(header);
    for (const r of payload.rows) {
      out += csvRow([
        r.administrationId,
        r.encounterId,
        r.patientId,
        r.orderId ?? "",
        r.orderItemId ?? "",
        r.orderedAt ?? "",
        r.medicationOrdered,
        r.administeredAt ?? "",
        r.administeredByUserId,
        r.administeredByDisplay,
        r.marAction ?? "",
        String(r.minutesOrderToAdmin),
      ]);
    }
    return out;
  }
}
