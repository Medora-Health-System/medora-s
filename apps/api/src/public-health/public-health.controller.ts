import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { PublicHealthService } from "./public-health.service";
import {
  createVaccineCatalogDtoSchema,
  recordVaccineAdministrationDtoSchema,
  createDiseaseCaseReportDtoSchema,
  listDiseaseCaseReportsQuerySchema,
  diseaseSummaryQuerySchema,
  listPatientVaccinationsQuerySchema,
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
  @RequireRoles(RoleCode.ADMIN)
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
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async listVaccineCatalog(@Query("includeInactive") inc?: string) {
    const activeOnly = inc !== "true" && inc !== "1";
    return this.publicHealth.listVaccineCatalog(activeOnly);
  }

  @Post("vaccinations")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
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
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async vaccinesDueSoon(@Req() req: any) {
    return this.publicHealth.listVaccinesDueSoon(
      this.facilityId(req),
      this.userId(req),
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("disease-reports")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
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

  @Get("disease-reports")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async listDiseaseReports(
    @Query() query: Record<string, string | undefined>,
    @Req() req: any
  ) {
    const parsed = listDiseaseCaseReportsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query", { cause: parsed.error });
    }
    return this.publicHealth.listDiseaseCaseReports(
      this.facilityId(req),
      parsed.data,
      this.userId(req),
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("disease-summary")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
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
}
