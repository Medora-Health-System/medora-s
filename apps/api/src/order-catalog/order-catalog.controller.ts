import {
  Controller,
  Get,
  Query,
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
import { catalogSearchQuerySchema } from "./dto/catalog-search-item.dto";

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

@Controller("catalog")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OrderCatalogController {
  constructor(
    private readonly labCatalog: LabCatalogService,
    private readonly imagingCatalog: ImagingCatalogService,
    private readonly medicationCatalog: MedicationCatalogService
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
}
