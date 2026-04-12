import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { MsppRoleCode } from "@prisma/client";
import { PublicHealthService } from "../public-health/public-health.service";
import {
  diseaseSummaryQuerySchema,
  listDiseaseCaseReportsQuerySchema,
} from "../public-health/dto";
import { RequireMsppRoles } from "./decorators/require-mspp-roles.decorator";
import { MsppRolesGuard } from "./guards/mspp-roles.guard";

/**
 * Lectures MSPP nationales sans `x-facility-id` — agrégats / listes multi-établissements.
 * Les écritures restent sur `PublicHealthController` (périmètre établissement).
 */
@Controller("mspp/public-health")
@UseGuards(AuthGuard("jwt"), MsppRolesGuard)
export class MsppPublicHealthNationalController {
  constructor(private readonly publicHealth: PublicHealthService) {}

  private userId(req: { user?: { userId?: string } }): string {
    const id = req.user?.userId;
    if (!id) throw new BadRequestException("Authentication required");
    return id;
  }

  @Get("disease-summary")
  @RequireMsppRoles(MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_PUBLIC_HEALTH)
  async diseaseSummary(
    @Query() query: Record<string, string | undefined>,
    @Req() req: { user?: { userId?: string }; ip?: string; headers?: Record<string, unknown> }
  ) {
    const parsed = diseaseSummaryQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query", { cause: parsed.error });
    }
    return this.publicHealth.getDiseaseSummaryNational(
      parsed.data,
      this.userId(req),
      req.ip,
      req.headers?.["user-agent"] as string | undefined
    );
  }

  @Get("disease-reports")
  @RequireMsppRoles(MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_DISEASE_REPORTS)
  async listDiseaseReports(
    @Query() query: Record<string, string | undefined>,
    @Req() req: { user?: { userId?: string }; ip?: string; headers?: Record<string, unknown> }
  ) {
    const parsed = listDiseaseCaseReportsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query", { cause: parsed.error });
    }
    return this.publicHealth.listDiseaseCaseReportsNational(
      parsed.data,
      this.userId(req),
      req.ip,
      req.headers?.["user-agent"] as string | undefined
    );
  }

  @Get("haiti-geo")
  @RequireMsppRoles(MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_DISEASE_REPORTS)
  async haitiGeo() {
    return this.publicHealth.listHaitiGeoReference("__national__");
  }

  @Get("vaccines/catalog")
  @RequireMsppRoles(MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_VACCINATIONS)
  async listVaccineCatalog(@Query("includeInactive") inc?: string) {
    const activeOnly = inc !== "true" && inc !== "1";
    return this.publicHealth.listVaccineCatalog(activeOnly);
  }
}
