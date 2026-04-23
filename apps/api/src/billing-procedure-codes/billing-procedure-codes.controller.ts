import { Controller, Get, Query, Req, UseGuards, BadRequestException, NotFoundException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode, BillingProcedureCodeSystem } from "@prisma/client";
import { ProcedureCatalogService } from "./procedure-catalog.service";

@Controller("billing/procedure-codes")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class BillingProcedureCodesController {
  constructor(private readonly procedureCatalog: ProcedureCatalogService) {}

  private facilityId(req: any): string {
    const id = req.user?.facilityId || req.headers["x-facility-id"];
    if (!id) throw new BadRequestException("Facility ID required");
    return id;
  }

  @Get("search")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async search(
    @Query("q") q: string,
    @Query("limit") limitRaw: string | undefined,
    @Query("system") systemRaw: string | undefined,
    @Req() req: any
  ) {
    void this.facilityId(req);
    const limit = limitRaw != null && limitRaw !== "" ? Number(limitRaw) : undefined;
    if (limit != null && (!Number.isFinite(limit) || limit < 1)) {
      throw new BadRequestException("Invalid limit");
    }
    let system: BillingProcedureCodeSystem | undefined;
    const s = systemRaw?.trim().toUpperCase();
    if (s === "CPT") system = BillingProcedureCodeSystem.CPT;
    else if (s === "HCPCS") system = BillingProcedureCodeSystem.HCPCS;
    else if (s) throw new BadRequestException("system must be CPT or HCPCS when set");
    return this.procedureCatalog.search(q ?? "", limit, system);
  }

  @Get("by-code")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.BILLING)
  async byCode(@Query("code") code: string, @Query("system") systemRaw: string | undefined, @Req() req: any) {
    void this.facilityId(req);
    const c = code?.trim();
    if (!c) throw new BadRequestException("Query parameter code is required");
    const s = systemRaw?.trim().toUpperCase();
    if (s !== "CPT" && s !== "HCPCS") {
      throw new BadRequestException("Query parameter system is required (CPT or HCPCS)");
    }
    const system = s === "CPT" ? BillingProcedureCodeSystem.CPT : BillingProcedureCodeSystem.HCPCS;
    const row = await this.procedureCatalog.findByCode(c, system);
    if (!row) throw new NotFoundException("Procedure code not found in catalog");
    return row;
  }
}
