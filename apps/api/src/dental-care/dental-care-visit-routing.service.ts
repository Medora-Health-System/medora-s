/**
 * MEDUI.D4C.10D — Dental claim / route / start visit authority.
 * Reuses Encounter.serviceLine as operational destination — no encounter clone for unclaimed waits.
 *
 * In-place CLINIC/null → DENTAL is allowed ONLY when the authoritative ownership
 * predicate finds zero clinical/financial blockers (shared planDentalVisitStart).
 */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import {
  D4C10D_CERTIFICATION_ID,
  buildDentalServiceLineTag,
  listClinicOwnershipBlockersForDentalReroute,
  mergeDentalServiceLineIntoNursingAssessment,
  planDentalVisitStart,
  type D4c10dOpenEncounterRoutingSnapshot,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { EncountersService } from "../encounters/encounters.service";
import { acquireEnterpriseEncounterCreateRaceLock } from "../encounters/encounter-create-race-lock.util";
import { toEncounterClinicResponse } from "../encounters/encounter-response.util";
import { ENCOUNTER_DETAIL_SELECT } from "../encounters/encounter-query-contracts";

/** Prisma select for authoritative safe-reroute evaluation (DB state, not UI). */
const D4C10D_ROUTING_OWNERSHIP_SELECT = {
  id: true,
  type: true,
  status: true,
  serviceLine: true,
  visitOrigin: true,
  providerDocumentationStatus: true,
  providerDocumentationSignedAt: true,
  providerDocumentationSignedByUserId: true,
  providerNote: true,
  treatmentPlan: true,
  notes: true,
  nursingAssessment: true,
  admissionSummaryJson: true,
  dischargeSummaryJson: true,
  physicianAssignedUserId: true,
  nurseAssignedUserId: true,
  providerId: true,
  roomLabel: true,
  disposition: true,
  dischargeStatus: true,
  dischargedAt: true,
  admittedAt: true,
  closedAt: true,
  reopenCount: true,
  workflowState: true,
  billingFinalizationStatus: true,
  billingFinalizedAt: true,
  billingCaptureJson: true,
  billingClassification: true,
  hospitalEpisodeId: true,
  triageAcuity: true,
  vitals: true,
  createdAt: true,
  version: true,
  triage: { select: { triageCompleteAt: true, esi: true } },
  appointment: {
    select: {
      id: true,
      department: { select: { code: true } },
    },
  },
  _count: {
    select: {
      diagnoses: true,
      orders: true,
      encounterNotes: true,
      billingEvents: true,
      claimSubmissions: true,
      encounterClinicalEvents: true,
      clinicalDocumentationEntries: true,
      medicationAdministrations: true,
      toothFindings: true,
      providerAddenda: true,
      lifecycleTransitions: true,
    },
  },
} as const;

function toRoutingSnapshot(
  row: {
    id: string;
    type: string;
    status: string;
    serviceLine: string | null;
    providerDocumentationStatus: string | null;
    providerDocumentationSignedAt: Date | null;
    providerDocumentationSignedByUserId: string | null;
    providerNote: string | null;
    treatmentPlan: string | null;
    notes: string | null;
    nursingAssessment: unknown;
    admissionSummaryJson: unknown;
    dischargeSummaryJson: unknown;
    physicianAssignedUserId: string | null;
    nurseAssignedUserId: string | null;
    providerId: string | null;
    roomLabel: string | null;
    disposition: string | null;
    dischargeStatus: string | null;
    dischargedAt: Date | null;
    admittedAt: Date | null;
    closedAt: Date | null;
    reopenCount: number;
    workflowState: string;
    billingFinalizationStatus: string;
    billingFinalizedAt: Date | null;
    billingCaptureJson: unknown;
    hospitalEpisodeId: string | null;
    triageAcuity: number | null;
    vitals: unknown;
    triage: { triageCompleteAt: Date | null; esi: number | null } | null;
    appointment: { id: string; department: { code: string } | null } | null;
    _count: {
      diagnoses: number;
      orders: number;
      encounterNotes: number;
      billingEvents: number;
      claimSubmissions: number;
      encounterClinicalEvents: number;
      clinicalDocumentationEntries: number;
      medicationAdministrations: number;
      toothFindings: number;
      providerAddenda: number;
      lifecycleTransitions: number;
    };
  }
): D4c10dOpenEncounterRoutingSnapshot {
  // Appointment.department CLINIC alone is NOT a Clinic-only lock (check-in waits
  // are the primary ROUTE case). No durable appointment "Clinic-locked" flag exists.
  const appointmentRequiresClinicOnly = false;

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    serviceLine: row.serviceLine,
    providerDocumentationStatus: row.providerDocumentationStatus,
    providerDocumentationSignedAt: row.providerDocumentationSignedAt,
    providerDocumentationSignedByUserId: row.providerDocumentationSignedByUserId,
    providerNote: row.providerNote,
    treatmentPlan: row.treatmentPlan,
    notes: row.notes,
    nursingAssessment: row.nursingAssessment,
    admissionSummaryJson: row.admissionSummaryJson,
    dischargeSummaryJson: row.dischargeSummaryJson,
    physicianAssignedUserId: row.physicianAssignedUserId,
    nurseAssignedUserId: row.nurseAssignedUserId,
    providerId: row.providerId,
    roomLabel: row.roomLabel,
    disposition: row.disposition,
    dischargeStatus: row.dischargeStatus,
    dischargedAt: row.dischargedAt,
    admittedAt: row.admittedAt,
    closedAt: row.closedAt,
    reopenCount: row.reopenCount,
    workflowState: row.workflowState,
    billingFinalizationStatus: row.billingFinalizationStatus,
    billingFinalizedAt: row.billingFinalizedAt,
    billingCaptureJson: row.billingCaptureJson,
    hospitalEpisodeId: row.hospitalEpisodeId,
    triageAcuity: row.triageAcuity ?? row.triage?.esi ?? null,
    triageCompleteAt: row.triage?.triageCompleteAt ?? null,
    vitals: row.vitals,
    appointmentRequiresClinicOnly,
    diagnosisCount: row._count.diagnoses,
    orderCount: row._count.orders,
    encounterNoteCount: row._count.encounterNotes,
    billingEventCount: row._count.billingEvents,
    claimSubmissionCount: row._count.claimSubmissions,
    clinicalEventCount: row._count.encounterClinicalEvents,
    clinicalDocumentationEntryCount: row._count.clinicalDocumentationEntries,
    medicationAdministrationCount: row._count.medicationAdministrations,
    toothFindingCount: row._count.toothFindings,
    providerAddendumCount: row._count.providerAddenda,
    lifecycleTransitionCount: row._count.lifecycleTransitions,
  };
}

@Injectable()
export class DentalCareVisitRoutingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly encounters: EncountersService
  ) {}

  /**
   * Claim unclaimed Clinic wait → Dental, reuse existing Dental, or create a new Dental visit.
   * Never converts a clinically/financially owned Clinic encounter into Dental.
   */
  async claimOrStartDentalVisit(input: {
    facilityId: string;
    patientId: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    visitReason?: string;
  }) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, facilityId: input.facilityId },
      select: { id: true, mrn: true, globalMrn: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    // Serialize same-patient Dental episode claims (D4C.10C lock reuse).
    const plannedInside = await this.prisma.$transaction(async (tx) => {
      await acquireEnterpriseEncounterCreateRaceLock(tx, {
        facilityId: input.facilityId,
        patientId: input.patientId,
        serviceLine: "DENTAL",
        appointmentId: null,
      });

      const openRowsRaw = await tx.encounter.findMany({
        where: {
          facilityId: input.facilityId,
          patientId: input.patientId,
          status: "OPEN",
        },
        select: D4C10D_ROUTING_OWNERSHIP_SELECT,
      });

      const openRows = openRowsRaw.map((r) => toRoutingSnapshot(r as never));
      const plan = planDentalVisitStart(openRows);

      if (plan.action === "REUSE_EXISTING_DENTAL") {
        const existing = await tx.encounter.findFirst({
          where: { id: plan.encounterId, facilityId: input.facilityId },
          select: ENCOUNTER_DETAIL_SELECT,
        });
        if (!existing) throw new NotFoundException("Encounter not found");
        return {
          kind: "reuse" as const,
          encounter: existing,
          routingAction: plan.action,
        };
      }

      if (plan.action === "ROUTE_UNCLAIMED_CLINIC") {
        const targetRaw = openRowsRaw.find((r) => r.id === plan.encounterId);
        const targetSnap = openRows.find((r) => r.id === plan.encounterId);
        if (!targetRaw || !targetSnap) {
          throw new ConflictException("Unclaimed visit no longer available");
        }

        // Defense in depth: re-evaluate ownership immediately before mutate.
        const blockers = listClinicOwnershipBlockersForDentalReroute(targetSnap);
        if (blockers.length > 0) {
          return {
            kind: "create" as const,
            routingAction: "CREATE_NEW_DENTAL" as const,
            reason: "CLINIC_DOCUMENTED" as const,
            ownershipBlockers: blockers,
            blockingEncounterId: targetSnap.id,
          };
        }

        const nursing = mergeDentalServiceLineIntoNursingAssessment(
          targetRaw.nursingAssessment,
          buildDentalServiceLineTag()
        );

        // Preserve visitOrigin, billingClassification, createdAt, patientId/MRN.
        // Only destination fields mutate for genuinely unclaimed waits.
        const updated = await tx.encounter.updateMany({
          where: {
            id: targetRaw.id,
            facilityId: input.facilityId,
            patientId: input.patientId,
            status: "OPEN",
            version: targetRaw.version,
            OR: [{ serviceLine: null }, { serviceLine: { in: ["CLINIC", "URGENT_CARE"] } }],
            physicianAssignedUserId: null,
            nurseAssignedUserId: null,
            providerId: null,
            providerDocumentationStatus: "DRAFT",
            providerDocumentationSignedAt: null,
            disposition: null,
            dischargeStatus: null,
            dischargedAt: null,
            admittedAt: null,
            closedAt: null,
            reopenCount: 0,
            workflowState: "ARRIVED",
            billingFinalizationStatus: "NOT_READY",
            billingFinalizedAt: null,
            hospitalEpisodeId: null,
          },
          data: {
            serviceLine: "DENTAL",
            roomLabel: "DENTAL",
            nursingAssessment: nursing as never,
            ...(input.visitReason?.trim()
              ? {
                  chiefComplaint: input.visitReason.trim(),
                }
              : {}),
            version: { increment: 1 },
          },
        });
        if (updated.count === 0) {
          throw new ConflictException({
            code: "VISIT_ROUTING_CONFLICT",
            message: "Visit was claimed by another user. Refresh and retry.",
          });
        }

        await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
          userId: input.userId,
          facilityId: input.facilityId,
          patientId: input.patientId,
          encounterId: targetRaw.id,
          entityId: targetRaw.id,
          ip: input.ip,
          userAgent: input.userAgent,
          critical: true,
          tx,
          metadata: {
            certificationId: D4C10D_CERTIFICATION_ID,
            routingAction: "ROUTE_UNCLAIMED_CLINIC_TO_DENTAL",
            previousServiceLine: plan.previousServiceLine,
            newServiceLine: "DENTAL",
            preservedVisitOrigin: true,
            preservedBillingClassification: true,
            preservedCreatedAt: true,
            preservedPatientId: true,
          },
        });

        const encounter = await tx.encounter.findFirst({
          where: { id: targetRaw.id, facilityId: input.facilityId },
          select: ENCOUNTER_DETAIL_SELECT,
        });
        if (!encounter) throw new NotFoundException("Encounter not found after routing");
        return {
          kind: "routed" as const,
          encounter,
          routingAction: plan.action,
          previousServiceLine: plan.previousServiceLine,
        };
      }

      return {
        kind: "create" as const,
        routingAction: plan.action,
        reason: plan.reason,
        ownershipBlockers:
          plan.action === "CREATE_NEW_DENTAL" ? plan.ownershipBlockers : undefined,
        blockingEncounterId:
          plan.action === "CREATE_NEW_DENTAL" ? plan.blockingEncounterId : undefined,
      };
    });

    if (plannedInside.kind === "reuse" || plannedInside.kind === "routed") {
      return {
        certificationId: D4C10D_CERTIFICATION_ID,
        routingAction: plannedInside.routingAction,
        previousServiceLine:
          plannedInside.kind === "routed" ? plannedInside.previousServiceLine : null,
        patientId: patient.id,
        mrn: patient.mrn ?? patient.globalMrn ?? null,
        encounter: toEncounterClinicResponse(plannedInside.encounter),
      };
    }

    // Clinically/financially owned Clinic or no wait → distinct Dental episode (D4C.10).
    const created = await this.encounters.create(
      input.patientId,
      input.facilityId,
      {
        type: "OUTPATIENT",
        serviceLine: "DENTAL",
        visitReason: input.visitReason,
        roomLabel: "DENTAL",
      },
      input.userId,
      input.ip,
      input.userAgent
    );

    return {
      certificationId: D4C10D_CERTIFICATION_ID,
      routingAction: "CREATE_NEW_DENTAL",
      createReason: plannedInside.reason,
      ownershipBlockers: plannedInside.ownershipBlockers ?? null,
      blockingEncounterId: plannedInside.blockingEncounterId ?? null,
      previousServiceLine: null,
      patientId: patient.id,
      mrn: patient.mrn ?? patient.globalMrn ?? null,
      encounter: created,
    };
  }
}
