import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../prisma/prisma.module";
import { PatientPortalAuthController } from "./auth/patient-portal-auth.controller";
import { PatientPortalAuthService } from "./auth/patient-portal-auth.service";
import { PatientPortalJwtStrategy } from "./auth/patient-portal-jwt.strategy";
import { PatientPortalAuthGuard } from "./guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "./guards/patient-portal-facility.guard";
import { PatientOrganizationsController } from "./organizations/patient-organizations.controller";
import { PatientOrganizationsService } from "./organizations/patient-organizations.service";
import { PatientPortalActivationController } from "./organizations/patient-portal-activation.controller";
import { PatientPortalActivationService } from "./organizations/patient-portal-activation.service";
import { PatientPortalStaffActivationController } from "./organizations/patient-portal-staff-activation.controller";
import { PatientPortalAuditService } from "./patient-portal-audit.service";
import { PatientPortalActivationRepository } from "./persistence/patient-portal-activation.repository";
import { PatientPortalRepository } from "./persistence/patient-portal.repository";

@Module({
  imports: [PassportModule, PrismaModule, JwtModule.register({})],
  controllers: [
    PatientPortalAuthController,
    PatientOrganizationsController,
    PatientPortalActivationController,
    PatientPortalStaffActivationController,
  ],
  providers: [
    PatientPortalRepository,
    PatientPortalActivationRepository,
    PatientPortalAuditService,
    PatientPortalAuthService,
    PatientPortalJwtStrategy,
    PatientPortalAuthGuard,
    PatientPortalFacilityGuard,
    PatientOrganizationsService,
    PatientPortalActivationService,
  ],
  exports: [
    PatientPortalRepository,
    PatientPortalAuthGuard,
    PatientPortalFacilityGuard,
  ],
})
export class PatientPortalModule {}
