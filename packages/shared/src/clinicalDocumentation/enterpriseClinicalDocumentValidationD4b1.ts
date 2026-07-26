/**
 * MEDUI.D4B.1 — Validation vs clinical completeness (separate concerns).
 * Valid JSON ≠ clinically complete documentation.
 */

import type {
  EnterpriseClinicalDocumentCompletenessState,
  EnterpriseClinicalDocumentValidationIssue,
  EnterpriseClinicalDocumentValidationState,
} from "./enterpriseClinicalDocumentContractD4b1.js";

export type EnterpriseClinicalDocumentFieldRule = {
  fieldPath: string;
  required: boolean;
  conditionalOn?: { fieldPath: string; equals: unknown };
  mutuallyExclusiveWith?: ReadonlyArray<string>;
};

export function evaluateEnterpriseClinicalDocumentFieldValidation(input: {
  payload: Record<string, unknown>;
  rules: ReadonlyArray<EnterpriseClinicalDocumentFieldRule>;
  schemaVersion: string;
}): EnterpriseClinicalDocumentValidationState {
  const issues: EnterpriseClinicalDocumentValidationIssue[] = [];
  for (const rule of input.rules) {
    if (rule.conditionalOn) {
      const parent = input.payload[rule.conditionalOn.fieldPath];
      if (parent !== rule.conditionalOn.equals) continue;
    }
    const value = input.payload[rule.fieldPath];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "");
    if (rule.required && missing) {
      issues.push({
        code: "REQUIRED_FIELD",
        severity: "HARD_STOP",
        fieldPath: rule.fieldPath,
        messageKey: "enterpriseClinicalDocumentD4b1.validation.requiredField",
      });
    }
    if (rule.mutuallyExclusiveWith?.length) {
      const present = !missing;
      const othersPresent = rule.mutuallyExclusiveWith.some((p) => {
        const v = input.payload[p];
        return !(v === undefined || v === null || (typeof v === "string" && v.trim() === ""));
      });
      if (present && othersPresent) {
        issues.push({
          code: "MUTUALLY_EXCLUSIVE",
          severity: "HARD_STOP",
          fieldPath: rule.fieldPath,
          messageKey: "enterpriseClinicalDocumentD4b1.validation.mutuallyExclusive",
        });
      }
    }
  }
  // schemaVersion retained for version-specific rule sets in later phases
  void input.schemaVersion;
  return {
    fieldValid: issues.every((i) => i.severity !== "HARD_STOP"),
    issues,
  };
}

export function evaluateEnterpriseClinicalDocumentCompleteness(input: {
  validation: EnterpriseClinicalDocumentValidationState;
  requiredClinicalIndicators: ReadonlyArray<string>;
  presentIndicators: ReadonlyArray<string>;
  acknowledgedExceptions?: ReadonlyArray<string>;
}): EnterpriseClinicalDocumentCompletenessState {
  const acknowledged = input.acknowledgedExceptions ?? [];
  const missing = input.requiredClinicalIndicators.filter(
    (id) => !input.presentIndicators.includes(id) && !acknowledged.includes(id)
  );
  const clinicallyComplete = missing.length === 0;
  const signatureReady = clinicallyComplete && input.validation.fieldValid;
  return {
    clinicallyComplete,
    signatureReady,
    missingIndicators: missing,
    acknowledgedExceptions: acknowledged,
  };
}

export function canSignEnterpriseClinicalDocument(input: {
  completeness: EnterpriseClinicalDocumentCompletenessState;
  allowIncompleteWithException?: boolean;
}): boolean {
  if (input.completeness.signatureReady) return true;
  if (
    input.allowIncompleteWithException &&
    input.completeness.acknowledgedExceptions.length > 0 &&
    input.completeness.missingIndicators.length === 0
  ) {
    return true;
  }
  return false;
}
