/**
 * MEDUI.D5A.2/D5A.3/D5A.4/D5A.5 / D4C.10D — Dental Care shell, worklist, odontogram,
 * clinical board (perio/plan/procedures/overview), visit routing.
 * Reuses enterprise Patient/Encounter — no DentalPatient / DentalEncounter.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  projectDentalDashboardShellPlaceholders,
  type DentalWorkspaceAccess,
} from "@medora/shared";
import { RequireRoles } from "../common/guards/roles.decorators";
import { RoleCode } from "@prisma/client";
import { DentalCareReadAccessGuard } from "./dental-care-read-access.guard";
import { DentalCareWorklistService } from "./dental-care-worklist.service";
import { DentalCareOdontogramService } from "./dental-care-odontogram.service";
import { DentalCareVisitRoutingService } from "./dental-care-visit-routing.service";
import { DentalCareClinicalBoardService } from "./dental-care-clinical-board.service";

@Controller("dental-care")
@UseGuards(AuthGuard("jwt"))
export class DentalCareController {
  constructor(
    private readonly dentalCareWorklist: DentalCareWorklistService,
    private readonly odontogram: DentalCareOdontogramService,
    private readonly visitRouting: DentalCareVisitRoutingService,
    private readonly clinicalBoard: DentalCareClinicalBoardService
  ) {}

  private actor(req: any): {
    userId: string;
    facilityId: string;
    access: DentalWorkspaceAccess;
  } {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    const userId = req.user?.userId as string | undefined;
    if (!facilityId) throw new BadRequestException("Facility ID required");
    if (!userId) throw new BadRequestException("Authentication required");
    return {
      userId,
      facilityId: String(facilityId),
      access: req.dentalCareAccess as DentalWorkspaceAccess,
    };
  }

  @Get("dashboard")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getDashboard(@Req() req: { dentalCareAccess?: DentalWorkspaceAccess }) {
    return {
      certificationId: "MEDUI.D5A.2",
      access: req.dentalCareAccess ?? null,
      sections: projectDentalDashboardShellPlaceholders(),
    };
  }

  @Get("access")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getAccess(@Req() req: { dentalCareAccess?: DentalWorkspaceAccess }) {
    return {
      certificationId: "MEDUI.D5A.2",
      access: req.dentalCareAccess ?? null,
    };
  }

  @Get("worklist")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  async getWorklist(@Req() req: any) {
    const { facilityId } = this.actor(req);
    return this.dentalCareWorklist.listOpenDentalEncounters(facilityId);
  }

  @Post("patients/:patientId/claim-or-start")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.RN)
  @UseGuards(DentalCareReadAccessGuard)
  claimOrStart(
    @Req() req: any,
    @Param("patientId") patientId: string,
    @Body() body: { visitReason?: string }
  ) {
    const { facilityId, userId } = this.actor(req);
    return this.visitRouting.claimOrStartDentalVisit({
      facilityId,
      patientId,
      userId,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
      visitReason: body?.visitReason,
    });
  }

  @Get("encounters/:encounterId/odontogram")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getEncounterOdontogram(@Req() req: any, @Param("encounterId") encounterId: string) {
    return this.odontogram.getEncounterOdontogram(this.actor(req), encounterId);
  }

  @Get("patients/:patientId/odontogram")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getPatientOdontogram(@Req() req: any, @Param("patientId") patientId: string) {
    return this.odontogram.getPatientOdontogram(this.actor(req), patientId);
  }

  @Get("patients/:patientId/teeth/:toothCode/history")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getToothHistory(
    @Req() req: any,
    @Param("patientId") patientId: string,
    @Param("toothCode") toothCode: string
  ) {
    return this.odontogram.getToothHistory(this.actor(req), patientId, toothCode);
  }

  @Put("patients/:patientId/dentition")
  @RequireRoles(RoleCode.PROVIDER)
  @UseGuards(DentalCareReadAccessGuard)
  upsertDentition(
    @Req() req: any,
    @Param("patientId") patientId: string,
    @Body() body: { dentitionType?: string; numberingSystem?: string }
  ) {
    return this.odontogram.upsertDentition(this.actor(req), patientId, body ?? {});
  }

  @Post("encounters/:encounterId/tooth-findings")
  @RequireRoles(RoleCode.PROVIDER)
  @UseGuards(DentalCareReadAccessGuard)
  createFinding(
    @Req() req: any,
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      toothCode?: string;
      scope?: string;
      surfaces?: string[];
      findingType?: string;
      clinicalState?: string;
      notes?: string | null;
      supersedesFindingId?: string | null;
    }
  ) {
    return this.odontogram.createFinding(this.actor(req), encounterId, body ?? {});
  }

  /** MEDUI.D5A.5 — one authoritative finding per selected tooth. */
  @Post("encounters/:encounterId/tooth-findings/bulk")
  @RequireRoles(RoleCode.PROVIDER)
  @UseGuards(DentalCareReadAccessGuard)
  createBulkFindings(
    @Req() req: any,
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      toothCodes?: string[];
      scope?: string;
      surfaces?: string[];
      findingType?: string;
      clinicalState?: string;
      notes?: string | null;
    }
  ) {
    return this.odontogram.createBulkFindings(this.actor(req), encounterId, body ?? {});
  }

  @Patch("tooth-findings/:id")
  @RequireRoles(RoleCode.PROVIDER)
  @UseGuards(DentalCareReadAccessGuard)
  patchFinding(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { action?: string; reason?: string | null }
  ) {
    return this.odontogram.voidOrResolveFinding(this.actor(req), id, body ?? {});
  }

  @Get("encounters/:encounterId/periodontal-exam")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getPeriodontal(@Req() req: any, @Param("encounterId") encounterId: string) {
    return this.clinicalBoard.getPeriodontalExam(this.actor(req), encounterId);
  }

  @Put("encounters/:encounterId/periodontal-exam")
  @RequireRoles(RoleCode.PROVIDER)
  @UseGuards(DentalCareReadAccessGuard)
  savePeriodontal(@Req() req: any, @Param("encounterId") encounterId: string, @Body() body: unknown) {
    return this.clinicalBoard.savePeriodontalExam(this.actor(req), encounterId, (body ?? {}) as never);
  }

  @Get("encounters/:encounterId/treatment-plan")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getTreatmentPlan(@Req() req: any, @Param("encounterId") encounterId: string) {
    return this.clinicalBoard.getTreatmentPlan(this.actor(req), encounterId);
  }

  @Put("encounters/:encounterId/treatment-plan")
  @RequireRoles(RoleCode.PROVIDER)
  @UseGuards(DentalCareReadAccessGuard)
  saveTreatmentPlan(@Req() req: any, @Param("encounterId") encounterId: string, @Body() body: unknown) {
    return this.clinicalBoard.saveTreatmentPlan(this.actor(req), encounterId, (body ?? {}) as never);
  }

  @Get("encounters/:encounterId/procedures")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  listProcedures(@Req() req: any, @Param("encounterId") encounterId: string) {
    return this.clinicalBoard.listProcedures(this.actor(req), encounterId);
  }

  @Post("encounters/:encounterId/procedures")
  @RequireRoles(RoleCode.PROVIDER)
  @UseGuards(DentalCareReadAccessGuard)
  createProcedure(@Req() req: any, @Param("encounterId") encounterId: string, @Body() body: unknown) {
    return this.clinicalBoard.createProcedure(this.actor(req), encounterId, (body ?? {}) as never);
  }

  @Get("encounters/:encounterId/clinical-record")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK, RoleCode.BILLING)
  @UseGuards(DentalCareReadAccessGuard)
  getClinicalRecord(@Req() req: any, @Param("encounterId") encounterId: string) {
    return this.clinicalBoard.getClinicalRecord(this.actor(req), encounterId);
  }

  /** MEDUI.D5A.5A — encounter-scoped medical-history review acknowledgement. */
  @Put("encounters/:encounterId/history-review")
  @RequireRoles(RoleCode.PROVIDER)
  @UseGuards(DentalCareReadAccessGuard)
  saveHistoryReview(
    @Req() req: any,
    @Param("encounterId") encounterId: string,
    @Body() body: { reviewed?: boolean; notes?: string | null }
  ) {
    return this.clinicalBoard.saveHistoryReview(this.actor(req), encounterId, body ?? {});
  }
}
