import {
  BadRequestException,
  Controller,
  Get,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ClinicCareReadAccessGuard } from "./clinic-care-read-access.guard";
import {
  CLINIC_CARE_SCHEMA_MISS_MESSAGE,
  isPrismaSchemaMissError,
} from "./clinic-care-schema-miss";
import { ClinicCareService } from "./clinic-care.service";

@Controller("clinic-care")
@UseGuards(AuthGuard("jwt"))
export class ClinicCareController {
  constructor(private readonly clinicCareService: ClinicCareService) {}

  /**
   * MEDUI.D4C.2 — ambulatory Clinic Care trackboard projection (metrics + rows).
   * Facility-scoped; real counts only; no parallel clinical engines.
   * MEDUI.D4C.2A.1 — Prisma schema-miss (P2021/P2022) → 503, never empty [].
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

    try {
      return await this.clinicCareService.getTrackboardProjection({
        facilityId,
        facility: req.clinicCareFacility,
        serviceLines: req.clinicCareServiceLines,
        access: req.clinicCareAccess,
        professionGroup: req.clinicCareProfessionGroup,
        moduleCapabilities: req.clinicCareModuleCapabilities,
      });
    } catch (err) {
      if (isPrismaSchemaMissError(err)) {
        throw new ServiceUnavailableException({
          message: CLINIC_CARE_SCHEMA_MISS_MESSAGE,
          code: "CLINIC_CARE_SCHEMA_MISS",
          migration: "20261028120000_enterprise_appointment_visit_origin_d4c3",
        });
      }
      throw err;
    }
  }
}
