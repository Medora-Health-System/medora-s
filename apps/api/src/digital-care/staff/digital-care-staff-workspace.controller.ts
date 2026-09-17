import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles, RolesGuard } from "../../common/guards/roles.guard";
import type { DiagnosticResultStaffActor } from "../../patient-portal/records/patient-diagnostic-result-release.service";
import { DigitalCareStaffWorkspaceFallbackService } from "./digital-care-staff-workspace-fallback.service";
import { DigitalCareStaffWorkspaceService } from "./digital-care-staff-workspace.service";

@Controller("patient-portal/v1/staff/digital-care")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
export class DigitalCareStaffWorkspaceController {
  constructor(
    private readonly workspace: DigitalCareStaffWorkspaceService,
    private readonly fallback: DigitalCareStaffWorkspaceFallbackService,
  ) {}

  private actor(req: any): DiagnosticResultStaffActor {
    const userId = req.user?.userId as string | undefined;
    const facilityId = (req.user?.facilityId || req.headers?.["x-facility-id"]) as string | undefined;
    if (!userId) throw new UnauthorizedException("Staff identity missing");
    if (!facilityId) throw new BadRequestException("Facility is required");
    return { userId, facilityId, ip: req.ip, userAgent: req.headers?.["user-agent"] };
  }

  private rethrowClientError(error: unknown) {
    if (error instanceof HttpException && error.getStatus() < 500) throw error;
  }

  @Get("roster")
  async roster(
    @Req() req: any,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const actor = this.actor(req);
    const query = {
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };
    try {
      return await this.workspace.roster(actor, query);
    } catch (error) {
      this.rethrowClientError(error);
      return this.fallback.roster(actor, query);
    }
  }

  @Get("patients/:patientId")
  async patient(@Param("patientId") patientId: string, @Req() req: any) {
    const actor = this.actor(req);
    try {
      return await this.workspace.workspace(actor, patientId);
    } catch (error) {
      this.rethrowClientError(error);
      return this.fallback.workspace(actor, patientId);
    }
  }
}
