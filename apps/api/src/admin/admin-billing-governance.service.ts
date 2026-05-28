import { Injectable, NotFoundException } from "@nestjs/common";
import {
  buildBillingGovernanceAnalytics,
  computeObservationStaySummaryForExport,
  deriveDocumentationCompletenessFlags,
  evaluateFacilityBillingIdentityComplete,
  incrementGovernanceCount,
  resolveChargeCaptureReview,
  resolveClaimAssemblyPreview,
  resolveCodingIntegrityReview,
  resolveEncounterBillingExportReadiness,
  resolveFacilityFeeOperationalReadiness,
  resolveProfessionalFacilityBillingLedger,
  type BillingClassification,
  type BillingClassificationTransitionEntry,
  type BillingGovernanceAnalyticsInput,
} from "@medora/shared";
import { AuditAction, BillingSide, EncounterBillingFinalizationStatus, OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { facilityBillingWorkflowSelect, facilityWorkflowConfigFromRow } from "../encounters/facility-billing-workflow.util";

const READINESS_SAMPLE_LIMIT = 500;

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
  disposition: true,
  dischargeSummaryJson: true,
  providerDocumentationStatus: true,
  providerId: true,
  physicianAssignedUserId: true,
  nursingAssessment: true,
  patientId: true,
  facilityId: true,
  billingClassificationTransitionJson: true,
} as const;

export type BillingGovernanceSummaryFilters = {
  facilityId: string;
  dateFrom?: Date;
  dateTo?: Date;
  classification?: BillingClassification;
  includeClosed?: boolean;
  includeOpen?: boolean;
};

function encounterDurationMinutes(args: {
  createdAt: Date;
  dischargedAt: Date | null;
  nowMs: number;
}): number {
  const endMs = args.dischargedAt?.getTime() ?? args.nowMs;
  return Math.max(0, Math.floor((endMs - args.createdAt.getTime()) / 60000));
}

function inDateRange(iso: string, dateFrom?: Date, dateTo?: Date): boolean {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  if (dateFrom && ms < dateFrom.getTime()) return false;
  if (dateTo && ms > dateTo.getTime()) return false;
  return true;
}

@Injectable()
export class AdminBillingGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSummary(
    filters: BillingGovernanceSummaryFilters,
    auditContext: { userId?: string; ip?: string; userAgent?: string },
  ) {
    const { facilityId } = filters;
    const nowMs = Date.now();
    const includeOpen = filters.includeOpen !== false;
    const includeClosed = filters.includeClosed !== false;

    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId },
      select: {
        ...facilityIdentitySelect,
        ...facilityBillingWorkflowSelect,
      },
    });
    if (!facility) throw new NotFoundException("Facility not found");

    const encounterWhere: Record<string, unknown> = { facilityId };
    if (filters.classification) {
      encounterWhere.billingClassification = filters.classification;
    }
    if (filters.dateFrom || filters.dateTo) {
      encounterWhere.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }
    const statusFilter: string[] = [];
    if (includeOpen) statusFilter.push("OPEN");
    if (includeClosed) statusFilter.push("CLOSED");
    if (statusFilter.length === 1) {
      encounterWhere.status = statusFilter[0];
    } else if (statusFilter.length === 0) {
      return buildBillingGovernanceAnalytics({
        totals: {
          encountersReviewed: 0,
          openEncounters: 0,
          closedEncounters: 0,
          readinessSampleSize: 0,
        },
        byClassification: {},
        byFacility: [],
        byExportReadinessRoute: {},
        byLedgerProfessionalStatus: {},
        byLedgerFacilityStatus: {},
        byFacilityFeeStatus: {},
        byChargeReviewStatus: {},
        byCodingReviewStatus: {},
        byClaimAssemblyStatus: {},
        conversionSummary: {
          ucToEdCount: 0,
          edToUcCount: 0,
          acknowledgmentCapturedCount: 0,
          missingAcknowledgmentCount: 0,
          byFacility: [],
        },
        observationSummary: {
          reviewRequiredCount: 0,
          extendedObservationCount: 0,
          activeObservationCount: 0,
          holdForPendingResultsCount: 0,
        },
        claimAssemblySummary: {
          readyForExportReviewCount: 0,
          notReadyCount: 0,
          manualReviewRequiredCount: 0,
          professionalReadyCount: 0,
          facilityReadyCount: 0,
        },
        facilityConfiguration: this.evaluateFacilityConfiguration(facility),
        manualReviewRequiredCount: 0,
        pendingResultsCount: 0,
      });
    }

    const [classificationGroups, statusGroups, transitionEncounters, readinessEncounters] = await Promise.all([
      this.prisma.encounter.groupBy({
        by: ["billingClassification"],
        where: encounterWhere,
        _count: { _all: true },
      }),
      this.prisma.encounter.groupBy({
        by: ["status"],
        where: encounterWhere,
        _count: { _all: true },
      }),
      this.prisma.encounter.findMany({
        where: encounterWhere,
        select: {
          facilityId: true,
          billingClassificationTransitionJson: true,
        },
      }),
      this.prisma.encounter.findMany({
        where: encounterWhere,
        select: encounterSelect,
        orderBy: { createdAt: "desc" },
        take: READINESS_SAMPLE_LIMIT,
      }),
    ]);

    const byClassification: BillingGovernanceAnalyticsInput["byClassification"] = {};
    for (const row of classificationGroups) {
      byClassification[row.billingClassification as BillingClassification] = row._count._all;
    }

    let openEncounters = 0;
    let closedEncounters = 0;
    for (const row of statusGroups) {
      if (row.status === "OPEN") openEncounters = row._count._all;
      if (row.status === "CLOSED") closedEncounters = row._count._all;
    }
    const encountersReviewed = openEncounters + closedEncounters;

    const conversionSummary: BillingGovernanceAnalyticsInput["conversionSummary"] = {
      ucToEdCount: 0,
      edToUcCount: 0,
      acknowledgmentCapturedCount: 0,
      missingAcknowledgmentCount: 0,
      byFacility: [{ facilityId, ucToEdCount: 0, edToUcCount: 0 }],
    };

    for (const enc of transitionEncounters) {
      const transitions = Array.isArray(enc.billingClassificationTransitionJson)
        ? (enc.billingClassificationTransitionJson as BillingClassificationTransitionEntry[])
        : [];
      for (const t of transitions) {
        if (!inDateRange(t.changedAt, filters.dateFrom, filters.dateTo)) continue;
        if (t.from === "URGENT_CARE" && t.to === "EMERGENCY_DEPARTMENT") {
          conversionSummary.ucToEdCount += 1;
          conversionSummary.byFacility[0]!.ucToEdCount += 1;
          if (t.patientAcknowledged) {
            conversionSummary.acknowledgmentCapturedCount += 1;
          } else {
            conversionSummary.missingAcknowledgmentCount += 1;
          }
        }
        if (t.from === "EMERGENCY_DEPARTMENT" && t.to === "URGENT_CARE") {
          conversionSummary.edToUcCount += 1;
          conversionSummary.byFacility[0]!.edToUcCount += 1;
        }
      }
    }

    const ids = readinessEncounters.map((e) => e.id);
    const [diagGroup, billingEvents, pendingOrderGroup, reassessmentGroup] =
      ids.length === 0
        ? [[], [], [], []]
        : await Promise.all([
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
            this.prisma.encounterClinicalEvent.groupBy({
              by: ["encounterId"],
              where: {
                facilityId,
                encounterId: { in: ids },
                payloadJson: { path: ["source"], equals: "OBSERVATION_REASSESSMENT_V1" },
              },
              _count: { _all: true },
            }),
          ]);

    const diagMap = new Map(diagGroup.map((g) => [g.encounterId, g._count._all]));
    const pendingMap = new Map(pendingOrderGroup.map((g) => [g.encounterId, g._count._all]));
    const reassessmentMap = new Map(reassessmentGroup.map((g) => [g.encounterId, g._count._all]));
    const eventsByEncounter = new Map<string, typeof billingEvents>();
    for (const row of billingEvents) {
      const cur = eventsByEncounter.get(row.encounterId) ?? [];
      cur.push(row);
      eventsByEncounter.set(row.encounterId, cur);
    }

    const facilityBillingIdentityComplete = evaluateFacilityBillingIdentityComplete(facility);
    const workflowConfig = facilityWorkflowConfigFromRow(facility);

    const byExportReadinessRoute: BillingGovernanceAnalyticsInput["byExportReadinessRoute"] = {};
    const byLedgerProfessionalStatus: BillingGovernanceAnalyticsInput["byLedgerProfessionalStatus"] = {};
    const byLedgerFacilityStatus: BillingGovernanceAnalyticsInput["byLedgerFacilityStatus"] = {};
    const byFacilityFeeStatus: BillingGovernanceAnalyticsInput["byFacilityFeeStatus"] = {};
    const byChargeReviewStatus: BillingGovernanceAnalyticsInput["byChargeReviewStatus"] = {};
    const byCodingReviewStatus: BillingGovernanceAnalyticsInput["byCodingReviewStatus"] = {};
    const byClaimAssemblyStatus: BillingGovernanceAnalyticsInput["byClaimAssemblyStatus"] = {};

    let manualReviewRequiredCount = 0;
    let pendingResultsCount = 0;
    let observationReviewRequired = 0;
    let extendedObservationCount = 0;
    let activeObservationCount = 0;
    let holdForPendingResultsCount = 0;
    let claimReadyCount = 0;
    let claimNotReadyCount = 0;
    let claimManualReview = 0;
    let professionalReadyCount = 0;
    let facilityReadyCount = 0;

    for (const encounter of readinessEncounters) {
      const classification = encounter.billingClassification as BillingClassification;
      const diagnosisCount = diagMap.get(encounter.id) ?? 0;
      const hasPrimaryDiagnosis = diagnosisCount > 0;
      const hasProviderAttribution = Boolean(
        encounter.physicianAssignedUserId?.trim() || encounter.providerId?.trim(),
      );
      const encEvents = eventsByEncounter.get(encounter.id) ?? [];
      const hasProcedureCodes = encEvents.some(
        (e) => Boolean(e.procedureCode?.trim()) || Boolean(e.hcpcsCode?.trim()) || Boolean(e.code?.trim()),
      );
      const hasUnknownBillingSideEvents = encEvents.some((e) => e.billingSide === BillingSide.UNKNOWN);
      const hasPendingResults = (pendingMap.get(encounter.id) ?? 0) > 0;
      if (hasPendingResults) pendingResultsCount += 1;

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
        billingClassification: classification,
        facilityBillingIdentityComplete,
        hasPrimaryDiagnosis,
        hasProcedureCodes,
        hasPayer: true,
        facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
        encounterStatus: encounter.status,
      });
      incrementGovernanceCount(byExportReadinessRoute, exportReadiness.route);

      const ledgerReadiness = resolveProfessionalFacilityBillingLedger({
        billingClassification: classification,
        billingExportRoute: exportReadiness.route,
        hasPrimaryDiagnosis,
        hasProfessionalProvider: hasProviderAttribution,
        hasProcedureCodes,
        hasFacilityBillingIdentity: facilityBillingIdentityComplete,
        hasPayer: true,
        encounterStatus: encounter.status,
        facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
      });
      incrementGovernanceCount(byLedgerProfessionalStatus, ledgerReadiness.professional.status);
      incrementGovernanceCount(byLedgerFacilityStatus, ledgerReadiness.facility.status);

      const ws = (encounter.workflowState ?? "").trim();
      const boardingOperational = ws === "ARRIVED" || ws === "TRIAGE";

      const facilityFeeReadiness = resolveFacilityFeeOperationalReadiness({
        billingClassification: classification,
        exportRoute: exportReadiness.route,
        encounterStatus: encounter.status,
        encounterDurationMinutes: observationStay.observationLosMinutes ?? durationMinutes,
        hasPrimaryDiagnosis,
        hasProviderAttribution,
        hasFacilityBillingIdentity: facilityBillingIdentityComplete,
        facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
        disposition: encounter.dischargeStatus,
        boardingOperational,
        extendedObservationLos: observationStay.extendedObservation24hPlus,
        observationToInpatientPending: false,
        hasObservationDocumentation: encounter.nursingAssessment != null,
      });
      incrementGovernanceCount(byFacilityFeeStatus, facilityFeeReadiness.readinessStatus);

      if (facilityFeeReadiness.readinessStatus === "REVIEW_REQUIRED") {
        observationReviewRequired += 1;
      }
      if (facilityFeeReadiness.observationOperationalStatus === "EXTENDED_OBSERVATION_REVIEW") {
        extendedObservationCount += 1;
      }
      if (
        facilityFeeReadiness.observationOperationalStatus === "ACTIVE_OBSERVATION" ||
        facilityFeeReadiness.observationOperationalStatus === "OBSERVATION_CANDIDATE"
      ) {
        activeObservationCount += 1;
      }

      const chargeReview = resolveChargeCaptureReview({
        billingClassification: classification,
        encounterStatus: encounter.status,
        exportReadiness,
        ledgerReadiness,
        facilityFeeReadiness,
        hasPrimaryDiagnosis,
        hasProviderAttribution,
        hasPayer: true,
        hasPendingResults,
        hasUnknownBillingSideEvents,
        hasProcedureCodes,
        encounterAgeMinutes: durationMinutes,
        facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
        billingReviewCompleted:
          encounter.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED,
      });
      incrementGovernanceCount(byChargeReviewStatus, chargeReview.status);
      if (chargeReview.status === "HOLD_FOR_PENDING_RESULTS") {
        holdForPendingResultsCount += 1;
      }

      const documentationCompleteness = deriveDocumentationCompletenessFlags({
        nursingAssessment: encounter.nursingAssessment,
        dischargeStatus: encounter.dischargeStatus,
        disposition: encounter.disposition,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        providerDocumentationStatus: encounter.providerDocumentationStatus,
        hasPrimaryDiagnosis,
        hasProviderAttribution,
        observationReassessmentEventCount: reassessmentMap.get(encounter.id) ?? 0,
      });

      const codingReview = resolveCodingIntegrityReview({
        billingClassification: classification,
        encounterStatus: encounter.status,
        exportReadiness,
        ledgerReadiness,
        facilityFeeReadiness,
        chargeReview,
        hasPrimaryDiagnosis,
        hasProviderAttribution,
        hasMDM: documentationCompleteness.hasMDM,
        hasDispositionDocumentation: documentationCompleteness.hasDispositionDocumentation,
        hasReassessment: documentationCompleteness.hasReassessment,
        hasPendingResults,
        observationStatus: facilityFeeReadiness.observationOperationalStatus,
        encounterAgeMinutes: durationMinutes,
        facilityBillingWorkflowMode: workflowConfig.billingClassificationMode,
        codingReviewCompleted:
          encounter.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED,
      });
      incrementGovernanceCount(byCodingReviewStatus, codingReview.status);

      const claimAssembly = resolveClaimAssemblyPreview({
        billingClassification: classification,
        exportReadiness,
        ledgerReadiness,
        facilityFeeReadiness,
        chargeReview,
        codingReview,
        encounterStatus: encounter.status,
        hasPrimaryDiagnosis,
        hasPayer: true,
        hasProviderAttribution,
        hasFacilityBillingIdentity: facilityBillingIdentityComplete,
        hasProfessionalLedger: encEvents.some(
          (e) => e.billingSide === BillingSide.PROFESSIONAL || e.billingSide === BillingSide.BOTH,
        ),
        hasFacilityLedger: encEvents.some(
          (e) => e.billingSide === BillingSide.FACILITY || e.billingSide === BillingSide.BOTH,
        ),
        hasUnknownBillingSideEvents,
        hasPendingResults,
      });
      incrementGovernanceCount(byClaimAssemblyStatus, claimAssembly.status);
      if (claimAssembly.status === "READY_FOR_EXPORT_REVIEW") claimReadyCount += 1;
      else if (claimAssembly.status !== "NOT_APPLICABLE") claimNotReadyCount += 1;
      if (claimAssembly.requiresManualReview) {
        manualReviewRequiredCount += 1;
        claimManualReview += 1;
      }
      if (claimAssembly.professionalPackage.ready) professionalReadyCount += 1;
      if (claimAssembly.facilityPackage.ready) facilityReadyCount += 1;
    }

    const analyticsInput: BillingGovernanceAnalyticsInput = {
      totals: {
        encountersReviewed,
        openEncounters,
        closedEncounters,
        readinessSampleSize: readinessEncounters.length,
      },
      byClassification,
      byFacility: [{ facilityId, encounterCount: encountersReviewed }],
      byExportReadinessRoute,
      byLedgerProfessionalStatus,
      byLedgerFacilityStatus,
      byFacilityFeeStatus,
      byChargeReviewStatus,
      byCodingReviewStatus,
      byClaimAssemblyStatus,
      conversionSummary,
      observationSummary: {
        reviewRequiredCount: observationReviewRequired,
        extendedObservationCount,
        activeObservationCount,
        holdForPendingResultsCount,
      },
      claimAssemblySummary: {
        readyForExportReviewCount: claimReadyCount,
        notReadyCount: claimNotReadyCount,
        manualReviewRequiredCount: claimManualReview,
        professionalReadyCount,
        facilityReadyCount,
      },
      facilityConfiguration: this.evaluateFacilityConfiguration(facility),
      manualReviewRequiredCount,
      pendingResultsCount,
    };

    const result = buildBillingGovernanceAnalytics(analyticsInput);

    await this.audit.log(AuditAction.VIEW, "BILLING_GOVERNANCE_SUMMARY", {
      userId: auditContext.userId,
      entityId: "aggregate",
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
      metadata: {
        aggregate: true,
        facilityId,
        encountersReviewed,
        readinessSampleSize: readinessEncounters.length,
        warningCount: result.warnings.length,
      },
    });

    return result;
  }

  private evaluateFacilityConfiguration(
    facility: {
      billingClassificationMode: string | null;
      showEncounterBillingControls: boolean;
      billingLegalName: string | null;
      billingAddressLine1: string | null;
      billingCity: string | null;
      billingCountry: string | null;
      allowedEncounterBillingClassifications: string[];
    },
  ): BillingGovernanceAnalyticsInput["facilityConfiguration"] {
    const identityComplete = evaluateFacilityBillingIdentityComplete(facility);
    const mode = facility.billingClassificationMode;
    const isHybrid = mode === "HYBRID_UC_ED";
    const isHospital = mode === "HOSPITAL_ENTERPRISE";

    return {
      missingClassificationModeCount: mode ? 0 : 1,
      hybridControlsDisabledCount: isHybrid && !facility.showEncounterBillingControls ? 1 : 0,
      missingBillingIdentityCount: identityComplete ? 0 : 1,
      hospitalEnterpriseIncompleteCount:
        isHospital && (!identityComplete || facility.allowedEncounterBillingClassifications.length === 0) ? 1 : 0,
    };
  }
}
