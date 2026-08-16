import { ForbiddenException, Injectable } from "@nestjs/common";
import {
  AppointmentStatus,
  EncounterStatus,
  EncounterType,
  FollowUpStatus,
  Prisma,
} from "@prisma/client";
import {
  CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES,
  CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS,
  DeterministicClinicInsightsProvider,
  averageNullable,
  buildClinicCareMissedAppointments,
  buildClinicCarePatientFlow,
  buildClinicCareVisitTypeSlices,
  buildClinicCareVisitsByDaySeries,
  classifyClinicCareAmbulatoryResult,
  clinicCareNextStepHint,
  clinicCareVisitOriginDisplayToken,
  computeClinicCareWaitMinutes,
  clinicCareFollowUpDrillDownHref,
  countClinicCareMetricsFromEncounters,
  countClinicFollowUpsForPeriod,
  defaultClinicCareTrackboardViewForProfession,
  facilityLocalDayUtcBounds,
  facilityLocalPeriodUtcBounds,
  filterClinicCareTrackboardRowForRole,
  isClinicCareFollowUpDue,
  isHaitiPublicHealthJurisdiction,
  localDateKeyForInstant,
  percentChange,
  projectClinicCareAmbulatoryOrderCategory,
  projectClinicCareIntakeStatus,
  projectClinicCareNursingQueueStage,
  projectClinicCareStage,
  resolveClinicFollowUpPeriod,
  projectHospitalBoardAssignments,
  projectRegistrationCompleteness,
  readHospitalAssignmentBag,
  resolveAmbulatoryOperatingMode,
  resolveClinicCareAmbulatoryOrdersBoardAccess,
  resolveClinicCareAmbulatoryResultsInboxAccess,
  resolveClinicCareDashboardAccess,
  resolveClinicCareTrackboardFieldVisibility,
  resolveFacilityCareProfile,
  clinicAmbulatoryWorklistServiceLineWhere,
  dedupeWorklistRowsByEncounterId,
  type ClinicCareAnalyticsKpiValue,
  type ClinicCareDashboardPeriod,
  type ClinicCareDeterministicInsight,
  type ClinicCareIntakeStatusProjection,
  type ClinicCareMetricCountMap,
  type ClinicCareMissedAppointmentsSummary,
  type ClinicCareNursingQueueStage,
  type ClinicCarePatientFlowSlice,
  type ClinicCareProviderProductivityRow,
  type ClinicCareStageId,
  type ClinicCareTrackboardFieldVisibility,
  type ClinicCareTrackboardView,
  type ClinicCareVisitTypeSlice,
  type ClinicCareVisitsByDayPoint,
  type ClinicCareWaitTrendPoint,
  type ClinicCareWorkspaceRoleAccess,
  type FacilityModuleCapabilitiesD4c1,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { TrackboardService } from "../trackboard/trackboard.service";
import { TRACKBOARD_ACTIVE_ENCOUNTER_SELECT } from "../trackboard/trackboard-encounter-select";

const CLINIC_CARE_ROW_LIMIT = 250;

const CLINIC_CARE_ENCOUNTER_SELECT = {
  ...TRACKBOARD_ACTIVE_ENCOUNTER_SELECT,
  visitOrigin: true,
  admissionSummaryJson: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dob: true,
      sexAtBirth: true,
      mrn: true,
      latestVitalsAt: true,
      clinicalHistoryProfileJson: true,
    },
  },
  triage: {
    select: {
      esi: true,
      chiefComplaint: true,
      triageCompleteAt: true,
      vitalsJson: true,
    },
  },
  appointment: {
    select: {
      id: true,
      scheduledStartAt: true,
      arrivedAt: true,
      checkedInAt: true,
      status: true,
    },
  },
  intake: {
    select: {
      arrivalAt: true,
    },
  },
} as const;

export type ClinicCareTrackboardRowDto = {
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string | null;
  encounterType: string;
  status: string;
  workflowState: string | null;
  stageId: ClinicCareStageId;
  nextStepHint: string;
  createdAt: string;
  roomLabel: string | null;
  chiefComplaint: string | null;
  providerName: string | null;
  nurseName: string | null;
  openOrderCount: number;
  resultsPendingCount: number;
  hasOpenFollowUpDue: boolean;
  /** D4C.3 — durable origin token; LEGACY when null. */
  visitOrigin: string | null;
  visitOriginDisplay: ReturnType<typeof clinicCareVisitOriginDisplayToken>;
  scheduledStartAt: string | null;
  arrivedAt: string | null;
  checkedInAt: string | null;
  registrationCompletenessStatus: string | null;
  /** MEDUI.D4C.4 — nursing queue stage projection (presentation-only). */
  nursingQueueStage: ClinicCareNursingQueueStage;
  /** MEDUI.D4C.4 — intake / vitals / allergy / med-rec flags from enterprise fields. */
  intakeStatus: ClinicCareIntakeStatusProjection;
  /** MEDUI.D4C.4 — MA / PATIENT_CARE_TECH display from hospital TECHNICIAN adapter bag. */
  maName: string | null;
};

export type ClinicCareTrackboardProjectionDto = {
  facilityId: string;
  facilityName: string | null;
  facilityTimeZone: string;
  localDateKey: string;
  careProfile: string;
  operatingMode: string | null;
  metrics: ClinicCareMetricCountMap;
  metricContracts: typeof CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS;
  defaultView: ClinicCareTrackboardView;
  rows: ClinicCareTrackboardRowDto[];
  rowLimit: number;
  truncated: boolean;
  fieldVisibility: ClinicCareTrackboardFieldVisibility;
  access: {
    canAccessClinicCareShell: boolean;
    canAccessProviderDocumentation: boolean;
    canAccessNursingMa: boolean;
    canAccessTechnicianSafeNursingMaProjection: boolean;
    canAccessRegistration: boolean;
    canAccessPatients: boolean;
    canAccessEncounters: boolean;
    canAccessFollowUps: boolean;
    canAccessLaboratory: boolean;
    canAccessRadiology: boolean;
    canAccessPharmacy: boolean;
    canAccessBilling: boolean;
    canAccessAdministration: boolean;
    canAccessPublicHealth: boolean;
    canAccessPublicHealthImmunizations: boolean;
    canAccessPublicHealthDiseaseReporting: boolean;
    canAccessMsppHaitiPathway: boolean;
    canAdministerVaccines: boolean;
    canAuthorProviderDocumentation: boolean;
    canMutateDiagnosesOrProblemList: boolean;
    canIssueProviderOrders: boolean;
    canPrescribe: boolean;
    canAuthorIndependentNursingAssessment: boolean;
    canAdministerMedicationsUnrestricted: boolean;
    canCompleteDispositionOrEncounter: boolean;
    canSignAsNurseOrProvider: boolean;
  };
  capabilities: FacilityModuleCapabilitiesD4c1;
  generatedAt: string;
};

function personName(
  p: { firstName?: string | null; lastName?: string | null } | null | undefined
): string | null {
  if (!p) return null;
  const name = `${(p.firstName ?? "").trim()} ${(p.lastName ?? "").trim()}`.trim();
  return name || null;
}

@Injectable()
export class ClinicCareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trackboardService: TrackboardService
  ) {}

  async getTrackboardProjection(input: {
    facilityId: string;
    facility: {
      name?: string | null;
      timezone?: string | null;
      facilityType?: string | null;
      serviceLinesJson?: unknown;
      facilityCareProfileJson?: unknown;
      country?: string | null;
    };
    serviceLines: readonly string[];
    access: ClinicCareWorkspaceRoleAccess;
    professionGroup: string;
    moduleCapabilities: FacilityModuleCapabilitiesD4c1;
    now?: Date;
  }): Promise<ClinicCareTrackboardProjectionDto> {
    const now = input.now ?? new Date();
    const day = facilityLocalDayUtcBounds(now, input.facility.timezone);
    const careProfile = resolveFacilityCareProfile({
      facilityType: input.facility.facilityType,
      careProfileJson: input.facility.facilityCareProfileJson,
      serviceLines: input.serviceLines,
    });
    const operatingMode = resolveAmbulatoryOperatingMode({
      facilityType: input.facility.facilityType,
      careProfileJson: input.facility.facilityCareProfileJson,
      serviceLines: input.serviceLines,
    });
    const fieldVisibility = resolveClinicCareTrackboardFieldVisibility(input.professionGroup);

    const ambulatoryTypes = [
      EncounterType.OUTPATIENT,
      EncounterType.URGENT_CARE,
    ] as EncounterType[];

    const openWhere: Prisma.EncounterWhereInput = {
      facilityId: input.facilityId,
      status: EncounterStatus.OPEN,
      type: { in: ambulatoryTypes },
      // MEDUI.D4C.10D — Clinic board = Clinic/UC/legacy-null only (not Dental-routed visits).
      ...clinicAmbulatoryWorklistServiceLineWhere(),
    };

    const todayClosedWhere: Prisma.EncounterWhereInput = {
      facilityId: input.facilityId,
      status: EncounterStatus.CLOSED,
      type: { in: ambulatoryTypes },
      createdAt: { gte: day.startUtc, lt: day.endExclusiveUtc },
      ...clinicAmbulatoryWorklistServiceLineWhere(),
    };

    // FOLLOW_UPS_DUE candidate rows: facility-scoped OPEN with dueDate before local tomorrow.
    // Final inclusion hardened via isClinicCareFollowUpDue (ambulatory + valid date + not completed/canceled).
    const followUpCandidates = await this.prisma.followUp.findMany({
      where: {
        facilityId: input.facilityId,
        status: FollowUpStatus.OPEN,
        dueDate: { lt: day.endExclusiveUtc },
      },
      select: {
        id: true,
        facilityId: true,
        status: true,
        dueDate: true,
        encounterId: true,
        encounter: { select: { type: true, facilityId: true } },
      },
      take: 1000,
    });

    const followUpsDueRows = followUpCandidates.filter((fu) =>
      isClinicCareFollowUpDue({
        authenticatedFacilityId: input.facilityId,
        followUpFacilityId: fu.facilityId,
        status: fu.status,
        dueDate: fu.dueDate,
        dayEndExclusiveUtc: day.endExclusiveUtc,
        linkedEncounterType: fu.encounter?.type ?? null,
        encounterFacilityId: fu.encounter?.facilityId ?? null,
      })
    );
    const followUpsDue = followUpsDueRows.length;
    const followUpEncounterIds = followUpsDueRows
      .map((r) => r.encounterId)
      .filter((id): id is string => Boolean(id));

    const [openRows, todayClosedRows] = await Promise.all([
      this.prisma.encounter.findMany({
        where: openWhere,
        select: CLINIC_CARE_ENCOUNTER_SELECT,
        orderBy: { createdAt: "desc" },
        take: CLINIC_CARE_ROW_LIMIT,
      }),
      this.prisma.encounter.findMany({
        where: todayClosedWhere,
        select: CLINIC_CARE_ENCOUNTER_SELECT,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const byId = new Map<string, (typeof openRows)[number]>();
    for (const row of [...openRows, ...todayClosedRows]) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    const encounters = dedupeWorklistRowsByEncounterId([...byId.values()]);
    const truncated = openRows.length >= CLINIC_CARE_ROW_LIMIT;

    const opMap = await this.trackboardService.getOperationalAggregatesForEncounterIds(
      input.facilityId,
      encounters.map((e) => e.id)
    );

    const followUpSet = new Set(followUpEncounterIds);

    const metricSource = encounters.map((e) => {
      const ops = opMap.get(e.id);
      return {
        workflowState: e.workflowState,
        status: e.status,
        type: e.type,
        createdAt: e.createdAt,
        resultsPendingCount: ops?.resultsPendingCount ?? 0,
      };
    });

    const metrics = countClinicCareMetricsFromEncounters({
      encounters: metricSource,
      followUpsDue,
      dayStartUtc: day.startUtc,
      dayEndExclusiveUtc: day.endExclusiveUtc,
    });

    const haiti = isHaitiPublicHealthJurisdiction(input.facility.country ?? null);
    const rows: ClinicCareTrackboardRowDto[] = encounters.map((e) => {
      const ops = opMap.get(e.id);
      const resultsPendingCount = ops?.resultsPendingCount ?? 0;
      const stage = projectClinicCareStage({
        workflowState: e.workflowState,
        encounterStatus: e.status,
        resultsPendingCount,
      });
      const chief =
        (e.triage?.chiefComplaint ?? e.chiefComplaint ?? "").trim() || null;
      const appt = e.appointment ?? null;
      const visitOrigin = e.visitOrigin ?? null;
      const arrivedAt =
        appt?.arrivedAt?.toISOString() ??
        e.intake?.arrivalAt?.toISOString() ??
        (visitOrigin === "WALK_IN" ? e.createdAt.toISOString() : null);
      const completeness = projectRegistrationCompleteness({
        patient: {
          firstName: e.patient?.firstName,
          lastName: e.patient?.lastName,
          dob: e.patient?.dob ?? null,
          sexAtBirth: e.patient?.sexAtBirth ?? null,
        },
        insuranceRequired: !haiti,
        visitOrigin,
        hasAppointmentLink: Boolean(appt?.id),
      });
      const fullRow: ClinicCareTrackboardRowDto = {
        encounterId: e.id,
        patientId: e.patientId,
        patientName: personName(e.patient) ?? "—",
        mrn: e.patient?.mrn?.trim() || null,
        encounterType: e.type,
        status: e.status,
        workflowState: e.workflowState ?? null,
        stageId: stage.stageId,
        nextStepHint: clinicCareNextStepHint(stage.stageId),
        createdAt: e.createdAt.toISOString(),
        roomLabel: e.roomLabel?.trim() || null,
        chiefComplaint: chief,
        providerName: personName(e.physicianAssigned),
        nurseName: personName(e.nurseAssigned),
        openOrderCount: ops?.openOrderCount ?? 0,
        resultsPendingCount,
        hasOpenFollowUpDue: followUpSet.has(e.id),
        visitOrigin,
        visitOriginDisplay: clinicCareVisitOriginDisplayToken(visitOrigin),
        scheduledStartAt: appt?.scheduledStartAt?.toISOString() ?? null,
        arrivedAt,
        checkedInAt: appt?.checkedInAt?.toISOString() ?? null,
        registrationCompletenessStatus: completeness.overallStatus,
        nursingQueueStage: projectClinicCareNursingQueueStage({
          workflowState: e.workflowState,
          encounterStatus: e.status,
          resultsPendingCount,
        }),
        intakeStatus: projectClinicCareIntakeStatus({
          encounterVitals: e.vitals,
          triageCompleteAt: e.triage?.triageCompleteAt ?? null,
          patientLatestVitalsAt: e.patient?.latestVitalsAt ?? null,
          clinicalHistoryProfileJson: e.patient?.clinicalHistoryProfileJson ?? null,
        }),
        maName:
          projectHospitalBoardAssignments(readHospitalAssignmentBag(e.admissionSummaryJson))
            .technicianName ?? null,
      };
      return filterClinicCareTrackboardRowForRole(fullRow, fieldVisibility);
    });

    // Stable sort: waiting first-ish by createdAt asc within open pipeline, then recent.
    rows.sort((a, b) => {
      const aOpen = a.status === "OPEN" ? 0 : 1;
      const bOpen = b.status === "OPEN" ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return a.createdAt.localeCompare(b.createdAt);
    });

    return {
      facilityId: input.facilityId,
      facilityName: input.facility.name?.trim() || null,
      facilityTimeZone: day.timeZone,
      localDateKey: day.localDateKey,
      careProfile,
      operatingMode,
      metrics,
      metricContracts: CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS,
      defaultView: defaultClinicCareTrackboardViewForProfession(input.professionGroup),
      rows,
      rowLimit: CLINIC_CARE_ROW_LIMIT,
      truncated,
      fieldVisibility,
      access: {
        canAccessClinicCareShell: input.access.canAccessClinicCareShell,
        canAccessProviderDocumentation: input.access.canAccessProviderDocumentation,
        canAccessNursingMa: input.access.canAccessNursingMa,
        canAccessTechnicianSafeNursingMaProjection:
          input.access.canAccessTechnicianSafeNursingMaProjection,
        canAccessRegistration: input.access.canAccessRegistration,
        canAccessPatients: input.access.canAccessPatients,
        canAccessEncounters: input.access.canAccessEncounters,
        canAccessFollowUps: input.access.canAccessFollowUps,
        canAccessLaboratory: input.access.canAccessLaboratory,
        canAccessRadiology: input.access.canAccessRadiology,
        canAccessPharmacy: input.access.canAccessPharmacy,
        canAccessBilling: input.access.canAccessBilling,
        canAccessAdministration: input.access.canAccessAdministration,
        canAccessPublicHealth: input.access.canAccessPublicHealth,
        canAccessPublicHealthImmunizations: input.access.canAccessPublicHealthImmunizations,
        canAccessPublicHealthDiseaseReporting: input.access.canAccessPublicHealthDiseaseReporting,
        canAccessMsppHaitiPathway: input.access.canAccessMsppHaitiPathway,
        canAdministerVaccines: input.access.canAdministerVaccines,
        canAuthorProviderDocumentation: input.access.canAuthorProviderDocumentation,
        canMutateDiagnosesOrProblemList: input.access.canMutateDiagnosesOrProblemList,
        canIssueProviderOrders: input.access.canIssueProviderOrders,
        canPrescribe: input.access.canPrescribe,
        canAuthorIndependentNursingAssessment: input.access.canAuthorIndependentNursingAssessment,
        canAdministerMedicationsUnrestricted: input.access.canAdministerMedicationsUnrestricted,
        canCompleteDispositionOrEncounter: input.access.canCompleteDispositionOrEncounter,
        canSignAsNurseOrProvider: input.access.canSignAsNurseOrProvider,
      },
      capabilities: input.moduleCapabilities,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * MEDUI.D4C.5A — facility-scoped ambulatory operational analytics dashboard.
   * Role-aware: provider productivity / financial fields omitted server-side for non-ADMIN.
   * Schema miss → throw (controller maps to 503). Failure ≠ empty fake zeros.
   */
  async getDashboardProjection(input: {
    facilityId: string;
    facility: {
      name?: string | null;
      timezone?: string | null;
      facilityType?: string | null;
      serviceLinesJson?: unknown;
      facilityCareProfileJson?: unknown;
      country?: string | null;
    };
    serviceLines: readonly string[];
    access: ClinicCareWorkspaceRoleAccess;
    professionGroup: string;
    moduleCapabilities: FacilityModuleCapabilitiesD4c1;
    period?: ClinicCareDashboardPeriod | string;
    now?: Date;
  }): Promise<ClinicCareDashboardProjectionDto> {
    const now = input.now ?? new Date();
    const periodRaw = String(input.period ?? "TODAY")
      .trim()
      .toUpperCase();
    const period: ClinicCareDashboardPeriod =
      periodRaw === "WEEK" || periodRaw === "MONTH" ? periodRaw : "TODAY";

    const dashAccess = resolveClinicCareDashboardAccess({
      canAccessClinicCareShell: input.access.canAccessClinicCareShell,
      professionGroup: input.professionGroup,
    });
    if (!dashAccess.canViewDashboard) {
      throw new ForbiddenException("Clinic Care dashboard access denied for this role.");
    }

    const careProfile = resolveFacilityCareProfile({
      facilityType: input.facility.facilityType,
      careProfileJson: input.facility.facilityCareProfileJson,
      serviceLines: input.serviceLines,
    });
    const operatingMode = resolveAmbulatoryOperatingMode({
      facilityType: input.facility.facilityType,
      careProfileJson: input.facility.facilityCareProfileJson,
      serviceLines: input.serviceLines,
    });

    const periodBounds = facilityLocalPeriodUtcBounds(now, input.facility.timezone, period);
    const today = facilityLocalDayUtcBounds(now, input.facility.timezone);
    const priorDay = facilityLocalDayUtcBounds(
      new Date(today.startUtc.getTime() - 60_000),
      input.facility.timezone
    );
    const weekBounds = facilityLocalPeriodUtcBounds(now, input.facility.timezone, "WEEK");
    /** Forward-looking follow-up window (distinct from visit rolling-past periodBounds). */
    const followUpPeriod = resolveClinicFollowUpPeriod(now, input.facility.timezone, period);

    const ambulatoryTypes = [
      EncounterType.OUTPATIENT,
      EncounterType.URGENT_CARE,
    ] as EncounterType[];

    const encounterSelect = {
      id: true,
      status: true,
      type: true,
      workflowState: true,
      createdAt: true,
      dischargedAt: true,
      visitOrigin: true,
      physicianAssignedUserId: true,
      physicianAssignedAt: true,
      physicianAssigned: {
        select: { id: true, firstName: true, lastName: true },
      },
      appointment: {
        select: {
          arrivedAt: true,
          checkedInAt: true,
          status: true,
        },
      },
      intake: { select: { arrivalAt: true } },
      followUpDate: true,
    } as const;

    const [
      periodEncounters,
      openEncounters,
      todayEncounters,
      priorDayEncounters,
      followUpCandidates,
      noShowAppointments,
    ] = await Promise.all([
      this.prisma.encounter.findMany({
        where: {
          facilityId: input.facilityId,
          type: { in: ambulatoryTypes },
          createdAt: { gte: periodBounds.startUtc, lt: periodBounds.endExclusiveUtc },
        },
        select: encounterSelect,
        take: 5000,
      }),
      this.prisma.encounter.findMany({
        where: {
          facilityId: input.facilityId,
          status: EncounterStatus.OPEN,
          type: { in: ambulatoryTypes },
          // MEDUI.D4C.10D — open Clinic dashboard KPIs exclude Dental-routed visits.
          ...clinicAmbulatoryWorklistServiceLineWhere(),
        },
        select: encounterSelect,
        take: 1000,
      }),
      this.prisma.encounter.findMany({
        where: {
          facilityId: input.facilityId,
          type: { in: ambulatoryTypes },
          OR: [
            { createdAt: { gte: today.startUtc, lt: today.endExclusiveUtc } },
            {
              status: EncounterStatus.CLOSED,
              dischargedAt: { gte: today.startUtc, lt: today.endExclusiveUtc },
            },
          ],
        },
        select: encounterSelect,
        take: 2000,
      }),
      this.prisma.encounter.findMany({
        where: {
          facilityId: input.facilityId,
          type: { in: ambulatoryTypes },
          OR: [
            { createdAt: { gte: priorDay.startUtc, lt: priorDay.endExclusiveUtc } },
            {
              status: EncounterStatus.CLOSED,
              dischargedAt: { gte: priorDay.startUtc, lt: priorDay.endExclusiveUtc },
            },
          ],
        },
        select: encounterSelect,
        take: 2000,
      }),
      this.prisma.followUp.findMany({
        where: {
          facilityId: input.facilityId,
          // Candidate window: anything due before forward period end (includes overdue).
          // Final inclusion via countClinicFollowUpsForPeriod (OPEN + ambulatory + scope).
          dueDate: { lt: followUpPeriod.endExclusiveUtc },
        },
        select: {
          id: true,
          facilityId: true,
          status: true,
          dueDate: true,
          encounterId: true,
          encounter: { select: { type: true, facilityId: true } },
        },
        take: 2000,
      }),
      this.prisma.appointment.findMany({
        where: {
          facilityId: input.facilityId,
          status: AppointmentStatus.NO_SHOW,
          scheduledStartAt: { gte: weekBounds.startUtc, lt: weekBounds.endExclusiveUtc },
        },
        select: { status: true, scheduledStartAt: true },
        take: 2000,
      }),
    ]);

    // Prescription counts require a durable ambulatory Rx rollup — omit rather than fabricate.
    const prescriptionCount: number | null = null;
    const followUpCounts = countClinicFollowUpsForPeriod({
      authenticatedFacilityId: input.facilityId,
      records: followUpCandidates.map((fu) => ({
        facilityId: fu.facilityId,
        status: fu.status,
        dueDate: fu.dueDate,
        linkedEncounterType: fu.encounter?.type ?? null,
        encounterFacilityId: fu.encounter?.facilityId ?? null,
      })),
      periodEndExclusiveUtc: followUpPeriod.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    const followUpsActionable = followUpCounts.actionable;

    const todayById = new Map<string, (typeof todayEncounters)[number]>();
    for (const e of todayEncounters) todayById.set(e.id, e);
    const todayList = [...todayById.values()];

    const priorById = new Map<string, (typeof priorDayEncounters)[number]>();
    for (const e of priorDayEncounters) priorById.set(e.id, e);
    const priorList = [...priorById.values()];

    const todaysVisits = todayList.filter(
      (e) =>
        (e.status === EncounterStatus.OPEN || e.status === EncounterStatus.CLOSED) &&
        e.createdAt >= today.startUtc &&
        e.createdAt < today.endExclusiveUtc
    ).length;

    const priorTodaysVisits = priorList.filter(
      (e) =>
        (e.status === EncounterStatus.OPEN || e.status === EncounterStatus.CLOSED) &&
        e.createdAt >= priorDay.startUtc &&
        e.createdAt < priorDay.endExclusiveUtc
    ).length;

    const completedToday = todayList.filter((e) => {
      if (e.status !== EncounterStatus.CLOSED) return false;
      const closedAt = e.dischargedAt ?? e.createdAt;
      return closedAt >= today.startUtc && closedAt < today.endExclusiveUtc;
    }).length;

    const priorCompleted = priorList.filter((e) => {
      if (e.status !== EncounterStatus.CLOSED) return false;
      const closedAt = e.dischargedAt ?? e.createdAt;
      return closedAt >= priorDay.startUtc && closedAt < priorDay.endExclusiveUtc;
    }).length;

    const waitingNow = openEncounters.filter((e) => {
      const wf = String(e.workflowState ?? "")
        .trim()
        .toUpperCase();
      return wf === "ARRIVED" || wf === "TRIAGE";
    }).length;

    const waitMinutesToday = todayList.map((e) =>
      computeClinicCareWaitMinutes({
        arrivedAt:
          e.appointment?.arrivedAt ??
          e.intake?.arrivalAt ??
          (e.visitOrigin === "WALK_IN" ? e.createdAt : null),
        checkedInAt: e.appointment?.checkedInAt ?? null,
        physicianAssignedAt: e.physicianAssignedAt,
      })
    );
    const waitAgg = averageNullable(waitMinutesToday);

    const waitMinutesPrior = priorList.map((e) =>
      computeClinicCareWaitMinutes({
        arrivedAt:
          e.appointment?.arrivedAt ??
          e.intake?.arrivalAt ??
          (e.visitOrigin === "WALK_IN" ? e.createdAt : null),
        checkedInAt: e.appointment?.checkedInAt ?? null,
        physicianAssignedAt: e.physicianAssignedAt,
      })
    );
    const priorWaitAgg = averageNullable(waitMinutesPrior);

    const sparkFromPeriod = buildClinicCareVisitsByDaySeries({
      dayKeys: periodBounds.dayKeys,
      encounters: periodEncounters,
      facilityTimeZone: periodBounds.timeZone,
    });

    const visitsSpark = sparkFromPeriod.map((p) => p.total);
    const completedSpark = sparkFromPeriod.map((p) => p.completed);
    const waitingSpark = sparkFromPeriod.map((p) => p.waiting);

    const waitTrend: ClinicCareWaitTrendPoint[] = periodBounds.dayKeys.map((localDateKey) => {
      const dayEnc = periodEncounters.filter(
        (e) => localDateKeyForInstant(e.createdAt, periodBounds.timeZone) === localDateKey
      );
      const mins = dayEnc.map((e) =>
        computeClinicCareWaitMinutes({
          arrivedAt:
            e.appointment?.arrivedAt ??
            e.intake?.arrivalAt ??
            (e.visitOrigin === "WALK_IN" ? e.createdAt : null),
          checkedInAt: e.appointment?.checkedInAt ?? null,
          physicianAssignedAt: e.physicianAssignedAt,
        })
      );
      const agg = averageNullable(mins);
      return {
        localDateKey,
        averageWaitMinutes: agg.average,
        included: agg.included,
        eligible: agg.eligible,
      };
    });

    const waitSpark = waitTrend.map((p) => p.averageWaitMinutes).filter((v): v is number => v != null);

    function visitComparison(current: number, prior: number) {
      const pct = percentChange(current, prior);
      if (!pct) return null;
      return {
        delta: pct.delta,
        direction: pct.direction,
        priorValue: prior,
        labelKey: "vsYesterday",
      };
    }

    function waitComparison() {
      if (waitAgg.average == null || priorWaitAgg.average == null) return null;
      if (waitAgg.included < 1 || priorWaitAgg.included < 1) return null;
      const raw = waitAgg.average - priorWaitAgg.average;
      const direction = raw > 0 ? ("up" as const) : raw < 0 ? ("down" as const) : ("flat" as const);
      return {
        delta: Math.abs(Math.round(raw)),
        direction,
        priorValue: priorWaitAgg.average,
        labelKey: "vsYesterdayMinutes",
      };
    }

    const kpis: ClinicCareAnalyticsKpiValue[] = [
      {
        id: "TODAYS_VISITS",
        value: todaysVisits,
        comparison: visitComparison(todaysVisits, priorTodaysVisits),
        sparkline: visitsSpark,
        unit: "count",
        coverage: null,
      },
      {
        id: "COMPLETED_VISITS",
        value: completedToday,
        comparison: visitComparison(completedToday, priorCompleted),
        sparkline: completedSpark,
        unit: "count",
        coverage: null,
      },
      {
        id: "WAITING",
        value: waitingNow,
        comparison: null,
        sparkline: waitingSpark,
        unit: "count",
        coverage: null,
      },
      {
        id: "AVERAGE_WAIT_MINUTES",
        value: waitAgg.average,
        comparison: waitComparison(),
        sparkline: waitSpark,
        unit: "minutes",
        coverage: { included: waitAgg.included, eligible: waitAgg.eligible },
      },
      {
        id: "FOLLOW_UPS_TO_SCHEDULE",
        value: followUpsActionable,
        comparison: null,
        sparkline: [],
        unit: "patients",
        coverage: null,
      },
    ];

    const visitsByDay = buildClinicCareVisitsByDaySeries({
      dayKeys: periodBounds.dayKeys,
      encounters: periodEncounters,
      facilityTimeZone: periodBounds.timeZone,
    });

    const visitTypes = buildClinicCareVisitTypeSlices(
      periodEncounters.map((e) => ({
        visitOrigin: e.visitOrigin,
        encounterType: e.type,
      }))
    );

    const flowSource =
      period === "TODAY"
        ? [...openEncounters, ...todayList.filter((e) => e.status === EncounterStatus.CLOSED)]
        : periodEncounters;
    const patientFlow = buildClinicCarePatientFlow(
      flowSource.map((e) => ({
        status: e.status,
        workflowState: e.workflowState,
      }))
    );

    const missed = buildClinicCareMissedAppointments({
      appointments: noShowAppointments,
      facilityTimeZone: periodBounds.timeZone,
      todayKey: today.localDateKey,
      weekDayKeys: weekBounds.dayKeys,
    });

    let providerProductivity: ClinicCareProviderProductivityRow[] | null = null;
    if (dashAccess.canViewProviderProductivity) {
      const byProvider = new Map<string, ClinicCareProviderProductivityRow>();
      for (const e of periodEncounters) {
        if (e.status !== EncounterStatus.CLOSED) continue;
        const uid = e.physicianAssignedUserId;
        if (!uid) continue;
        const name = personName(e.physicianAssigned) ?? "—";
        const row = byProvider.get(uid) ?? {
          providerUserId: uid,
          providerDisplayName: name,
          completedVisitCount: 0,
        };
        row.completedVisitCount += 1;
        byProvider.set(uid, row);
      }
      providerProductivity = [...byProvider.values()].sort(
        (a, b) => b.completedVisitCount - a.completedVisitCount
      );
    }

    const closedWithFollowUpPlan = todayList.filter(
      (e) => e.status === EncounterStatus.CLOSED && Boolean(e.followUpDate)
    ).length;
    const followUpPlanningRatePercent =
      completedToday > 0 ? (closedWithFollowUpPlan / completedToday) * 100 : null;

    const insightsProvider = new DeterministicClinicInsightsProvider();
    const followUpDrillHref = clinicCareFollowUpDrillDownHref({
      period,
      dateFromKey: followUpPeriod.dateFromKey,
      dateToKey: followUpPeriod.dateToKey,
      endExclusiveIso: followUpPeriod.endExclusiveUtc.toISOString(),
      actionable: true,
      status: "OPEN",
    });
    const insights = insightsProvider.buildInsights({
      period,
      kpis,
      visitsByDay,
      visitTypes,
      patientFlow,
      waitTrend,
      missed,
      providerProductivity,
      canViewFinancialInsights: dashAccess.canViewFinancialInsights,
      prescriptionsToday: typeof prescriptionCount === "number" ? prescriptionCount : null,
      followUpPlanningRatePercent,
      followUpDrillDownHref: followUpDrillHref,
    });

    return {
      facilityId: input.facilityId,
      facilityName: input.facility.name?.trim() || null,
      facilityTimeZone: periodBounds.timeZone,
      localDateKey: today.localDateKey,
      period,
      periodStartUtc: periodBounds.startUtc.toISOString(),
      periodEndExclusiveUtc: periodBounds.endExclusiveUtc.toISOString(),
      followUpPeriodStartUtc: followUpPeriod.startUtc.toISOString(),
      followUpPeriodEndExclusiveUtc: followUpPeriod.endExclusiveUtc.toISOString(),
      followUpDrillDownHref: followUpDrillHref,
      careProfile,
      operatingMode,
      kpis,
      visitsByDay,
      visitTypes,
      patientFlow,
      waitTrend,
      missedAppointments: missed,
      providerProductivity,
      insights,
      access: {
        canViewDashboard: dashAccess.canViewDashboard,
        canViewProviderProductivity: dashAccess.canViewProviderProductivity,
        canViewFinancialInsights: dashAccess.canViewFinancialInsights,
      },
      classificationNotes: {
        visitsByDay:
          "Exclusive priority CANCELLED→COMPLETED→TELECONSULTATION→WAITING→NEW; TELECONSULTATION always 0 (no durable modality).",
        waitTime:
          "providerStart proxy = physicianAssignedAt; arrival = checkedInAt ?? arrivedAt ?? walk-in createdAt; missing excluded.",
        missedAppointments: "AppointmentStatus.NO_SHOW only.",
        followUpsToSchedule:
          "D4C.5B.1: OPEN FollowUp with dueDate < forward period end (TODAY=+1d, WEEK=+7d, MONTH=+30d from facility-local today) via countClinicFollowUpsForPeriod; includes overdue; excludes COMPLETED/CANCELLED; ambulatory-safe; facility-scoped. Distinct from visit rolling-past periodBounds and from Today's Visits FOLLOW_UPS_DUE (today+overdue only).",
        revenue: "Shared Revenue KPI forbidden; financial insights ADMIN-only and deferred (no rollup).",
      },
      generatedAt: now.toISOString(),
    };
  }

  /**
   * MEDUI.D4C.6 — ambulatory order board projection over enterprise Order rows.
   * Facility + OUTPATIENT|URGENT_CARE only. No ClinicOrder* persistence.
   */
  async getAmbulatoryOrdersBoardProjection(input: {
    facilityId: string;
    facility: {
      name?: string | null;
      timezone?: string | null;
    };
    access: ClinicCareWorkspaceRoleAccess;
    professionGroup: string;
    now?: Date;
  }): Promise<ClinicCareAmbulatoryOrdersBoardDto> {
    const boardAccess = resolveClinicCareAmbulatoryOrdersBoardAccess({
      professionGroup: input.professionGroup,
      access: input.access,
    });
    if (!boardAccess.canViewBoard) {
      throw new ForbiddenException("Clinic Care ambulatory orders board access denied for this role.");
    }

    const now = input.now ?? new Date();
    const ambulatoryTypes = [
      EncounterType.OUTPATIENT,
      EncounterType.URGENT_CARE,
    ] as EncounterType[];

    const orders = await this.prisma.order.findMany({
      where: {
        facilityId: input.facilityId,
        encounter: {
          facilityId: input.facilityId,
          type: { in: ambulatoryTypes },
        },
      },
      select: {
        id: true,
        type: true,
        status: true,
        priority: true,
        createdAt: true,
        encounterId: true,
        encounter: {
          select: {
            id: true,
            type: true,
            status: true,
            patientId: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
          },
        },
        items: {
          select: {
            id: true,
            status: true,
            catalogItemType: true,
            manualLabel: true,
            manualSecondaryText: true,
          },
          take: 12,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: CLINIC_CARE_ORDERS_BOARD_LIMIT,
    });

    const rows: ClinicCareAmbulatoryOrderBoardRowDto[] = orders.map((order) => {
      const patient = order.encounter?.patient;
      const patientName = personName(patient) ?? "—";
      const itemSummaries = order.items.map((it) => ({
        id: it.id,
        status: it.status,
        catalogItemType: it.catalogItemType,
        label:
          it.manualLabel?.trim() ||
          it.manualSecondaryText?.trim() ||
          it.catalogItemType ||
          "—",
      }));
      return {
        orderId: order.id,
        encounterId: order.encounterId,
        patientId: order.encounter?.patientId ?? patient?.id ?? "",
        patientName,
        mrn: patient?.mrn ?? null,
        encounterType: order.encounter?.type ?? null,
        encounterStatus: order.encounter?.status ?? null,
        orderType: order.type,
        category: projectClinicCareAmbulatoryOrderCategory(order.type),
        status: order.status,
        priority: order.priority,
        createdAt: order.createdAt.toISOString(),
        itemCount: order.items.length,
        itemSummaries,
        careSettingProjection: "AMBULATORY" as const,
      };
    });

    return {
      facilityId: input.facilityId,
      facilityName: input.facility.name ?? null,
      facilityTimeZone: input.facility.timezone ?? "UTC",
      careSettingProjection: "AMBULATORY",
      ambulatoryEncounterTypes: [...CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES],
      rows,
      rowLimit: CLINIC_CARE_ORDERS_BOARD_LIMIT,
      truncated: rows.length >= CLINIC_CARE_ORDERS_BOARD_LIMIT,
      access: boardAccess,
      authority: {
        orderEngine: "OrdersService",
        placement: "POST /encounters/:id/orders via CreateOrderModal",
        detail: "enterprise encounter orders tab",
        noClinicOrderEntity: true,
      },
      generatedAt: now.toISOString(),
    };
  }

  /**
   * MEDUI.D4C.6 — ambulatory results inbox projection over enterprise Result rows.
   * Acknowledge remains POST /orders/:id/result/acknowledge (no ClinicResult*).
   */
  async getAmbulatoryResultsInboxProjection(input: {
    facilityId: string;
    facility: {
      name?: string | null;
      timezone?: string | null;
    };
    access: ClinicCareWorkspaceRoleAccess;
    professionGroup: string;
    roleCodes?: readonly string[];
    now?: Date;
  }): Promise<ClinicCareAmbulatoryResultsInboxDto> {
    const inboxAccess = resolveClinicCareAmbulatoryResultsInboxAccess({
      professionGroup: input.professionGroup,
      access: input.access,
      roleCodes: input.roleCodes,
    });
    if (!inboxAccess.canViewInbox) {
      throw new ForbiddenException("Clinic Care ambulatory results inbox access denied for this role.");
    }

    const now = input.now ?? new Date();
    const ambulatoryTypes = [
      EncounterType.OUTPATIENT,
      EncounterType.URGENT_CARE,
    ] as EncounterType[];

    const items = await this.prisma.orderItem.findMany({
      where: {
        catalogItemType: { in: ["LAB_TEST", "IMAGING_STUDY"] },
        OR: [
          { status: { in: ["RESULTED", "VERIFIED", "COMPLETED", "IN_PROGRESS"] } },
          { result: { isNot: null } },
        ],
        order: {
          facilityId: input.facilityId,
          encounter: {
            facilityId: input.facilityId,
            type: { in: ambulatoryTypes },
          },
        },
      },
      select: {
        id: true,
        status: true,
        catalogItemType: true,
        manualLabel: true,
        manualSecondaryText: true,
        result: {
          select: {
            id: true,
            resultText: true,
            criticalValue: true,
            verifiedAt: true,
            acknowledgedByProviderAt: true,
            acknowledgedByUserId: true,
          },
        },
        order: {
          select: {
            id: true,
            type: true,
            status: true,
            priority: true,
            encounterId: true,
            encounter: {
              select: {
                id: true,
                type: true,
                status: true,
                patientId: true,
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    mrn: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: CLINIC_CARE_RESULTS_INBOX_LIMIT,
    });

    const rows: ClinicCareAmbulatoryResultInboxRowDto[] = items
      .filter((it) => {
        const r = it.result;
        const hasContent =
          Boolean(r?.resultText?.trim()) ||
          Boolean(r?.verifiedAt) ||
          Boolean(r?.criticalValue) ||
          it.status === "RESULTED" ||
          it.status === "VERIFIED" ||
          it.status === "COMPLETED" ||
          it.status === "IN_PROGRESS";
        return hasContent;
      })
      .map((it) => {
        const patient = it.order.encounter?.patient;
        const classification = classifyClinicCareAmbulatoryResult({
          catalogItemType: it.catalogItemType,
          status: it.status,
          resultText: it.result?.resultText ?? null,
          criticalValue: it.result?.criticalValue ?? null,
          acknowledgedByProviderAt: it.result?.acknowledgedByProviderAt ?? null,
          verifiedAt: it.result?.verifiedAt ?? null,
        });
        return {
          orderItemId: it.id,
          orderId: it.order.id,
          encounterId: it.order.encounterId,
          patientId: it.order.encounter?.patientId ?? patient?.id ?? "",
          patientName: personName(patient) ?? "—",
          mrn: patient?.mrn ?? null,
          encounterType: it.order.encounter?.type ?? null,
          catalogItemType: it.catalogItemType,
          orderType: it.order.type,
          status: it.status,
          priority: it.order.priority,
          label:
            it.manualLabel?.trim() ||
            it.manualSecondaryText?.trim() ||
            it.catalogItemType ||
            "—",
          critical: classification.critical,
          abnormal: classification.abnormal,
          preliminary: classification.preliminary,
          finalLike: classification.finalLike,
          acknowledged: classification.acknowledged,
          primaryGroup: classification.primaryGroup,
          groups: classification.groups,
          acknowledgedByProviderAt: it.result?.acknowledgedByProviderAt
            ? it.result.acknowledgedByProviderAt.toISOString()
            : null,
          acknowledgedByUserId: it.result?.acknowledgedByUserId ?? null,
          verifiedAt: it.result?.verifiedAt ? it.result.verifiedAt.toISOString() : null,
          resultPreview: (it.result?.resultText ?? "").trim().slice(0, 160) || null,
          careSettingProjection: "AMBULATORY" as const,
        };
      });

    const groupCounts = {
      CRITICAL: rows.filter((r) => r.groups.includes("CRITICAL")).length,
      ABNORMAL: rows.filter((r) => r.groups.includes("ABNORMAL")).length,
      NEW_FINAL: rows.filter((r) => r.groups.includes("NEW_FINAL")).length,
      PRELIMINARY: rows.filter((r) => r.groups.includes("PRELIMINARY")).length,
      ACKNOWLEDGED: rows.filter((r) => r.groups.includes("ACKNOWLEDGED")).length,
      ALL: rows.length,
    };

    return {
      facilityId: input.facilityId,
      facilityName: input.facility.name ?? null,
      facilityTimeZone: input.facility.timezone ?? "UTC",
      careSettingProjection: "AMBULATORY",
      ambulatoryEncounterTypes: [...CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES],
      rows,
      groupCounts,
      rowLimit: CLINIC_CARE_RESULTS_INBOX_LIMIT,
      truncated: rows.length >= CLINIC_CARE_RESULTS_INBOX_LIMIT,
      access: inboxAccess,
      authority: {
        resultEngine: "ResultsService",
        acknowledgeEndpoint: "POST /orders/:id/result/acknowledge",
        acknowledgeMetadata: ["acknowledgedByUserId", "acknowledgedByProviderAt"],
        acknowledgeCommentDeferred: true,
        detail: "ClinicalResultViewer / EncounterResultsTab",
        noClinicResultEntity: true,
      },
      generatedAt: now.toISOString(),
    };
  }
}

export type ClinicCareAmbulatoryOrderBoardRowDto = {
  orderId: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string | null;
  encounterType: string | null;
  encounterStatus: string | null;
  orderType: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  itemCount: number;
  itemSummaries: Array<{
    id: string;
    status: string;
    catalogItemType: string | null;
    label: string;
  }>;
  careSettingProjection: "AMBULATORY";
};

export type ClinicCareAmbulatoryOrdersBoardDto = {
  facilityId: string;
  facilityName: string | null;
  facilityTimeZone: string;
  careSettingProjection: "AMBULATORY";
  ambulatoryEncounterTypes: string[];
  rows: ClinicCareAmbulatoryOrderBoardRowDto[];
  rowLimit: number;
  truncated: boolean;
  access: ReturnType<typeof resolveClinicCareAmbulatoryOrdersBoardAccess>;
  authority: {
    orderEngine: string;
    placement: string;
    detail: string;
    noClinicOrderEntity: true;
  };
  generatedAt: string;
};

export type ClinicCareAmbulatoryResultInboxRowDto = {
  orderItemId: string;
  orderId: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string | null;
  encounterType: string | null;
  catalogItemType: string;
  orderType: string;
  status: string;
  priority: string;
  label: string;
  critical: boolean;
  abnormal: boolean;
  preliminary: boolean;
  finalLike: boolean;
  acknowledged: boolean;
  primaryGroup: string;
  groups: string[];
  acknowledgedByProviderAt: string | null;
  acknowledgedByUserId: string | null;
  verifiedAt: string | null;
  resultPreview: string | null;
  careSettingProjection: "AMBULATORY";
};

export type ClinicCareAmbulatoryResultsInboxDto = {
  facilityId: string;
  facilityName: string | null;
  facilityTimeZone: string;
  careSettingProjection: "AMBULATORY";
  ambulatoryEncounterTypes: string[];
  rows: ClinicCareAmbulatoryResultInboxRowDto[];
  groupCounts: Record<string, number>;
  rowLimit: number;
  truncated: boolean;
  access: ReturnType<typeof resolveClinicCareAmbulatoryResultsInboxAccess>;
  authority: {
    resultEngine: string;
    acknowledgeEndpoint: string;
    acknowledgeMetadata: string[];
    acknowledgeCommentDeferred: true;
    detail: string;
    noClinicResultEntity: true;
  };
  generatedAt: string;
};

export type ClinicCareDashboardProjectionDto = {
  facilityId: string;
  facilityName: string | null;
  facilityTimeZone: string;
  localDateKey: string;
  period: ClinicCareDashboardPeriod;
  periodStartUtc: string;
  periodEndExclusiveUtc: string;
  /** Forward-looking follow-up window (D4C.5B.1) — distinct from visit rolling-past period. */
  followUpPeriodStartUtc: string;
  followUpPeriodEndExclusiveUtc: string;
  followUpDrillDownHref: string;
  careProfile: string;
  operatingMode: string | null;
  kpis: ClinicCareAnalyticsKpiValue[];
  visitsByDay: ClinicCareVisitsByDayPoint[];
  visitTypes: ClinicCareVisitTypeSlice[];
  patientFlow: ClinicCarePatientFlowSlice[];
  waitTrend: ClinicCareWaitTrendPoint[];
  missedAppointments: ClinicCareMissedAppointmentsSummary;
  /** null when caller is not ADMIN — never send then hide client-side. */
  providerProductivity: ClinicCareProviderProductivityRow[] | null;
  insights: ClinicCareDeterministicInsight[];
  access: {
    canViewDashboard: boolean;
    canViewProviderProductivity: boolean;
    canViewFinancialInsights: boolean;
  };
  classificationNotes: Record<string, string>;
  generatedAt: string;
};

/** Exported for unit tests — ambulatory type list matches shared contract. */
export function clinicCareAmbulatoryTypesForQuery(): string[] {
  return [...CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES];
}

const CLINIC_CARE_ORDERS_BOARD_LIMIT = 200;
const CLINIC_CARE_RESULTS_INBOX_LIMIT = 200;

export { CLINIC_CARE_ROW_LIMIT, CLINIC_CARE_ORDERS_BOARD_LIMIT, CLINIC_CARE_RESULTS_INBOX_LIMIT };
