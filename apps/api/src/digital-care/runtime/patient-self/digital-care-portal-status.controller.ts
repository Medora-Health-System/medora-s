import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  PatientPortalAuthGuard,
  type PatientPortalPrincipal,
} from "../../../patient-portal/public";

interface PatientPortalRequest extends Request {
  patientPrincipal?: PatientPortalPrincipal;
}

export interface DigitalCarePortalStatusResponse {
  active: true;
  authenticated: true;
  principal: "patient";
}

@Controller("digital-care/v1/me")
@UseGuards(PatientPortalAuthGuard)
export class DigitalCarePortalStatusController {
  @Get("portal")
  getPortalStatus(
    @Req() request: PatientPortalRequest,
  ): DigitalCarePortalStatusResponse {
    if (!request.patientPrincipal) {
      throw new UnauthorizedException("Patient portal authentication required");
    }

    return {
      active: true,
      authenticated: true,
      principal: "patient",
    };
  }
}
