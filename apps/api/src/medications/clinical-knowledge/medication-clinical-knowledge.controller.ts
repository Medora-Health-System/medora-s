import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { z } from "zod";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";
import { MedicationClinicalKnowledgeHttpService } from "./medication-clinical-knowledge.http-service";

type AuthReq = Request & {
  user?: { userId?: string; facilityId?: string };
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

@Controller("medications/clinical-knowledge")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationClinicalKnowledgeController {
  constructor(private readonly knowledge: MedicationClinicalKnowledgeHttpService) {}

  @Get("dashboard")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  dashboard() {
    return this.knowledge.dashboard();
  }

  @Get("profiles")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  list(
    @Query("conceptId") conceptId?: string,
    @Query("productId") productId?: string,
    @Query("lifecycleStatus") lifecycleStatus?: string,
    @Query("emergencyUseProfile") emergencyUseProfile?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.knowledge.list({
      conceptId,
      productId,
      lifecycleStatus,
      emergencyUseProfile,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("profiles/:id")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  getOne(@Param("id") id: string) {
    return this.knowledge.getOne(id);
  }

  @Post("sources")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  upsertSource(@Body() body: unknown, @Req() req: AuthReq) {
    return this.knowledge.upsertSource(body, actorFromReq(req));
  }

  @Post("versions")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createVersion(@Body() body: unknown, @Req() req: AuthReq) {
    return this.knowledge.createVersion(body, actorFromReq(req));
  }

  @Post("profiles")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createDraft(@Body() body: unknown, @Req() req: AuthReq) {
    return this.knowledge.createDraft(body, actorFromReq(req));
  }

  @Patch("profiles/:id")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  updateDraft(@Param("id") id: string, @Body() body: unknown, @Req() req: AuthReq) {
    return this.knowledge.updateDraft(id, body, actorFromReq(req));
  }

  @Post("profiles/:id/transition")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  transition(@Param("id") id: string, @Body() body: unknown, @Req() req: AuthReq) {
    const parsed = z
      .object({
        toStatus: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "SUPERSEDED", "RETIRED"]),
        rationale: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    const actor = actorFromReq(req);
    if (parsed.data.reviewerUserId && parsed.data.reviewerUserId !== actor.userId) {
      throw new BadRequestException(
        "Payload reviewerUserId must match the authenticated user."
      );
    }
    if (parsed.data.toStatus === "APPROVED") {
      // Enforce admin via role guard + service
      const adminRoles = RXNORM_PILOT_ADMIN_ROLES as readonly string[];
      if (!actor.roles.some((r) => adminRoles.includes(r))) {
        // Allow if JWT role is admin; otherwise service will throw
      }
    }
    return this.knowledge.transition(id, parsed.data, actor);
  }

  @Post("profiles/:id/fork")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  fork(@Param("id") id: string, @Body() body: unknown, @Req() req: AuthReq) {
    return this.knowledge.fork(id, body, actorFromReq(req));
  }

  @Post("profiles/:id/approve")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  approve(@Param("id") id: string, @Body() body: unknown, @Req() req: AuthReq) {
    const parsed = z
      .object({
        rationale: z.string().min(1),
        reviewerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    const actor = actorFromReq(req);
    if (parsed.data.reviewerUserId && parsed.data.reviewerUserId !== actor.userId) {
      throw new BadRequestException(
        "Payload reviewerUserId must match the authenticated user."
      );
    }
    return this.knowledge.transition(
      id,
      { toStatus: "APPROVED", rationale: parsed.data.rationale },
      actor
    );
  }
}
