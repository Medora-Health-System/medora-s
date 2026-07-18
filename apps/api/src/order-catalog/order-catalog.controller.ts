import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { LabCatalogService } from "./lab-catalog.service";
import { ImagingCatalogService } from "./imaging-catalog.service";
import { MedicationCatalogService } from "../medication-catalog/medication-catalog.service";
import { ProcedureCatalogService } from "./procedure-catalog.service";
import { OrderSetCatalogResolveService } from "./order-set-catalog-resolve.service";
import { catalogSearchQuerySchema, procedureCatalogSearchQuerySchema } from "./dto/catalog-search-item.dto";
import { orderSetCatalogResolveRequestSchema } from "./dto/order-set-catalog-resolve.dto";
import { CANONICAL_CARE_PROCEDURE_CATEGORIES } from "@medora/shared";

/** Prescription / ordres cliniques + travail laboratoire / imagerie */
const ORDER_CATALOG_ROLES = [
  RoleCode.RN,
  RoleCode.PROVIDER,
  RoleCode.ADMIN,
  RoleCode.LAB,
  RoleCode.RADIOLOGY,
] as const;

/** Recherche médicaments : même périmètre qu’historique `/pharmacy/medications/search`. */
const CATALOG_MEDICATION_SEARCH_ROLES = [
  RoleCode.PHARMACY,
  RoleCode.ADMIN,
  RoleCode.PROVIDER,
  RoleCode.RN,
] as const;

function roleCodesFromRequest(req: any): string[] {
  const candidates = [
    req.user?.roles,
    req.user?.roleCodes,
    req.user?.role,
  ].flat();
  return candidates
    .filter((role): role is string => typeof role === "string")
    .map((role) => role.trim().toUpperCase())
    .filter(Boolean);
}

@Controller("catalog")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OrderCatalogController {
  constructor(
    private readonly labCatalog: LabCatalogService,
    private readonly imagingCatalog: ImagingCatalogService,
    private readonly medicationCatalog: MedicationCatalogService,
    private readonly procedureCatalog: ProcedureCatalogService,
    private readonly orderSetCatalogResolve: OrderSetCatalogResolveService
  ) {}

  private facilityId(req: any): string {
    const id = req.user?.facilityId || req.headers["x-facility-id"];
    if (!id) throw new BadRequestException("Établissement requis");
    return id;
  }

  @Get("medications/search")
  @RequireRoles(...CATALOG_MEDICATION_SEARCH_ROLES)
  async searchMedications(@Query() query: Record<string, string>, @Req() req: any) {
    const facilityId = this.facilityId(req);
    const parsed = catalogSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide", {
        cause: parsed.error,
      });
    }
    return this.medicationCatalog.search(facilityId, {
      q: parsed.data.q,
      limit: parsed.data.limit,
      favoritesFirst: parsed.data.favoritesFirst ?? false,
      specialtyPack: parsed.data.specialtyPack,
      purpose: parsed.data.purpose ?? "order",
      pilotScope: {
        facilityId,
        userId: req.user?.userId,
        providerGroupId: req.user?.providerGroupId || req.headers["x-provider-group-id"],
        roleCodes: roleCodesFromRequest(req),
      },
    });
  }

  @Get("lab-tests/search")
  @RequireRoles(...ORDER_CATALOG_ROLES)
  async searchLab(@Query() query: Record<string, string>, @Req() req: any) {
    this.facilityId(req);
    const parsed = catalogSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide", {
        cause: parsed.error,
      });
    }
    return this.labCatalog.search({ q: parsed.data.q, limit: parsed.data.limit });
  }

  @Get("imaging-studies/search")
  @RequireRoles(...ORDER_CATALOG_ROLES)
  async searchImaging(@Query() query: Record<string, string>, @Req() req: any) {
    this.facilityId(req);
    const parsed = catalogSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide", {
        cause: parsed.error,
      });
    }
    return this.imagingCatalog.search({ q: parsed.data.q, limit: parsed.data.limit });
  }

  @Get("procedures/search")
  @RequireRoles(...ORDER_CATALOG_ROLES)
  async searchProcedures(@Query() query: Record<string, string>, @Req() req: any) {
    this.facilityId(req);
    const parsed = procedureCatalogSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide", {
        cause: parsed.error,
      });
    }
    const category = parsed.data.category?.trim();
    const validCategory = CANONICAL_CARE_PROCEDURE_CATEGORIES.includes(category as any)
      ? (category as (typeof CANONICAL_CARE_PROCEDURE_CATEGORIES)[number])
      : undefined;
    if (parsed.data.q.trim().length > 0 && parsed.data.q.trim().length < 2) {
      return { items: [] };
    }
    return this.procedureCatalog.search({
      q: parsed.data.q,
      limit: parsed.data.limit,
      ...(validCategory ? { category: validCategory } : {}),
    });
  }

  /** Enterprise order set apply — batch exact catalog reference resolution (LAB/IMAGING only). */
  @Post("order-set/resolve")
  @RequireRoles(...ORDER_CATALOG_ROLES)
  async resolveOrderSetCatalogReferences(@Body() body: unknown, @Req() req: any) {
    this.facilityId(req);
    const parsed = orderSetCatalogResolveRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide", {
        cause: parsed.error,
      });
    }
    return this.orderSetCatalogResolve.resolveBatch(parsed.data);
  }
}
