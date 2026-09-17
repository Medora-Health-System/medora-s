import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles, RolesGuard } from "../../common/guards/roles.guard";
import { resolveAuthorizedFacilityId } from "../../common/http/request-facility";
import type { DiagnosticResultStaffActor } from "../../patient-portal/records/patient-diagnostic-result-release.service";
import { DigitalCareStaffWorkspaceService } from "./digital-care-staff-workspace.service";

@Controller("patient-portal/v1/staff/digital-care")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
export class DigitalCareStaffWorkspaceController {
  constructor(private readonly workspace: DigitalCareStaffWorkspaceService) {}

  private actor(req: any): DiagnosticResultStaffActor {
    const userId = req.user?.userId as string | undefined;
    const facilityId = resolveAuthorizedFacilityId(req);
    if (!userId) throw new UnauthorizedException("Staff identity missing");
    if (!facilityId) throw new BadRequestException("Facility is required");
    return { userId, facilityId, ip: req.ip, userAgent: req.headers?.["user-agent"] };
  }

  @Get("roster")
  roster(
    @Req() req: any,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.workspace.roster(this.actor(req), {
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("patients/:patientId")
  patient(@Param("patientId") patientId: string, @Req() req: any) {
    return this.workspace.workspace(this.actor(req), patientId);
  }
}
