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
  projectHospitalBoardAssignments,
  readHospitalAssignmentBag,
  readInpatientClinicalOpsFromAdmissionSummary,
  type ClinicalAvailabilityState,
  type HospitalWorkspaceBootstrapV1,
  type InpatientWorkspaceRole,
  projectHospitalHeaderVitalsLiteFromJson,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { SchemaCompatibleEncounterRepository } from "./schema-compatible-encounter.repository";
import { HospitalEncounterAuthorityService } from "./hospital-encounter-authority.service";

@Injectable()
export class ObservationOperationsService {
  private readonly logger = new Logger(ObservationOperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly compatibleEncounters: SchemaCompatibleEncounterRepository,
    private readonly encounterAuthority: HospitalEncounterAuthorityService
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

    // D4A.2.8-HF2: resolve by ID first so FACILITY_MISMATCH is never hidden as NOT_FOUND.
    const authority = await this.encounterAuthority.resolveRequestedEncounter(
      facilityId,
      requested,
      { workspace: "OBSERVATION", allowLineageRedirect: true }
    );

    if (!authority.ok) {
      const mappedCategory =
        authority.category === "CROSS_FACILITY_LINEAGE"
          ? ("FACILITY_MISMATCH" as const)
          : authority.category === "CROSS_PATIENT_LINEAGE"
            ? ("LINEAGE_AMBIGUOUS" as const)
            : authority.category === "WRONG_ENCOUNTER_TYPE"
              ? ("WRONG_ENCOUNTER_TYPE" as const)
              : authority.category;
      await this.audit.log(AuditAction.CHART_ACCESS, "ObservationWorkspace", {
        userId: actorUserId,
        facilityId,
        patientId: authority.patientId ?? undefined,
        entityId: requested,
        encounterId: requested,
        ip: options?.ip,
        userAgent: options?.userAgent,
        metadata: {
          event:
            mappedCategory === "FACILITY_MISMATCH"
              ? "OBSERVATION_WORKSPACE_BOOTSTRAP_FACILITY_MISMATCH"
              : mappedCategory === "NOT_FOUND" || mappedCategory === "MISSING_ID"
                ? "OBSERVATION_WORKSPACE_BOOTSTRAP_FAILED"
                : "OBSERVATION_WORKSPACE_BOOTSTRAP_REJECTED_TYPE",
          category: mappedCategory,
          actualType: authority.actualEncounterType ?? null,
          actualFacilityId: authority.actualFacilityId ?? null,
          accessKind: "OPEN",
        },
      });
      const messageCode =
        mappedCategory === "ED_ENCOUNTER_REJECTED"
          ? "inpatientWorkspaceRecovery.errors.ED_ENCOUNTER_REJECTED"
          : mappedCategory === "FACILITY_MISMATCH"
            ? "inpatientWorkspaceRecovery.errors.FACILITY_MISMATCH"
            : mappedCategory === "NOT_FOUND" || mappedCategory === "MISSING_ID"
              ? `inpatientWorkspaceRecovery.errors.${mappedCategory}`
              : "inpatientRapidConvergenceD4a27c.observation.wrongType";
      return {
        certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
        observationCertification: INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
        resolution: {
          ok: false,
          requestedEncounterId: requested,
          category: mappedCategory,
          writersEnabled: false,
          actualEncounterType: authority.actualEncounterType ?? null,
          actualFacilityId: authority.actualFacilityId ?? null,
          messageCode,
        },
        generatedAt,
        header: null,
        readiness: {
          role,
          encounterResolved: false,
          roleAuthorized: true,
          modules: {
            bootstrap:
              mappedCategory === "NOT_FOUND" || mappedCategory === "MISSING_ID"
                ? "SOURCE_UNAVAILABLE"
                : "ENCOUNTER_MISMATCH",
          },
        },
        alertCounts: { criticalResults: null, pendingTasks: null, escalations: null },
        writersEnabled: false,
      };
    }

    const enc = await this.compatibleEncounters.findFacilityEncounterForWorkspace(
      facilityId,
      authority.resolvedEncounterId
    );
    if (!enc) {
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

    // Defense-in-depth: keep legacy gate aligned with authority OBSERVATION workspace.
    const gate = observationBootstrapRejectsEdAndInpatient({
      type: enc.type,
      billingClassification: enc.billingClassification,
      admissionSummaryJson: enc.admissionSummaryJson,
    });
    if (!gate.ok) {
      return {
        certification: INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
        observationCertification: INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
        resolution: {
          ok: false,
          requestedEncounterId: requested,
          category: gate.category,
          writersEnabled: false,
          actualEncounterType: String(enc.type),
          messageCode:
            gate.category === "ED_ENCOUNTER_REJECTED"
              ? "inpatientWorkspaceRecovery.errors.ED_ENCOUNTER_REJECTED"
              : "inpatientRapidConvergenceD4a27c.observation.wrongType",
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
    // D4A.3.0 — hospital care team from independent bag only (never ED columns).
    const hospitalAssignment = projectHospitalBoardAssignments(
      readHospitalAssignmentBag(enc.admissionSummaryJson)
    );
    const attendingName = hospitalAssignment.providerName;
    const assignedRnName = hospitalAssignment.nurseName;
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
        weightKg: projectHospitalHeaderVitalsLiteFromJson(
          enc.patient?.latestVitalsJson,
          enc.patient?.latestVitalsAt ? new Date(enc.patient.latestVitalsAt).toISOString() : null
        ).weightKg,
        latestVitals: projectHospitalHeaderVitalsLiteFromJson(
          enc.patient?.latestVitalsJson,
          enc.patient?.latestVitalsAt ? new Date(enc.patient.latestVitalsAt).toISOString() : null
        ),
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
