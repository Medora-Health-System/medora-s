import { BadRequestException, Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ClinicCareReadAccessGuard } from "./clinic-care-read-access.guard";
import { ClinicCareService } from "./clinic-care.service";

@Controller("clinic-care")
@UseGuards(AuthGuard("jwt"))
export class ClinicCareController {
  constructor(private readonly clinicCareService: ClinicCareService) {}

  /**
   * MEDUI.D4C.2 — ambulatory Clinic Care trackboard projection (metrics + rows).
   * Facility-scoped; real counts only; no parallel clinical engines.
   */
  @Get("trackboard")
  @UseGuards(ClinicCareReadAccessGuard)
  async getTrackboard(
    @Req()
    req: {
      facilityId?: string;
      clinicCareAccess?: Parameters<ClinicCareService["getTrackboardProjection"]>[0]["access"];
      clinicCareProfessionGroup?: string;
      clinicCareFacility?: Parameters<ClinicCareService["getTrackboardProjection"]>[0]["facility"];
      clinicCareModuleCapabilities?: Parameters<
        ClinicCareService["getTrackboardProjection"]
      >[0]["moduleCapabilities"];
      clinicCareServiceLines?: readonly string[];
    }
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    if (
      !req.clinicCareAccess ||
      !req.clinicCareFacility ||
      !req.clinicCareModuleCapabilities ||
      !req.clinicCareServiceLines ||
      !req.clinicCareProfessionGroup
    ) {
      throw new BadRequestException("Clinic Care context required");
    }

    return this.clinicCareService.getTrackboardProjection({
      facilityId,
      facility: req.clinicCareFacility,
      serviceLines: req.clinicCareServiceLines,
      access: req.clinicCareAccess,
      professionGroup: req.clinicCareProfessionGroup,
      moduleCapabilities: req.clinicCareModuleCapabilities,
    });
  }
}
