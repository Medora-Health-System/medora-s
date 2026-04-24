import { Controller, Put, Post, Param, Body, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { ResultsService } from "./results.service";
import { RoleCode } from "@prisma/client";

@Controller("orders")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Put(":id/result")
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async updateResult(
    @Param("id") orderItemId: string,
    @Body() body: { resultData?: any; resultText?: string; criticalValue?: boolean },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    return this.resultsService.updateResult(
      orderItemId,
      facilityId,
      body,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post(":id/result/acknowledge")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async acknowledgeResult(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.resultsService.acknowledgeResultByClinician(
      orderItemId,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post(":id/result/verify")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async verifyResult(@Param("id") orderItemId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.resultsService.verifyResultByClinician(
      orderItemId,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post(":id/critical")
  @RequireRoles(RoleCode.LAB, RoleCode.ADMIN)
  async setCriticalFlag(
    @Param("id") orderItemId: string,
    @Body() body: { critical: boolean },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    return this.resultsService.setCriticalFlag(
      orderItemId,
      facilityId,
      body.critical,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

