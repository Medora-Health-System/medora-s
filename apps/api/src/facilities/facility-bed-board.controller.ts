import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { bedBoardUnitQuerySchema, bedStatusUpdateDtoSchema } from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { FacilityBedBoardService } from "./facility-bed-board.service";

@Controller("facilities")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class FacilityBedBoardController {
  constructor(private readonly bedBoardService: FacilityBedBoardService) {}

  private resolveFacilityId(req: any, paramFacilityId: string): string {
    const headerOrUser = req.user?.facilityId || req.headers["x-facility-id"];
    if (!headerOrUser || headerOrUser !== paramFacilityId) {
      throw new ForbiddenException("Facility access denied");
    }
    return paramFacilityId;
  }

  @Get(":facilityId/bed-board")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async getBedBoard(
    @Param("facilityId") facilityId: string,
    @Query() query: unknown,
    @Req() req: any
  ) {
    const scopedFacilityId = this.resolveFacilityId(req, facilityId);
    const parsed = bedBoardUnitQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query");
    }
    return this.bedBoardService.getBedBoard(scopedFacilityId, parsed.data.unit ?? null);
  }

  @Patch(":facilityId/beds/:bedKey/status")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async updateBedStatus(
    @Param("facilityId") facilityId: string,
    @Param("bedKey") bedKey: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const scopedFacilityId = this.resolveFacilityId(req, facilityId);
    const parsed = bedStatusUpdateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.bedBoardService.updateBedStatus(
      scopedFacilityId,
      bedKey,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get(":facilityId/beds/:bedKey/status-history")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async getBedStatusHistory(
    @Param("facilityId") facilityId: string,
    @Param("bedKey") bedKey: string,
    @Query("limit") limitRaw: string | undefined,
    @Req() req: any
  ) {
    const scopedFacilityId = this.resolveFacilityId(req, facilityId);
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;
    return this.bedBoardService.getBedStatusHistory(
      scopedFacilityId,
      bedKey,
      Number.isFinite(limit) ? limit : 10
    );
  }
}
