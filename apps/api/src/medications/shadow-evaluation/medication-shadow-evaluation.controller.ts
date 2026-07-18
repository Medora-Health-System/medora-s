import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import {
  SE_ADMIN_ROLES,
  SE_READ_ROLES,
} from "./medication-shadow-evaluation.roles";
import { MedicationShadowEvaluationHttpService } from "./medication-shadow-evaluation.http-service";

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

@Controller("medications/shadow-evaluation")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationShadowEvaluationController {
  constructor(private readonly http: MedicationShadowEvaluationHttpService) {}

  @Get("dashboard")
  @RequireRoles(...SE_READ_ROLES)
  dashboard() {
    return this.http.dashboard();
  }

  @Get("readiness")
  @RequireRoles(...SE_READ_ROLES)
  readiness() {
    return this.http.dashboard();
  }

  @Get("reports/wave1")
  @RequireRoles(...SE_READ_ROLES)
  wave1Report() {
    return this.http.dashboard();
  }

  @Get("gaps")
  @RequireRoles(...SE_READ_ROLES)
  gaps() {
    return this.http.dashboard().then((d) => d.GapLinks);
  }

  @Get("batches")
  @RequireRoles(...SE_READ_ROLES)
  batches() {
    return this.http.dashboard();
  }

  @Post("batches")
  @RequireRoles(...SE_ADMIN_ROLES)
  createBatch(@Req() req: AuthReq) {
    return this.http.createBatch(actorFromReq(req));
  }

  @Post("batches/validate")
  @RequireRoles(...SE_ADMIN_ROLES)
  validate(@Req() req: AuthReq) {
    return this.http.validate(actorFromReq(req));
  }

  @Post("batches/execute")
  @RequireRoles(...SE_ADMIN_ROLES)
  execute(@Req() req: AuthReq) {
    return this.http.execute(actorFromReq(req));
  }

  @Post("batches/analyze")
  @RequireRoles(...SE_ADMIN_ROLES)
  analyze(@Req() req: AuthReq) {
    return this.http.analyze(actorFromReq(req));
  }

  @Post("batches/certify")
  @RequireRoles(...SE_ADMIN_ROLES)
  certify(@Req() req: AuthReq) {
    return this.http.certify(actorFromReq(req));
  }

  @Post("batches/pipeline")
  @RequireRoles(...SE_ADMIN_ROLES)
  pipeline(@Req() req: AuthReq) {
    return this.http.pipeline(actorFromReq(req));
  }

  @Post("batches/determinism")
  @RequireRoles(...SE_ADMIN_ROLES)
  determinism(@Req() req: AuthReq) {
    return this.http.determinism(actorFromReq(req));
  }

  @Post("findings/:findingId/classify")
  @RequireRoles(...SE_ADMIN_ROLES)
  classify(
    @Param("findingId") findingId: string,
    @Body() body: { classification?: string; rationale?: string },
    @Req() req: AuthReq
  ) {
    return this.http.classify(
      findingId,
      body?.classification ?? "UNRESOLVED",
      body?.rationale ?? "",
      actorFromReq(req)
    );
  }
}
