import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { PharmacyInventoryService } from "./pharmacy-inventory.service";
import {
  createInventoryItemDtoSchema,
  receiveStockDtoSchema,
  adjustStockDtoSchema,
  dispenseMedicationDtoSchema,
  recordOrderDispenseDtoSchema,
  listInventoryFiltersDtoSchema,
} from "./dto";

@Controller("pharmacy")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PharmacyInventoryController {
  constructor(
    private readonly pharmacyInventoryService: PharmacyInventoryService
  ) {}

  private getFacilityId(req: any): string {
    const facilityId =
      req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return facilityId;
  }

  private getUserId(req: any): string {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException("Authentication required");
    }
    return userId;
  }

  @Get("catalog-medications")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async listCatalogMedications() {
    return this.pharmacyInventoryService.listCatalogMedications();
  }

  @Post("inventory")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async createInventoryItem(@Body() body: unknown, @Req() req: any) {
    const facilityId = this.getFacilityId(req);
    const parsed = createInventoryItemDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.pharmacyInventoryService.createInventoryItem(
      facilityId,
      parsed.data,
      this.getUserId(req)
    );
  }

  @Get("inventory")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async listInventory(
    @Query() query: Record<string, string | undefined>,
    @Req() req: any
  ) {
    const facilityId = this.getFacilityId(req);
    const parsed = listInventoryFiltersDtoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException("Invalid query", { cause: parsed.error });
    }
    return this.pharmacyInventoryService.listInventoryItems(
      facilityId,
      parsed.data
    );
  }

  @Get("inventory-low-stock")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async listLowStock(@Req() req: any) {
    const facilityId = this.getFacilityId(req);
    return this.pharmacyInventoryService.listLowStockItems(facilityId);
  }

  @Get("inventory-expiring")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async listExpiring(
    @Query("withinDays") withinDaysStr: string | undefined,
    @Req() req: any
  ) {
    const facilityId = this.getFacilityId(req);
    const withinDays = withinDaysStr
      ? parseInt(withinDaysStr, 10)
      : 90;
    if (isNaN(withinDays) || withinDays < 1 || withinDays > 365) {
      throw new BadRequestException(
        "withinDays must be a number between 1 and 365"
      );
    }
    return this.pharmacyInventoryService.listExpiringItems(
      facilityId,
      withinDays
    );
  }

  @Get("inventory/:id")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async getInventoryItem(@Param("id") id: string, @Req() req: any) {
    const facilityId = this.getFacilityId(req);
    return this.pharmacyInventoryService.getInventoryItemById(facilityId, id);
  }

  @Post("inventory/:id/receive")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async receiveStock(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = this.getFacilityId(req);
    const userId = this.getUserId(req);
    const parsed = receiveStockDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.pharmacyInventoryService.receiveStock(
      facilityId,
      id,
      parsed.data,
      userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("inventory/:id/adjust")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async adjustStock(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = this.getFacilityId(req);
    const userId = this.getUserId(req);
    const parsed = adjustStockDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.pharmacyInventoryService.adjustStock(
      facilityId,
      id,
      parsed.data,
      userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("dispenses")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async dispenseMedication(@Body() body: unknown, @Req() req: any) {
    const facilityId = this.getFacilityId(req);
    const userId = this.getUserId(req);
    const parsed = dispenseMedicationDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.pharmacyInventoryService.dispenseMedication(
      facilityId,
      parsed.data,
      userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("dispenses/record-order")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async recordOrderDispense(@Body() body: unknown, @Req() req: any) {
    const facilityId = this.getFacilityId(req);
    const userId = this.getUserId(req);
    const parsed = recordOrderDispenseDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.pharmacyInventoryService.recordDispenseFromOrderItem(
      facilityId,
      parsed.data,
      userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}
