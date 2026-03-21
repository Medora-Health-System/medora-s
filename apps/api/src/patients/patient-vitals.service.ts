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
   * Sort DESC by triage.updatedAt.
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

    const encounters = await this.prisma.encounter.findMany({
      where: { patientId, facilityId },
      include: { triage: true },
    });

    const snapshots: PatientTriageVitalsSnapshot[] = encounters
      .filter((e) => e.triage && hasVitalsJson(e.triage.vitalsJson))
      .map((e) => {
        const t = e.triage!;
        return {
          encounterId: e.id,
          encounterType: e.type,
          triageId: t.id,
          updatedAt: t.updatedAt.toISOString(),
          triageCompleteAt: t.triageCompleteAt ? t.triageCompleteAt.toISOString() : null,
          vitalsJson: (t.vitalsJson ?? {}) as Record<string, unknown>,
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const latest = snapshots[0] ?? null;
    const history = snapshots.slice(1);
    return { latest, history };
  }
}
