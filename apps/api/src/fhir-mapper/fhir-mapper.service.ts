import { Injectable } from "@nestjs/common";
import type { Encounter, Patient } from "@prisma/client";
import { mapEncounterToFhir } from "./encounter-to-fhir.mapper";
import { mapPatientToFhir } from "./patient-to-fhir.mapper";
import type { FhirEncounter, FhirObservation, FhirPatient } from "./fhir-resource.types";
import { mapVitalsJsonToObservations, type VitalsObservationContext } from "./vitals-to-observation.mapper";

/**
 * Isolated FHIR R4 mapping facade. Does not read or write the database;
 * pass Prisma models or JSON from your feature code.
 */
@Injectable()
export class FhirMapperService {
  toFhirPatient(patient: Patient): FhirPatient {
    return mapPatientToFhir(patient);
  }

  toFhirEncounter(encounter: Encounter): FhirEncounter {
    return mapEncounterToFhir(encounter);
  }

  /**
   * Maps stored vitals JSON (encounter `vitals`, patient `latestVitalsJson`, etc.) to FHIR Observation resources.
   */
  vitalsToObservations(vitalsJson: unknown, ctx: VitalsObservationContext): FhirObservation[] {
    return mapVitalsJsonToObservations(vitalsJson, ctx);
  }
}
