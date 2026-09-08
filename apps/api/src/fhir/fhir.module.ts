import { Module } from "@nestjs/common";
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
import { JurisdictionProfileRegistry } from "./jurisdiction-profile.registry";
import { FhirR4StructuralValidator } from "./fhir-validator";

@Module({
  imports: [PatientsModule, FhirMapperModule],
  controllers: [FhirController, FhirPatientController, FhirEncounterController, FhirObservationController],
  providers: [FhirResourceService, AuditService, FhirCapabilityRegistry, FhirContextGuard, FhirDeploymentGuard, FhirMediaInterceptor, JurisdictionProfileRegistry, FhirR4StructuralValidator],
  exports: [FhirCapabilityRegistry, JurisdictionProfileRegistry],
})
export class FhirModule {}
