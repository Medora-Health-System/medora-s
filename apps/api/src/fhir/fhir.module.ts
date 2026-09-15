import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuditService } from "../common/services/audit.service";
import { FhirMapperModule } from "../fhir-mapper/fhir-mapper.module";
import { PatientsModule } from "../patients/patients.module";
import { FhirEncounterController } from "./fhir-encounter.controller";
import { FhirObservationController } from "./fhir-observation.controller";
import { FhirPatientController } from "./fhir-patient.controller";
import { FhirResourceService } from "./fhir-resource.service";
import { FhirCapabilityRegistry } from "./fhir-capability.registry";
import { FhirController } from "./fhir.controller";
import { FhirContextGuard, FhirDeploymentGuard } from "./fhir-context.guard";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { BASE_PROFILE, FHIR_JURISDICTION_PROFILES, JurisdictionProfileRegistry } from "./jurisdiction-profile.registry";
import { FhirCapabilityGuard } from "./fhir-capability.guard";
import { FhirR4StructuralValidator } from "./fhir-validator";
import { FhirLocationController, FhirOrganizationController, FhirPractitionerController, FhirPractitionerRoleController } from "./fhir-administrative.controller";
import { FhirAdministrativeService } from "./fhir-administrative.service";
import { FhirReferenceResolver } from "./fhir-reference.resolver";
import { FhirSearchService } from "./fhir-search";
import { FhirClinicalService } from "./fhir-clinical.service";
import { FhirCarePlanController, FhirConditionController, FhirDiagnosticReportController, FhirServiceRequestController } from "./fhir-clinical.controller";
import { FhirAllergyIntoleranceController } from "./fhir-allergy-intolerance.controller";
import { FhirAllergyIntoleranceService } from "./fhir-allergy-intolerance.service";
import { FhirMedicationAdministrationController, FhirMedicationRequestController } from "./fhir-medication.controller";
import { FhirMedicationService } from "./fhir-medication.service";
import { FhirDocumentReferenceController } from "./fhir-document-reference.controller";
import { FhirDocumentReferenceService } from "./fhir-document-reference.service";
import { FhirProvenanceController } from "./fhir-provenance.controller";
import { FhirProvenanceService } from "./fhir-provenance.service";
import { FhirMachineIdentityService } from "./fhir-machine-identity.service";
import { FhirMachineCredentialAdminService } from "./fhir-machine-credential-admin.service";
import { FhirMachineStrategy } from "./fhir-machine.strategy";
import { FhirMachineAuthController } from "./fhir-machine-auth.controller";
import { FhirMachineAuditInterceptor } from "./fhir-machine-audit.interceptor";
import { FhirDiagnosticOutboundService } from "./fhir-diagnostic-outbound.service";

@Module({
  imports: [PatientsModule, FhirMapperModule, PassportModule, JwtModule.register({})],
  controllers: [
    FhirController,
    FhirMachineAuthController,
    FhirAllergyIntoleranceController,
    FhirMedicationRequestController,
    FhirMedicationAdministrationController,
    FhirDocumentReferenceController,
    FhirProvenanceController,
    FhirConditionController,
    FhirServiceRequestController,
    FhirDiagnosticReportController,
    FhirCarePlanController,
    FhirPatientController,
    FhirEncounterController,
    FhirObservationController,
    FhirPractitionerController,
    FhirPractitionerRoleController,
    FhirOrganizationController,
    FhirLocationController,
  ],
  providers: [
    FhirResourceService,
    AuditService,
    FhirCapabilityRegistry,
    FhirCapabilityGuard,
    FhirContextGuard,
    FhirDeploymentGuard,
    FhirMediaInterceptor,
    FhirMachineIdentityService,
    FhirMachineCredentialAdminService,
    FhirMachineStrategy,
    FhirMachineAuditInterceptor,
    { provide: FHIR_JURISDICTION_PROFILES, useValue: Object.freeze([BASE_PROFILE]) },
    {
      provide: JurisdictionProfileRegistry,
      inject: [FHIR_JURISDICTION_PROFILES],
      useFactory: (profiles: readonly typeof BASE_PROFILE[]) => new JurisdictionProfileRegistry(profiles),
    },
    FhirR4StructuralValidator,
    FhirAdministrativeService,
    FhirReferenceResolver,
    FhirSearchService,
    FhirClinicalService,
    FhirAllergyIntoleranceService,
    FhirMedicationService,
    FhirDocumentReferenceService,
    FhirProvenanceService,
    FhirDiagnosticOutboundService,
  ],
  exports: [FhirCapabilityRegistry, JurisdictionProfileRegistry, FhirMachineIdentityService, FhirMachineCredentialAdminService, FhirDiagnosticOutboundService],
})
export class FhirModule {}
