import { Injectable, NotFoundException } from "@nestjs/common";
import {
  computeObservationStaySummaryForExport,
  evaluateFacilityBillingIdentityComplete,
  resolveChargeCaptureReview,
  resolveEncounterBillingExportReadiness,
  resolveFacilityFeeOperationalReadiness,
  resolveProfessionalFacilityBillingLedger,
  type BillingClassification,
  type ChargeReviewDomain,
  type ChargeReviewStatus,
} from "@medora/shared";
import { BillingSide, EncounterBillingFinalizationStatus, OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { resolvePrimaryCoverage } from "../billing/claim-coverage-resolution.util";
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

const encounterSelect = {
  id: true,
  type: true,
  status: true,
  workflowState: true,
  billingClassification: true,
  billingFinalizationStatus: true,
  createdAt: true,
  admittedAt: true,
  dischargedAt: true,
  dischargeStatus: true,
  providerId: true,
  physicianAssignedUserId: true,
  nursingAssessment: true,
  patientId: true,
  patient: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const;

export type ChargeReviewQueueFilters = {
  facilityId: string;
  status?: ChargeReviewStatus;
  domain?: ChargeReviewDomain;
  billingClassification?: BillingClassification;
  dateFrom?: Date;
  dateTo?: Date;
  encounterOpen?: boolean;
  manualReviewOnly?: boolean;
  limit?: number;
};

function encounterDurationMinutes(args: {
  createdAt: Date;
  dischargedAt: Date | null;
  nowMs: number;
}): number {
  const endMs = args.dischargedAt?.getTime() ?? args.nowMs;
  return Math.max(0, Math.floor((endMs - args.createdAt.getTime()) / 60000));
}

function patientDisplaySafeLabel(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const f = (firstName ?? "").trim();
  const l = (lastName ?? "").trim();
  if (f && l) return `${f} ${l.charAt(0).toUpperCase()}.`;
  if (f) return f;
  if (l) return `${l.charAt(0).toUpperCase()}.`;
  return "—";
}

@Injectable()
export class ChargeCaptureReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getForEncounter(params: { encounterId: string; facilityId: string }) {
    const summary = await this.buildEncounterChargeReview(params.encounterId, params.facilityId);
    if (!summary) throw new NotFoundException("Encounter not found");
    return summary;
  }

  async getQueue(filters: ChargeReviewQueueFilters) {
    const { facilityId } = filters;
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 250);
    const nowMs = Date.now();

    const where: Record<string, unknown> = { facilityId };
    if (filters.billingClassification) {
      where.billingClassification = filters.billingClassification;
    }
    if (filters.encounterOpen === true) {
      where.status = { not: "CLOSED" };
    } else if (filters.encounterOpen === false) {
      where.status = "CLOSED";
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    const [encounters, facility] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        select: encounterSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      this.prisma.facility.findFirst({
        where: { id: facilityId },
        select: {
          ...facilityIdentitySelect,
          ...facilityBillingWorkflowSelect,
        },
      }),
    ]);

    if (!facility) throw new NotFoundException("Facility not found");

    const ids = encounters.map((e) => e.id);
    if (ids.length === 0) {
      return { rows: [], previewOnly: true as const };
    }

    const [diagGroup, billingEvents, pendingOrderGroup] = await Promise.all([
      this.prisma.diagnosis.groupBy({
        by: ["encounterId"],
        where: { facilityId, encounterId: { in: ids }, status: "ACTIVE" },
        _count: { _all: true },
      }),
      this.prisma.billingEvent.findMany({
        where: { facilityId, encounterId: { in: ids }, reviewStatus: { not: "VOIDED" } },
        select: {
          encounterId: true,
          billingSide: true,
          procedureCode: true,
          hcpcsCode: true,
          code: true,
        },
      }),
      this.prisma.order.groupBy({
        by: ["encounterId"],
        where: {
          facilityId,
          encounterId: { in: ids },
          status: OrderStatus.IN_PROGRESS,
        },
        _count: { _all: true },
      }),
    ]);

    const diagMap = new Map(diagGroup.map((g) => [g.encounterId, g._count._all]));
    const pendingMap = new Map(pendingOrderGroup.map((g) => [g.encounterId, g._count._all]));
    const eventsByEncounter = new Map<string, typeof billingEvents>();
    for (const row of billingEvents) {
      const cur = eventsByEncounter.get(row.encounterId) ?? [];
      cur.push(row);
      eventsByEncounter.set(row.encounterId, cur);
    }

    const facilityBillingIdentityComplete = evaluateFacilityBillingIdentityComplete(facility);
    const workflowConfig = facilityWorkflowConfigFromRow(facility);

    const rows = [];
    for (const encounter of encounters) {
      const evRows = eventsByEncounter.get(encounter.id) ?? [];
      const review = this.computeReviewFromData({
        encounter,
        facilityBillingIdentityComplete,
        workflowMode: workflowConfig.billingClassificationMode,
        diagnosisCount: diagMap.get(encounter.id) ?? 0,
        billingEvents: evRows,
        hasPendingResults: (pendingMap.get(encounter.id) ?? 0) > 0,
        nowMs,
        hasPayer: true,
      });

      if (filters.status && review.chargeReviewStatus !== filters.status) continue;
      if (filters.domain && !review.domains.includes(filters.domain)) continue;
      if (filters.manualReviewOnly && !review.manualReviewRequired) continue;

      const { layers: _layers, ...queueRow } = review;
      rows.push(queueRow);
    }

    return { rows, previewOnly: true as const };
  }

  private async buildEncounterChargeReview(encounterId: string, facilityId: string) {
    const nowMs = Date.now();
    const [encounter, facility] = await Promise.all([
      this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: encounterSelect,
      }),
      this.prisma.facility.findFirst({
        where: { id: facilityId },
        select: {
          ...facilityIdentitySelect,
          ...facilityBillingWorkflowSelect,
        },
      }),
    ]);

    if (!encounter || !facility) return null;

    const [diagnosisCount, billingEvents, payerResolution, pendingOrders] = await Promise.all([
      this.prisma.diagnosis.count({
        where: { facilityId, encounterId, status: "ACTIVE" },
      }),
      this.prisma.billingEvent.findMany({
        where: { facilityId, encounterId, reviewStatus: { not: "VOIDED" } },
        select: {
          billingSide: true,
          procedureCode: true,
          hcpcsCode: true,
          code: true,
        },
      }),
      resolvePrimaryCoverage(this.prisma, {
        facilityId,
        patientId: encounter.patientId,
        serviceDate: encounter.createdAt,
      }),
      this.prisma.order.count({
        where: { facilityId, encounterId, status: OrderStatus.IN_PROGRESS },
      }),
    ]);

    const facilityBillingIdentityComplete = evaluateFacilityBillingIdentityComplete(facility);
    const workflowConfig = facilityWorkflowConfigFromRow(facility);

    const computed = this.computeReviewFromData({
      encounter,
      facilityBillingIdentityComplete,
      workflowMode: workflowConfig.billingClassificationMode,
      diagnosisCount,
      billingEvents,
      hasPendingResults: pendingOrders > 0,
      nowMs,
      hasPayer: payerResolution.ok,
    });

    const { layers, ...row } = computed;
    return {
      ...row,
      exportReadiness: layers.exportReadiness,
      ledgerReadiness: layers.ledgerReadiness,
      facilityFeeReadiness: layers.facilityFeeReadiness,
      previewOnly: true as const,
    };
  }

  private computeReviewFromData(args: {
    encounter: {
      id: string;
      type: string;
      status: string;
      workflowState: string | null;
      billingClassification: string;
      billingFinalizationStatus: EncounterBillingFinalizationStatus;
      createdAt: Date;
      admittedAt: Date | null;
      dischargedAt: Date | null;
      dischargeStatus: string | null;
      providerId: string | null;
      physicianAssignedUserId: string | null;
      nursingAssessment: unknown;
      patient?: { firstName: string | null; lastName: string | null } | null;
    };
    facilityBillingIdentityComplete: boolean;
    workflowMode: ReturnType<typeof facilityWorkflowConfigFromRow>["billingClassificationMode"];
    diagnosisCount: number;
    billingEvents: Array<{
      billingSide: BillingSide;
      procedureCode: string | null;
      hcpcsCode: string | null;
      code: string | null;
    }>;
    hasPendingResults: boolean;
    nowMs: number;
    hasPayer: boolean;
  }) {
    const { encounter } = args;
    const classification = encounter.billingClassification as BillingClassification;
    const hasPrimaryDiagnosis = args.diagnosisCount > 0;
    const hasProviderAttribution = Boolean(
      encounter.physicianAssignedUserId?.trim() || encounter.providerId?.trim(),
    );
    const hasProcedureCodes = args.billingEvents.some(
      (e) => Boolean(e.procedureCode?.trim()) || Boolean(e.hcpcsCode?.trim()) || Boolean(e.code?.trim()),
    );
    const hasUnknownBillingSideEvents = args.billingEvents.some((e) => e.billingSide === BillingSide.UNKNOWN);

    let professionalEventCount = 0;
    let facilityEventCount = 0;
    let unknownSideEventCount = 0;
    let procedureCodeCount = 0;
    for (const row of args.billingEvents) {
      if (row.billingSide === BillingSide.PROFESSIONAL || row.billingSide === BillingSide.BOTH) {
        professionalEventCount++;
      }
      if (row.billingSide === BillingSide.FACILITY || row.billingSide === BillingSide.BOTH) {
        facilityEventCount++;
      }
      if (row.billingSide === BillingSide.UNKNOWN) {
        unknownSideEventCount++;
      }
      if (row.procedureCode?.trim() || row.hcpcsCode?.trim() || row.code?.trim()) {
        procedureCodeCount++;
      }
    }

    const durationMinutes = encounterDurationMinutes({
      createdAt: encounter.createdAt,
      dischargedAt: encounter.dischargedAt,
      nowMs: args.nowMs,
    });

    const observationStay = computeObservationStaySummaryForExport({
      encounterType: encounter.type,
      admittedAt: encounter.admittedAt,
      createdAt: encounter.createdAt,
      dischargedAt: encounter.dischargedAt,
      previewNowMs: encounter.status !== "CLOSED" ? args.nowMs : null,
    });

    const exportReadiness = resolveEncounterBillingExportReadiness({
      billingClassification: classification,
      facilityBillingIdentityComplete: args.facilityBillingIdentityComplete,
      hasPrimaryDiagnosis,
      hasProcedureCodes,
      hasPayer: args.hasPayer,
      facilityBillingWorkflowMode: args.workflowMode,
      encounterStatus: encounter.status,
    });

    const ledgerReadiness = resolveProfessionalFacilityBillingLedger({
      billingClassification: classification,
      billingExportRoute: exportReadiness.route,
      hasPrimaryDiagnosis,
      hasProfessionalProvider: hasProviderAttribution,
      hasProcedureCodes,
      hasFacilityBillingIdentity: args.facilityBillingIdentityComplete,
      hasPayer: args.hasPayer,
      encounterStatus: encounter.status,
      facilityBillingWorkflowMode: args.workflowMode,
    });

    const ws = (encounter.workflowState ?? "").trim();
    const boardingOperational = ws === "ARRIVED" || ws === "TRIAGE";

    const facilityFeeReadiness = resolveFacilityFeeOperationalReadiness({
      billingClassification: classification,
      exportRoute: exportReadiness.route,
      encounterStatus: encounter.status,
      encounterDurationMinutes: observationStay.observationLosMinutes ?? durationMinutes,
      hasPrimaryDiagnosis,
      hasProviderAttribution,
      hasFacilityBillingIdentity: args.facilityBillingIdentityComplete,
      facilityBillingWorkflowMode: args.workflowMode,
      disposition: encounter.dischargeStatus,
      boardingOperational,
      extendedObservationLos: observationStay.extendedObservation24hPlus,
      observationToInpatientPending: false,
      hasObservationDocumentation: encounter.nursingAssessment != null,
    });

    const chargeReview = resolveChargeCaptureReview({
      billingClassification: classification,
      encounterStatus: encounter.status,
      exportReadiness,
      ledgerReadiness,
      facilityFeeReadiness,
      hasPrimaryDiagnosis,
      hasProviderAttribution,
      hasPayer: args.hasPayer,
      hasPendingResults: args.hasPendingResults,
      hasUnknownBillingSideEvents,
      hasProcedureCodes,
      encounterAgeMinutes: durationMinutes,
      facilityBillingWorkflowMode: args.workflowMode,
      billingReviewCompleted:
        encounter.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED,
    });

    return {
      encounterId: encounter.id,
      patientDisplaySafeLabel: patientDisplaySafeLabel(
        encounter.patient?.firstName,
        encounter.patient?.lastName,
      ),
      encounterDate: encounter.createdAt.toISOString(),
      billingClassification: classification,
      chargeReviewStatus: chargeReview.status,
      domains: chargeReview.domains,
      reasons: chargeReview.reasons,
      warnings: chargeReview.warnings,
      professionalStatus: ledgerReadiness.professional.status,
      facilityStatus: ledgerReadiness.facility.status,
      facilityFeeStatus: facilityFeeReadiness.readinessStatus,
      manualReviewRequired:
        chargeReview.requiresCoderReview ||
        chargeReview.requiresFacilityReview ||
        chargeReview.requiresProviderClarification ||
        exportReadiness.requiresManualReview ||
        ledgerReadiness.requiresManualReview ||
        facilityFeeReadiness.requiresManualReview,
      missingItemsCount: chargeReview.reasons.length,
      requiresCoderReview: chargeReview.requiresCoderReview,
      requiresProviderClarification: chargeReview.requiresProviderClarification,
      requiresFacilityReview: chargeReview.requiresFacilityReview,
      hold: chargeReview.hold,
      readyForReview: chargeReview.readyForReview,
      nextOperationalAction: chargeReview.status,
      eventCounts: {
        professionalEventCount,
        facilityEventCount,
        unknownSideEventCount,
        procedureCodeCount,
      },
      previewOnly: true as const,
      layers: {
        exportReadiness,
        ledgerReadiness,
        facilityFeeReadiness,
      },
    };
  }
}
