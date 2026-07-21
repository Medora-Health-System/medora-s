import { Controller, Get, Req, UseGuards } from "@nestjs/common";
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
  type HospitalCareDashboardCapabilities,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { InternalPlacementService } from "./internal-placement.service";

function facilityIdFromReq(req: { user?: { facilityId?: string } }): string {
  return String(req.user?.facilityId ?? "").trim();
}

/**
 * D3E.6 — Hospital Care operational dashboard + activation diagnostics.
 * Facility id always from JWT — never from client body.
 */
@Controller("hospital-care")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class HospitalCareController {
  constructor(private readonly placement: InternalPlacementService) {}

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
      certification: "MEDUI.HOSPITAL_CARE_OPERATIONAL_ACTIVATION.D3E6",
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
      inpatient: ipOn || placementOn,
      directAdmission: directOn,
      bedManagement: true,
      transfers: false,
      placementWorkflow: placementOn,
      receivingEncounters: receivingOn,
    };

    const queue = await this.placement.listFacilityQueue(facilityId, { strict: false });
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
    });

    return {
      ...summary,
      dashboardSoftEnabled: hospitalCareDashboardEnabled(env),
      diagnostics:
        isDevelopmentRuntime(env) && !placementOn
          ? {
              reason: "PLACEMENT_WORKFLOW_DISABLED",
              hint: "Enable INTERNAL_PLACEMENT_WORKFLOW_ENABLED and NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED for local operational data.",
              mismatches: evaluateHospitalCareFlagPairs(env).filter((p) => p.mismatch),
            }
          : null,
    };
  }
}
