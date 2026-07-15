import type { RemoveDiagnosisReasonCode } from "@/lib/chartApi";

export const DIAGNOSIS_REMOVAL_REASON_OPTIONS: Array<{
  code: RemoveDiagnosisReasonCode;
}> = [
  { code: "ENTERED_IN_ERROR" },
  { code: "DUPLICATE_DIAGNOSIS" },
  { code: "DIAGNOSIS_RULED_OUT" },
  { code: "INCORRECT_PATIENT_ENCOUNTER" },
  { code: "MORE_SPECIFIC_SELECTED" },
  { code: "OTHER" },
];
