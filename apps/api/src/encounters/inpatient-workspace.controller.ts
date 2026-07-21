import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import {
  inpatientClinicalWorkspaceEnabled,
  inpatientDepartmentalOrdersEnabled,
  inpatientDocumentationEnabled,
  inpatientMarEnabled,
  inpatientWorkspaceFlagsFromProcessEnv,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";

/**
 * D3E — Inpatient workspace meta (flag-safe).
 * Does not introduce departmental engines; census uses placement queue.
 */
@Controller("inpatient-workspace")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class InpatientWorkspaceController {
  @Get("meta")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  meta() {
    const env = inpatientWorkspaceFlagsFromProcessEnv();
    const workspace = inpatientClinicalWorkspaceEnabled(env);
    const departmentalOrders = inpatientDepartmentalOrdersEnabled(env);
    const mar = inpatientMarEnabled(env);
    const documentation = inpatientDocumentationEnabled(env);
    return {
      availability: workspace ? ("ENABLED" as const) : ("FEATURE_DISABLED" as const),
      module: "INPATIENT_CLINICAL_WORKSPACE",
      certification: "MEDUI.INPATIENT_CLINICAL_WORKSPACE.D3E",
      flags: {
        inpatientClinicalWorkspaceEnabled: workspace,
        inpatientDepartmentalOrdersEnabled: departmentalOrders,
        inpatientMarEnabled: mar,
        inpatientDocumentationEnabled: documentation,
      },
      consumesSharedEngines: {
        orders: true,
        laboratory: true,
        radiology: true,
        pharmacy: true,
        mar: true,
        results: true,
        chartCertification: true,
        hospitalEpisodeService: true,
      },
    };
  }
}
