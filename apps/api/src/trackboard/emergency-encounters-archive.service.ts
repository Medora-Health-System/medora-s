import { Injectable } from "@nestjs/common";
import {
  buildEdClosedEncounterCertification,
  type EdClosedEncounterCertificationResult,
} from "@medora/shared";
import { EncounterStatus, EncounterType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type EmergencyEncountersArchiveQuery = {
  facilityId: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type EmergencyEncountersArchiveRow = {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  dischargedAt: string | null;
  chiefComplaint: string | null;
  providerDocumentationStatus: string | null;
  billingFinalizationStatus: string | null;
  billingReadinessSnapshotJson: unknown;
  dischargeSummaryJson: unknown;
  admissionSummaryJson: unknown;
  nursingAssessment: unknown;
  workflowState: string | null;
  patient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
    sexAtBirth: string | null;
    mrn: string | null;
    phone: string | null;
  } | null;
  triage: {
    chiefComplaint: string | null;
  } | null;
  facility: {
    name: string | null;
  } | null;
  diagnosisCount: number;
  certification: Pick<
    EdClosedEncounterCertificationResult,
    | "status"
    | "allEncountersEligible"
    | "certifiedClosed"
    | "billingReady"
    | "closureReady"
    | "billingBlockers"
  >;
};

@Injectable()
export class EmergencyEncountersArchiveService {
  /** Default page size — archive remains bounded; UI does not load full history. */
  static readonly DEFAULT_LIMIT = 100;
  /** Hard cap per request to protect DB and payload size at scale. */
  static readonly MAX_LIMIT = 200;

  constructor(private readonly prisma: PrismaService) {}

  async listArchiveEncounters(query: EmergencyEncountersArchiveQuery): Promise<{
    rows: EmergencyEncountersArchiveRow[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(
      Math.max(query.limit ?? EmergencyEncountersArchiveService.DEFAULT_LIMIT, 1),
      EmergencyEncountersArchiveService.MAX_LIMIT
    );
    const offset = Math.max(query.offset ?? 0, 0);
    const search = (query.search ?? "").trim();

    const where: Prisma.EncounterWhereInput = {
      facilityId: query.facilityId,
      status: EncounterStatus.CLOSED,
      type: EncounterType.EMERGENCY,
      providerDocumentationStatus: "SIGNED",
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
        { chiefComplaint: { contains: search, mode: "insensitive" } },
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { mrn: { contains: search, mode: "insensitive" } } },
        { patient: { phone: { contains: search, mode: "insensitive" } } },
        { triage: { chiefComplaint: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [encounters, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dob: true,
              sexAtBirth: true,
              mrn: true,
              phone: true,
            },
          },
          triage: {
            select: { chiefComplaint: true },
          },
          facility: {
            select: { name: true },
          },
          _count: { select: { diagnoses: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.encounter.count({ where }),
    ]);

    const rows: EmergencyEncountersArchiveRow[] = [];
    for (const encounter of encounters) {
      const certification = buildEdClosedEncounterCertification({
        lifecycleSnapshot: {
          status: encounter.status,
          workflowState: encounter.workflowState,
          providerDocumentationStatus: encounter.providerDocumentationStatus,
          dischargeSummaryJson: encounter.dischargeSummaryJson,
          admissionSummaryJson: encounter.admissionSummaryJson,
          nursingAssessment: encounter.nursingAssessment,
          billingFinalizationStatus: encounter.billingFinalizationStatus,
          dischargedAt: encounter.dischargedAt?.toISOString() ?? null,
          chiefComplaint: encounter.chiefComplaint ?? encounter.triage?.chiefComplaint ?? null,
          providerNote: encounter.providerNote,
          treatmentPlan: encounter.treatmentPlan,
          encounterType: encounter.type,
          dispositionSafetyReadiness: null,
        },
        billingReadinessSnapshot:
          encounter.billingReadinessSnapshotJson &&
          typeof encounter.billingReadinessSnapshotJson === "object" &&
          !Array.isArray(encounter.billingReadinessSnapshotJson)
            ? (encounter.billingReadinessSnapshotJson as Record<string, unknown>)
            : null,
        demographics: {
          dob: encounter.patient?.dob?.toISOString() ?? null,
          sexAtBirth: encounter.patient?.sexAtBirth ?? null,
          mrn: encounter.patient?.mrn ?? null,
          phone: encounter.patient?.phone ?? null,
        },
        diagnosisCount: encounter._count.diagnoses,
      });

      rows.push({
        id: encounter.id,
        status: encounter.status,
        type: encounter.type,
        createdAt: encounter.createdAt.toISOString(),
        dischargedAt: encounter.dischargedAt?.toISOString() ?? null,
        chiefComplaint: encounter.chiefComplaint,
        providerDocumentationStatus: encounter.providerDocumentationStatus,
        billingFinalizationStatus: encounter.billingFinalizationStatus,
        billingReadinessSnapshotJson: encounter.billingReadinessSnapshotJson,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        admissionSummaryJson: encounter.admissionSummaryJson,
        nursingAssessment: encounter.nursingAssessment,
        workflowState: encounter.workflowState,
        patient: encounter.patient
          ? {
              id: encounter.patient.id,
              firstName: encounter.patient.firstName,
              lastName: encounter.patient.lastName,
              dob: encounter.patient.dob?.toISOString() ?? null,
              sexAtBirth: encounter.patient.sexAtBirth,
              mrn: encounter.patient.mrn,
              phone: encounter.patient.phone,
            }
          : null,
        triage: encounter.triage,
        facility: encounter.facility,
        diagnosisCount: encounter._count.diagnoses,
        certification: {
          status: certification.status,
          allEncountersEligible: certification.allEncountersEligible,
          certifiedClosed: certification.certifiedClosed,
          billingReady: certification.billingReady,
          closureReady: certification.closureReady,
          billingBlockers: certification.billingBlockers,
        },
      });
    }

    return { rows, total, limit, offset };
  }
}
