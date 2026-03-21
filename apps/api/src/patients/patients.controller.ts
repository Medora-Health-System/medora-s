import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { PatientsService } from "./patients.service";
import { ChartSummaryService } from "./chart-summary.service";
import { PatientVitalsService } from "./patient-vitals.service";
import { EncountersService } from "../encounters/encounters.service";
import { PublicHealthService } from "../public-health/public-health.service";
import { DiagnosesService } from "../diagnoses/diagnoses.service";
import { listPatientVaccinationsQuerySchema } from "../public-health/dto";
import { listDiagnosesQuerySchema } from "../diagnoses/dto";
import {
  patientCreateDtoSchema,
  patientUpdateDtoSchema,
} from "@medora/shared";
import { listPatientEncountersQuerySchema } from "../encounters/dto";
import { RoleCode } from "@prisma/client";
import { assertZodBody } from "../common/http/zod-parse";

@Controller("patients")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly chartSummaryService: ChartSummaryService,
    private readonly patientVitalsService: PatientVitalsService,
    private readonly encountersService: EncountersService,
    private readonly publicHealthService: PublicHealthService,
    private readonly diagnosesService: DiagnosesService,
  ) {}

  @Get("search")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.PHARMACY)
  async search(
    @Query() query: { q?: string; mrn?: string; phone?: string; dob?: string; limit?: string },
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    return this.patientsService.search(
      facilityId,
      {
        q: query.q,
        mrn: query.mrn,
        phone: query.phone,
        dob: query.dob,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      },
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post()
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async create(@Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const dto = assertZodBody(patientCreateDtoSchema.safeParse(body));

    return this.patientsService.create(
      facilityId,
      dto,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get(":id/diagnoses")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async listPatientDiagnoses(
    @Param("id") id: string,
    @Query() query: Record<string, string | undefined>,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const parsed = listDiagnosesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query", { cause: parsed.error });
    }
    return this.diagnosesService.findByPatient(
      id,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get(":id/vaccinations")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async listPatientVaccinations(
    @Param("id") id: string,
    @Query() query: Record<string, string | undefined>,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const parsed = listPatientVaccinationsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query", { cause: parsed.error });
    }
    return this.publicHealthService.listPatientVaccines(
      id,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get(":id/chart-summary")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getChartSummary(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.chartSummaryService.getChartSummary(
      id,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** Latest vitals + history (history excludes latest). Query latest=true required. */
  @Get(":id/triage")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getPatientTriage(
    @Param("id") id: string,
    @Query("latest") latest: string | undefined,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    if (latest !== "true") {
      throw new BadRequestException("Utilisez le paramètre latest=true");
    }
    return this.patientVitalsService.getTriageVitalsTimeline(id, facilityId);
  }

  @Get(":id")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async findOne(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    return this.patientsService.findOne(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch(":id")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }

    const patchDto = assertZodBody(patientUpdateDtoSchema.safeParse(body));

    return this.patientsService.update(
      facilityId,
      id,
      patchDto,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get(":id/encounters")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async getEncounters(
    @Param("id") id: string,
    @Query() query: Record<string, string>,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const encQuery = assertZodBody(listPatientEncountersQuerySchema.safeParse(query));

    return this.encountersService.findByPatient(
      id,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      Object.keys(encQuery).length ? encQuery : undefined
    );
  }
}

