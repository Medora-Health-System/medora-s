import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type {
  Phase16FeedbackType,
  Phase16RecommendationLifecycle,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import {
  RECOMMENDATION_ADMIN_ROLES,
  RECOMMENDATION_PROVIDER_ROLES,
  RECOMMENDATION_READ_ROLES,
  RECOMMENDATION_WRITE_ROLES,
} from "./medication-recommendation.roles";
import { MedicationRecommendationHttpService } from "./medication-recommendation.http-service";

type AuthReq = Request & {
  user?: { userId?: string };
  userRole?: string;
};

function actorFromReq(req: AuthReq) {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedException();
  return {
    userId,
    roles: req.userRole ? [String(req.userRole)] : ["MEDICATION_REVIEWER"],
  };
}

@Controller("medications/recommendations")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationRecommendationController {
  constructor(private readonly http: MedicationRecommendationHttpService) {}

  @Get("governance/dashboard")
  @RequireRoles(...RECOMMENDATION_READ_ROLES)
  dashboard() {
    return this.http.dashboard();
  }

  @Get("analytics")
  @RequireRoles(...RECOMMENDATION_READ_ROLES)
  analytics(@Req() req: AuthReq) {
    return this.http.analytics(actorFromReq(req));
  }

  @Get("readiness")
  @RequireRoles(...RECOMMENDATION_READ_ROLES)
  readiness() {
    return this.http.readiness();
  }

  @Get()
  @RequireRoles(...RECOMMENDATION_PROVIDER_ROLES)
  list(
    @Query("exposableOnly") exposableOnly?: string,
    @Query("familyKey") familyKey?: string,
    @Query("lifecycleStatus") lifecycleStatus?: string
  ) {
    return this.http.list({
      exposableOnly: exposableOnly === "1" || exposableOnly === "true",
      familyKey,
      lifecycleStatus,
    });
  }

  @Get(":id/explanation")
  @RequireRoles(...RECOMMENDATION_PROVIDER_ROLES)
  explanation(@Param("id") id: string) {
    return this.http.explanation(id);
  }

  @Get(":id/evidence")
  @RequireRoles(...RECOMMENDATION_PROVIDER_ROLES)
  evidence(@Param("id") id: string) {
    return this.http.evidence(id);
  }

  @Get(":id/history")
  @RequireRoles(...RECOMMENDATION_READ_ROLES)
  history(@Param("id") id: string) {
    return this.http.history(id);
  }

  @Post("seed")
  @RequireRoles(...RECOMMENDATION_ADMIN_ROLES)
  seed(@Req() req: AuthReq) {
    return this.http.seed(actorFromReq(req));
  }

  @Post("promote-shadow")
  @RequireRoles(...RECOMMENDATION_ADMIN_ROLES)
  promote(@Req() req: AuthReq) {
    return this.http.promoteToShadow(actorFromReq(req));
  }

  @Post("shadow/evaluate")
  @RequireRoles(...RECOMMENDATION_PROVIDER_ROLES)
  shadowEvaluate(
    @Req() req: AuthReq,
    @Body()
    body: {
      facilityId: string;
      patientId?: string;
      encounterId?: string;
      familyKeys?: string[];
    }
  ) {
    return this.http.shadowEvaluate(actorFromReq(req), body);
  }

  @Post(":id/feedback")
  @RequireRoles(...RECOMMENDATION_PROVIDER_ROLES)
  feedback(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body()
    body: {
      facilityId: string;
      feedbackType: Phase16FeedbackType;
      evaluationId?: string;
      encounterId?: string;
      overrideReason?: string;
      notes?: string;
    }
  ) {
    return this.http.feedback(actorFromReq(req), {
      definitionId: id,
      ...body,
    });
  }

  @Post(":id/review")
  @RequireRoles(...RECOMMENDATION_WRITE_ROLES)
  review(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body()
    body: {
      decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "DEFERRED";
      rationale: string;
      promoteToShadow?: boolean;
    }
  ) {
    return this.http.review(actorFromReq(req), {
      definitionId: id,
      ...body,
    });
  }

  @Post(":id/transition")
  @RequireRoles(...RECOMMENDATION_WRITE_ROLES)
  transition(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body()
    body: { toStatus: Phase16RecommendationLifecycle; reason: string }
  ) {
    return this.http.transition(actorFromReq(req), {
      definitionId: id,
      toStatus: body.toStatus,
      reason: body.reason,
    });
  }
}
