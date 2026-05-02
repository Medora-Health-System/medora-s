import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { edReportsQuerySchema } from "./dto/ed-reports-query.dto";
import { ReportsService } from "./reports.service";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

function flattenQuery(q: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null) continue;
    const s = Array.isArray(v) ? String(v[0] ?? "") : String(v);
    if (s.trim() === "") continue;
    out[k] = s;
  }
  return out;
}

/**
 * ED reports — JSON only for now (`format=json` or default). CSV streaming reintroduced in a follow-up (S19B+).
 */
@Controller("reports/ed")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("door-to-ekg")
  @RequireRoles(RoleCode.ADMIN)
  async doorToEkg(
    @Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> },
    @Query() query: Record<string, string | string[] | undefined>
  ) {
    const parsed = edReportsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    return this.reports.doorToEkgJson(facilityId, parsed.data);
  }

  @Get("door-to-provider")
  @RequireRoles(RoleCode.ADMIN)
  async doorToProvider(
    @Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> },
    @Query() query: Record<string, string | string[] | undefined>
  ) {
    const parsed = edReportsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    return this.reports.doorToProviderJson(facilityId, parsed.data);
  }

  @Get("door-to-door")
  @RequireRoles(RoleCode.ADMIN)
  async doorToDoor(
    @Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> },
    @Query() query: Record<string, string | string[] | undefined>
  ) {
    const parsed = edReportsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    return this.reports.doorToDoorJson(facilityId, parsed.data);
  }

  @Get("medication-administration")
  @RequireRoles(RoleCode.ADMIN)
  async medicationAdministration(
    @Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> },
    @Query() query: Record<string, string | string[] | undefined>
  ) {
    const parsed = edReportsQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const facilityId = facilityIdFromReq(req);
    return this.reports.medicationAdministrationJson(facilityId, parsed.data);
  }
}
