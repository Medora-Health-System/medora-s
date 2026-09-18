import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PatientPortalAuthService } from "./patient-portal-auth.service";
import {
  patientPortalDeleteAccountBodySchema,
  patientPortalLoginBodySchema,
  patientPortalRefreshBodySchema,
  patientPortalRegisterBodySchema,
} from "./patient-portal-auth.schemas";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import type { PatientPortalPrincipal } from "./patient-portal.types";

@Controller("patient/v1/auth")
export class PatientPortalAuthController {
  constructor(private readonly auth: PatientPortalAuthService) {}

  @Post("register")
  async register(@Body() body: unknown, @Req() req: any) {
    const parsed = patientPortalRegisterBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid patient registration payload", {
        cause: parsed.error,
      });
    }
    return this.auth.register(parsed.data, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Post("login")
  async login(@Body() body: unknown, @Req() req: any) {
    const parsed = patientPortalLoginBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid patient login payload", {
        cause: parsed.error,
      });
    }
    return this.auth.login(parsed.data, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Post("refresh")
  async refresh(@Body() body: unknown) {
    const parsed = patientPortalRefreshBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid refresh payload", {
        cause: parsed.error,
      });
    }
    return this.auth.refresh(parsed.data.refreshToken);
  }

  @Delete("account")
  @UseGuards(PatientPortalAuthGuard)
  async deleteAccount(
    @Body() body: unknown,
    @Req() req: { patientPrincipal?: PatientPortalPrincipal; ip?: string; headers?: Record<string, string | undefined> },
  ) {
    if (!req.patientPrincipal) {
      throw new BadRequestException("Patient principal missing");
    }
    const parsed = patientPortalDeleteAccountBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid account deletion payload", {
        cause: parsed.error,
      });
    }
    await this.auth.deleteAccount(req.patientPrincipal, parsed.data, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
    return {
      deleted: true,
      portalAccessRevoked: true,
      clinicalRecordsRetainedByProvider: true,
    };
  }

  @Post("logout")
  @UseGuards(PatientPortalAuthGuard)
  async logout(@Req() req: { patientPrincipal?: PatientPortalPrincipal }) {
    if (!req.patientPrincipal) {
      throw new BadRequestException("Patient principal missing");
    }
    await this.auth.logout(req.patientPrincipal);
    return { ok: true };
  }

  @Get("me")
  @UseGuards(PatientPortalAuthGuard)
  async me(@Req() req: { patientPrincipal?: PatientPortalPrincipal }) {
    if (!req.patientPrincipal) {
      throw new BadRequestException("Patient principal missing");
    }
    return this.auth.me(req.patientPrincipal);
  }
}
