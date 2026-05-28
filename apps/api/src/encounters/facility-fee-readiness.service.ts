import { Injectable, NotFoundException } from "@nestjs/common";
import {
  computeObservationStaySummaryForExport,
  evaluateFacilityBillingIdentityComplete,
  resolveEncounterBillingExportReadiness,
  resolveFacilityFeeOperationalReadiness,
  type BillingClassification,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { facilityBillingWorkflowSelect, facilityWorkflowConfigFromRow } from "./facility-billing-workflow.util";

const facilityIdentitySelect = {
  billingLegalName: true,
  billingAddressLine1: true,
  billingCity: true,
  billingStateProvince: true,
  billingPostalCode: true,
  billingCountry: true,
  billingNpi: true,
  taxIdEin: true,
} as const;

function encounterDurationMinutes(args: {
  createdAt: Date;
  dischargedAt: Date | null;
  nowMs: number;
}): number {
  const endMs = args.dischargedAt?.getTime() ?? args.nowMs;
  return Math.max(0, Math.floor((endMs - args.createdAt.getTime()) / 60000));
}

@Injectable()
export class FacilityFeeReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getForEncounter(params: { encounterId: string; facilityId: string }) {
    const { encounterId, facilityId } = params;
    const nowMs = Date.now();

    const [encounter, facility] = await Promise.all([
      this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: {
          id: true,
          type: true,
          status: true,
          workflowState: true,
          billingClassification: true,
          createdAt: true,
          admittedAt: true,
          dischargedAt: true,
          dischargeStatus: true,
          providerId: true,
          physicianAssignedUserId: true,
          nursingAssessment: true,
        },
      }),
      this.prisma.facility.findFirst({
        where: { id: facilityId },
        select: {
          ...facilityIdentitySelect,
          ...facilityBillingWorkflowSelect,
        },
      }),
    ]);

    if (!encounter) throw new NotFoundException("Encounter not found");
    if (!facility) throw new NotFoundException("Facility not found");

    const diagnosisCount = await this.prisma.diagnosis.count({
      where: { facilityId, encounterId, status: "ACTIVE" },
    });

    const facilityBillingIdentityComplete = evaluateFacilityBillingIdentityComplete(facility);
    const workflowConfig = facilityWorkflowConfigFromRow(facility);
    const hasProviderAttribution = Boolean(
      encounter.physicianAssignedUserId?.trim() || encounter.providerId?.trim(),
    );
    const durationMinutes = encounterDurationMinutes({
      createdAt: encounter.createdAt,
      dischargedAt: encounter.dischargedAt,
      nowMs,
    });

    const observationStay = computeObservationStaySummaryForExport({
      encounterType: encounter.type,
      admittedAt: encounter.admittedAt,
      createdAt: encounter.createdAt,
      dischargedAt: encounter.dischargedAt,
      previewNowMs: encounter.status !== "CLOSED" ? nowMs : null,
    });

    const exportReadiness = resolveEncounterBillingExportReadiness({
      billingClassification: encounter.billingClassification as BillingClassification,
      facilityBillingIdentityComplete,
      hasPrimaryDiagnosis: diagnosisCount > 0,
      hasProcedureCodes: false,
      hasPayer: true,
      facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
      encounterStatus: encounter.status,
    });

    const ws = (encounter.workflowState ?? "").trim();
    const boardingOperational = ws === "ARRIVED" || ws === "TRIAGE";
    const hasObservationDocumentation = encounter.nursingAssessment != null;

    const readiness = resolveFacilityFeeOperationalReadiness({
      billingClassification: encounter.billingClassification as BillingClassification,
      exportRoute: exportReadiness.route,
      encounterStatus: encounter.status,
      encounterDurationMinutes:
        observationStay.observationLosMinutes ?? durationMinutes,
      hasPrimaryDiagnosis: diagnosisCount > 0,
      hasProviderAttribution,
      hasFacilityBillingIdentity: facilityBillingIdentityComplete,
      facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
      disposition: encounter.dischargeStatus,
      boardingOperational,
      extendedObservationLos: observationStay.extendedObservation24hPlus,
      observationToInpatientPending: false,
      hasObservationDocumentation,
    });

    return {
      encounterId: encounter.id,
      facilityId,
      billingClassification: encounter.billingClassification,
      exportRoute: exportReadiness.route,
      ...readiness,
      previewOnly: true as const,
    };
  }
}
