import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PatientMessagesStaffController } from "../patient-portal/messages/patient-messages-staff.controller";
import { PatientMessagesService } from "../patient-portal/messages/patient-messages.service";
import { PatientPortalAuditService } from "../patient-portal/patient-portal-audit.service";
import { PatientPortalRepository } from "../patient-portal/persistence/patient-portal.repository";
import { PatientDiagnosticResultReleaseController } from "../patient-portal/records/patient-diagnostic-result-release.controller";
import { PatientDiagnosticResultReleaseService } from "../patient-portal/records/patient-diagnostic-result-release.service";
import { DigitalCareStaffWorkspaceController } from "./staff/digital-care-staff-workspace.controller";
import { DigitalCareStaffWorkspaceService } from "./staff/digital-care-staff-workspace.service";

/**
 * Staff-facing Digital Care runtime.
 *
 * This module is intentionally registered independently of PATIENT_PORTAL_ENABLED.
 * ADMIN/PROVIDER/RN staff workflows (secure conversations and governed diagnostic
 * result release) must remain available in the Medora staff application even when
 * the patient-facing portal runtime is feature-gated.
 *
 * Patient-facing controllers remain owned by PatientPortalModule and keep their
 * existing feature flag. The shared services below retain facility-scoped queries,
 * role guards, and audit behavior.
 */
@Module({
  imports: [PrismaModule],
  controllers: [
    PatientMessagesStaffController,
    PatientDiagnosticResultReleaseController,
    DigitalCareStaffWorkspaceController,
  ],
  providers: [
    PatientPortalRepository,
    PatientPortalAuditService,
    PatientMessagesService,
    PatientDiagnosticResultReleaseService,
    DigitalCareStaffWorkspaceService,
    AuditService,
  ],
  exports: [
    PatientPortalRepository,
    PatientPortalAuditService,
    PatientMessagesService,
    PatientDiagnosticResultReleaseService,
  ],
})
export class DigitalCareModule {}
