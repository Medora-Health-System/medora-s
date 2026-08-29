/**
 * INP.HIST.1A — Lightweight CLOSED inpatient encounter archive.
 * Mirrors ED archive: historical completed hospitalizations only (not live census).
 */

import { Injectable } from "@nestjs/common";
import {
  buildInpatientHospitalCourseProjection,
  formatInpatientEncounterDateRange,
} from "@medora/shared";
import { EncounterStatus, EncounterType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type InpatientEncountersArchiveQuery = {
  facilityId: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type InpatientEncountersArchiveRow = {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  admittedAt: string | null;
  dischargedAt: string | null;
  roomLabel: string | null;
  dateRangeLabel: string;
  encounterTypeLabel: string;
  courseSummary: string;
  dispositionLabel: string | null;
  originatingEdEncounterId: string | null;
  timelineIncomplete: boolean;
  patient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
    mrn: string | null;
  } | null;
};

const ARCHIVE_SELECT = {
  id: true,
  status: true,
  type: true,
  createdAt: true,
  dischargedAt: true,
  roomLabel: true,
  admissionSummaryJson: true,
  dischargeSummaryJson: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dob: true,
      mrn: true,
    },
  },
} as const;

@Injectable()
export class InpatientEncountersArchiveService {
  static readonly DEFAULT_LIMIT = 50;
  static readonly MAX_LIMIT = 100;

  constructor(private readonly prisma: PrismaService) {}

  async listArchiveEncounters(query: InpatientEncountersArchiveQuery): Promise<{
    rows: InpatientEncountersArchiveRow[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(
      Math.max(query.limit ?? InpatientEncountersArchiveService.DEFAULT_LIMIT, 1),
      InpatientEncountersArchiveService.MAX_LIMIT
    );
    const offset = Math.max(query.offset ?? 0, 0);
    const search = (query.search ?? "").trim();

    /** Server-enforced closed archive — mirrors ED All Encounters (CLOSED only). */
    const where: Prisma.EncounterWhereInput = {
      facilityId: query.facilityId,
      type: EncounterType.INPATIENT,
      status: EncounterStatus.CLOSED,
    };

    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        if (!Number.isNaN(start.getTime())) createdAt.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          createdAt.lte = end;
        }
      }
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt;
      }
    }

    if (search) {
      where.OR = [
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { mrn: { contains: search, mode: "insensitive" } } },
        { id: { equals: search } },
        { roomLabel: { contains: search, mode: "insensitive" } },
      ];
    }

    const [encounters, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        select: ARCHIVE_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
      }),
      this.prisma.encounter.count({ where }),
    ]);

    const rows: InpatientEncountersArchiveRow[] = encounters.map((enc) => {
      const root =
        enc.admissionSummaryJson &&
        typeof enc.admissionSummaryJson === "object" &&
        !Array.isArray(enc.admissionSummaryJson)
          ? (enc.admissionSummaryJson as Record<string, unknown>)
          : {};
      const admittedAt =
        typeof root.admittedAt === "string"
          ? root.admittedAt
          : typeof root.admissionInitiatedAt === "string"
            ? root.admissionInitiatedAt
            : null;
      const course = buildInpatientHospitalCourseProjection({
        id: enc.id,
        type: enc.type,
        status: enc.status,
        createdAt: enc.createdAt.toISOString(),
        admittedAt,
        dischargedAt: enc.dischargedAt?.toISOString() ?? null,
        roomLabel: enc.roomLabel,
        admissionSummaryJson: enc.admissionSummaryJson,
        dischargeSummaryJson: enc.dischargeSummaryJson,
      });
      return {
        id: enc.id,
        status: enc.status,
        type: enc.type,
        createdAt: enc.createdAt.toISOString(),
        admittedAt,
        dischargedAt: enc.dischargedAt?.toISOString() ?? null,
        roomLabel: enc.roomLabel,
        dateRangeLabel: formatInpatientEncounterDateRange({
          createdAt: enc.createdAt.toISOString(),
          admittedAt,
          dischargedAt: enc.dischargedAt?.toISOString() ?? null,
          status: enc.status,
        }),
        encounterTypeLabel: course.encounterTypeLabel,
        courseSummary: course.courseSummary,
        dispositionLabel: course.dispositionLabel,
        originatingEdEncounterId: course.originatingEdEncounterId,
        timelineIncomplete: course.timelineIncomplete,
        patient: enc.patient
          ? {
              id: enc.patient.id,
              firstName: enc.patient.firstName,
              lastName: enc.patient.lastName,
              dob: enc.patient.dob ? enc.patient.dob.toISOString().slice(0, 10) : null,
              mrn: enc.patient.mrn,
            }
          : null,
      };
    });

    return { rows, total, limit, offset };
  }
}
