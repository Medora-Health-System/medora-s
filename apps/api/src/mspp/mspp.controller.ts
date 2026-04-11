import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { MsppRoleCode } from "@prisma/client";
import { MsppRolesGuard, type MsppRequestContext } from "./guards/mspp-roles.guard";
import { RequireMsppRoles } from "./decorators/require-mspp-roles.decorator";
import { MsppService } from "./mspp.service";
import { msppReviewActionSchema, type MsppReviewActionDto } from "./dto/review-action.dto";

type RequestWithJwtAndMspp = {
  user?: { userId: string };
  msppContext?: MsppRequestContext;
};

function msppCtx(req: RequestWithJwtAndMspp): MsppRequestContext {
  const ctx = req.msppContext;
  if (!ctx) {
    throw new ForbiddenException("MSPP context missing");
  }
  return ctx;
}

function parseReviewAction(body: unknown): MsppReviewActionDto {
  const parsed = msppReviewActionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    const msg =
      parsed.error.errors.map((e) => e.message).join(" ") || "Corps de requête invalide.";
    throw new BadRequestException(msg);
  }
  return parsed.data;
}

@Controller("mspp")
@UseGuards(AuthGuard("jwt"), MsppRolesGuard)
export class MsppController {
  constructor(private readonly mspp: MsppService) {}

  @Get("reviews")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  listReviews(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.listReviews(msppCtx(req));
  }

  @Post("reviews/:id/department-approve")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_DEPT, MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  departmentApprove(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: unknown
  ) {
    return this.mspp.departmentApprove(id, msppCtx(req), parseReviewAction(body));
  }

  @Post("reviews/:id/department-reject")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_DEPT, MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  departmentReject(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: unknown
  ) {
    return this.mspp.departmentReject(id, msppCtx(req), parseReviewAction(body));
  }

  @Post("reviews/:id/central-approve")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  centralApprove(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: unknown
  ) {
    return this.mspp.centralApprove(id, msppCtx(req), parseReviewAction(body));
  }

  @Post("reviews/:id/central-reject")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  centralReject(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: unknown
  ) {
    return this.mspp.centralReject(id, msppCtx(req), parseReviewAction(body));
  }

  @Post("reviews/:id/department-requeue")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_DEPT, MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  departmentRequeue(@Param("id") id: string, @Req() req: RequestWithJwtAndMspp) {
    return this.mspp.departmentRequeue(id, msppCtx(req));
  }

  @Post("reviews/:id/central-requeue")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  centralRequeue(@Param("id") id: string, @Req() req: RequestWithJwtAndMspp) {
    return this.mspp.centralRequeue(id, msppCtx(req));
  }

  @Get("summary")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  summary(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.summary(msppCtx(req));
  }

  @Get("trends")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  trends(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.trends(msppCtx(req));
  }

  @Get("geography")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  geography(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.geography(msppCtx(req));
  }

  @Get("diseases")
  @RequireMsppRoles(
    MsppRoleCode.MSPP_MINISTRE,
    MsppRoleCode.MSPP_EPIDEMIOLOGIE,
    MsppRoleCode.MSPP_VALIDATOR_DEPT,
    MsppRoleCode.MSPP_VALIDATOR_CENTRAL
  )
  diseases(@Req() req: RequestWithJwtAndMspp) {
    return this.mspp.diseases(msppCtx(req));
  }
}
