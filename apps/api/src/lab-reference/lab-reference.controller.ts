import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { LabReferenceIntervalService } from "./lab-reference-interval.service";

@Controller("lab-reference")
@UseGuards(AuthGuard("jwt"))
export class LabReferenceController {
  constructor(private readonly labReference: LabReferenceIntervalService) {}

  /**
   * Hydrate CBC/BMP/CMP authoring rows with resolved units/ranges for the patient.
   * Enterprise-wide — no ED/Clinic/IP/Dental branching.
   */
  @Get("panels/:panelCode/observations")
  async resolvePanelObservations(
    @Param("panelCode") panelCode: string,
    @Query("facilityId") facilityId: string,
    @Query("sex") sex?: string,
    @Query("ageYears") ageYearsRaw?: string,
    @Query("pregnancy") pregnancy?: string
  ) {
    const code = String(panelCode ?? "").toUpperCase();
    if (code !== "CBC" && code !== "BMP" && code !== "CMP") {
      throw new BadRequestException("panelCode must be CBC, BMP, or CMP.");
    }
    if (!facilityId?.trim()) {
      throw new BadRequestException("facilityId is required.");
    }
    const ageYears =
      ageYearsRaw == null || ageYearsRaw === ""
        ? null
        : Number(ageYearsRaw);
    if (ageYearsRaw != null && ageYearsRaw !== "" && !Number.isFinite(ageYears)) {
      throw new BadRequestException("ageYears must be numeric.");
    }

    return this.labReference.resolvePanelObservationsForAuthoring({
      facilityId: facilityId.trim(),
      panelCode: code,
      patientDemographics: {
        sex: (sex as "MALE" | "FEMALE" | "OTHER" | "UNKNOWN" | "M" | "F" | null) ?? null,
        ageYears,
        pregnancy:
          pregnancy === "PREGNANT" || pregnancy === "NOT_PREGNANT" || pregnancy === "UNKNOWN"
            ? pregnancy
            : null,
      },
    });
  }
}
