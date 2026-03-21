import { PatientSex, SexAtBirth } from "@prisma/client";

/** Registration form values → Prisma enums (dual-write `sexAtBirth` + `sex`). */
export const REGISTRATION_SEX_TO_SEX_AT_BIRTH: Record<string, SexAtBirth> = {
  HOMME: SexAtBirth.M,
  FEMME: SexAtBirth.F,
  AUTRE: SexAtBirth.X,
  INCONNU: SexAtBirth.U,
};

export const REGISTRATION_SEX_TO_PATIENT_SEX: Record<string, PatientSex> = {
  HOMME: PatientSex.MALE,
  FEMME: PatientSex.FEMALE,
  AUTRE: PatientSex.OTHER,
  INCONNU: PatientSex.UNKNOWN,
};

export function sexAtBirthToPatientSex(s: SexAtBirth | null | undefined): PatientSex {
  if (s == null) return PatientSex.UNKNOWN;
  switch (s) {
    case SexAtBirth.M:
      return PatientSex.MALE;
    case SexAtBirth.F:
      return PatientSex.FEMALE;
    case SexAtBirth.X:
      return PatientSex.OTHER;
    case SexAtBirth.U:
    default:
      return PatientSex.UNKNOWN;
  }
}

export function hasNonEmptyVitalsJson(v: unknown): v is Record<string, unknown> {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.keys(v as object).length > 0;
}
