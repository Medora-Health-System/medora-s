import { Module } from "@nestjs/common";
import { AuditService } from "../common/services/audit.service";
import { FhirMapperModule } from "../fhir-mapper/fhir-mapper.module";
import { PatientsModule } from "../patients/patients.module";
import { FhirEncounterController } from "./fhir-encounter.controller";
import { FhirObservationController } from "./fhir-observation.controller";
import { FhirPatientController } from "./fhir-patient.controller";
import { FhirResourceService } from "./fhir-resource.service";

@Module({
  imports: [PatientsModule, FhirMapperModule],
  controllers: [FhirPatientController, FhirEncounterController, FhirObservationController],
  providers: [FhirResourceService, AuditService],
})
export class FhirModule {}
