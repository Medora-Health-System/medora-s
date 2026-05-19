import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { importStagingBodySchema } from "./dto/medication-formulary-import.dto";
import { medicationMasterSearchQuerySchema } from "./dto/medication-master-explorer.dto";
import { MedicationCatalogBackfillAnalysisService } from "./medication-catalog-backfill-analysis.service";
import { MedicationFormularyImportService } from "./medication-formulary-import.service";
import { MedicationFormularyPromotionService } from "./medication-formulary-promotion.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import { promoteStagingRowBodySchema } from "./dto/promote-staging.dto";

function facilityIdFromReq(req: {
  user?: { facilityId?: string };
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  return typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : undefined;
}

@Controller("medication-master")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationMasterController {
  constructor(
    private readonly formularyImport: MedicationFormularyImportService,
    private readonly catalogBackfill: MedicationCatalogBackfillAnalysisService,
    private readonly promotion: MedicationFormularyPromotionService,
    private readonly explorer: MedicationMasterExplorerService
  ) {}

  /** Phase 19C.1 — read-only canonical medication search (no runtime cutover). */
  @Get("search")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async searchMedicationMaster(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: { facilityId?: string } }
  ) {
    const parsed = medicationMasterSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const callerFacilityId = facilityIdFromReq(req);
    const facilityId = parsed.data.facilityId ?? callerFacilityId;
    if (facilityId) {
      this.explorer.assertFacilityScope(facilityId, callerFacilityId);
    }
    return this.explorer.search({ ...parsed.data, facilityId });
  }

  /** Phase 19C.1 — read-only concept detail with products/packages/profiles. */
  @Get("concepts/:id")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getMedicationConcept(
    @Param("id") id: string,
    @Query("facilityId") facilityIdQuery: string | undefined,
    @Req() req: Request & { user?: { facilityId?: string } }
  ) {
    const callerFacilityId = facilityIdFromReq(req);
    const facilityId = facilityIdQuery ?? callerFacilityId;
    if (facilityId) {
      this.explorer.assertFacilityScope(facilityId, callerFacilityId);
    }
    return this.explorer.getConceptDetail(id, facilityId);
  }

  /** Phase 19C.1 — read-only facility formulary explorer (canonical master only). */
  @Get("formulary/facility/:facilityId")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getFacilityFormulary(
    @Param("facilityId") facilityId: string,
    @Req() req: Request & { user?: { facilityId?: string } }
  ) {
    const callerFacilityId = facilityIdFromReq(req);
    this.explorer.assertFacilityScope(facilityId, callerFacilityId);
    return this.explorer.getFacilityFormulary(facilityId);
  }

  /**
   * Import Priority ER workbook rows into staging only (never activates formulary).
   * `dryRun=true` validates without writing.
   */
  @Post("import-staging")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async importStaging(
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string } }
  ) {
    const parsed = importStagingBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }

    const userId = req.user?.userId ?? null;
    if (!parsed.data.dryRun && !userId) {
      throw new UnauthorizedException();
    }

    return this.formularyImport.importStaging(parsed.data, parsed.data.dryRun ? null : userId);
  }

  /** Aggregate staging batch metrics (no PHI). */
  @Get("import-staging/:batchId/summary")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async importStagingSummary(@Param("batchId") batchId: string) {
    const summary = await this.formularyImport.getBatchSummary(batchId);
    return { summary };
  }

  /** Read-only legacy catalog → proposed master mapping analysis (no writes). */
  @Get("catalog-backfill-analysis")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async catalogBackfillAnalysis() {
    return this.catalogBackfill.analyzeCatalogBackfill();
  }

  /** Manual promotion: staging row → canonical master (no runtime cutover). */
  @Post("promote-staging-row/:id")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async promoteStagingRow(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = promoteStagingRowBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.promotion.promoteStagingRow(id, parsed.data, userId, req.user?.facilityId, {
      ip,
      userAgent: ua,
    });
  }

  /** Batch promotion: row-by-row validation; partial success reporting. */
  @Post("promote-staging-batch/:batchId")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async promoteStagingBatch(
    @Param("batchId") batchId: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = promoteStagingRowBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.promotion.promoteStagingBatch(batchId, parsed.data, userId, req.user?.facilityId, {
      ip,
      userAgent: ua,
    });
  }
}
