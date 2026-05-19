import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { importStagingBodySchema } from "./dto/medication-formulary-import.dto";
import { MedicationCatalogBackfillAnalysisService } from "./medication-catalog-backfill-analysis.service";
import { MedicationFormularyImportService } from "./medication-formulary-import.service";
import { MedicationFormularyPromotionService } from "./medication-formulary-promotion.service";
import { promoteStagingRowBodySchema } from "./dto/promote-staging.dto";

@Controller("medication-master")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationMasterController {
  constructor(
    private readonly formularyImport: MedicationFormularyImportService,
    private readonly catalogBackfill: MedicationCatalogBackfillAnalysisService,
    private readonly promotion: MedicationFormularyPromotionService
  ) {}

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
