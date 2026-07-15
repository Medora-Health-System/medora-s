import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleCode, TriageVitalsReadingStatus } from "@prisma/client";
import { hasMeaningfulVitalMeasurement, resolveLatestMeaningfulVitalsReading } from "@medora/shared";
import { AuditService } from "../common/services/audit.service";
import { logBreakGlassAccessIfApplicable } from "../common/break-glass/break-glass-audit.helper";
import { PrismaService } from "../prisma/prisma.service";
import { computeDisplayNameInitials } from "../utils/clinical-event-nursing-assessment-json.util";

export type PatientTriageVitalsSnapshot = {
  readingId: string;
  encounterId: string;
  encounterType: string;
  triageId: string;
  /** Clinical measurement time (preferred for display/sort). */
  measuredAt: string;
  /** Server documentation time. */
  recordedAt: string;
  /** @deprecated Prefer measuredAt — kept for older clients (maps to measuredAt). */
  updatedAt: string;
  triageCompleteAt: string | null;
  vitalsJson: Record<string, unknown>;
  status: "ACTIVE" | "VOIDED";
  recordedByUserId: string | null;
  recordedByDisplayName: string | null;
  recordedByInitials: string | null;
  recordedByRole: string | null;
};

function pickRoleTitle(codes: RoleCode[]): string | null {
  if (codes.includes(RoleCode.PROVIDER)) return "PROVIDER";
  if (codes.includes(RoleCode.RN)) return "RN";
  if (codes.includes(RoleCode.ADMIN)) return "ADMIN";
  return codes[0] ?? null;
}

@Injectable()
export class PatientVitalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Active triage vitals across encounters for the patient (voided excluded).
   * Sort DESC by measuredAt, then recordedAt.
   */
  async getTriageVitalsTimeline(
    patientId: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    breakGlassSessionId?: string
  ): Promise<{ latest: PatientTriageVitalsSnapshot | null; history: PatientTriageVitalsSnapshot[] }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    await logBreakGlassAccessIfApplicable(this.audit, {
      breakGlassSessionId,
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      context: "patient_triage_vitals",
    });

    const readings = await this.prisma.triageVitalsReading.findMany({
      where: {
        patientId,
        facilityId,
        status: TriageVitalsReadingStatus.ACTIVE,
      },
      orderBy: [{ measuredAt: "desc" }, { recordedAt: "desc" }],
      include: {
        encounter: { select: { type: true } },
        recordedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userRoles: {
              where: { facilityId, isActive: true },
              include: { role: { select: { code: true } } },
            },
          },
        },
      },
    });

    const snapshots: PatientTriageVitalsSnapshot[] = readings.map((r) => {
      const firstName = (r.recordedBy?.firstName ?? "").trim();
      const lastName = (r.recordedBy?.lastName ?? "").trim();
      const display = `${firstName} ${lastName}`.trim();
      let initials: string | null = null;
      if (display) {
        initials = computeDisplayNameInitials(display) || null;
      }
      if (!initials && (firstName || lastName)) {
        initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || null;
      }
      // Legacy rows without recorder may render "—" in the UI; never invent fake initials.
      const roleCodes = (r.recordedBy?.userRoles ?? []).map((ur) => ur.role.code);
      return {
        readingId: r.id,
        encounterId: r.encounterId,
        encounterType: r.encounter.type,
        triageId: r.triageId,
        measuredAt: r.measuredAt.toISOString(),
        recordedAt: r.recordedAt.toISOString(),
        updatedAt: r.measuredAt.toISOString(),
        triageCompleteAt: r.triageCompleteAt ? r.triageCompleteAt.toISOString() : null,
        vitalsJson: (r.vitalsJson ?? {}) as Record<string, unknown>,
        status: r.status,
        recordedByUserId: r.recordedByUserId,
        recordedByDisplayName: display || null,
        recordedByInitials: initials,
        recordedByRole: pickRoleTitle(roleCodes),
      };
    });

    // History may include context-only rows for audit visibility, but "latest" is meaningful-only.
    const latest =
      resolveLatestMeaningfulVitalsReading(
        snapshots.map((s) => ({
          ...s,
          status: s.status,
          measuredAt: s.measuredAt,
          recordedAt: s.recordedAt,
          vitalsJson: s.vitalsJson,
        }))
      ) ?? null;
    const history = snapshots.filter((s) => !latest || s.readingId !== latest.readingId);
    return { latest, history };
  }
}
