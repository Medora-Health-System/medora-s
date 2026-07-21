/**
 * D3E.6A — Hospital Care operational dashboard + canonical census.
 * Facility id always from JWT — never from client body.
 */

import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import {
  buildHospitalCareDashboardSummary,
  directInpatientAdmissionEnabled,
  evaluateHospitalCareFlagPairs,
  hospitalCareActivationFlagsFromProcessEnv,
  hospitalCareDashboardEnabled,
  hospitalCareProductionDefaultsAreOff,
  inpatientClinicalWorkspaceEnabled,
  inpatientWorkspaceFlagsFromProcessEnv,
  internalPlacementWorkflowEnabledFromProcessEnv,
  isDevelopmentRuntime,
  observationClinicalWorkspaceEnabled,
  observationDepartmentalFlagsFromProcessEnv,
  receivingEncounterFoundationEnabledFromProcessEnv,
  UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID,
  type HospitalCareDashboardCapabilities,
  type HospitalOperationalSnapshotV1,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { InternalPlacementService } from "./internal-placement.service";
import { HospitalCensusService } from "./hospital-census.service";
import { HospitalUnitRegistryService } from "./hospital-unit-registry.service";

function facilityIdFromReq(req: { user?: { facilityId?: string } }): string {
  return String(req.user?.facilityId ?? "").trim();
}

@Controller("hospital-care")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class HospitalCareController {
  constructor(
    private readonly placement: InternalPlacementService,
    private readonly hospitalCensus: HospitalCensusService,
    private readonly unitRegistry: HospitalUnitRegistryService
  ) {}

  @Get("meta")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  meta(@Req() req: { user?: { facilityId?: string } }) {
    const env = hospitalCareActivationFlagsFromProcessEnv();
    const pairs = evaluateHospitalCareFlagPairs(env);
    const placementOn = internalPlacementWorkflowEnabledFromProcessEnv();
    const receivingOn = receivingEncounterFoundationEnabledFromProcessEnv();
    const obsEnv = observationDepartmentalFlagsFromProcessEnv();
    const ipEnv = inpatientWorkspaceFlagsFromProcessEnv();
    return {
      module: "HOSPITAL_CARE",
      certification: UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID,
      facilityId: facilityIdFromReq(req),
      productionDefaultsOff: hospitalCareProductionDefaultsAreOff({}),
      flags: {
        placementWorkflow: placementOn,
        receivingEncounters: receivingOn,
        observationWorkspace: observationClinicalWorkspaceEnabled(obsEnv),
        inpatientWorkspace: inpatientClinicalWorkspaceEnabled(ipEnv),
        directInpatientAdmission: directInpatientAdmissionEnabled(env),
        hospitalCareDashboard: hospitalCareDashboardEnabled(env),
      },
      flagPairs: pairs,
      mismatches: pairs.filter((p) => p.mismatch),
      developmentDiagnosticsVisible: isDevelopmentRuntime(env),
    };
  }

  @Get("units")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  async units(@Req() req: { user?: { facilityId?: string } }) {
    return this.unitRegistry.getUnitRegistry(facilityIdFromReq(req));
  }

  @Get("census")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  async census(
    @Req() req: { user?: { facilityId?: string } },
    @Query("scope") scope?: string
  ) {
    const normalized = String(scope ?? "ALL_HOSPITAL_CARE")
      .trim()
      .toUpperCase();
    const snapshotScope: HospitalOperationalSnapshotV1["scope"] =
      normalized === "OBSERVATION" || normalized === "INPATIENT"
        ? normalized
        : "ALL_HOSPITAL_CARE";
    return this.hospitalCensus.getHospitalCensus(facilityIdFromReq(req), { snapshotScope });
  }

  @Get("dashboard")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  async dashboard(@Req() req: { user?: { facilityId?: string } }) {
    const facilityId = facilityIdFromReq(req);
    const env = hospitalCareActivationFlagsFromProcessEnv();
    const obsEnv = observationDepartmentalFlagsFromProcessEnv();
    const ipEnv = inpatientWorkspaceFlagsFromProcessEnv();
    const placementOn = internalPlacementWorkflowEnabledFromProcessEnv();
    const receivingOn = receivingEncounterFoundationEnabledFromProcessEnv();
    const obsOn = observationClinicalWorkspaceEnabled(obsEnv);
    const ipOn = inpatientClinicalWorkspaceEnabled(ipEnv);
    const directOn = directInpatientAdmissionEnabled(env);

    const capabilities: HospitalCareDashboardCapabilities = {
      emergencyDepartment: true,
      observation: obsOn,
      inpatient: ipOn || placementOn || true,
      directAdmission: directOn,
      bedManagement: true,
      transfers: false,
      placementWorkflow: placementOn,
      receivingEncounters: receivingOn,
    };

    const [queue, clinicalCensus] = await Promise.all([
      this.placement.listFacilityQueue(facilityId, { strict: false }),
      this.hospitalCensus.getHospitalCensus(facilityId, {
        snapshotScope: "ALL_HOSPITAL_CARE",
      }),
    ]);

    const summary = buildHospitalCareDashboardSummary({
      facilityId,
      placementAvailability: queue.availability,
      rows: queue.items.map((item) => ({
        id: item.id,
        status: item.status,
        requestedEncounterType: item.requestedEncounterType,
        arrivedDestinationAt: item.arrivedDestinationAt ?? null,
        receivingEncounterId: item.receivingEncounterId ?? null,
        departedEdAt: item.departedEdAt ?? null,
        readyForTransferAt: item.readyForTransferAt ?? null,
        assignedBedKey: item.assignedBedKey ?? null,
        assignedUnitCode: item.assignedUnitCode ?? null,
        requestedAt: item.requestedAt ?? null,
        createdAt: item.createdAt,
        acceptingProviderNameSnapshot: item.acceptingProviderNameSnapshot ?? null,
        patient: item.patient,
      })),
      capabilities,
      clinicalCensus: {
        activeObservation: clinicalCensus.summary.activeObservation,
        activeInpatient: clinicalCensus.summary.activeInpatient,
        admissionsToday: clinicalCensus.summary.admissionsToday,
        bedsAvailable: clinicalCensus.summary.bedsAvailable,
        bedsOccupied: clinicalCensus.summary.bedsOccupied,
        bedsUnavailable:
          clinicalCensus.summary.bedsCleaning != null ||
          clinicalCensus.summary.bedsBlocked != null
            ? (clinicalCensus.summary.bedsCleaning ?? 0) +
              (clinicalCensus.summary.bedsBlocked ?? 0)
            : null,
      },
    });

    return {
      ...summary,
      census: clinicalCensus,
      dashboardSoftEnabled: hospitalCareDashboardEnabled(env),
      diagnostics:
        isDevelopmentRuntime(env) && !placementOn
          ? {
              reason: "PLACEMENT_WORKFLOW_DISABLED",
              hint: "Internal placement workflow is disabled. Placement queue and awaiting-bed metrics are unavailable. Active Observation and Inpatient census data remain visible.",
              mismatches: evaluateHospitalCareFlagPairs(env).filter((p) => p.mismatch),
            }
          : clinicalCensus.diagnostics.length
            ? {
                reason: "CENSUS_CONSISTENCY",
                hint: "Server-owned census/bed consistency diagnostics attached.",
                censusDiagnostics: clinicalCensus.diagnostics,
              }
            : null,
    };
  }
}
