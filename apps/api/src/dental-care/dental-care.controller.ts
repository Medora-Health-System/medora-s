import { BadRequestException, Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  projectDentalDashboardShellPlaceholders,
  type DentalWorkspaceAccess,
} from "@medora/shared";
import { RequireRoles } from "../common/guards/roles.decorators";
import { RoleCode } from "@prisma/client";
import { DentalCareReadAccessGuard } from "./dental-care-read-access.guard";
import { DentalCareWorklistService } from "./dental-care-worklist.service";

/**
 * MEDUI.D5A.2/D5A.3 — Dental Care shell + thin worklist API.
 * Reuses enterprise Encounter — no Dental repositories.
 */
@Controller("dental-care")
@UseGuards(AuthGuard("jwt"))
export class DentalCareController {
  constructor(private readonly dentalCareWorklist: DentalCareWorklistService) {}

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

  /**
   * MEDUI.D5A.3 — Thin OPEN encounter worklist filtered to Dental service-line tags.
   */
  @Get("worklist")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  async getWorklist(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.dentalCareWorklist.listOpenDentalEncounters(facilityId);
  }
}
