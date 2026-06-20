/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.6
 * Formal age-context policy for pediatric vs adult fever routing (family resolver only).
 */

import { calculateAge } from "@/lib/patientDisplay";

function normalizeIcdCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

export const PEDIATRIC_FEVER_TEMPLATE_ID = "pediatric_fever_v1";
export const ADULT_FEVER_TEMPLATE_ID = "infectious_fever_unknown_source_v1";
export const PEDIATRIC_AGE_MAX_EXCLUSIVE = 18;

export type PediatricFeverAgePolicyStatus =
  | "not_applicable"
  | "pediatric_confirmed"
  | "adult_confirmed"
  | "adult_default_unknown_age"
  | "adult_explicit_label"
  | "needs_review_pediatric_label_no_age";

export type PediatricFeverAgePolicyResult = {
  status: PediatricFeverAgePolicyStatus;
  /** Resolved age in years when derivable from chart context. */
  resolvedAgeYears?: number;
  /** When true, adult fever family minAge guardrail may be waived (unknown-age default). */
  feverAdultDefaultUnknownAge: boolean;
  /** When true, pediatric fever family must not route. */
  blockPediatricFeverFamily: boolean;
  /** When true, resolver should return generic (clinical review required). */
  forceGenericFallback: boolean;
  explicitPediatricLabel: boolean;
  explicitAdultLabel: boolean;
};

const FEVER_EXCLUDED_EXACT = new Set(["R50.2"]);

const PEDIATRIC_LABEL_TOKENS = [
  "pediatric",
  "paediatric",
  "pédiatrique",
  "pediatrique",
  "child",
  "children",
  "enfant",
  "infant",
  "newborn",
  "neonate",
  "neonatal",
  "nourrisson",
  "bébé",
  "bebe",
  "baby",
] as const;

const ADULT_LABEL_TOKENS = [
  "adult",
  "adulte",
  "elderly",
  "geriatric",
  "âgé",
  "personne âgée",
  "personne agee",
] as const;

export function isPediatricFeverIcdCode(code?: string | null): boolean {
  const normalized = normalizeIcdCode(code ?? "");
  if (!normalized) return false;
  if (FEVER_EXCLUDED_EXACT.has(normalized)) return false;
  return normalized === "R50.9" || normalized === "R50.81" || normalized.startsWith("R50");
}

function normalizeLabelText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function labelIncludesToken(labelText: string, token: string): boolean {
  const normalizedToken = normalizeLabelText(token);
  if (!normalizedToken) return false;
  const padded = ` ${labelText} `;
  if (normalizedToken.includes(" ")) {
    return padded.includes(` ${normalizedToken} `);
  }
  return padded.includes(` ${normalizedToken} `);
}

export function detectExplicitPediatricFeverLabel(labelText: string): boolean {
  return PEDIATRIC_LABEL_TOKENS.some((token) => labelIncludesToken(labelText, token));
}

export function detectExplicitAdultFeverLabel(labelText: string): boolean {
  return ADULT_LABEL_TOKENS.some((token) => labelIncludesToken(labelText, token));
}

export function derivePatientAgeYears(input: {
  patientAgeYears?: number | null;
  patientDob?: string | null;
  referenceDate?: string | Date;
}): number | undefined {
  if (
    typeof input.patientAgeYears === "number" &&
    Number.isFinite(input.patientAgeYears) &&
    input.patientAgeYears >= 0
  ) {
    return Math.floor(input.patientAgeYears);
  }
  const dob = input.patientDob?.trim();
  if (!dob) return undefined;

  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  const reference =
    input.referenceDate != null ? new Date(input.referenceDate) : new Date();
  if (Number.isNaN(reference.getTime()) || birth.getTime() > reference.getTime()) {
    return undefined;
  }

  if (input.referenceDate == null) {
    try {
      const computed = calculateAge(dob);
      if (Number.isFinite(computed) && computed >= 0) return Math.floor(computed);
    } catch {
      return undefined;
    }
  }

  const ageMs = reference.getTime() - birth.getTime();
  const years = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
  return years >= 0 ? years : undefined;
}

export function evaluatePediatricFeverAgePolicy(input: {
  code?: string;
  displayName?: string;
  label?: string;
  patientAgeYears?: number | null;
  patientDob?: string | null;
  referenceDate?: string | Date;
}): PediatricFeverAgePolicyResult {
  if (!isPediatricFeverIcdCode(input.code)) {
    return {
      status: "not_applicable",
      feverAdultDefaultUnknownAge: false,
      blockPediatricFeverFamily: false,
      forceGenericFallback: false,
      explicitPediatricLabel: false,
      explicitAdultLabel: false,
    };
  }

  const labelText = normalizeLabelText(
    [input.displayName, input.label, input.code].filter(Boolean).join(" ")
  );
  const explicitPediatricLabel = detectExplicitPediatricFeverLabel(labelText);
  const explicitAdultLabel = detectExplicitAdultFeverLabel(labelText);
  const resolvedAgeYears = derivePatientAgeYears(input);

  if (resolvedAgeYears !== undefined && resolvedAgeYears < PEDIATRIC_AGE_MAX_EXCLUSIVE) {
    return {
      status: "pediatric_confirmed",
      resolvedAgeYears,
      feverAdultDefaultUnknownAge: false,
      blockPediatricFeverFamily: false,
      forceGenericFallback: false,
      explicitPediatricLabel,
      explicitAdultLabel,
    };
  }

  if (resolvedAgeYears !== undefined && resolvedAgeYears >= PEDIATRIC_AGE_MAX_EXCLUSIVE) {
    return {
      status: "adult_confirmed",
      resolvedAgeYears,
      feverAdultDefaultUnknownAge: false,
      blockPediatricFeverFamily: true,
      forceGenericFallback: false,
      explicitPediatricLabel,
      explicitAdultLabel,
    };
  }

  if (explicitPediatricLabel && !explicitAdultLabel) {
    return {
      status: "needs_review_pediatric_label_no_age",
      feverAdultDefaultUnknownAge: false,
      blockPediatricFeverFamily: true,
      forceGenericFallback: true,
      explicitPediatricLabel: true,
      explicitAdultLabel: false,
    };
  }

  if (explicitAdultLabel) {
    return {
      status: "adult_explicit_label",
      feverAdultDefaultUnknownAge: true,
      blockPediatricFeverFamily: true,
      forceGenericFallback: false,
      explicitPediatricLabel,
      explicitAdultLabel: true,
    };
  }

  return {
    status: "adult_default_unknown_age",
    feverAdultDefaultUnknownAge: true,
    blockPediatricFeverFamily: true,
    forceGenericFallback: false,
    explicitPediatricLabel: false,
    explicitAdultLabel: false,
  };
}

export function isAdultToPediatricPreventedOutcome(input: {
  registryTemplateId: string;
  familyTemplateId: string;
  policyStatus: PediatricFeverAgePolicyStatus;
}): boolean {
  if (input.policyStatus === "not_applicable") return false;
  const registryPediatric = input.registryTemplateId.includes("pediatric");
  const familyPediatric = input.familyTemplateId.includes("pediatric");
  return (
    registryPediatric &&
    !familyPediatric &&
    input.familyTemplateId === ADULT_FEVER_TEMPLATE_ID
  );
}

export const PEDIATRIC_FEVER_AGE_POLICY_REPORT = {
  policyVersion: "MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.6",
  rules: [
    "If age < 18: R50.x → pediatric_fever_v1",
    "If age >= 18: R50.x → infectious_fever_unknown_source_v1",
    "If age unavailable: never route pediatric; default to adult fever template",
    "If label explicitly pediatric/child/infant and age unavailable: NEEDS_REVIEW (generic fallback)",
    "If label explicitly adult/elderly and age unavailable: route adult fever template",
  ],
  registryResolverUnchanged: true,
  productionDefaultEnabled: false,
} as const;
