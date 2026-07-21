import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import {
  observationClinicalWorkspaceEnabled,
  observationDepartmentalFlagsFromProcessEnv,
  observationDepartmentalOrdersEnabled,
  observationDocumentationEnabled,
  observationMarEnabled,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";

/**
 * D3D/D3DA — Observation workspace meta (flag-safe).
 * Does not touch InternalPlacementRequest / HospitalEpisode Prisma models.
 */
@Controller("observation-workspace")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ObservationWorkspaceController {
  @Get("meta")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  meta() {
    const env = observationDepartmentalFlagsFromProcessEnv();
    const workspace = observationClinicalWorkspaceEnabled(env);
    const departmentalOrders = observationDepartmentalOrdersEnabled(env);
    const mar = observationMarEnabled(env);
    const documentation = observationDocumentationEnabled(env);
    return {
      availability: workspace ? ("ENABLED" as const) : ("FEATURE_DISABLED" as const),
      module: "OBSERVATION_WORKSPACE",
      certification: "MEDUI.OBSERVATION_DEPARTMENTAL_INTEGRATION.D3DA",
      flags: {
        observationClinicalWorkspaceEnabled: workspace,
        observationDepartmentalOrdersEnabled: departmentalOrders,
        observationMarEnabled: mar,
        observationDocumentationEnabled: documentation,
      },
    };
  }
}
