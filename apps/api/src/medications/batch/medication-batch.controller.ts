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
import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";
import { MedicationBatchHttpService } from "./medication-batch.http-service";

type AuthReq = Request & {
  user?: { userId?: string; facilityId?: string };
  userRole?: string;
};

function actorFromReq(req: AuthReq) {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedException();
  const role = req.userRole ? [String(req.userRole)] : ["MEDICATION_REVIEWER"];
  return { userId, roles: role };
}

@Controller("medications/batches")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationBatchController {
  constructor(private readonly batches: MedicationBatchHttpService) {}

  @Get()
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  list() {
    return this.batches.list();
  }

  @Get("metrics")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  metrics() {
    return this.batches.metrics();
  }

  @Get(":batchId")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  getOne(@Param("batchId") batchId: string) {
    return this.batches.getOne(batchId);
  }

  @Get(":batchId/preview")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  preview(@Param("batchId") batchId: string, @Req() req: AuthReq) {
    return this.batches.preview(batchId, actorFromReq(req));
  }

  @Get(":batchId/report")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  report(@Param("batchId") batchId: string, @Req() req: AuthReq) {
    return this.batches.report(batchId, actorFromReq(req));
  }

  @Get(":batchId/items")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  items(
    @Param("batchId") batchId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.batches.items(batchId, Number(limit ?? 50), Number(offset ?? 0));
  }

  @Get(":batchId/conflicts")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  conflicts(@Param("batchId") batchId: string) {
    return this.batches.conflicts(batchId);
  }

  @Get(":batchId/metrics")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  batchMetrics(@Param("batchId") batchId: string) {
    return this.batches.batchMetrics(batchId);
  }

  @Post()
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  create(@Req() req: AuthReq) {
    return this.batches.create(actorFromReq(req));
  }

  @Post(":batchId/approve")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  approve(@Param("batchId") batchId: string, @Req() req: AuthReq) {
    return this.batches.approve(batchId, actorFromReq(req));
  }

  @Post(":batchId/extract")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  extract(
    @Param("batchId") batchId: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.batches.extract(batchId, body, actorFromReq(req));
  }

  @Post(":batchId/normalize")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  normalize(@Param("batchId") batchId: string, @Req() req: AuthReq) {
    return this.batches.normalize(batchId, actorFromReq(req));
  }

  @Post(":batchId/dedupe")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  dedupe(@Param("batchId") batchId: string, @Req() req: AuthReq) {
    return this.batches.dedupe(batchId, actorFromReq(req));
  }

  @Post(":batchId/stage")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  stage(
    @Param("batchId") batchId: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.batches.stage(batchId, body, actorFromReq(req));
  }

  @Post(":batchId/candidates")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  candidates(@Param("batchId") batchId: string, @Req() req: AuthReq) {
    return this.batches.candidates(batchId, actorFromReq(req));
  }

  @Post(":batchId/rollback")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  rollback(
    @Param("batchId") batchId: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.batches.rollback(batchId, body, actorFromReq(req));
  }

  @Post(":batchId/attest")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  attest(
    @Param("batchId") batchId: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.batches.attest(batchId, body, actorFromReq(req));
  }
}
