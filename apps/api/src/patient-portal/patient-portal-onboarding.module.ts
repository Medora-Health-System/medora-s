import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { OutboundMailService } from "../common/mail/outbound-mail.service";
import { PrismaModule } from "../prisma/prisma.module";
import { FacilityConfigurationModule } from "../facility-configuration/facility-configuration.module";
import { PatientPortalAuthController } from "./auth/patient-portal-auth.controller";
import { PatientPortalAuthService } from "./auth/patient-portal-auth.service";
import { PatientPortalJwtStrategy } from "./auth/patient-portal-jwt.strategy";
import { PatientPortalAuthGuard } from "./guards/patient-portal-auth.guard";
import { PatientPortalActivationController } from "./organizations/patient-portal-activation.controller";
import { PatientPortalActivationService } from "./organizations/patient-portal-activation.service";
import { PatientPortalAuditService } from "./patient-portal-audit.service";
import { PatientPortalActivationRepository } from "./persistence/patient-portal-activation.repository";
import { PatientPortalRepository } from "./persistence/patient-portal.repository";

/**
 * Minimal patient-facing runtime required to complete invitation onboarding.
 *
 * This module intentionally exposes only patient authentication/session routes
 * and the facility-issued activation redemption route. Clinical portal reads,
 * messaging, documents, results, medications, appointments, and requests stay
 * behind PATIENT_PORTAL_ENABLED in PatientPortalModule/Digital Care runtime.
 */
@Module({
  imports: [PassportModule, PrismaModule, JwtModule.register({}), FacilityConfigurationModule],
  controllers: [PatientPortalAuthController, PatientPortalActivationController],
  providers: [
    PatientPortalRepository,
    PatientPortalActivationRepository,
    PatientPortalAuditService,
    PatientPortalAuthService,
    PatientPortalJwtStrategy,
    PatientPortalAuthGuard,
    PatientPortalActivationService,
    OutboundMailService,
  ],
})
export class PatientPortalOnboardingModule {}
