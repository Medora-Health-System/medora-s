import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { observationWorkspaceEnabledFromProcessEnv } from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";

/**
 * D3D — Observation workspace meta (flag-safe).
 * Does not touch InternalPlacementRequest / HospitalEpisode Prisma models.
 */
@Controller("observation-workspace")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ObservationWorkspaceController {
  @Get("meta")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  meta() {
    const enabled = observationWorkspaceEnabledFromProcessEnv();
    return {
      availability: enabled ? ("ENABLED" as const) : ("FEATURE_DISABLED" as const),
      module: "OBSERVATION_WORKSPACE",
      certification: "MEDUI.OBSERVATION_WORKSPACE.D3D",
    };
  }
}
