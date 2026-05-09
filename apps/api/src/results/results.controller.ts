import { Controller, Put, Post, Param, Body, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { ResultsService } from "./results.service";
import { PrismaService } from "../prisma/prisma.service";
import { RoleCode } from "@prisma/client";

@Controller("orders")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Phase 1 RN-policy gate needs every facility-scoped role to discriminate RN-only from RN+LAB. */
  private async roleCodesForFacility(userId: string | undefined, facilityId: string): Promise<RoleCode[]> {
    if (!userId) return [];
    const urs = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      include: { role: true },
    });
    return urs.flatMap((u) => (u.role ? [u.role.code] : []));
  }

  @Put(":id/result")
  /**
   * Phase 1 — RN inclusion is policy-gated, not blanket. The decorator only widens who *can*
   * reach the handler; `ResultsService.updateResult` re-checks at runtime that the facility
   * has `allowRnLabResultSubmission === true` AND the line is `LAB_TEST` before allowing RN
   * to submit. RN remains blocked from imaging submission and from provider verification.
   */
  @RequireRoles(RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.RN, RoleCode.ADMIN)
  async updateResult(
    @Param("id") orderItemId: string,
    @Body() body: { resultData?: any; resultText?: string; criticalValue?: boolean },
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const actorRoles = await this.roleCodesForFacility(req.user?.userId, facilityId);

    return this.resultsService.updateResult(
      orderItemId,
      facilityId,
      body,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      actorRoles
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

