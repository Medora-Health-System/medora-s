import { Injectable } from "@nestjs/common";
import { createStructuredLogger } from "../common/logging/structured-logger";
import {
  EncounterClinicalEventType,
  EncounterStatus,
  EncounterType,
  Prisma,
} from "@prisma/client";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import type { EdReportsQueryDto } from "./dto/ed-reports-query.dto";
import { jsonPageLimit } from "./dto/ed-reports-query.dto";
import { decodeReportCursor, encodeReportCursor } from "./ed-report-cursor.util";
import {
  assertEdReportDateRange,
  CSV_BATCH_SIZE,
  JSON_PAGE_MAX_LIMIT,
} from "./ed-report-range.util";
import { iso, minutesBetween, parseReportTimeBoundary } from "./ed-reports-time.util";
import { medicationCatalogLabelForReport } from "./report-catalog-display.util";

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

/**
 * Door-to-EKG/ECG procedure branch: earliest defensible clinical time from payload.performedAt when
 * parseable ISO; otherwise EncounterClinicalEvent.createdAt. Invalid/missing performedAt never throws.
 */
function getProcedurePerformedAtForReporting(event: { createdAt: Date; payloadJson: Prisma.JsonValue }): Date {
  if (!isEkgProcedurePayload(event.payloadJson)) {
    return event.createdAt;
  }
  if (event.payloadJson == null || typeof event.payloadJson !== "object" || Array.isArray(event.payloadJson)) {
    return event.createdAt;
  }
  const p = event.payloadJson as Record<string, unknown>;
  const raw = p.performedAt;
  if (typeof raw !== "string") return event.createdAt;
  const s = raw.trim();
  if (!s) return event.createdAt;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return event.createdAt;
  return d;
}

function truncateDisposition(s: string | null | undefined, max = 120): string {
  if (s == null) return "";
  const t = String(s).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3)}...`;
}

function formatQuantity(
  qty: { toString(): string } | null | undefined,
  unit: string | null | undefined
): string {
  if (qty == null && !unit?.trim()) return "";
  const q = qty != null ? qty.toString() : "";
  const u = unit?.trim() ?? "";
  return u ? `${q} ${u}`.trim() : q;
}

function displayUserName(u: { firstName: string; lastName: string; email: string } | null | undefined): string {
  if (!u) return "";
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n || u.email?.trim() || "";
}

const reportCsvLog = createStructuredLogger("ReportsService.csv");

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** End CSV response safely after success or failure (never throw from here). */
  private endCsvResponse(res: Response, err: unknown | null, logCtx: Record<string, unknown>): void {
    if (err) {
      reportCsvLog.error("ed_report_csv_stream_failed", {
        ...logCtx,
        errorName: err instanceof Error ? err.name : "unknown",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
    try {
      if (!res.writableEnded) res.end();
    } catch {
      /* ignore */
    }
  }

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
      catalogItemType?: string | null;
      catalogItemId: string | null;
      manualLabel: string | null;
      manualSecondaryText: string | null;
    },
    ekgCatalogIds: Set<string>
  ): boolean {
    const catalogItemType = item.catalogItemType ?? "";
    if (catalogItemType !== "IMAGING_STUDY") return false;
    const manual = `${item.manualLabel ?? ""} ${item.manualSecondaryText ?? ""}`;
    if (/ekg|ecg/i.test(manual)) return true;
    const cid = item.catalogItemId?.trim();
    return Boolean(cid && ekgCatalogIds.has(cid));
  }

  private async loadMrnMap(patientIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const uniq = [...new Set(patientIds)].filter(Boolean);
    const chunk = 500;
    for (let i = 0; i < uniq.length; i += chunk) {
      const slice = uniq.slice(i, i + chunk);
      const rows = await this.prisma.patient.findMany({
        where: { id: { in: slice } },
        select: { id: true, mrn: true },
      });
      for (const p of rows) map.set(p.id, p.mrn ?? "");
    }
    return map;
  }

  private async loadUsersMap(userIds: (string | null | undefined)[]): Promise<
    Map<string, { firstName: string; lastName: string; email: string; billingTaxonomyCode: string | null }>
  > {
    const ids = [...new Set(userIds.filter((x): x is string => Boolean(x)))];
    const map = new Map<string, { firstName: string; lastName: string; email: string; billingTaxonomyCode: string | null }>();
    if (ids.length === 0) return map;
    const chunk = 200;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const rows = await this.prisma.user.findMany({
        where: { id: { in: slice } },
        select: { id: true, firstName: true, lastName: true, email: true, billingTaxonomyCode: true },
      });
      for (const u of rows) {
        map.set(u.id, {
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          billingTaxonomyCode: u.billingTaxonomyCode,
        });
      }
    }
    return map;
  }

  async doorToDoorJson(facilityId: string, query: EdReportsQueryDto) {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    assertEdReportDateRange(from, to);
    const limit = Math.min(jsonPageLimit(query), JSON_PAGE_MAX_LIMIT);
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);
    const cursor = decodeReportCursor(query.cursor);

    const where: Prisma.EncounterWhereInput = {
      ...whereVisit,
      status: EncounterStatus.CLOSED,
      dischargedAt: { not: null },
      ...(cursor
        ? {
            OR: [
              { dischargedAt: { lt: new Date(cursor.isoDate) } },
              {
                AND: [{ dischargedAt: new Date(cursor.isoDate) }, { id: { lt: cursor.id } }],
              },
            ],
          }
        : {}),
    };

    const rowsDb = await this.prisma.encounter.findMany({
      where,
      take: limit + 1,
      orderBy: [{ dischargedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        createdAt: true,
        dischargedAt: true,
        status: true,
        disposition: true,
        intake: { select: { arrivalAt: true } },
      },
    });

    const truncated = rowsDb.length > limit;
    const page = truncated ? rowsDb.slice(0, limit) : rowsDb;
    const mrns = await this.loadMrnMap(page.map((e) => e.patientId));

    const last = page[page.length - 1];
    const nextCursor =
      truncated && last?.dischargedAt
        ? encodeReportCursor(last.dischargedAt.toISOString(), last.id)
        : null;

    const rows = page.map((enc) => {
      const door = arrivalTime(enc);
      const end = enc.dischargedAt!;
      return {
        facilityId: enc.facilityId,
        encounterId: enc.id,
        patientId: enc.patientId,
        mrn: mrns.get(enc.patientId) ?? "",
        arrivalAt: iso(door),
        closedAt: iso(end),
        durationMinutes: minutesBetween(door, end),
        encounterStatus: enc.status,
        disposition: enc.disposition ?? null,
      };
    });

    return {
      reportType: "door-to-door" as const,
      generatedAt: new Date().toISOString(),
      from: from.toISOString(),
      to: to.toISOString(),
      format: "json" as const,
      rowCount: rows.length,
      truncated,
      nextCursor,
      rows,
    };
  }

  async streamDoorToDoorCsv(facilityId: string, query: EdReportsQueryDto, res: Response): Promise<number> {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    assertEdReportDateRange(from, to);
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);
    const where: Prisma.EncounterWhereInput = {
      ...whereVisit,
      status: EncounterStatus.CLOSED,
      dischargedAt: { not: null },
    };

    const header = [
      "facility_id",
      "encounter_id",
      "patient_id",
      "mrn",
      "arrival_at",
      "closed_at",
      "duration_minutes",
      "encounter_status",
      "disposition",
    ];
    res.write(csvRow(header));
    let total = 0;
    let lastId: string | undefined;
    let streamErr: unknown | null = null;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await this.prisma.encounter.findMany({
          where: { ...where, ...(lastId ? { id: { gt: lastId } } : {}) },
          orderBy: { id: "asc" },
          take: CSV_BATCH_SIZE,
          select: {
            id: true,
            patientId: true,
            facilityId: true,
            createdAt: true,
            dischargedAt: true,
            status: true,
            disposition: true,
            intake: { select: { arrivalAt: true } },
          },
        });
        if (batch.length === 0) break;
        const mrns = await this.loadMrnMap(batch.map((e) => e.patientId));
        for (const enc of batch) {
          const door = arrivalTime(enc);
          const end = enc.dischargedAt!;
          res.write(
            csvRow([
              enc.facilityId,
              enc.id,
              enc.patientId,
              mrns.get(enc.patientId) ?? "",
              iso(door) ?? "",
              iso(end) ?? "",
              String(minutesBetween(door, end)),
              enc.status,
              truncateDisposition(enc.disposition),
            ])
          );
          total += 1;
        }
        lastId = batch[batch.length - 1]!.id;
        if (batch.length < CSV_BATCH_SIZE) break;
      }
    } catch (e) {
      streamErr = e;
    }
    this.endCsvResponse(res, streamErr, { reportType: "door-to-door", rowCount: total });
    return total;
  }

  async doorToProviderJson(facilityId: string, query: EdReportsQueryDto) {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    assertEdReportDateRange(from, to);
    const limit = Math.min(jsonPageLimit(query), JSON_PAGE_MAX_LIMIT);
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);
    const cursor = decodeReportCursor(query.cursor);

    const where: Prisma.EncounterWhereInput = {
      ...whereVisit,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.isoDate) } },
              {
                AND: [{ createdAt: new Date(cursor.isoDate) }, { id: { lt: cursor.id } }],
              },
            ],
          }
        : {}),
    };

    const encounters = await this.prisma.encounter.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        createdAt: true,
        providerDocumentationSignedAt: true,
        providerDocumentationSignedByUserId: true,
        intake: { select: { arrivalAt: true } },
      },
    });

    const truncated = encounters.length > limit;
    const page = truncated ? encounters.slice(0, limit) : encounters;
    const encounterIds = page.map((e) => e.id);

    const events =
      encounterIds.length === 0
        ? []
        : await this.prisma.encounterClinicalEvent.findMany({
            where: {
              facilityId,
              encounterId: { in: encounterIds },
              eventType: {
                in: [EncounterClinicalEventType.PROVIDER_MSE_SAVED, EncounterClinicalEventType.PROVIDER_SIGNED],
              },
            },
            select: { encounterId: true, createdAt: true, eventType: true, createdByUserId: true },
            orderBy: { createdAt: "asc" },
          });

    const byEncounter = new Map<string, typeof events>();
    for (const ev of events) {
      const list = byEncounter.get(ev.encounterId) ?? [];
      list.push(ev);
      byEncounter.set(ev.encounterId, list);
    }

    type Cand = { t: Date; source: string; userId: string | null };
    const rows = page.map((enc) => {
      const door = arrivalTime(enc);
      const list = byEncounter.get(enc.id) ?? [];
      const candidates: Cand[] = [];
      for (const ev of list) {
        if (ev.eventType === EncounterClinicalEventType.PROVIDER_MSE_SAVED) {
          candidates.push({ t: ev.createdAt, source: "PROVIDER_MSE_SAVED", userId: ev.createdByUserId });
        } else if (ev.eventType === EncounterClinicalEventType.PROVIDER_SIGNED) {
          candidates.push({ t: ev.createdAt, source: "PROVIDER_SIGNED", userId: ev.createdByUserId });
        }
      }
      if (enc.providerDocumentationSignedAt) {
        candidates.push({
          t: enc.providerDocumentationSignedAt,
          source: "ENCOUNTER_SIGNATURE",
          userId: enc.providerDocumentationSignedByUserId,
        });
      }
      let best: Cand | null = null;
      for (const c of candidates) {
        if (!best || c.t.getTime() < best.t.getTime()) best = c;
      }
      const seenAt = best?.t ?? null;
      return {
        facilityId: enc.facilityId,
        encounterId: enc.id,
        patientId: enc.patientId,
        arrivalAt: iso(door),
        firstProviderAt: seenAt ? iso(seenAt) : null,
        minutesToProvider: seenAt ? minutesBetween(door, seenAt) : null,
        providerUserId: best?.userId ?? enc.providerDocumentationSignedByUserId ?? null,
        source: best?.source ?? null,
      };
    });

    const mrns = await this.loadMrnMap(page.map((e) => e.patientId));
    const users = await this.loadUsersMap(rows.map((r) => r.providerUserId));

    const rowsOut = rows.map((r) => {
      const u = r.providerUserId ? users.get(r.providerUserId) : undefined;
      return {
        ...r,
        mrn: mrns.get(r.patientId) ?? "",
        providerName: displayUserName(u ?? null),
        providerTitle: u?.billingTaxonomyCode?.trim() ?? "",
      };
    });

    const last = page[page.length - 1];
    const nextCursor =
      truncated && last ? encodeReportCursor(last.createdAt.toISOString(), last.id) : null;

    return {
      reportType: "door-to-provider" as const,
      generatedAt: new Date().toISOString(),
      from: from.toISOString(),
      to: to.toISOString(),
      format: "json" as const,
      rowCount: rowsOut.length,
      truncated,
      nextCursor,
      rows: rowsOut,
    };
  }

  async streamDoorToProviderCsv(facilityId: string, query: EdReportsQueryDto, res: Response): Promise<number> {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    assertEdReportDateRange(from, to);
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);
    const header = [
      "facility_id",
      "encounter_id",
      "patient_id",
      "mrn",
      "arrival_at",
      "first_provider_at",
      "minutes_to_provider",
      "provider_user_id",
      "provider_name",
      "provider_title",
      "source",
    ];
    res.write(csvRow(header));
    let total = 0;
    let lastId: string | undefined;
    let streamErr: unknown | null = null;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await this.prisma.encounter.findMany({
          where: { ...whereVisit, ...(lastId ? { id: { gt: lastId } } : {}) },
          orderBy: { id: "asc" },
          take: CSV_BATCH_SIZE,
          select: {
            id: true,
            patientId: true,
            facilityId: true,
            createdAt: true,
            providerDocumentationSignedAt: true,
            providerDocumentationSignedByUserId: true,
            intake: { select: { arrivalAt: true } },
          },
        });
        if (batch.length === 0) break;
        const ids = batch.map((e) => e.id);
        const evs = await this.prisma.encounterClinicalEvent.findMany({
          where: {
            facilityId,
            encounterId: { in: ids },
            eventType: {
              in: [EncounterClinicalEventType.PROVIDER_MSE_SAVED, EncounterClinicalEventType.PROVIDER_SIGNED],
            },
          },
          select: { encounterId: true, createdAt: true, eventType: true, createdByUserId: true },
          orderBy: { createdAt: "asc" },
        });
        const byEnc = new Map<string, typeof evs>();
        for (const ev of evs) {
          const l = byEnc.get(ev.encounterId) ?? [];
          l.push(ev);
          byEnc.set(ev.encounterId, l);
        }
        const userIdSet: string[] = [];
        const lines: Array<{
          facilityId: string;
          encounterId: string;
          patientId: string;
          arrival: string;
          firstAt: string;
          mins: string;
          source: string;
          userId: string | null;
        }> = [];
        const mrns = await this.loadMrnMap(batch.map((e) => e.patientId));
        for (const enc of batch) {
          const door = arrivalTime(enc);
          const list = byEnc.get(enc.id) ?? [];
          type Cand = { t: Date; source: string; userId: string | null };
          const candidates: Cand[] = [];
          for (const ev of list) {
            if (ev.eventType === EncounterClinicalEventType.PROVIDER_MSE_SAVED) {
              candidates.push({ t: ev.createdAt, source: "PROVIDER_MSE_SAVED", userId: ev.createdByUserId });
            } else if (ev.eventType === EncounterClinicalEventType.PROVIDER_SIGNED) {
              candidates.push({ t: ev.createdAt, source: "PROVIDER_SIGNED", userId: ev.createdByUserId });
            }
          }
          if (enc.providerDocumentationSignedAt) {
            candidates.push({
              t: enc.providerDocumentationSignedAt,
              source: "ENCOUNTER_SIGNATURE",
              userId: enc.providerDocumentationSignedByUserId,
            });
          }
          let best: Cand | null = null;
          for (const c of candidates) {
            if (!best || c.t.getTime() < best.t.getTime()) best = c;
          }
          const uid = best?.userId ?? enc.providerDocumentationSignedByUserId ?? null;
          if (uid) userIdSet.push(uid);
          const seenAt = best?.t ?? null;
          lines.push({
            facilityId: enc.facilityId,
            encounterId: enc.id,
            patientId: enc.patientId,
            arrival: iso(door) ?? "",
            firstAt: seenAt ? iso(seenAt)! : "",
            mins: seenAt ? String(minutesBetween(door, seenAt)) : "",
            source: best?.source ?? "",
            userId: uid,
          });
        }
        const users = await this.loadUsersMap(userIdSet);
        for (const ln of lines) {
          const u = ln.userId ? users.get(ln.userId) : undefined;
          res.write(
            csvRow([
              ln.facilityId,
              ln.encounterId,
              ln.patientId,
              mrns.get(ln.patientId) ?? "",
              ln.arrival,
              ln.firstAt,
              ln.mins,
              ln.userId ?? "",
              displayUserName(u ?? null),
              u?.billingTaxonomyCode?.trim() ?? "",
              ln.source,
            ])
          );
          total += 1;
        }
        lastId = batch[batch.length - 1]!.id;
        if (batch.length < CSV_BATCH_SIZE) break;
      }
    } catch (e) {
      streamErr = e;
    }
    this.endCsvResponse(res, streamErr, { reportType: "door-to-provider", rowCount: total });
    return total;
  }

  async doorToEkgJson(facilityId: string, query: EdReportsQueryDto) {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    assertEdReportDateRange(from, to);
    const limit = Math.min(jsonPageLimit(query), JSON_PAGE_MAX_LIMIT);
    const ekgCatalogIds = await this.loadEkgCatalogItemIds();
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);
    const cursor = decodeReportCursor(query.cursor);

    const where: Prisma.EncounterWhereInput = {
      ...whereVisit,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.isoDate) } },
              {
                AND: [{ createdAt: new Date(cursor.isoDate) }, { id: { lt: cursor.id } }],
              },
            ],
          }
        : {}),
    };

    const encounters = await this.prisma.encounter.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        createdAt: true,
        intake: { select: { arrivalAt: true } },
      },
    });

    const truncated = encounters.length > limit;
    const page = truncated ? encounters.slice(0, limit) : encounters;
    const encounterIds = page.map((e) => e.id);

    if (encounterIds.length === 0) {
      return {
        reportType: "door-to-ekg" as const,
        generatedAt: new Date().toISOString(),
        from: from.toISOString(),
        to: to.toISOString(),
        format: "json" as const,
        rowCount: 0,
        truncated: false,
        nextCursor: null,
        rows: [] as Array<{
          facilityId: string;
          encounterId: string;
          patientId: string;
          mrn: string;
          arrivalAt: string | null;
          firstEkgAt: string | null;
          minutesToEkg: number | null;
          source: "ORDER_ITEM" | "PROCEDURE_DOCUMENTED" | null;
        }>,
      };
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

    const mrns = await this.loadMrnMap(page.map((e) => e.patientId));

    const rows = page.map((enc) => {
      const door = arrivalTime(enc);
      const ekgTimes: { t: Date; source: "ORDER_ITEM" | "PROCEDURE_DOCUMENTED" }[] = [];
      for (const it of orderItems) {
        if (it.order.encounterId !== enc.id) continue;
        if (!this.isEkgOrderItem(it, ekgCatalogIds)) continue;
        ekgTimes.push({ t: it.createdAt, source: "ORDER_ITEM" });
        if (it.completedAt) ekgTimes.push({ t: it.completedAt, source: "ORDER_ITEM" });
        ekgTimes.push({ t: it.order.createdAt, source: "ORDER_ITEM" });
      }
      for (const ev of procEvents) {
        if (ev.encounterId !== enc.id) continue;
        if (!isEkgProcedurePayload(ev.payloadJson)) continue;
        ekgTimes.push({ t: getProcedurePerformedAtForReporting(ev), source: "PROCEDURE_DOCUMENTED" });
      }
      let best: { t: Date; source: "ORDER_ITEM" | "PROCEDURE_DOCUMENTED" } | null = null;
      for (const x of ekgTimes) {
        if (!best || x.t.getTime() < best.t.getTime()) best = x;
        else if (best && x.t.getTime() === best.t.getTime() && x.source === "PROCEDURE_DOCUMENTED") best = x;
      }
      const ekgAt = best?.t ?? null;
      return {
        facilityId: enc.facilityId,
        encounterId: enc.id,
        patientId: enc.patientId,
        mrn: mrns.get(enc.patientId) ?? "",
        arrivalAt: iso(door),
        firstEkgAt: ekgAt ? iso(ekgAt) : null,
        minutesToEkg: ekgAt ? minutesBetween(door, ekgAt) : null,
        source: best?.source ?? null,
      };
    });

    const last = page[page.length - 1];
    const nextCursor =
      truncated && last ? encodeReportCursor(last.createdAt.toISOString(), last.id) : null;

    return {
      reportType: "door-to-ekg" as const,
      generatedAt: new Date().toISOString(),
      from: from.toISOString(),
      to: to.toISOString(),
      format: "json" as const,
      rowCount: rows.length,
      truncated,
      nextCursor,
      rows,
    };
  }

  async streamDoorToEkgCsv(facilityId: string, query: EdReportsQueryDto, res: Response): Promise<number> {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    assertEdReportDateRange(from, to);
    const ekgCatalogIds = await this.loadEkgCatalogItemIds();
    const whereVisit = this.edVisitWhere(facilityId, from, to, query.providerId);
    const header = [
      "facility_id",
      "encounter_id",
      "patient_id",
      "mrn",
      "arrival_at",
      "first_ekg_at",
      "minutes_to_ekg",
      "source",
    ];
    res.write(csvRow(header));
    let total = 0;
    let lastId: string | undefined;
    let streamErr: unknown | null = null;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await this.prisma.encounter.findMany({
          where: { ...whereVisit, ...(lastId ? { id: { gt: lastId } } : {}) },
          orderBy: { id: "asc" },
          take: CSV_BATCH_SIZE,
          select: {
            id: true,
            patientId: true,
            facilityId: true,
            createdAt: true,
            intake: { select: { arrivalAt: true } },
          },
        });
        if (batch.length === 0) break;
        const ids = batch.map((e) => e.id);
        const [orderItems, procEvents] = await Promise.all([
          this.prisma.orderItem.findMany({
            where: {
              catalogItemType: "IMAGING_STUDY",
              order: { encounterId: { in: ids }, facilityId, cancelledAt: null },
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
              encounterId: { in: ids },
              eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
            },
            select: { encounterId: true, createdAt: true, payloadJson: true },
          }),
        ]);
        const mrns = await this.loadMrnMap(batch.map((e) => e.patientId));
        for (const enc of batch) {
          const door = arrivalTime(enc);
          const ekgTimes: { t: Date; source: "ORDER_ITEM" | "PROCEDURE_DOCUMENTED" }[] = [];
          for (const it of orderItems) {
            if (it.order.encounterId !== enc.id) continue;
            if (!this.isEkgOrderItem(it, ekgCatalogIds)) continue;
            ekgTimes.push({ t: it.createdAt, source: "ORDER_ITEM" });
            if (it.completedAt) ekgTimes.push({ t: it.completedAt, source: "ORDER_ITEM" });
            ekgTimes.push({ t: it.order.createdAt, source: "ORDER_ITEM" });
          }
          for (const ev of procEvents) {
            if (ev.encounterId !== enc.id) continue;
            if (!isEkgProcedurePayload(ev.payloadJson)) continue;
            ekgTimes.push({ t: getProcedurePerformedAtForReporting(ev), source: "PROCEDURE_DOCUMENTED" });
          }
          let best: { t: Date; source: "ORDER_ITEM" | "PROCEDURE_DOCUMENTED" } | null = null;
          for (const x of ekgTimes) {
            if (!best || x.t.getTime() < best.t.getTime()) best = x;
            else if (best && x.t.getTime() === best.t.getTime() && x.source === "PROCEDURE_DOCUMENTED") best = x;
          }
          const ekgAt = best?.t ?? null;
          res.write(
            csvRow([
              enc.facilityId,
              enc.id,
              enc.patientId,
              mrns.get(enc.patientId) ?? "",
              iso(door) ?? "",
              ekgAt ? iso(ekgAt)! : "",
              ekgAt ? String(minutesBetween(door, ekgAt)) : "",
              best?.source ?? "",
            ])
          );
          total += 1;
        }
        lastId = batch[batch.length - 1]!.id;
        if (batch.length < CSV_BATCH_SIZE) break;
      }
    } catch (e) {
      streamErr = e;
    }
    this.endCsvResponse(res, streamErr, { reportType: "door-to-ekg", rowCount: total });
    return total;
  }

  async medicationAdministrationJson(facilityId: string, query: EdReportsQueryDto) {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    assertEdReportDateRange(from, to);
    const limit = Math.min(jsonPageLimit(query), JSON_PAGE_MAX_LIMIT);
    const encounterFilter: Prisma.EncounterWhereInput = {
      facilityId,
      type: { in: [EncounterType.EMERGENCY, EncounterType.URGENT_CARE] },
      ...(query.providerId
        ? { OR: [{ providerId: query.providerId }, { physicianAssignedUserId: query.providerId }] }
        : {}),
    };

    const cursor = decodeReportCursor(query.cursor);
    const where: Prisma.MedicationAdministrationWhereInput = {
      facilityId,
      administeredAt: { gte: from, lte: to },
      encounter: encounterFilter,
      ...(cursor
        ? {
            OR: [
              { administeredAt: { lt: new Date(cursor.isoDate) } },
              {
                AND: [{ administeredAt: new Date(cursor.isoDate) }, { id: { lt: cursor.id } }],
              },
            ],
          }
        : {}),
    };

    const admins = await this.prisma.medicationAdministration.findMany({
      where,
      take: limit + 1,
      orderBy: [{ administeredAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        facilityId: true,
        orderItemId: true,
        medicationLabelSnapshot: true,
        marAction: true,
        route: true,
        administeredQuantity: true,
        quantityUnit: true,
        notes: true,
        administeredAt: true,
        administeredBy: {
          select: { id: true, firstName: true, lastName: true, email: true, billingTaxonomyCode: true },
        },
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

    const truncated = admins.length > limit;
    const page = truncated ? admins.slice(0, limit) : admins;

    const medIds = [
      ...new Set(
        page.map((a) => a.orderItem?.catalogItemId).filter((x): x is string => typeof x === "string" && x.length > 0)
      ),
    ];
    const medLabels = new Map<string, string>();
    if (medIds.length > 0) {
      const meds = await this.prisma.catalogMedication.findMany({
        where: { id: { in: medIds } },
        select: { id: true, code: true, displayNameFr: true, displayNameEn: true },
      });
      for (const m of meds) {
        const label = medicationCatalogLabelForReport(m, query.language);
        medLabels.set(m.id, label);
      }
    }

    const mrns = await this.loadMrnMap(page.map((a) => a.patientId));

    const rows = page.map((a) => {
      const oi = a.orderItem;
      const orderedAt = oi?.order.createdAt ?? oi?.createdAt ?? a.administeredAt;
      const catalogLabel = oi?.catalogItemId ? medLabels.get(oi.catalogItemId) : undefined;
      const medicationName =
        catalogLabel ?? oi?.manualLabel?.trim() ?? a.medicationLabelSnapshot?.trim() ?? "MEDICATION";
      return {
        facilityId: a.facilityId,
        encounterId: a.encounterId,
        patientId: a.patientId,
        mrn: mrns.get(a.patientId) ?? "",
        orderItemId: a.orderItemId,
        medicationName,
        route: a.route ?? null,
        orderedAt: iso(orderedAt),
        administeredAt: iso(a.administeredAt),
        administeredBy: displayUserName(a.administeredBy),
        administeredByTitle: a.administeredBy.billingTaxonomyCode?.trim() ?? "",
        marAction: a.marAction ?? null,
        quantity: formatQuantity(a.administeredQuantity, a.quantityUnit),
        notesPresent: Boolean(a.notes?.trim()),
      };
    });

    const last = page[page.length - 1];
    const nextCursor =
      truncated && last ? encodeReportCursor(last.administeredAt.toISOString(), last.id) : null;

    return {
      reportType: "medication-administration" as const,
      generatedAt: new Date().toISOString(),
      from: from.toISOString(),
      to: to.toISOString(),
      format: "json" as const,
      rowCount: rows.length,
      truncated,
      nextCursor,
      rows,
    };
  }

  async streamMedicationAdministrationCsv(facilityId: string, query: EdReportsQueryDto, res: Response): Promise<number> {
    const from = parseReportTimeBoundary(query.from, false);
    const to = parseReportTimeBoundary(query.to, true);
    assertEdReportDateRange(from, to);
    const encounterFilter: Prisma.EncounterWhereInput = {
      facilityId,
      type: { in: [EncounterType.EMERGENCY, EncounterType.URGENT_CARE] },
      ...(query.providerId
        ? { OR: [{ providerId: query.providerId }, { physicianAssignedUserId: query.providerId }] }
        : {}),
    };

    const header = [
      "facility_id",
      "encounter_id",
      "patient_id",
      "mrn",
      "order_item_id",
      "medication_name",
      "route",
      "ordered_at",
      "administered_at",
      "administered_by",
      "administered_by_title",
      "mar_action",
      "quantity",
      "notes_present",
    ];
    res.write(csvRow(header));
    let total = 0;
    let lastId: string | undefined;
    let lastAt: Date | undefined;
    let streamErr: unknown | null = null;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await this.prisma.medicationAdministration.findMany({
          where: {
            facilityId,
            administeredAt: { gte: from, lte: to },
            encounter: encounterFilter,
            ...(lastAt && lastId
              ? {
                  OR: [
                    { administeredAt: { gt: lastAt } },
                    {
                      AND: [{ administeredAt: lastAt }, { id: { gt: lastId } }],
                    },
                  ],
                }
              : {}),
          },
          orderBy: [{ administeredAt: "asc" }, { id: "asc" }],
          take: CSV_BATCH_SIZE,
          select: {
            id: true,
            encounterId: true,
            patientId: true,
            facilityId: true,
            orderItemId: true,
            medicationLabelSnapshot: true,
            marAction: true,
            route: true,
            administeredQuantity: true,
            quantityUnit: true,
            notes: true,
            administeredAt: true,
            administeredBy: {
              select: { id: true, firstName: true, lastName: true, email: true, billingTaxonomyCode: true },
            },
            orderItem: {
              select: {
                id: true,
                createdAt: true,
                manualLabel: true,
                catalogItemId: true,
                order: { select: { createdAt: true } },
              },
            },
          },
        });
        if (batch.length === 0) break;
        const medIds = [
          ...new Set(
            batch.map((a) => a.orderItem?.catalogItemId).filter((x): x is string => typeof x === "string" && x.length > 0)
          ),
        ];
        const medLabels = new Map<string, string>();
        if (medIds.length > 0) {
          const meds = await this.prisma.catalogMedication.findMany({
            where: { id: { in: medIds } },
            select: { id: true, code: true, displayNameFr: true, displayNameEn: true },
          });
          for (const m of meds) {
            medLabels.set(m.id, medicationCatalogLabelForReport(m, query.language));
          }
        }
        const mrns = await this.loadMrnMap(batch.map((a) => a.patientId));
        for (const a of batch) {
          const oi = a.orderItem;
          const orderedAt = oi?.order.createdAt ?? oi?.createdAt ?? a.administeredAt;
          const catalogLabel = oi?.catalogItemId ? medLabels.get(oi.catalogItemId) : undefined;
          const medicationName =
            catalogLabel ?? oi?.manualLabel?.trim() ?? a.medicationLabelSnapshot?.trim() ?? "MEDICATION";
          res.write(
            csvRow([
              a.facilityId,
              a.encounterId,
              a.patientId,
              mrns.get(a.patientId) ?? "",
              a.orderItemId ?? "",
              medicationName,
              a.route ?? "",
              iso(orderedAt) ?? "",
              iso(a.administeredAt) ?? "",
              displayUserName(a.administeredBy),
              a.administeredBy.billingTaxonomyCode?.trim() ?? "",
              a.marAction ?? "",
              formatQuantity(a.administeredQuantity, a.quantityUnit),
              a.notes?.trim() ? "true" : "false",
            ])
          );
          total += 1;
        }
        const last = batch[batch.length - 1]!;
        lastAt = last.administeredAt;
        lastId = last.id;
        if (batch.length < CSV_BATCH_SIZE) break;
      }
    } catch (e) {
      streamErr = e;
    }
    this.endCsvResponse(res, streamErr, { reportType: "medication-administration", rowCount: total });
    return total;
  }
}
