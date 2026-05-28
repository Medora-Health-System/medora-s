import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { billingClassificationSchema } from "@medora/shared";
import { AdminBillingGovernanceService } from "./admin-billing-governance.service";

function facilityIdFromReq(req: {
  user?: { facilityId?: string };
  headers: Record<string, string | string[] | undefined>;
}): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Facility ID required");
  return fid;
}

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return defaultValue;
}

/** Phase 19UCED.9 — read-only billing governance analytics (aggregate only, no PHI). */
@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminBillingGovernanceController {
  constructor(private readonly billingGovernance: AdminBillingGovernanceService) {}

  @Get("billing-governance/summary")
  @RequireRoles(RoleCode.ADMIN, RoleCode.BILLING, RoleCode.MEDORA_SUPER_ADMIN)
  async summary(
    @Req() req: any,
    @Query("dateFrom") dateFromRaw?: string,
    @Query("dateTo") dateToRaw?: string,
    @Query("classification") classificationRaw?: string,
    @Query("includeClosed") includeClosedRaw?: string,
    @Query("includeOpen") includeOpenRaw?: string,
  ) {
    const facilityId = facilityIdFromReq(req);
    const classificationParsed = classificationRaw?.trim()
      ? billingClassificationSchema.safeParse(classificationRaw.trim())
      : null;
    if (classificationParsed && !classificationParsed.success) {
      throw new BadRequestException("Invalid classification filter");
    }

    return this.billingGovernance.getSummary(
      {
        facilityId,
        dateFrom: dateFromRaw?.trim() ? new Date(dateFromRaw.trim()) : undefined,
        dateTo: dateToRaw?.trim() ? new Date(dateToRaw.trim()) : undefined,
        classification: classificationParsed?.success ? classificationParsed.data : undefined,
        includeClosed: parseBool(includeClosedRaw, true),
        includeOpen: parseBool(includeOpenRaw, true),
      },
      {
        userId: req.user?.userId,
        ip: req.ip,
        userAgent: req.headers?.["user-agent"],
      },
    );
  }
}
