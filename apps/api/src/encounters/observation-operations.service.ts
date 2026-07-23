/**
 * D4A.2.7C — Observation workspace bootstrap (type/lane-gated).
 * Rejects ED and pure Inpatient. Shares hospital header projection shape.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import {
  INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
  INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
  observationBootstrapRejectsEdAndInpatient,
  patientClinicalHistoryProfileFromJson,
  readInpatientClinicalOpsFromAdmissionSummary,
  type ClinicalAvailabilityState,
  type HospitalWorkspaceBootstrapV1,
  type InpatientWorkspaceRole,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { SchemaCompatibleEncounterRepository } from "./schema-compatible-encounter.repository";

@Injectable()
export class ObservationOperationsService {
  private readonly logger = new Logger(ObservationOperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly compatibleEncounters: SchemaCompatibleEncounterRepository
  ) {}

  async getWorkspaceBootstrap(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    options?: {
      role?: InpatientWorkspaceRole;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<HospitalWorkspaceBootstrapV1 & { observationCertification: string }> {
    const requested = String(encounterId ?? "").trim();
    const role: InpatientWorkspaceRole = options?.role ?? "CHART";
    const generatedAt = new Date().toISOString();

    if (!requested) {
      return {
        certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
        observationCertification: INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
        resolution: {
          ok: false,
          requestedEncounterId: null,
          category: "MISSING_ID",
          writersEnabled: false,
          messageCode: "inpatientWorkspaceRecovery.errors.MISSING_ID",
        },
        generatedAt,
        header: null,
        readiness: {
          role,
          encounterResolved: false,
          roleAuthorized: true,
          modules: { bootstrap: "ENCOUNTER_MISMATCH" },
        },
        alertCounts: { criticalResults: null, pendingTasks: null, escalations: null },
        writersEnabled: false,
      };
    }

    // D4A.2.8-HF1: compatibility-aware projection — never select hospitalEpisodeId when foundation OFF.
    const enc = await this.compatibleEncounters.findFacilityEncounterForWorkspace(
      facilityId,
      requested
    );

    if (!enc) {
      await this.audit.log(AuditAction.CHART_ACCESS, "ObservationWorkspace", {
        userId: actorUserId,
        facilityId,
        entityId: requested,
        encounterId: requested,
        ip: options?.ip,
        userAgent: options?.userAgent,
        metadata: {
          event: "OBSERVATION_WORKSPACE_BOOTSTRAP_FAILED",
          category: "NOT_FOUND",
          accessKind: "OPEN",
        },
      });
      return {
        certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
        observationCertification: INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
        resolution: {
          ok: false,
          requestedEncounterId: requested,
          category: "NOT_FOUND",
          writersEnabled: false,
          messageCode: "inpatientWorkspaceRecovery.errors.NOT_FOUND",
        },
        generatedAt,
        header: null,
        readiness: {
          role,
          encounterResolved: false,
          roleAuthorized: true,
          modules: { bootstrap: "SOURCE_UNAVAILABLE" },
        },
        alertCounts: { criticalResults: null, pendingTasks: null, escalations: null },
        writersEnabled: false,
      };
    }

    const gate = observationBootstrapRejectsEdAndInpatient({
      type: enc.type,
      billingClassification: enc.billingClassification,
      admissionSummaryJson: enc.admissionSummaryJson,
    });

    if (!gate.ok) {
      await this.audit.log(AuditAction.CHART_ACCESS, "ObservationWorkspace", {
        userId: actorUserId,
        facilityId,
        patientId: enc.patientId,
        entityId: enc.id,
        encounterId: enc.id,
        ip: options?.ip,
        userAgent: options?.userAgent,
        metadata: {
          event: "OBSERVATION_WORKSPACE_BOOTSTRAP_REJECTED_TYPE",
          category: gate.category,
          actualType: enc.type,
          accessKind: "OPEN",
        },
      });
      const messageCode =
        gate.category === "ED_ENCOUNTER_REJECTED"
          ? "inpatientWorkspaceRecovery.errors.ED_ENCOUNTER_REJECTED"
          : "inpatientRapidConvergenceD4a27c.observation.wrongType";
      return {
        certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
        observationCertification: INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
        resolution: {
          ok: false,
          requestedEncounterId: requested,
          category: gate.category,
          writersEnabled: false,
          actualEncounterType: String(enc.type),
          messageCode,
        },
        generatedAt,
        header: null,
        readiness: {
          role,
          encounterResolved: false,
          roleAuthorized: true,
          modules: { bootstrap: "ENCOUNTER_MISMATCH" },
        },
        alertCounts: { criticalResults: null, pendingTasks: null, escalations: null },
        writersEnabled: false,
      };
    }

    await this.audit.log(AuditAction.CHART_ACCESS, "ObservationWorkspace", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      encounterId: enc.id,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        event: "OBSERVATION_WORKSPACE_BOOTSTRAP_OPEN",
        hospitalEpisodeId: enc.hospitalEpisodeId,
        role,
        accessKind: "OPEN",
      },
    });

    const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
    const patientName =
      `${enc.patient?.firstName ?? ""} ${enc.patient?.lastName ?? ""}`.trim() || "—";
    const attendingName = enc.physicianAssigned
      ? `${enc.physicianAssigned.firstName ?? ""} ${enc.physicianAssigned.lastName ?? ""}`.trim() ||
        null
      : null;
    const assignedRnName = enc.nurseAssigned
      ? `${enc.nurseAssigned.firstName ?? ""} ${enc.nurseAssigned.lastName ?? ""}`.trim() || null
      : null;
    let ageYears: number | null = null;
    if (enc.patient?.dob) {
      const dob = new Date(enc.patient.dob);
      if (Number.isFinite(dob.getTime())) {
        ageYears = new Date().getUTCFullYear() - dob.getUTCFullYear();
      }
    }
    const roomParts = String(enc.roomLabel ?? "")
      .split(/[-:]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const modules: Record<string, ClinicalAvailabilityState> = {
      header: "AVAILABLE",
      overview: "AVAILABLE",
      providerNotes: "AVAILABLE",
      nursing: "AVAILABLE",
      orders: "AVAILABLE",
      results: "AVAILABLE",
      medications: "AVAILABLE",
      reassessment: "AVAILABLE",
      disposition: "AVAILABLE",
      timeline: "AVAILABLE",
      summary: "AVAILABLE",
    };

    return {
      certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
      observationCertification: INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
      resolution: {
        ok: true,
        encounterId: enc.id,
        encounterType: "OBSERVATION",
        clinicalContext: "OBSERVATION",
        facilityId: enc.facilityId,
        patientId: enc.patientId,
        status: String(enc.status),
        hospitalEpisodeId: enc.hospitalEpisodeId,
        writersEnabled: true,
      },
      generatedAt,
      header: {
        encounterId: enc.id,
        patientId: enc.patientId,
        patientName,
        preferredName: null,
        mrn: enc.patient?.mrn ?? null,
        dateOfBirth: enc.patient?.dob ? new Date(enc.patient.dob).toISOString() : null,
        ageYears,
        sexAtBirth: enc.patient?.sexAtBirth ?? null,
        preferredLanguage: enc.patient?.language ?? null,
        interpreterRequired: null,
        encounterType: "OBSERVATION",
        hospitalDay: enc.admittedAt
          ? Math.max(
              1,
              Math.floor(
                (Date.now() - new Date(enc.admittedAt).getTime()) / (24 * 60 * 60 * 1000)
              ) + 1
            )
          : null,
        admittedAt: enc.admittedAt ? new Date(enc.admittedAt).toISOString() : null,
        admissionSource: null,
        attendingName,
        assignedRnName,
        residentOrAppName: null,
        facilityName: enc.facility?.name ?? null,
        unit: roomParts[0] ?? null,
        room: roomParts[1] ?? roomParts[0] ?? null,
        bed: roomParts.length > 2 ? roomParts[2]! : null,
        levelOfCare: "OBSERVATION",
        encounterStatus: String(enc.status),
        chiefConcern: enc.chiefComplaint ?? null,
        codeStatus: ops.codeStatus?.status ?? null,
        isolation: ops.isolation?.precautions ?? null,
        fallRisk: null,
        allergiesSummary: (() => {
          try {
            const profile = patientClinicalHistoryProfileFromJson(
              enc.patient?.clinicalHistoryProfileJson ?? null
            );
            const note =
              profile?.allergies?.allergyNote ??
              profile?.allergies?.medicationAllergiesDetail ??
              null;
            return note ? String(note).slice(0, 240) : null;
          } catch {
            return null;
          }
        })(),
        allergiesAvailability: (() => {
          try {
            const profile = patientClinicalHistoryProfileFromJson(
              enc.patient?.clinicalHistoryProfileJson ?? null
            );
            const note =
              profile?.allergies?.allergyNote ??
              profile?.allergies?.medicationAllergiesDetail ??
              null;
            if (note) return "PRESENT" as const;
            if (profile?.allergies) return "NOT_DOCUMENTED" as const;
            return "SOURCE_UNAVAILABLE" as const;
          } catch {
            return "SOURCE_UNAVAILABLE" as const;
          }
        })(),
        oxygenSupport: null,
        dietNpo: null,
        weightKg: null,
        latestVitals: (() => {
          const raw = enc.patient?.latestVitalsJson;
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
            return {
              availability: "NO_DATA_DOCUMENTED" as const,
              recordedAt: enc.patient?.latestVitalsAt
                ? new Date(enc.patient.latestVitalsAt).toISOString()
                : null,
              systolic: null,
              diastolic: null,
              heartRate: null,
              spo2: null,
              temperatureC: null,
              respiratoryRate: null,
            };
          }
          const v = raw as Record<string, unknown>;
          const num = (k: string) => {
            const n = Number(v[k]);
            return Number.isFinite(n) ? n : null;
          };
          return {
            availability: "AVAILABLE" as const,
            recordedAt: enc.patient?.latestVitalsAt
              ? new Date(enc.patient.latestVitalsAt).toISOString()
              : null,
            systolic: num("systolic") ?? num("sbp"),
            diastolic: num("diastolic") ?? num("dbp"),
            heartRate: num("heartRate") ?? num("hr") ?? num("pulse"),
            spo2: num("spo2") ?? num("oxygenSaturation"),
            temperatureC: num("temperatureC") ?? num("tempC") ?? num("temperature"),
            respiratoryRate: num("respiratoryRate") ?? num("rr"),
          };
        })(),
        indicators: [
          {
            code: "ISOLATION",
            state: (ops.isolation?.precautions?.length ? "PRESENT" : "NOT_DOCUMENTED") as
              | "PRESENT"
              | "NOT_DOCUMENTED",
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.isolation",
          },
          {
            code: "PERIPHERAL_IV",
            state: "SOURCE_UNAVAILABLE" as const,
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.peripheralIv",
          },
          {
            code: "CENTRAL_LINE",
            state: "SOURCE_UNAVAILABLE" as const,
            labelKey: "inpatientRapidConvergenceD4a27c.indicators.centralLine",
          },
        ],
      },
      readiness: {
        role,
        encounterResolved: true,
        roleAuthorized: true,
        modules,
      },
      alertCounts: {
        criticalResults: null,
        pendingTasks: null,
        escalations: null,
      },
      writersEnabled: true,
    };
  }

  /** Guard helper for other observation writers. */
  assertObservationEncounter(enc: {
    type?: string | null;
    billingClassification?: string | null;
    admissionSummaryJson?: unknown;
  }) {
    const gate = observationBootstrapRejectsEdAndInpatient(enc);
    if (!gate.ok) {
      if (gate.category === "ED_ENCOUNTER_REJECTED") {
        throw new BadRequestException("ED encounter cannot open Observation workspace");
      }
      throw new BadRequestException("Encounter is not an Observation chart");
    }
  }
}
