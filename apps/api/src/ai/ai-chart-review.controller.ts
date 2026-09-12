import { BadRequestException, Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard.js";
import { ClinicalReviewOrchestratorService } from "./review/clinical-review-orchestrator.service.js";

@Controller("ai/chart-review")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AiChartReviewController {
  constructor(private readonly reviewOrchestrator: ClinicalReviewOrchestratorService) {}

  @Get(":encounterId")
  @RequireRoles(RoleCode.PROVIDER)
  async getChartReview(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    const actorUserId = req.user?.userId;

    if (!facilityId || typeof facilityId !== "string") {
      throw new BadRequestException("Facility ID required");
    }
    if (!actorUserId || typeof actorUserId !== "string") {
      throw new BadRequestException("Authenticated user required");
    }

    return this.reviewOrchestrator.run({
      facilityId,
      encounterId,
      actorUserId,
    });
  }
}
