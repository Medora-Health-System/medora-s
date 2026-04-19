import { Controller, Get, Query, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireClinicalOrMspp } from "../common/guards/roles.guard";
import { InsurancePayersService } from "./insurance-payers.service";
import { insurancePayerSearchQuerySchema } from "@medora/shared";
import { MsppRoleCode, RoleCode } from "@prisma/client";

@Controller("insurance-payers")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class InsurancePayersController {
  constructor(private readonly insurancePayersService: InsurancePayersService) {}

  @Get()
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_VACCINATIONS]
  )
  async search(@Query() query: Record<string, string | undefined>, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const parsed = insurancePayerSearchQuerySchema.safeParse({
      q: query.q ?? "",
    });
    if (!parsed.success) {
      throw new BadRequestException("Requête invalide", { cause: parsed.error });
    }
    const rawLimit = query.limit;
    const limit =
      rawLimit !== undefined && rawLimit !== ""
        ? Math.min(50, Math.max(1, parseInt(String(rawLimit), 10) || 25))
        : 25;
    return this.insurancePayersService.search(parsed.data.q, limit);
  }
}
