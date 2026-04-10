import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { MsppRoleCode } from "@prisma/client";
import { MsppRolesGuard, type MsppRequestContext } from "./guards/mspp-roles.guard";
import { RequireMsppRoles } from "./decorators/require-mspp-roles.decorator";
import { MsppService } from "./mspp.service";
import type { ReviewActionBody } from "./dto/review-action.dto";

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
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_DEPT)
  departmentApprove(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: ReviewActionBody
  ) {
    return this.mspp.departmentApprove(id, msppCtx(req), body?.reason);
  }

  @Post("reviews/:id/department-reject")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_DEPT)
  departmentReject(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: ReviewActionBody
  ) {
    return this.mspp.departmentReject(id, msppCtx(req), body?.reason);
  }

  @Post("reviews/:id/central-approve")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  centralApprove(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: ReviewActionBody
  ) {
    return this.mspp.centralApprove(id, msppCtx(req), body?.reason);
  }

  @Post("reviews/:id/central-reject")
  @RequireMsppRoles(MsppRoleCode.MSPP_VALIDATOR_CENTRAL)
  centralReject(
    @Param("id") id: string,
    @Req() req: RequestWithJwtAndMspp,
    @Body() body: ReviewActionBody
  ) {
    return this.mspp.centralReject(id, msppCtx(req), body?.reason);
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
