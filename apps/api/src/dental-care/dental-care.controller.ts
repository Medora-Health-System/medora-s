import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  projectDentalDashboardShellPlaceholders,
  type DentalWorkspaceAccess,
} from "@medora/shared";
import { RequireRoles } from "../common/guards/roles.decorators";
import { RoleCode } from "@prisma/client";
import { DentalCareReadAccessGuard } from "./dental-care-read-access.guard";

/**
 * MEDUI.D5A.2 — Dental Care shell API.
 * Placeholder projections only; reuses enterprise authorities (no Dental repositories).
 */
@Controller("dental-care")
@UseGuards(AuthGuard("jwt"))
export class DentalCareController {
  @Get("dashboard")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getDashboard(@Req() req: { dentalCareAccess?: DentalWorkspaceAccess }) {
    return {
      certificationId: "MEDUI.D5A.2",
      access: req.dentalCareAccess ?? null,
      sections: projectDentalDashboardShellPlaceholders(),
    };
  }

  @Get("access")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getAccess(@Req() req: { dentalCareAccess?: DentalWorkspaceAccess }) {
    return {
      certificationId: "MEDUI.D5A.2",
      access: req.dentalCareAccess ?? null,
    };
  }
}
