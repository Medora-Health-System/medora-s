import { Injectable } from "@nestjs/common";
import { EncounterStatus, EncounterType, FollowUpStatus, Prisma } from "@prisma/client";
import {
  CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES,
  CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS,
  clinicCareNextStepHint,
  countClinicCareMetricsFromEncounters,
  defaultClinicCareTrackboardViewForProfession,
  facilityLocalDayUtcBounds,
  filterClinicCareTrackboardRowForRole,
  isClinicCareFollowUpDue,
  projectClinicCareStage,
  resolveAmbulatoryOperatingMode,
  resolveClinicCareTrackboardFieldVisibility,
  resolveFacilityCareProfile,
  type ClinicCareMetricCountMap,
  type ClinicCareStageId,
  type ClinicCareTrackboardFieldVisibility,
  type ClinicCareTrackboardView,
  type ClinicCareWorkspaceRoleAccess,
  type FacilityModuleCapabilitiesD4c1,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { TrackboardService } from "../trackboard/trackboard.service";
import { TRACKBOARD_ACTIVE_ENCOUNTER_SELECT } from "../trackboard/trackboard-encounter-select";

const CLINIC_CARE_ROW_LIMIT = 250;

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
    };

    const todayClosedWhere: Prisma.EncounterWhereInput = {
      facilityId: input.facilityId,
      status: EncounterStatus.CLOSED,
      type: { in: ambulatoryTypes },
      createdAt: { gte: day.startUtc, lt: day.endExclusiveUtc },
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
      })
    );
    const followUpsDue = followUpsDueRows.length;
    const followUpEncounterIds = followUpsDueRows
      .map((r) => r.encounterId)
      .filter((id): id is string => Boolean(id));

    const [openRows, todayClosedRows] = await Promise.all([
      this.prisma.encounter.findMany({
        where: openWhere,
        select: TRACKBOARD_ACTIVE_ENCOUNTER_SELECT,
        orderBy: { createdAt: "desc" },
        take: CLINIC_CARE_ROW_LIMIT,
      }),
      this.prisma.encounter.findMany({
        where: todayClosedWhere,
        select: TRACKBOARD_ACTIVE_ENCOUNTER_SELECT,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const byId = new Map<string, (typeof openRows)[number]>();
    for (const row of [...openRows, ...todayClosedRows]) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    const encounters = [...byId.values()];
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
}

/** Exported for unit tests — ambulatory type list matches shared contract. */
export function clinicCareAmbulatoryTypesForQuery(): string[] {
  return [...CLINIC_CARE_AMBULATORY_ENCOUNTER_TYPES];
}

export { CLINIC_CARE_ROW_LIMIT };
