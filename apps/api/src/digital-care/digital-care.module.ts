import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import { FacilityConfigurationModule } from "../facility-configuration/facility-configuration.module";
import { PatientMessagesStaffController } from "../patient-portal/messages/patient-messages-staff.controller";
import { PatientMessagesService } from "../patient-portal/messages/patient-messages.service";
import { PatientPortalAuditService } from "../patient-portal/patient-portal-audit.service";
import { PatientPortalRepository } from "../patient-portal/persistence/patient-portal.repository";
import { PatientPortalActivationService } from "../patient-portal/organizations/patient-portal-activation.service";
import { PatientPortalStaffActivationController } from "../patient-portal/organizations/patient-portal-staff-activation.controller";
import { PatientPortalActivationRepository } from "../patient-portal/persistence/patient-portal-activation.repository";
import { PatientDiagnosticResultReleaseController } from "../patient-portal/records/patient-diagnostic-result-release.controller";
import { PatientDiagnosticResultReleaseService } from "../patient-portal/records/patient-diagnostic-result-release.service";
import { DigitalCarePatientRuntimeModule } from "./runtime/digital-care-patient-runtime.module";
import { DigitalCareStaffWorkspaceController } from "./staff/digital-care-staff-workspace.controller";
import { DigitalCareStaffWorkspaceService } from "./staff/digital-care-staff-workspace.service";

const digitalCareImports = [
  PrismaModule,
  FacilityConfigurationModule,
  ...(process.env.PATIENT_PORTAL_ENABLED === "true" ? [DigitalCarePatientRuntimeModule] : []),
];

/**
 * Staff-facing Digital Care runtime is always registered.
 *
 * ADMIN/PROVIDER/RN staff workflows (secure conversations, governed diagnostic
 * result release, and staff patient-app activation) must remain available in the
 * Medora staff application even when the patient-facing portal runtime is
 * feature-gated.
 *
 * When PATIENT_PORTAL_ENABLED=true, the patient Digital Care runtime is mounted
 * through DigitalCarePatientRuntimeModule so /digital-care/v1/me/* routes used by
 * the patient app are available alongside the patient portal.
 */
@Module({
  imports: digitalCareImports,
  controllers: [
    PatientMessagesStaffController,
    PatientDiagnosticResultReleaseController,
    DigitalCareStaffWorkspaceController,
    PatientPortalStaffActivationController,
  ],
  providers: [
    PatientPortalRepository,
    PatientPortalAuditService,
    PatientPortalActivationRepository,
    PatientPortalActivationService,
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