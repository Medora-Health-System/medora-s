import { BadRequestException, ConflictException, HttpException, HttpStatus } from "@nestjs/common";

/** PHI-safe structured admission decision errors (D4A.2.1). */
export function throwAdmissionDecisionError(
  code: string,
  messageFr: string,
  opts?: { status?: number; field?: string; requestId?: string | null }
): never {
  const status = opts?.status ?? HttpStatus.BAD_REQUEST;
  const body = {
    statusCode: status,
    code,
    errorCode: code,
    message: messageFr,
    field: opts?.field ?? null,
    requestId: opts?.requestId ?? null,
  };
  if (status === HttpStatus.CONFLICT) {
    throw new ConflictException(body);
  }
  if (status === HttpStatus.BAD_REQUEST) {
    throw new BadRequestException(body);
  }
  throw new HttpException(body, status);
}

export const ADMISSION_ERROR_MESSAGES_FR: Record<string, string> = {
  ADMISSION_PRIMARY_DIAGNOSIS_REQUIRED: "Un diagnostic principal d'admission est requis pour signer.",
  ADMISSION_DIAGNOSIS_NOT_ON_ENCOUNTER:
    "Un diagnostic d'admission sélectionné est introuvable sur cette rencontre.",
  ADMISSION_DUPLICATE_DIAGNOSIS_SELECTION:
    "Le même diagnostic ne peut pas être à la fois principal et secondaire.",
  ADMITTING_SERVICE_REQUIRED: "Le service d'admission est requis pour signer.",
  ADMITTING_SERVICE_INVALID: "Le service d'admission sélectionné est invalide.",
  ADMITTING_SERVICE_OTHER_CLARIFICATION_REQUIRED:
    "Précisez le service d'admission lorsque « Autre » est sélectionné.",
  LEVEL_OF_CARE_REQUIRED: "Le niveau de soins est requis pour signer.",
  LEVEL_OF_CARE_INVALID: "Le niveau de soins sélectionné est invalide.",
  LEVEL_OF_CARE_OTHER_CLARIFICATION_REQUIRED:
    "Précisez le niveau de soins lorsque « Autre » est sélectionné.",
  LEVEL_OF_CARE_UNIT_INCOMPATIBLE: "Le niveau de soins est incompatible avec l'unité demandée.",
  INVALID_SERVICE_LEVEL_OF_CARE_COMBINATION:
    "La combinaison service / niveau de soins n'est pas autorisée.",
  SERVICE_LOC_INCOMPATIBLE: "La combinaison service / niveau de soins n'est pas autorisée.",
  REASON_FOR_ADMISSION_REQUIRED: "Le motif d'admission est requis pour signer.",
  CONDITION_ON_ADMISSION_REQUIRED: "L'état à l'admission est requis pour signer.",
  INITIAL_PLAN_REQUIRED: "Le plan initial (narratif ou structurés) est requis pour signer.",
  ADMISSION_PROVIDER_NOT_AUTHORIZED:
    "Seul un médecin (PROVIDER) ou administrateur peut signer l'admission.",
  ADMISSION_DECISION_ALREADY_SUPERSEDED: "Une décision d'admission plus récente existe déjà.",
  ADMISSION_ALREADY_SIGNED: "La décision d'admission est déjà signée.",
  ADMISSION_DECISION_STALE: "Le dossier d'admission a été modifié ailleurs. Actualisez et réessayez.",
  ENCOUNTER_NOT_EDITABLE: "La rencontre n'est plus modifiable pour une décision d'admission.",
  ADMISSION_SIGNATURE_METADATA_REQUIRED:
    "Le médecin responsable (signature) est requis pour signer.",
  ADMISSION_DISPOSITION_REQUIRED:
    "La disposition doit être Admission ou Observation pour signer ce dossier.",
  NURSING_DISPOSITION_STALE: "La documentation infirmière a été modifiée ailleurs. Actualisez.",
  DEPARTURE_ALREADY_COMPLETED: "Le départ des urgences est déjà documenté comme terminé.",
    PLACEMENT_DESTINATION_LOCKED:
      "La destination d'observation ou d'admission ne peut plus être modifiée : une demande de placement est déjà engagée.",
    INPATIENT_DISABLED_BY_PROFILE:
      "Cet établissement n'autorise pas l'admission hospitalière locale. Choisissez l'observation ou un transfert externe.",
};
