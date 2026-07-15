import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TriageService } from "./triage.service";
import { TriageCarryForwardService } from "./triage-carry-forward.service";
import { TriageVitalsReadingService } from "./triage-vitals-reading.service";
import { EdTriageAccessGuard } from "./ed-triage-access.guard";

@Controller("encounters")
@UseGuards(AuthGuard("jwt"))
export class TriageController {
  constructor(
    private readonly triageService: TriageService,
    private readonly triageCarryForwardService: TriageCarryForwardService,
    private readonly triageVitalsReadingService: TriageVitalsReadingService
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
        measuredAt: body.measuredAt ?? null,
      },
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch(":id/triage/vitals-readings/:readingId")
  @UseGuards(EdTriageAccessGuard)
  async updateVitalsReading(
    @Param("id") encounterId: string,
    @Param("readingId") readingId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.triageVitalsReadingService.updateReading(
      encounterId,
      readingId,
      facilityId,
      {
        vitalsJson: body?.vitalsJson,
        measuredAt: body?.measuredAt,
      },
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post(":id/triage/vitals-readings/:readingId/void")
  @UseGuards(EdTriageAccessGuard)
  async voidVitalsReading(
    @Param("id") encounterId: string,
    @Param("readingId") readingId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.triageVitalsReadingService.voidReading(
      encounterId,
      readingId,
      facilityId,
      {
        voidReasonCode: body?.voidReasonCode,
        voidReasonText: body?.voidReasonText,
      },
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

