import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Response } from "express";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";
import { RequireRoles, RolesGuard } from "../common/guards/roles.guard";
import { OrganizationDataExportService } from "./organization-data-export.service";
import { organizationDataExportCreateSchema, organizationDataExportListQuerySchema } from "./dto/organization-data-export.dto";

type AuthedReq = {
  user?: { userId?: string; facilityId?: string };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  get(name: string): string | undefined;
};

function facilityIdFromReq(req: AuthedReq): string {
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

@Controller("admin/data-exports")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class OrganizationDataExportController {
  constructor(private readonly exportsService: OrganizationDataExportService) {}

  @Post()
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async create(@Req() req: AuthedReq, @Body() body: unknown) {
    const parsed = organizationDataExportCreateSchema.safeParse(body && typeof body === "object" ? body : {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Corps invalide.", { cause: parsed.error });
    }
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new ForbiddenException("Authentication required");
    const facilityId = parsed.data.facility_id ?? facilityIdFromReq(req);
    return this.exportsService.requestExport({
      actorUserId,
      facilityId,
      format: parsed.data.format,
      ip: req.ip,
      userAgent: typeof req.get === "function" ? req.get("user-agent") : undefined,
    });
  }

  @Get()
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async list(@Req() req: AuthedReq, @Query() query: Record<string, string | string[] | undefined>) {
    const parsed = organizationDataExportListQuerySchema.safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new ForbiddenException("Authentication required");
    const facilityId = parsed.data.facilityId ?? facilityIdFromReq(req);
    return this.exportsService.listExports(actorUserId, facilityId, parsed.data.limit, parsed.data.offset);
  }

  @Get(":id")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getById(@Req() req: AuthedReq, @Param("id") id: string, @Query() query: Record<string, string | string[] | undefined>) {
    const parsed = organizationDataExportListQuerySchema.pick({ facilityId: true }).safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new ForbiddenException("Authentication required");
    const facilityId = parsed.data.facilityId ?? facilityIdFromReq(req);
    return this.exportsService.getExport(actorUserId, facilityId, id);
  }

  @Post(":id/download")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async download(
    @Req() req: AuthedReq,
    @Param("id") id: string,
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response
  ) {
    const parsed = organizationDataExportListQuerySchema.pick({ facilityId: true }).safeParse(flattenQuery(query));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", { cause: parsed.error });
    }
    const actorUserId = req.user?.userId;
    if (!actorUserId) throw new ForbiddenException("Authentication required");
    const facilityId = parsed.data.facilityId ?? facilityIdFromReq(req);
    const payload = await this.exportsService.downloadExport({
      actorUserId,
      facilityId,
      exportId: id,
      ip: req.ip,
      userAgent: typeof req.get === "function" ? req.get("user-agent") : undefined,
    });
    res.setHeader("Content-Type", payload.contentType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${encodeURIComponent(payload.fileName)}\"`);
    res.setHeader("Content-Length", payload.buffer.length);
    res.end(payload.buffer);
  }
}
