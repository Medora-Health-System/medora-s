import {
  BadRequestException,
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
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import { RxNormReviewService } from "./rxnorm-review.service";
import {
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "./rxnorm-review.roles";
import {
  reviewApproveBodySchema,
  reviewAssignBodySchema,
  reviewBulkBodySchema,
  reviewDeferBodySchema,
  reviewRejectBodySchema,
  reviewRetireBodySchema,
  reviewSupersedeBodySchema,
} from "./dto/rxnorm-review.dto";

type AuthReq = Request & {
  user?: { userId?: string; facilityId?: string };
};

function parseIntQuery(value: string | undefined, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

@Controller("medications/review")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class RxNormReviewController {
  constructor(private readonly review: RxNormReviewService) {}

  @Get("candidates")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listCandidates(
    @Query("releaseId") releaseId?: string,
    @Query("status") status?: string,
    @Query("termType") termType?: string,
    @Query("assignedToUserId") assignedToUserId?: string,
    @Query("reviewerUserId") reviewerUserId?: string,
    @Query("ambiguityOnly") ambiguityOnly?: string,
    @Query("conflictOnly") conflictOnly?: string,
    @Query("pilotId") pilotId?: string,
    @Query("batchId") batchId?: string,
    @Query("duplicateClassification") duplicateClassification?: string,
    @Query("medicationCategory") medicationCategory?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.review.listCandidates({
      releaseId,
      status,
      termType,
      assignedToUserId,
      reviewerUserId,
      ambiguityOnly: ambiguityOnly === "true" || ambiguityOnly === "1",
      conflictOnly: conflictOnly === "true" || conflictOnly === "1",
      pilotId,
      batchId,
      duplicateClassification,
      medicationCategory,
      search,
      limit: parseIntQuery(limit, 50),
      offset: parseIntQuery(offset, 0),
    });
  }

  @Get("pilot/duplicates")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listPilotDuplicates(
    @Query("pilotId") pilotId?: string,
    @Query("classification") classification?: string,
    @Query("resolutionStatus") resolutionStatus?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.review.listPilotDuplicates({
      pilotId,
      classification,
      resolutionStatus,
      limit: parseIntQuery(limit, 50),
      offset: parseIntQuery(offset, 0),
    });
  }

  @Post("pilot/duplicates/:id/resolve")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  resolvePilotDuplicate(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    const userId = req.user?.userId;
    const facilityId =
      (typeof req.user?.facilityId === "string" && req.user.facilityId) ||
      (typeof req.headers["x-facility-id"] === "string"
        ? req.headers["x-facility-id"]
        : undefined);
    if (!userId) throw new UnauthorizedException();
    return this.review.resolvePilotDuplicate(id, body, userId, facilityId);
  }

  @Get("candidate/:id")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  getCandidate(@Param("id") id: string, @Req() req: AuthReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.review.getCandidate(id, userId, "MedicationReviewer");
  }

  @Get("dashboard")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  dashboard() {
    return this.review.dashboard();
  }

  @Get("pilot-config")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  pilotConfig() {
    return this.review.pilotConfig();
  }

  @Post("approve")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  approve(@Body() body: unknown, @Req() req: AuthReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = reviewApproveBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    return this.review.approve(parsed.data, userId, "MedicationReviewer");
  }

  @Post("reject")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  reject(@Body() body: unknown, @Req() req: AuthReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = reviewRejectBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    return this.review.reject(parsed.data, userId, "MedicationReviewer");
  }

  @Post("defer")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  defer(@Body() body: unknown, @Req() req: AuthReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = reviewDeferBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    return this.review.defer(parsed.data, userId, "MedicationReviewer");
  }

  @Post("assign")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  assign(@Body() body: unknown, @Req() req: AuthReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = reviewAssignBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    return this.review.assign(parsed.data, userId, "MedicationAdmin");
  }

  @Post("retire")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  retire(@Body() body: unknown, @Req() req: AuthReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = reviewRetireBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    return this.review.retire(parsed.data, userId, "MedicationAdmin");
  }

  @Post("supersede")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  supersede(@Body() body: unknown, @Req() req: AuthReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = reviewSupersedeBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    return this.review.supersede(parsed.data, userId, "MedicationAdmin");
  }

  @Post("bulk")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  bulk(@Body() body: unknown, @Req() req: AuthReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = reviewBulkBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    return this.review.bulk(parsed.data, userId, "MedicationAdmin");
  }
}
