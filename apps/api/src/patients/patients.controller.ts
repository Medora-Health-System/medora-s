import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import {
  RolesGuard,
  RequireClinicalOrMspp,
  RequireRoles,
  AllowBreakGlassForPatientParam,
} from "../common/guards/roles.guard";
import { PatientsService } from "./patients.service";
import { PatientInsuranceService } from "./patient-insurance.service";
import { PatientDocumentsService } from "./patient-documents.service";
import { PatientClinicalHistoryService } from "./patient-clinical-history.service";
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
  patientInsuranceCoverageUpsertDtoSchema,
} from "@medora/shared";
import { listPatientEncountersQuerySchema } from "../encounters/dto";
import { MsppRoleCode, RoleCode } from "@prisma/client";
import { assertZodBody } from "../common/http/zod-parse";

@Controller("patients")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly patientInsuranceService: PatientInsuranceService,
    private readonly chartSummaryService: ChartSummaryService,
    private readonly patientClinicalHistoryService: PatientClinicalHistoryService,
    private readonly patientVitalsService: PatientVitalsService,
    private readonly encountersService: EncountersService,
    private readonly publicHealthService: PublicHealthService,
    private readonly diagnosesService: DiagnosesService,
    private readonly patientDocumentsService: PatientDocumentsService,
  ) {}

  @Get("search")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.PHARMACY],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_VACCINATIONS]
  )
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
  @AllowBreakGlassForPatientParam("id")
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
      req.headers["user-agent"],
      req.breakGlassSessionId
    );
  }

  @Get(":id/vaccinations")
  @AllowBreakGlassForPatientParam("id")
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
      req.headers["user-agent"],
      req.breakGlassSessionId
    );
  }

  @Get(":id/clinical-history-profile")
  @AllowBreakGlassForPatientParam("id")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getClinicalHistoryProfile(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.patientClinicalHistoryService.getProfile(id, facilityId);
  }

  @Get(":id/chart-summary")
  @AllowBreakGlassForPatientParam("id")
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
      req.headers["user-agent"],
      req.breakGlassSessionId
    );
  }

  /** Latest vitals + history (history excludes latest). Query latest=true required. */
  @Get(":id/triage")
  @AllowBreakGlassForPatientParam("id")
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
    return this.patientVitalsService.getTriageVitalsTimeline(
      id,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      req.breakGlassSessionId
    );
  }

  @Get(":id/insurance")
  @AllowBreakGlassForPatientParam("id")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async listInsurance(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.patientInsuranceService.listCoverage(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      req.breakGlassSessionId
    );
  }

  @Put(":id/insurance/primary")
  @AllowBreakGlassForPatientParam("id")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async upsertPrimaryInsurance(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const dto = assertZodBody(patientInsuranceCoverageUpsertDtoSchema.safeParse(body));
    return this.patientInsuranceService.upsertPrimaryCoverage(
      facilityId,
      id,
      dto,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      req.breakGlassSessionId
    );
  }

  @Put(":id/insurance/secondary")
  @AllowBreakGlassForPatientParam("id")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async upsertSecondaryInsurance(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const dto = assertZodBody(patientInsuranceCoverageUpsertDtoSchema.safeParse(body));
    return this.patientInsuranceService.upsertSecondaryCoverage(
      facilityId,
      id,
      dto,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      req.breakGlassSessionId
    );
  }

  @Get(":id/facesheet")
  @AllowBreakGlassForPatientParam("id")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async getFacesheet(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.patientInsuranceService.getFacesheet(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
      req.breakGlassSessionId
    );
  }

  @Get(":id")
  @AllowBreakGlassForPatientParam("id")
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
      req.headers["user-agent"],
      req.breakGlassSessionId
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
  @AllowBreakGlassForPatientParam("id")
  @RequireClinicalOrMspp(
    [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK],
    [MsppRoleCode.MSPP_ADMIN, MsppRoleCode.MSPP_VACCINATIONS]
  )
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
      Object.keys(encQuery).length ? encQuery : undefined,
      req.breakGlassSessionId
    );
  }

  /* ── Patient Documents (My Media) ─────────────────────────── */

  @Get(":id/documents")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async listDocuments(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Établissement requis");
    return this.patientDocumentsService.list(id, facilityId);
  }

  @Post(":id/documents")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadDocument(
    @Param("id") id: string,
    @Body() body: { documentType?: string; notes?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Établissement requis");
    if (!file) throw new BadRequestException("File is required");
    if (!body.documentType) throw new BadRequestException("documentType is required");
    return this.patientDocumentsService.upload(
      id,
      facilityId,
      req.user?.userId,
      body.documentType,
      file,
      body.notes,
    );
  }

  @Get("documents/:docId/download")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async downloadDocument(
    @Param("docId") docId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Établissement requis");
    const { storagePath, fileName, mimeType } =
      await this.patientDocumentsService.getFilePath(docId, facilityId);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    if (mimeType) res.setHeader("Content-Type", mimeType);
    res.sendFile(storagePath);
  }

  @Delete(":id/documents/:docId")
  @RequireRoles(RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async deleteDocument(
    @Param("docId") docId: string,
    @Req() req: any,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("Établissement requis");
    return this.patientDocumentsService.remove(docId, facilityId);
  }
}

