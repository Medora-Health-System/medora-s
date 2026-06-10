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
import {
  MEDICATION_PASS_QUEUE_BUCKETS,
  type MedicationPassQueueBucket,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import {
  MedicationPassQueueService,
  type MedicationPassQueueQuery,
} from "./medication-pass-queue.service";

function parseOptionalIsoDate(value: string | undefined, label: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${label} invalide (ISO-8601 attendu).`);
  }
  return parsed;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value == null || value.trim() === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  throw new BadRequestException("includeUpcoming invalide (true/false attendu).");
}

function parseOptionalBucket(value: string | undefined): MedicationPassQueueBucket | undefined {
  if (!value?.trim()) return undefined;
  const bucket = value.trim().toUpperCase();
  if (!(MEDICATION_PASS_QUEUE_BUCKETS as readonly string[]).includes(bucket)) {
    throw new BadRequestException("bucket invalide.");
  }
  return bucket as MedicationPassQueueBucket;
}

@Controller("facilities/:facilityId")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationPassQueueController {
  constructor(private readonly passQueueService: MedicationPassQueueService) {}

  @Get("medication-pass-queue")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getMedicationPassQueue(
    @Param("facilityId") facilityId: string,
    @Query("encounterId") encounterId: string | undefined,
    @Query("assignedToUserId") assignedToUserId: string | undefined,
    @Query("shiftStart") shiftStartRaw: string | undefined,
    @Query("shiftEnd") shiftEndRaw: string | undefined,
    @Query("bucket") bucketRaw: string | undefined,
    @Query("includeUpcoming") includeUpcomingRaw: string | undefined,
    @Req() req: { user?: { facilityId?: string }; headers?: Record<string, string | string[] | undefined> }
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

    const shiftStart = parseOptionalIsoDate(shiftStartRaw, "shiftStart");
    const shiftEnd = parseOptionalIsoDate(shiftEndRaw, "shiftEnd");
    if ((shiftStart && !shiftEnd) || (!shiftStart && shiftEnd)) {
      throw new BadRequestException("shiftStart et shiftEnd doivent être fournis ensemble.");
    }
    if (shiftStart && shiftEnd && shiftStart >= shiftEnd) {
      throw new BadRequestException("shiftStart doit être antérieur à shiftEnd.");
    }

    const query: MedicationPassQueueQuery = {
      encounterId: encounterId?.trim() || undefined,
      assignedToUserId: assignedToUserId?.trim() || undefined,
      shiftStart,
      shiftEnd,
      bucket: parseOptionalBucket(bucketRaw),
      includeUpcoming: parseOptionalBoolean(includeUpcomingRaw),
    };

    return this.passQueueService.getPassQueue(facilityId, query);
  }
}
