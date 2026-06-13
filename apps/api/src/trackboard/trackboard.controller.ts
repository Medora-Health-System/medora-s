import { Controller, Get, Query, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TrackboardService } from "./trackboard.service";
import { TrackboardReadAccessGuard } from "./trackboard-read-access.guard";

@Controller("trackboard")
@UseGuards(AuthGuard("jwt"))
export class TrackboardController {
  constructor(private readonly trackboardService: TrackboardService) {}

  @Get()
  @UseGuards(TrackboardReadAccessGuard)
  async getActiveEncounters(
    @Query("status") status: string,
    @Query("type") type: string | undefined,
    @Req() req: {
      facilityId?: string;
      trackboardObservationPatientsOnly?: boolean;
    }
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.trackboardService.getActiveEncounters(facilityId, status, type, {
      observationPatientsOnly: req.trackboardObservationPatientsOnly === true,
    });
  }
}

