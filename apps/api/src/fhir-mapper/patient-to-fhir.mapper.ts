import type { Patient, PatientSex, SexAtBirth } from "@prisma/client";
import type { FhirAdministrativeGender, FhirPatient } from "./fhir-resource.types";
import { identifierSystemFacilityMrn, identifierSystemGlobalMrn } from "./fhir-systems";

function mapSexToAdministrativeGender(sex: PatientSex, sexAtBirth: SexAtBirth | null): FhirAdministrativeGender {
  switch (sex) {
    case "MALE":
      return "male";
    case "FEMALE":
      return "female";
    case "OTHER":
      return "other";
    case "UNKNOWN":
    default:
      if (sexAtBirth === "M") return "male";
      if (sexAtBirth === "F") return "female";
      if (sexAtBirth === "X") return "other";
      return "unknown";
  }
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Maps a Prisma `Patient` row to a FHIR R4 Patient resource (JSON).
 * Read-only: does not persist or alter database state.
 */
export function mapPatientToFhir(patient: Patient): FhirPatient {
  const identifiers: FhirPatient["identifier"] = [
    { system: identifierSystemGlobalMrn, value: patient.globalMrn },
  ];
  if (patient.mrn) {
    identifiers.push({ system: identifierSystemFacilityMrn, value: patient.mrn });
  }

  const telecom: FhirPatient["telecom"] = [];
  if (patient.phone) {
    telecom.push({ system: "phone", value: patient.phone, use: "mobile" });
  }
  if (patient.email) {
    telecom.push({ system: "email", value: patient.email });
  }

  const address: FhirPatient["address"] = [];
  if (patient.address || patient.city || patient.country) {
    address.push({
      line: patient.address ? [patient.address] : undefined,
      city: patient.city ?? undefined,
      country: patient.country ?? undefined,
    });
  }

  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: identifiers,
    name: [{ family: patient.lastName, given: [patient.firstName] }],
    gender: mapSexToAdministrativeGender(patient.sex, patient.sexAtBirth),
    birthDate: patient.dob ? toDateOnly(patient.dob) : undefined,
    telecom: telecom.length ? telecom : undefined,
    address: address.length ? address : undefined,
  };
}
