import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TrackboardReadAccessGuard } from "./trackboard-read-access.guard";
import { EmergencyEncountersArchiveService } from "./emergency-encounters-archive.service";

@Controller("emergency")
@UseGuards(AuthGuard("jwt"))
export class EmergencyEncountersArchiveController {
  constructor(private readonly archiveService: EmergencyEncountersArchiveService) {}

  @Get("encounters/archive")
  @UseGuards(TrackboardReadAccessGuard)
  async listArchiveEncounters(
    @Query("startDate") startDate: string | undefined,
    @Query("endDate") endDate: string | undefined,
    @Query("search") search: string | undefined,
    @Query("limit") limitRaw: string | undefined,
    @Query("offset") offsetRaw: string | undefined,
    @Req() req: { facilityId?: string }
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;

    return this.archiveService.listArchiveEncounters({
      facilityId,
      startDate,
      endDate,
      search,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
  }
}
