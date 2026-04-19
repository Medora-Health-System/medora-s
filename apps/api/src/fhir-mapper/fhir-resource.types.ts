/**
 * Minimal FHIR R4 JSON shapes used by the mapping layer (subset of fields).
 * Full validation is out of scope; consumers may validate with a FHIR server or library.
 */

export type FhirAdministrativeGender = "male" | "female" | "other" | "unknown";

export interface FhirIdentifier {
  system?: string;
  value?: string;
}

export interface FhirHumanName {
  family?: string;
  given?: string[];
}

export interface FhirContactPoint {
  system?: "phone" | "fax" | "email" | "pager" | "url" | "sms" | "other";
  value?: string;
  use?: "home" | "work" | "temp" | "old" | "mobile";
}

export interface FhirAddress {
  line?: string[];
  city?: string;
  country?: string;
}

export interface FhirPatient {
  resourceType: "Patient";
  id?: string;
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  gender?: FhirAdministrativeGender;
  birthDate?: string;
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
}

export type FhirEncounterStatus =
  | "planned"
  | "arrived"
  | "triaged"
  | "in-progress"
  | "onleave"
  | "finished"
  | "cancelled"
  | "entered-in-error"
  | "unknown";

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirReference {
  reference?: string;
  display?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirEncounterClass {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirEncounter {
  resourceType: "Encounter";
  id?: string;
  status: FhirEncounterStatus;
  class: FhirEncounterClass;
  subject?: FhirReference;
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
}

export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
}

export interface FhirObservation {
  resourceType: "Observation";
  id?: string;
  status: "registered" | "preliminary" | "final" | "amended" | "corrected" | "cancelled" | "entered-in-error" | "unknown";
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantity;
  component?: FhirObservationComponent[];
}
