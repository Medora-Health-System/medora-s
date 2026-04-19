/** Identifier / coding systems used when mapping Medora entities to FHIR. */

export const MEDORA_SYSTEM_BASE = "https://medora.app/fhir";

export const identifierSystemGlobalMrn = `${MEDORA_SYSTEM_BASE}/identifier/global-mrn`;
export const identifierSystemFacilityMrn = `${MEDORA_SYSTEM_BASE}/identifier/facility-mrn`;

/** LOINC — observation codes */
export const LOINC = {
  bodyTemp: "8310-5",
  heartRate: "8867-4",
  respiratoryRate: "9279-1",
  bpPanel: "85354-9",
  bpSystolic: "8480-6",
  bpDiastolic: "8462-4",
  spo2: "2708-6",
  bodyWeight: "29463-7",
  bodyHeight: "8302-2",
} as const;

/** Distinct LOINC codes used for generated Observation ids (longest suffix matched first when parsing). */
export const VITAL_LOINC_CODES: string[] = [...new Set(Object.values(LOINC))].sort((a, b) => b.length - a.length);

export const UCUM = {
  degC: "Cel",
  perMin: "/min",
  mmHg: "mm[Hg]",
  percent: "%",
  kg: "kg",
  cm: "cm",
} as const;
