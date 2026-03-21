import { Controller, Get, Query, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { MedicationCatalogService } from "./medication-catalog.service";
import { searchMedicationsQuerySchema } from "./dto/search-medications.dto";

@Controller("pharmacy/medications")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationCatalogController {
  constructor(private readonly catalog: MedicationCatalogService) {}

  @Get("search")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async search(@Query() query: Record<string, string>, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("x-facility-id required");
    }
    const parsed = searchMedicationsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors?.[0]?.message ?? "Invalid query", { cause: parsed.error });
    }
    return this.catalog.search(facilityId, {
      q: parsed.data.q,
      limit: parsed.data.limit,
      favoritesFirst: parsed.data.favoritesFirst,
    });
  }

  @Get("favorites")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async favorites(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("x-facility-id required");
    }
    const items = await this.catalog.getFavorites(facilityId);
    return { items };
  }

  @Get("recent")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async recent(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("x-facility-id required");
    }
    const items = await this.catalog.getRecent(facilityId);
    return { items };
  }
}
