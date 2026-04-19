export { FhirMapperModule } from "./fhir-mapper.module";
export { FhirMapperService } from "./fhir-mapper.service";
export { mapPatientToFhir } from "./patient-to-fhir.mapper";
export { mapEncounterToFhir } from "./encounter-to-fhir.mapper";
export { mapVitalsJsonToObservations, type VitalsObservationContext } from "./vitals-to-observation.mapper";
export type {
  FhirPatient,
  FhirEncounter,
  FhirObservation,
} from "./fhir-resource.types";
