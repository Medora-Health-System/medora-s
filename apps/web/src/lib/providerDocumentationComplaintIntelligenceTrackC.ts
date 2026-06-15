/**
 * MEDUI Track C — Human documentation audit helpers (Medora Gold Standard).
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

export const TRACK_C_PROHIBITED_SUBSTRINGS = [
  "reviewed",
  "ifdocumented",
  "assessment completed",
  "history obtained",
  "evaluation completed",
  "discussed with patient",
  "findings reviewed",
  "symptoms reviewed",
  "consider documenting",
  "assess for",
  "document if verified",
  "review whether",
  "if examined",
  "if present",
  "if obtained",
  "if performed",
  "if indicated",
  "if given",
  "if applicable",
  "when clinically",
  "summarized",
  "considered in differential",
] as const;

const PROHIBITED_KEY_SUBSTRINGS = ["reviewed", "ifdocumented", "considered", "ifgiven", "ifindicated", "ifobtained", "ifperformed", "ifapplicable"] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  const parts = fragmentKey.split(".");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

function containsProhibitedSubstring(value: string): string | null {
  const lower = value.toLowerCase();
  for (const term of TRACK_C_PROHIBITED_SUBSTRINGS) {
    if (lower.includes(term)) return term;
  }
  return null;
}

function containsProhibitedKeySubstring(keySuffix: string): string | null {
  for (const term of PROHIBITED_KEY_SUBSTRINGS) {
    if (keySuffix.includes(term)) return term;
  }
  return null;
}

function auditFragmentKeys(
  fragmentKeys: string[],
  section: string,
  allowReviewLanguage: boolean
): string[] {
  const violations: string[] = [];
  for (const fragmentKey of fragmentKeys) {
    const suffix = fragmentKeySuffix(fragmentKey);
    const keyViolation = allowReviewLanguage ? null : containsProhibitedKeySubstring(suffix);
    if (keyViolation) {
      violations.push(`${section} key "${suffix}" contains prohibited token "${keyViolation}"`);
    }
  }
  return violations;
}

export function collectTrackCViolations(bundle: ProviderDocumentationComplaintIntelligence): string[] {
  const violations: string[] = [];

  violations.push(...auditFragmentKeys(bundle.hpi ?? [], "HPI", false));
  violations.push(...auditFragmentKeys(bundle.rosImportantPositives ?? [], "ROS positive", false));
  violations.push(...auditFragmentKeys(bundle.rosImportantNegatives ?? [], "ROS negative", false));
  violations.push(...auditFragmentKeys(bundle.rosRedFlags ?? [], "ROS red flag", false));
  violations.push(...Object.values(bundle.physicalExam ?? {}).flatMap((keys) => auditFragmentKeys(keys, "Exam", false)));

  violations.push(...auditFragmentKeys(bundle.mdmWorkingAssessment ?? [], "Working assessment", false));
  violations.push(...auditFragmentKeys(bundle.mdmDifferentialSynthesis ?? [], "Differential", false));
  violations.push(...auditFragmentKeys(bundle.mdmRiskStratification ?? [], "Risk stratification", false));
  violations.push(...auditFragmentKeys(bundle.mdmClinicalRationale ?? [], "Medical reasoning", false));
  violations.push(...auditFragmentKeys(bundle.clinicalImpression ?? [], "Impression", false));
  violations.push(...auditFragmentKeys(bundle.mdmPlanSummary ?? [], "Plan", false));
  violations.push(...auditFragmentKeys(bundle.mdmImmediateActionsRationale ?? [], "Immediate actions", false));
  violations.push(...auditFragmentKeys(bundle.mdmAdmitObserveDischarge ?? [], "Disposition", false));
  violations.push(...auditFragmentKeys(bundle.followUpDisposition ?? [], "Follow-up disposition", false));

  violations.push(...auditFragmentKeys(bundle.mdmDataReviewed ?? [], "Data reviewed", true));
  violations.push(...auditFragmentKeys(bundle.reassessment ?? [], "Reassessment", true));

  if (!bundle.mdmRiskStratification?.length) {
    violations.push("Missing mdmRiskStratification section");
  }
  if (!bundle.clinicalImpression?.length) {
    violations.push("Missing clinicalImpression section");
  }
  if (!bundle.mdmPlanSummary?.length) {
    violations.push("Missing mdmPlanSummary (plan) section");
  }

  return violations;
}

export function assertTrackCCompliance(bundle: ProviderDocumentationComplaintIntelligence): void {
  const violations = collectTrackCViolations(bundle);
  if (violations.length > 0) {
    throw new Error(`Track C compliance failed:\n- ${violations.join("\n- ")}`);
  }
}

export function auditTrackCi18nMessageValues(
  messages: Record<string, string>,
  options?: { allowReviewLanguage?: boolean }
): string[] {
  const allowReviewLanguage = options?.allowReviewLanguage ?? false;
  const violations: string[] = [];
  for (const [key, value] of Object.entries(messages)) {
    const keyViolation = allowReviewLanguage ? null : containsProhibitedKeySubstring(key.toLowerCase());
    if (keyViolation) {
      violations.push(`i18n key "${key}" contains prohibited token "${keyViolation}"`);
    }
    const valueViolation = allowReviewLanguage ? null : containsProhibitedSubstring(value);
    if (valueViolation) {
      violations.push(`i18n value for "${key}" contains prohibited phrase "${valueViolation}"`);
    }
  }
  return violations;
}
