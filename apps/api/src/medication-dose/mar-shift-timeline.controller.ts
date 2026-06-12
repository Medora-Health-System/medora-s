import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import {
  MarShiftTimelineService,
  parseMarShiftTimelineShiftCode,
  type MarShiftTimelineQuery,
} from "./mar-shift-timeline.service";

function parseOptionalIsoDate(value: string | undefined, label: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${label} invalide (ISO-8601 attendu).`);
  }
  return parsed;
}

function parseOptionalBoolean(value: string | undefined, label: string): boolean | undefined {
  if (value == null || value.trim() === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  throw new BadRequestException(`${label} invalide (true/false attendu).`);
}

@Controller("facilities/:facilityId")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MarShiftTimelineController {
  constructor(private readonly marShiftTimelineService: MarShiftTimelineService) {}

  @Get("mar-shift-timeline")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getMarShiftTimeline(
    @Param("facilityId") facilityId: string,
    @Query("shiftCode") shiftCodeRaw: string | undefined,
    @Query("shiftStart") shiftStartRaw: string | undefined,
    @Query("shiftEnd") shiftEndRaw: string | undefined,
    @Query("encounterId") encounterId: string | undefined,
    @Query("assignedToUserId") assignedToUserId: string | undefined,
    @Query("includeCompleted") includeCompletedRaw: string | undefined,
    @Query("includeUpcoming") includeUpcomingRaw: string | undefined,
    @Query("locale") localeRaw: string | undefined,
    @Req()
    req: {
      user?: { userId?: string; facilityId?: string };
      headers?: Record<string, string | string[] | undefined>;
    }
  ) {
    const requestFacilityId =
      req.user?.facilityId ||
      (typeof req.headers?.["x-facility-id"] === "string" ? req.headers["x-facility-id"] : undefined);

    if (!requestFacilityId) {
      throw new BadRequestException("Facility ID required");
    }
    if (requestFacilityId !== facilityId) {
      throw new ForbiddenException("Établissement invalide pour cette requête.");
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException("Authentification requise");
    }

    const shiftStart = parseOptionalIsoDate(shiftStartRaw, "shiftStart");
    const shiftEnd = parseOptionalIsoDate(shiftEndRaw, "shiftEnd");
    if ((shiftStart && !shiftEnd) || (!shiftStart && shiftEnd)) {
      throw new BadRequestException("shiftStart et shiftEnd doivent être fournis ensemble.");
    }
    if (shiftStart && shiftEnd && shiftStart >= shiftEnd) {
      throw new BadRequestException("shiftStart doit être antérieur à shiftEnd.");
    }

    const shiftCode = shiftCodeRaw?.trim()
      ? parseMarShiftTimelineShiftCode(shiftCodeRaw)
      : undefined;
    if (shiftCodeRaw?.trim() && !shiftCode) {
      throw new BadRequestException("shiftCode invalide.");
    }

    const query: MarShiftTimelineQuery = {
      shiftCode: shiftCode ?? undefined,
      shiftStart,
      shiftEnd,
      encounterId: encounterId?.trim() || undefined,
      assignedToUserId: assignedToUserId?.trim() || undefined,
      includeCompleted: parseOptionalBoolean(includeCompletedRaw, "includeCompleted"),
      includeUpcoming: parseOptionalBoolean(includeUpcomingRaw, "includeUpcoming"),
      locale: localeRaw?.trim() || undefined,
    };

    const viewer = await this.marShiftTimelineService.resolveViewer(facilityId, userId);
    return this.marShiftTimelineService.getMarShiftTimeline(facilityId, viewer, query);
  }
}
