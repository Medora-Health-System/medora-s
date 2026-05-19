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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { throwInventoryImportError } from "./priority-er-inventory-import.errors";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { importStagingBodySchema } from "./dto/medication-formulary-import.dto";
import { medicationMasterSearchQuerySchema } from "./dto/medication-master-explorer.dto";
import { MedicationCatalogBackfillAnalysisService } from "./medication-catalog-backfill-analysis.service";
import { MedicationFormularyImportService } from "./medication-formulary-import.service";
import { PriorityErInventoryImportService } from "./priority-er-inventory-import.service";
import { PriorityErInventoryPromotionService } from "./priority-er-inventory-promotion.service";
import { promotePriorityErStagingRowBodySchema } from "./dto/priority-er-promote-staging.dto";
import {
  priorityErInventoryImportQuerySchema,
  priorityErInventoryStagingListQuerySchema,
} from "./dto/priority-er-inventory-import.dto";
import { MedicationFormularyPromotionService } from "./medication-formulary-promotion.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import { MedicationMasterGovernanceService } from "./medication-master-governance.service";
import { MedicationProductGovernanceService } from "./medication-product-governance.service";
import { promoteStagingRowBodySchema } from "./dto/promote-staging.dto";
import {
  medicationProductGovernanceActionBodySchema,
  medicationProductGovernanceBlockBodySchema,
} from "./dto/medication-product-governance-action.dto";
import {
  medicationMasterGovernanceDuplicatesQuerySchema,
  medicationMasterGovernanceFacilityQuerySchema,
  medicationMasterGovernanceUnmappedQuerySchema,
  medicationMasterGovernanceWarningsQuerySchema,
} from "./dto/medication-master-governance.dto";

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
    private readonly priorityErInventoryImport: PriorityErInventoryImportService,
    private readonly priorityErPromotion: PriorityErInventoryPromotionService,
    private readonly catalogBackfill: MedicationCatalogBackfillAnalysisService,
    private readonly promotion: MedicationFormularyPromotionService,
    private readonly explorer: MedicationMasterExplorerService,
    private readonly governance: MedicationMasterGovernanceService,
    private readonly productGovernance: MedicationProductGovernanceService
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

  /** Phase 19C.4 — read-only governance summary (no activation/cutover). */
  @Get("governance/summary")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getGovernanceSummary(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: { facilityId?: string } }
  ) {
    const parsed = medicationMasterGovernanceFacilityQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const callerFacilityId = facilityIdFromReq(req);
    const facilityId = parsed.data.facilityId ?? callerFacilityId;
    if (facilityId) {
      this.governance.assertFacilityScope(facilityId, callerFacilityId);
    }
    return this.governance.getSummary(facilityId);
  }

  /** Phase 19C.4 — paginated validation warnings for pharmacy review queues. */
  @Get("governance/warnings")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getGovernanceWarnings(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: { facilityId?: string } }
  ) {
    const parsed = medicationMasterGovernanceWarningsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const callerFacilityId = facilityIdFromReq(req);
    const facilityId = parsed.data.facilityId ?? callerFacilityId;
    if (facilityId) {
      this.governance.assertFacilityScope(facilityId, callerFacilityId);
    }
    return this.governance.getWarnings({ ...parsed.data, facilityId });
  }

  /** Phase 19C.4 — legacy catalog rows with no confident canonical link. */
  @Get("governance/unmapped")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getGovernanceUnmapped(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: { facilityId?: string } }
  ) {
    const parsed = medicationMasterGovernanceUnmappedQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const callerFacilityId = facilityIdFromReq(req);
    const facilityId = parsed.data.facilityId ?? callerFacilityId;
    if (facilityId) {
      this.governance.assertFacilityScope(facilityId, callerFacilityId);
    }
    return this.governance.getUnmapped(parsed.data);
  }

  /** Phase 19C.4 — duplicate candidate groups (NDC, generic name, staging codes). */
  @Get("governance/duplicates")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getGovernanceDuplicates(
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: { facilityId?: string } }
  ) {
    const parsed = medicationMasterGovernanceDuplicatesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const callerFacilityId = facilityIdFromReq(req);
    const facilityId = parsed.data.facilityId ?? callerFacilityId;
    if (facilityId) {
      this.governance.assertFacilityScope(facilityId, callerFacilityId);
    }
    return this.governance.getDuplicates({ ...parsed.data, facilityId });
  }

  /** Phase 19D.1 — governance activation approval (no runtime cutover). */
  @Post("governance/approve/:productId")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async approveProductGovernance(
    @Param("productId") productId: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = medicationProductGovernanceActionBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const callerFacilityId = facilityIdFromReq(req);
    this.productGovernance.assertFacilityScope(parsed.data.facilityId, callerFacilityId);

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.productGovernance.approveActivation(productId, parsed.data, userId, { ip, userAgent: ua });
  }

  /** Phase 19D.1 — block canonical product governance (note required). */
  @Post("governance/block/:productId")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async blockProductGovernance(
    @Param("productId") productId: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = medicationProductGovernanceBlockBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const callerFacilityId = facilityIdFromReq(req);
    this.productGovernance.assertFacilityScope(parsed.data.facilityId, callerFacilityId);

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.productGovernance.blockProduct(productId, parsed.data, userId, { ip, userAgent: ua });
  }

  /** Phase 19D.1 — retire canonical product from governance (note required). */
  @Post("governance/retire/:productId")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async retireProductGovernance(
    @Param("productId") productId: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = medicationProductGovernanceBlockBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    const callerFacilityId = facilityIdFromReq(req);
    this.productGovernance.assertFacilityScope(parsed.data.facilityId, callerFacilityId);

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.productGovernance.retireProduct(productId, parsed.data, userId, { ip, userAgent: ua });
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

  /** Phase 19E.1 — list staging import batches (read-only queue). */
  @Get("import-staging/batches")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async listImportStagingBatches(@Query("limit") limitRaw?: string) {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const batches = await this.priorityErInventoryImport.listBatches(limit);
    return { batches };
  }

  /** Phase 19E.1 — paginated staging rows for pharmacy review. */
  @Get("import-staging/rows")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async listImportStagingRows(@Query() query: Record<string, string | undefined>) {
    const parsed = priorityErInventoryStagingListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.priorityErInventoryImport.listStagingRows(parsed.data);
  }

  /** Aggregate staging batch metrics (no PHI). */
  @Get("import-staging/:batchId/summary")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async importStagingSummary(@Param("batchId") batchId: string) {
    const summary = await this.formularyImport.getBatchSummary(batchId);
    return { summary };
  }

  /**
   * Phase 19E.1 — Priority ER inventory XLSX → staging only (multipart upload).
   * Default dryRun=true. Never writes MedicationConcept/Product/Package.
   */
  @Post("import-priority-er-inventory")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  @UseInterceptors(
    FileInterceptor("workbook", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async importPriorityErInventory(
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          originalname?: string;
          mimetype?: string;
          size?: number;
        }
      | undefined,
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: { userId?: string } }
  ) {
    const parsed = priorityErInventoryImportQuerySchema.safeParse(query);
    if (!parsed.success) {
      throwInventoryImportError({
        code: "INVALID_QUERY",
        message: parsed.error.issues[0]?.message ?? "Requête invalide.",
        details: { issues: parsed.error.issues },
      });
    }

    const buffer = file?.buffer;
    if (!file || !buffer?.length) {
      throwInventoryImportError({
        code: "MISSING_FILE",
        message:
          "Fichier inventaire requis. Utilisez le champ multipart « workbook » (.xlsx, .xls ou .csv).",
        details: {
          fieldName: "workbook",
          receivedField: file ? "workbook (empty buffer)" : "none",
        },
      });
    }

    const name = file.originalname?.trim() || "PHARMACY INVENTORY LIST.xlsx";
    const lowerName = name.toLowerCase();
    const allowedExt = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv");
    if (!allowedExt) {
      throwInventoryImportError({
        code: "INVALID_EXTENSION",
        message: "Extension non acceptée. Formats autorisés : .xlsx, .xls, .csv",
        details: { workbookFilename: name },
      });
    }

    const mime = (file.mimetype ?? "").toLowerCase();
    const allowedMime =
      !mime ||
      mime.includes("spreadsheet") ||
      mime.includes("excel") ||
      mime.includes("csv") ||
      mime === "application/octet-stream";
    if (!allowedMime) {
      throwInventoryImportError({
        code: "INVALID_MIMETYPE",
        message: "Type MIME du fichier non reconnu pour un inventaire pharmacie.",
        details: { mimetype: file.mimetype, workbookFilename: name },
      });
    }

    const userId = req.user?.userId ?? null;
    if (!parsed.data.dryRun && !userId) {
      throw new UnauthorizedException();
    }

    return this.priorityErInventoryImport.importFromXlsxBuffer(
      buffer,
      name,
      parsed.data,
      parsed.data.dryRun ? null : userId
    );
  }

  /** Read-only legacy catalog → proposed master mapping analysis (no writes). */
  @Get("catalog-backfill-analysis")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async catalogBackfillAnalysis() {
    return this.catalogBackfill.analyzeCatalogBackfill();
  }

  /**
   * Phase 19E.2 — Priority ER inventory staging row → canonical master (manual, inactive).
   * Preserves exact source medication/dose/form; no runtime ordering/MAR/billing cutover.
   */
  @Post("import-staging/promote-priority-er/:id")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async promotePriorityErStagingRow(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = promotePriorityErStagingRowBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.priorityErPromotion.promoteStagingRow(id, parsed.data, userId, req.user?.facilityId, {
      ip,
      userAgent: ua,
    });
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
