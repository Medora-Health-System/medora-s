import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Param,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireClinicalOrMspp } from "../common/guards/roles.guard";
import { MsppRoleCode, RoleCode } from "@prisma/client";
import { PublicHealthService } from "./public-health.service";
import {
  createVaccineCatalogDtoSchema,
  recordVaccineAdministrationDtoSchema,
  createDiseaseCaseReportDtoSchema,
  listDiseaseCaseReportsQuerySchema,
  diseaseSummaryQuerySchema,
  listPatientVaccinationsQuerySchema,
  parseFacilityMsppFeedbackStatus,
} from "./dto";

@Controller("public-health")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PublicHealthController {
  constructor(private readonly publicHealth: PublicHealthService) {}

  private facilityId(req: any): string {
    const id = req.user?.facilityId || req.headers["x-facility-id"];
    if (!id) throw new BadRequestException("Facility ID required");
    return id;
  }

  private userId(req: any): string {
    const id = req.user?.userId;
    if (!id) throw new BadRequestException("Authentication required");
    return id;
  }

  @Post("vaccines/catalog")
  @RequireClinicalOrMspp([RoleCode.ADMIN], [MsppRoleCode.MSPP_ADMIN])
  async createVaccineCatalog(@Body() body: unknown, @Req() req: any) {
    const parsed = createVaccineCatalogDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.publicHealth.createVaccineCatalogItem(
      parsed.data,
      this.userId(req),
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("vaccines/catalog")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_VACCINATIONS]
  )
  async listVaccineCatalog(@Query("includeInactive") inc?: string) {
    const activeOnly = inc !== "true" && inc !== "1";
    return this.publicHealth.listVaccineCatalog(activeOnly);
  }

  @Post("vaccinations")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_VACCINATIONS]
  )
  async recordVaccination(@Body() body: unknown, @Req() req: any) {
    const parsed = recordVaccineAdministrationDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.publicHealth.recordVaccineAdministration(
      this.facilityId(req),
      parsed.data,
      this.userId(req),
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("vaccinations/due-soon")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_VACCINATIONS]
  )
  async vaccinesDueSoon(@Req() req: any) {
    return this.publicHealth.listVaccinesDueSoon(
      this.facilityId(req),
      this.userId(req),
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("disease-reports")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_DISEASE_REPORTS]
  )
  async createDiseaseReport(@Body() body: unknown, @Req() req: any) {
    const parsed = createDiseaseCaseReportDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.publicHealth.createDiseaseCaseReport(
      this.facilityId(req),
      parsed.data,
      this.userId(req),
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("haiti-geo")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_DISEASE_REPORTS]
  )
  async haitiGeo(@Req() req: any) {
    return this.publicHealth.listHaitiGeoReference(this.facilityId(req));
  }

  /**
   * Catalogue de maladies à déclaration (MSPP / surveillance) — lecture seule.
   * Réponse : `{ generatedAt, source, items[] }` ; chaque item inclut `reportingCategory`,
   * `surveillancePriority`, et si présents sur la ligne catalogue `sanitarySignalProfile`, `reviewGuidanceProfile`.
   */
  @Get("disease-catalog")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_DISEASE_REPORTS]
  )
  diseaseCatalog() {
    return this.publicHealth.listDiseaseNotifiableCatalog();
  }

  @Get("disease-reports")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_DISEASE_REPORTS]
  )
  async listDiseaseReports(
    @Query() query: Record<string, string | undefined>,
    @Req() req: any
  ) {
    const parsed = listDiseaseCaseReportsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query", { cause: parsed.error });
    }
    const revealPatientIdentity = await this.publicHealth.userMayViewPatientIdentityOnFacilityDiseaseReportList(
      this.userId(req)
    );
    return this.publicHealth.listDiseaseCaseReports(
      this.facilityId(req),
      parsed.data,
      this.userId(req),
      req.ip,
      req.headers["user-agent"],
      { revealPatientIdentity }
    );
  }

  @Get("disease-summary")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_PUBLIC_HEALTH]
  )
  async diseaseSummary(
    @Query() query: Record<string, string | undefined>,
    @Req() req: any
  ) {
    const parsed = diseaseSummaryQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query", { cause: parsed.error });
    }
    return this.publicHealth.getDiseaseSummary(
      this.facilityId(req),
      parsed.data,
      this.userId(req),
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** Retours qualité MSPP sur une déclaration (lecture établissement). */
  @Get("disease-reports/:reportId/mspp-feedback")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_DISEASE_REPORTS]
  )
  listMsppFeedbackForFacility(@Param("reportId") reportId: string, @Req() req: any) {
    return this.publicHealth.listMsppDiseaseReportFeedbackForReport(reportId, {
      facilityId: this.facilityId(req),
    });
  }

  /** Marquer un retour comme vu ou résolu (établissement). */
  @Post("disease-reports/:reportId/mspp-feedback/:feedbackId/facility-status")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_DISEASE_REPORTS]
  )
  setMsppFeedbackFacilityStatus(
    @Param("reportId") reportId: string,
    @Param("feedbackId") feedbackId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const parsed = parseFacilityMsppFeedbackStatus(body);
    return this.publicHealth.setMsppDiseaseReportFeedbackFacilityStatus(
      this.facilityId(req),
      reportId,
      feedbackId,
      this.userId(req),
      parsed.status
    );
  }
}
