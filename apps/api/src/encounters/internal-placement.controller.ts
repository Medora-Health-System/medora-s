/**
 * D3C — Internal Placement HTTP surface.
 * All routes fail closed when INTERNAL_PLACEMENT_WORKFLOW_ENABLED is OFF.
 * Identity (facilityId / patientId) is never trusted from the client body.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import {
  InternalPlacementActorRole,
  InternalPlacementStatus,
  type InternalPlacementActorRole as PlacementRole,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import {
  ClinicalPlacementDraftInput,
  InternalPlacementService,
} from "./internal-placement.service";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers?: Record<string, string> }): string {
  const facilityId = req.user?.facilityId || req.headers?.["x-facility-id"];
  if (!facilityId || typeof facilityId !== "string") {
    throw new BadRequestException("Facility ID required");
  }
  return facilityId;
}

function userIdFromReq(req: { user?: { userId?: string; id?: string } }): string {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) throw new BadRequestException("User ID required");
  return userId;
}

const ROLE_CODE_SET = new Set<string>(Object.values(RoleCode));

function roleCodesFromReq(req: {
  user?: {
    roles?: Array<string | { code?: string; role?: string }>;
    facilityRoles?: Array<{ facilityId?: string; role?: string; code?: string; isActive?: boolean }>;
    facilityId?: string;
  };
  headers?: Record<string, string | string[] | undefined>;
}): RoleCode[] {
  const out: RoleCode[] = [];
  const seen = new Set<string>();
  const push = (raw: unknown) => {
    const c = typeof raw === "string" ? raw.trim().toUpperCase() : "";
    if (!c || seen.has(c) || !ROLE_CODE_SET.has(c)) return;
    seen.add(c);
    out.push(c as RoleCode);
  };

  for (const r of req.user?.roles ?? []) {
    if (typeof r === "string") push(r);
    else if (r && typeof r === "object") {
      push(r.code);
      push(r.role);
    }
  }

  const headerFacility = req.headers?.["x-facility-id"];
  const facilityId =
    req.user?.facilityId ||
    (typeof headerFacility === "string" ? headerFacility : Array.isArray(headerFacility) ? headerFacility[0] : undefined);

  for (const fr of req.user?.facilityRoles ?? []) {
    if (!fr || fr.isActive === false) continue;
    if (facilityId && fr.facilityId && fr.facilityId !== facilityId) continue;
    push(fr.role);
    push(fr.code);
  }

  return out;
}

/**
 * Map Medora RoleCode → placement actor role for a target transition.
 * Clinic MVP: ADMIN covers BED_MANAGEMENT (no dedicated bed-management role yet).
 */
export function resolvePlacementActorRole(
  roleCodes: RoleCode[],
  toStatus: string
): PlacementRole {
  if (roleCodes.includes(RoleCode.ADMIN)) return InternalPlacementActorRole.ADMIN;
  if (
    toStatus === InternalPlacementStatus.UNDER_REVIEW ||
    toStatus === InternalPlacementStatus.ACCEPTED ||
    toStatus === InternalPlacementStatus.BED_ASSIGNED ||
    toStatus === InternalPlacementStatus.DECLINED ||
    toStatus === InternalPlacementStatus.EXPIRED
  ) {
    // Operational placement steps require ADMIN until a dedicated role exists.
    if (roleCodes.includes(RoleCode.ADMIN)) return InternalPlacementActorRole.ADMIN;
    throw new BadRequestException(
      "Operational placement transitions require ADMIN in this clinic MVP phase"
    );
  }
  if (
    toStatus === InternalPlacementStatus.READY_FOR_TRANSFER ||
    toStatus === InternalPlacementStatus.DEPARTED_ED
  ) {
    if (roleCodes.includes(RoleCode.RN) || roleCodes.includes(RoleCode.PROVIDER)) {
      return InternalPlacementActorRole.ED_NURSE;
    }
  }
  if (toStatus === InternalPlacementStatus.ARRIVED_DESTINATION) {
    if (roleCodes.includes(RoleCode.RN) || roleCodes.includes(RoleCode.PROVIDER)) {
      return InternalPlacementActorRole.RECEIVING_NURSE;
    }
  }
  if (roleCodes.includes(RoleCode.PROVIDER)) return InternalPlacementActorRole.PROVIDER;
  if (roleCodes.includes(RoleCode.RN)) return InternalPlacementActorRole.ED_NURSE;
  throw new BadRequestException("Caller role cannot perform this placement action");
}

function parseDraftBody(body: Record<string, unknown>): ClinicalPlacementDraftInput {
  const type = String(body.requestedEncounterType ?? "").toUpperCase();
  if (type !== "OBSERVATION" && type !== "INPATIENT") {
    throw new BadRequestException("requestedEncounterType must be OBSERVATION or INPATIENT");
  }
  return {
    requestedEncounterType: type,
    requestedLevelOfCare:
      typeof body.requestedLevelOfCare === "string" ? body.requestedLevelOfCare : null,
    requestedService: typeof body.requestedService === "string" ? body.requestedService : null,
    requestedSpecialty:
      typeof body.requestedSpecialty === "string" ? body.requestedSpecialty : null,
    requestedUnitCode: typeof body.requestedUnitCode === "string" ? body.requestedUnitCode : null,
    clinicalPriority: typeof body.clinicalPriority === "string" ? body.clinicalPriority : null,
    admissionDiagnosisSummary:
      typeof body.admissionDiagnosisSummary === "string"
        ? body.admissionDiagnosisSummary
        : null,
    reasonForPlacement:
      typeof body.reasonForPlacement === "string" ? body.reasonForPlacement : null,
    telemetryRequired: body.telemetryRequired === true,
    isolationRequired: body.isolationRequired === true,
    isolationType: typeof body.isolationType === "string" ? body.isolationType : null,
    specialPlacementNeedsJson:
      body.specialPlacementNeedsJson != null
        ? (body.specialPlacementNeedsJson as ClinicalPlacementDraftInput["specialPlacementNeedsJson"])
        : null,
    acceptingProviderNameSnapshot:
      typeof body.acceptingProviderNameSnapshot === "string"
        ? body.acceptingProviderNameSnapshot
        : null,
    expectedVersion:
      typeof body.expectedVersion === "number" ? body.expectedVersion : undefined,
  };
}

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class InternalPlacementController {
  constructor(private readonly placement: InternalPlacementService) {}

  /**
   * D3CA — facility placement queue (read-only).
   * Soft-empty envelope `{ availability: "FEATURE_DISABLED", items: [] }` when workflow flag OFF
   * (before Prisma). Facility-scoped via JWT facility id.
   */
  @Get("internal-placement")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN, RoleCode.LAB, RoleCode.RADIOLOGY)
  async listFacilityQueue(@Req() req: any) {
    return this.placement.listFacilityQueue(facilityIdFromReq(req), { strict: false });
  }

  @Get("encounters/:encounterId/internal-placement")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async getActive(@Param("encounterId") encounterId: string, @Req() req: any) {
    return this.placement.getActiveForEncounter(facilityIdFromReq(req), encounterId);
  }

  @Post("encounters/:encounterId/internal-placement/draft")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async createDraft(
    @Param("encounterId") encounterId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    return this.placement.createDraft(
      facilityIdFromReq(req),
      encounterId,
      userIdFromReq(req),
      parseDraftBody(body ?? {}),
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Patch("internal-placement/:requestId")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async updateDraft(
    @Param("requestId") requestId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any
  ) {
    return this.placement.updateDraft(
      facilityIdFromReq(req),
      requestId,
      userIdFromReq(req),
      parseDraftBody(body ?? {}),
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Post("internal-placement/:requestId/sign")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async sign(
    @Param("requestId") requestId: string,
    @Body() body: { expectedVersion?: number },
    @Req() req: any
  ) {
    return this.placement.signDraft(facilityIdFromReq(req), requestId, userIdFromReq(req), {
      expectedVersion: body?.expectedVersion,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Post("internal-placement/:requestId/submit")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async submit(
    @Param("requestId") requestId: string,
    @Body() body: { expectedVersion?: number },
    @Req() req: any
  ) {
    return this.placement.submitRequested(facilityIdFromReq(req), requestId, userIdFromReq(req), {
      expectedVersion: body?.expectedVersion,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Post("internal-placement/:requestId/transitions")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  async transition(
    @Param("requestId") requestId: string,
    @Body()
    body: {
      toStatus: string;
      acceptanceNotes?: string | null;
      assignedUnitCode?: string | null;
      assignedRoomKey?: string | null;
      assignedBedKey?: string | null;
      assignmentSourceSystem?: string | null;
      cancellationReason?: string | null;
      expectedVersion?: number;
    },
    @Req() req: any
  ) {
    const toStatus = String(body?.toStatus ?? "").trim();
    if (!toStatus) throw new BadRequestException("toStatus is required");
    const role = resolvePlacementActorRole(roleCodesFromReq(req), toStatus);
    return this.placement.transition(
      facilityIdFromReq(req),
      requestId,
      userIdFromReq(req),
      toStatus,
      role,
      {
        acceptanceNotes: body.acceptanceNotes,
        assignedUnitCode: body.assignedUnitCode,
        assignedRoomKey: body.assignedRoomKey,
        assignedBedKey: body.assignedBedKey,
        assignmentSourceSystem: body.assignmentSourceSystem,
        cancellationReason: body.cancellationReason,
        expectedVersion: body.expectedVersion,
      },
      { ip: req.ip, userAgent: req.headers?.["user-agent"] }
    );
  }

  @Post("internal-placement/:requestId/revise-type")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN)
  async reviseType(
    @Param("requestId") requestId: string,
    @Body() body: { requestedEncounterType: string; expectedVersion?: number },
    @Req() req: any
  ) {
    const type = String(body?.requestedEncounterType ?? "").toUpperCase();
    if (type !== "OBSERVATION" && type !== "INPATIENT") {
      throw new BadRequestException("requestedEncounterType must be OBSERVATION or INPATIENT");
    }
    return this.placement.reviseRequestedType(
      facilityIdFromReq(req),
      requestId,
      userIdFromReq(req),
      type,
      { expectedVersion: body?.expectedVersion }
    );
  }
}
