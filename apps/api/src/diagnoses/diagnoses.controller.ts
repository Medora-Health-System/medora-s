import {
  Controller,
  Patch,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { DiagnosesService } from "./diagnoses.service";
import { Icd10CatalogService } from "./icd10-catalog.service";
import { requireIcd10SearchLocale } from "./icd10-search-locale";
import { removeDiagnosisDtoSchema, updateDiagnosisDtoSchema } from "./dto";

@Controller("diagnoses")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class DiagnosesController {
  constructor(
    private readonly diagnosesService: DiagnosesService,
    private readonly icd10Catalog: Icd10CatalogService
  ) {}

  private facilityId(req: any): string {
    const id = req.user?.facilityId || req.headers["x-facility-id"];
    if (!id) throw new BadRequestException("Facility ID required");
    return id;
  }

  /** ICD-10-CM catalog search (prefix / contains on code and descriptions). */
  @Get("icd10/search")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async searchIcd10(
    @Query("q") q: string,
    @Query("locale") localeRaw: string | undefined,
    @Query("limit") limitRaw: string | undefined,
    @Query("dateOfService") dateOfServiceRaw: string | undefined,
    @Query("releaseVersion") releaseVersionRaw: string | undefined,
  ) {
    const locale = requireIcd10SearchLocale(localeRaw);
    const limit = limitRaw != null && limitRaw !== "" ? Number(limitRaw) : undefined;
    if (limit != null && (!Number.isFinite(limit) || limit < 1)) {
      throw new BadRequestException("Invalid limit");
    }
    return this.icd10Catalog.search(q ?? "", locale, limit, {
      dateOfService: dateOfServiceRaw,
      releaseVersion: releaseVersionRaw,
    });
  }

  /** Resolve one active catalog row by code (with or without dots). */
  @Get("icd10/by-code")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async lookupIcd10ByCode(
    @Query("code") code: string,
    @Query("dateOfService") dateOfServiceRaw: string | undefined,
    @Query("releaseVersion") releaseVersionRaw: string | undefined,
  ) {
    const c = code?.trim();
    if (!c) {
      throw new BadRequestException("Query parameter code is required");
    }
    const row = await this.icd10Catalog.findByCode(c, {
      dateOfService: dateOfServiceRaw,
      releaseVersion: releaseVersionRaw,
    });
    if (!row) {
      throw new NotFoundException("ICD-10 code not found in catalog");
    }
    return row;
  }

  @Patch(":id")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const parsed = updateDiagnosisDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.diagnosesService.update(
      id,
      this.facilityId(req),
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post(":id/resolve")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async resolve(@Param("id") id: string, @Req() req: any) {
    return this.diagnosesService.resolve(
      id,
      this.facilityId(req),
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  /** Soft-remove (void) an active encounter diagnosis; requires reason. */
  @Post(":id/remove")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async remove(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const parsed = removeDiagnosisDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.diagnosesService.remove(
      id,
      this.facilityId(req),
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}
