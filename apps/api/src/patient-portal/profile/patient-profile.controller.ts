import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { PatientPortalPrincipal } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientProfileService } from "./patient-profile.service";
import { patientProfileUpdateSchema } from "./patient-profile.schemas";

@Controller("patient/v1/profile")
@UseGuards(PatientPortalAuthGuard)
export class PatientProfileController {
  constructor(private readonly profile: PatientProfileService) {}

  @Get()
  async getProfile(@Req() req: { patientPrincipal?: PatientPortalPrincipal }) {
    if (!req.patientPrincipal) {
      throw new BadRequestException("Patient principal missing");
    }
    return this.profile.getProfile(req.patientPrincipal);
  }

  @Patch()
  async updateProfile(
    @Body() body: unknown,
    @Req() req: { patientPrincipal?: PatientPortalPrincipal },
  ) {
    if (!req.patientPrincipal) {
      throw new BadRequestException("Patient principal missing");
    }

    const parsed = patientProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid patient profile payload", {
        cause: parsed.error,
      });
    }

    return this.profile.updateProfile(req.patientPrincipal, parsed.data);
  }
}
