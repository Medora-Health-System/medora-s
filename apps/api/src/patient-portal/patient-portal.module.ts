import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuditService } from "../common/services/audit.service";
import { DocumentsModule } from "../documents/documents.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PatientAppointmentsController } from "./appointments/patient-appointments.controller";
import { PatientAppointmentsService } from "./appointments/patient-appointments.service";
import { PatientPortalAuthController } from "./auth/patient-portal-auth.controller";
import { PatientPortalAuthService } from "./auth/patient-portal-auth.service";
import { PatientPortalJwtStrategy } from "./auth/patient-portal-jwt.strategy";
import { PatientDashboardController } from "./dashboard/patient-dashboard.controller";
import { PatientDashboardService } from "./dashboard/patient-dashboard.service";
import { PatientPortalAuthGuard } from "./guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "./guards/patient-portal-facility.guard";
import { PatientMessagesController } from "./messages/patient-messages.controller";
import { PatientMessagesStaffController } from "./messages/patient-messages-staff.controller";
import { PatientMessagesService } from "./messages/patient-messages.service";
import { PatientOrganizationsController } from "./organizations/patient-organizations.controller";
import { PatientOrganizationsService } from "./organizations/patient-organizations.service";
import { PatientPortalActivationController } from "./organizations/patient-portal-activation.controller";
import { PatientPortalActivationService } from "./organizations/patient-portal-activation.service";
import { PatientPortalStaffActivationController } from "./organizations/patient-portal-staff-activation.controller";
import { PatientPortalAuditService } from "./patient-portal-audit.service";
import { PatientPortalActivationRepository } from "./persistence/patient-portal-activation.repository";
import { PatientPortalRepository } from "./persistence/patient-portal.repository";
import { PatientProfileController } from "./profile/patient-profile.controller";
import { PatientProfileService } from "./profile/patient-profile.service";
import { PatientDiagnosticResultsController } from "./records/patient-diagnostic-results.controller";
import { PatientDiagnosticResultsService } from "./records/patient-diagnostic-results.service";
import { PatientDocumentReleaseController } from "./records/patient-document-release.controller";
import { PatientDocumentReleaseService } from "./records/patient-document-release.service";
import { PatientDocumentsController } from "./records/patient-documents.controller";
import { PatientDocumentsService } from "./records/patient-documents.service";
import { PatientMedicationsController } from "./records/patient-medications.controller";
import { PatientMedicationsService } from "./records/patient-medications.service";
import { PatientRecordsController } from "./records/patient-records.controller";
import { PatientRecordsService } from "./records/patient-records.service";

@Module({
  imports: [PassportModule, PrismaModule, DocumentsModule, JwtModule.register({})],
  controllers: [
    PatientPortalAuthController,
    PatientOrganizationsController,
    PatientPortalActivationController,
    PatientPortalStaffActivationController,
    PatientDashboardController,
    PatientRecordsController,
    PatientDocumentsController,
    PatientDocumentReleaseController,
    PatientDiagnosticResultsController,
    PatientMedicationsController,
    PatientAppointmentsController,
    PatientProfileController,
    PatientMessagesController,
    PatientMessagesStaffController,
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
    PatientDashboardService,
    PatientRecordsService,
    PatientDocumentsService,
    PatientDocumentReleaseService,
    PatientDiagnosticResultsService,
    PatientMedicationsService,
    PatientAppointmentsService,
    PatientProfileService,
    PatientMessagesService,
    AuditService,
  ],
  exports: [
    PatientPortalRepository,
    PatientPortalAuthGuard,
    PatientPortalFacilityGuard,
  ],
})
export class PatientPortalModule {}
