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
import { PatientPortalAuditService } from "./patient-portal-audit.service";
import { PatientPortalRepository } from "./persistence/patient-portal.repository";

@Module({
  imports: [PassportModule, PrismaModule, JwtModule.register({})],
  controllers: [PatientPortalAuthController, PatientOrganizationsController],
  providers: [
    PatientPortalRepository,
    PatientPortalAuditService,
    PatientPortalAuthService,
    PatientPortalJwtStrategy,
    PatientPortalAuthGuard,
    PatientPortalFacilityGuard,
    PatientOrganizationsService,
  ],
  exports: [
    PatientPortalRepository,
    PatientPortalAuthGuard,
    PatientPortalFacilityGuard,
  ],
})
export class PatientPortalModule {}
