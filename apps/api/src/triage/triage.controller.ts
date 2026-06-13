import { Controller, Get, Put, Param, Body, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TriageService } from "./triage.service";
import { TriageCarryForwardService } from "./triage-carry-forward.service";
import { EdTriageAccessGuard } from "./ed-triage-access.guard";

@Controller("encounters")
@UseGuards(AuthGuard("jwt"))
export class TriageController {
  constructor(
    private readonly triageService: TriageService,
    private readonly triageCarryForwardService: TriageCarryForwardService
  ) {}

  @Get(":id/triage/carry-forward")
  @UseGuards(EdTriageAccessGuard)
  async getTriageCarryForward(@Param("id") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.triageCarryForwardService.resolveForEncounter(
      encounterId,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get(":id/triage")
  @UseGuards(EdTriageAccessGuard)
  async getTriage(@Param("id") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.triageService.getTriage(encounterId, facilityId);
  }

  @Put(":id/triage")
  @UseGuards(EdTriageAccessGuard)
  async upsertTriage(
    @Param("id") encounterId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.triageService.upsertTriage(
      encounterId,
      facilityId,
      {
        chiefComplaint: body.chiefComplaint,
        onsetAt: body.onsetAt ? new Date(body.onsetAt) : null,
        esi: body.esi,
        vitalsJson: body.vitalsJson,
        strokeScreen: body.strokeScreen,
        sepsisScreen: body.sepsisScreen,
        triageCompleteAt: body.triageCompleteAt ? new Date(body.triageCompleteAt) : null,
        lastKnownTriageUpdatedAt:
          typeof body.lastKnownTriageUpdatedAt === "string"
            ? body.lastKnownTriageUpdatedAt
            : null,
      },
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

