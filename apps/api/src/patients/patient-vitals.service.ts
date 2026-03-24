import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type PatientTriageVitalsSnapshot = {
  encounterId: string;
  encounterType: string;
  triageId: string;
  updatedAt: string;
  triageCompleteAt: string | null;
  vitalsJson: Record<string, unknown>;
};

function hasVitalsJson(vitalsJson: unknown): boolean {
  if (vitalsJson == null || typeof vitalsJson !== "object" || Array.isArray(vitalsJson)) return false;
  return Object.keys(vitalsJson as object).length > 0;
}

@Injectable()
export class PatientVitalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Latest triage vitals across all encounters for the patient, plus older snapshots (no duplicate: history excludes latest).
   * Sort DESC by recorded time (append-only readings).
   */
  async getTriageVitalsTimeline(
    patientId: string,
    facilityId: string
  ): Promise<{ latest: PatientTriageVitalsSnapshot | null; history: PatientTriageVitalsSnapshot[] }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const readings = await this.prisma.triageVitalsReading.findMany({
      where: { patientId, facilityId },
      orderBy: { recordedAt: "desc" },
      include: { encounter: { select: { type: true } } },
    });

    const snapshots: PatientTriageVitalsSnapshot[] = readings
      .filter((r) => hasVitalsJson(r.vitalsJson))
      .map((r) => ({
        encounterId: r.encounterId,
        encounterType: r.encounter.type,
        triageId: r.triageId,
        updatedAt: r.recordedAt.toISOString(),
        triageCompleteAt: r.triageCompleteAt ? r.triageCompleteAt.toISOString() : null,
        vitalsJson: (r.vitalsJson ?? {}) as Record<string, unknown>,
      }));

    const latest = snapshots[0] ?? null;
    const history = snapshots.slice(1);
    return { latest, history };
  }
}
