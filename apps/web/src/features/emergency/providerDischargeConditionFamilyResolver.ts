/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.1
 * Condition-family resolver — additive scaffold; registry resolution unchanged in production.
 */

import {
  getRoutableClinicalConditionFamilies,
  type ClinicalConditionFamilyDefinition,
  type ClinicalConditionFamilyId,
} from "./providerDischargeConditionFamilies";
import {
  evaluatePediatricFeverAgePolicy,
  isPediatricFeverIcdCode,
} from "./providerDischargePediatricFeverAgePolicy";
import { GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID } from "./providerDischargeTemplateRegistry";

export type ClinicalConditionFamilyMatchLevel =
  | "icdExact"
  | "icdPrefix"
  | "keyword"
  | "generic";

export type ClinicalConditionFamilyResolveContext = {
  /** Patient age in years when available from chart context. */
  patientAgeYears?: number;
  /** Patient date of birth (ISO) — used to derive age when years not supplied. */
  patientDob?: string;
  /** Documented patient sex when available. */
  patientSex?: "female" | "male" | "unknown";
  /** Explicit pregnancy context when available. */
  isPregnant?: boolean;
  /** Encounter billing/class context when available from chart. */
  encounterClass?: "ED" | "INPATIENT" | "OBSERVATION" | "OUTPATIENT";
  /** Fever policy: waive adult fever minAge when unknown age defaults to adult template. */
  feverAdultDefaultUnknownAge?: boolean;
  /** Fever policy: force generic when pediatric label lacks age confirmation. */
  feverForceGenericFallback?: boolean;
};

export type ClinicalConditionFamilyResolveResult = {
  familyId: ClinicalConditionFamilyId | null;
  family: ClinicalConditionFamilyDefinition | null;
  templateId: string;
  matchLevel: ClinicalConditionFamilyMatchLevel;
  matchedPrefix?: string;
  matchedKeyword?: string;
};

function normalizeIcdCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Short tokens (e.g. "uti") must not match inside unrelated words ("precautions"). */
function labelIncludesKeyword(labelText: string, keyword: string): boolean {
  const token = normalizeToken(keyword);
  if (!token) return false;
  if (token.length <= 4) {
    return new RegExp(`\\b${escapeRegExp(token)}\\b`).test(labelText);
  }
  return labelText.includes(token);
}

function prefixToken(raw: string): string {
  return normalizeIcdCode(raw.replace(/\.\*$/, "").replace(/\*$/, ""));
}

function isExcluded(code: string, family: ClinicalConditionFamilyDefinition): boolean {
  for (const exact of family.excludeIcdExact ?? []) {
    if (code === normalizeIcdCode(exact)) return true;
  }
  for (const prefix of family.excludeIcdPrefixes ?? []) {
    const p = prefixToken(prefix);
    if (p && code.startsWith(p)) return true;
  }
  return false;
}

function passesGuardrails(
  family: ClinicalConditionFamilyDefinition,
  context?: ClinicalConditionFamilyResolveContext
): boolean {
  const age = context?.patientAgeYears;
  const maxAge = family.guardrails?.age?.maxAgeYears;
  const minAge = family.guardrails?.age?.minAgeYears;
  if (maxAge !== undefined) {
    if (age === undefined) return false;
    if (age >= maxAge) return false;
  }
  if (minAge !== undefined) {
    if (age === undefined) {
      if (context?.feverAdultDefaultUnknownAge && family.id === "fever") return true;
      return false;
    }
    if (age < minAge) return false;
  }
  const requiredSex = family.guardrails?.sex?.sex;
  if (requiredSex && context?.patientSex && context.patientSex !== "unknown") {
    if (context.patientSex !== requiredSex) return false;
  }
  if (family.guardrails?.pregnancyContextRequired && context?.isPregnant !== true) {
    return false;
  }
  return true;
}

function templateIdForFamily(
  family: ClinicalConditionFamilyDefinition,
  code: string
): string {
  const normalized = normalizeIcdCode(code);
  const override = family.icdExactTemplateOverrides?.[normalized];
  if (override) return override;
  for (const [exact, templateId] of Object.entries(family.icdExactTemplateOverrides ?? {})) {
    if (normalized === normalizeIcdCode(exact)) return templateId;
  }
  return family.templateId;
}

function resultFromFamily(
  family: ClinicalConditionFamilyDefinition,
  code: string,
  matchLevel: ClinicalConditionFamilyMatchLevel,
  extra?: { matchedPrefix?: string; matchedKeyword?: string }
): ClinicalConditionFamilyResolveResult {
  return {
    familyId: family.id,
    family,
    templateId: templateIdForFamily(family, code),
    matchLevel,
    ...extra,
  };
}

function buildEffectiveFamilyResolveContext(
  input: {
    code?: string;
    displayName?: string;
    label?: string;
    context?: ClinicalConditionFamilyResolveContext;
  }
): ClinicalConditionFamilyResolveContext | undefined {
  const feverPolicy = evaluatePediatricFeverAgePolicy({
    code: input.code,
    displayName: input.displayName,
    label: input.label,
    patientAgeYears: input.context?.patientAgeYears,
    patientDob: input.context?.patientDob,
  });

  const resolvedAge =
    feverPolicy.resolvedAgeYears ?? input.context?.patientAgeYears;

  return {
    ...input.context,
    patientAgeYears: resolvedAge,
    feverAdultDefaultUnknownAge:
      input.context?.feverAdultDefaultUnknownAge ?? feverPolicy.feverAdultDefaultUnknownAge,
    feverForceGenericFallback:
      input.context?.feverForceGenericFallback ?? feverPolicy.forceGenericFallback,
  };
}

export function resolveClinicalConditionFamily(input: {
  code?: string;
  displayName?: string;
  label?: string;
  context?: ClinicalConditionFamilyResolveContext;
}): ClinicalConditionFamilyResolveResult {
  const code = normalizeIcdCode(input.code ?? "");
  const labelText = normalizeToken(
    [input.displayName, input.label, input.code].filter(Boolean).join(" ")
  );
  const context = buildEffectiveFamilyResolveContext(input);

  if (context?.feverForceGenericFallback && isPediatricFeverIcdCode(code)) {
    return {
      familyId: null,
      family: null,
      templateId: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
      matchLevel: "generic",
    };
  }

  const families = getRoutableClinicalConditionFamilies();

  if (code) {
    for (const family of families) {
      if (!passesGuardrails(family, context)) continue;
      if (isExcluded(code, family)) continue;
      for (const exact of family.icdExact ?? []) {
        if (code === normalizeIcdCode(exact)) {
          return resultFromFamily(family, code, "icdExact");
        }
      }
    }

    let bestPrefix: {
      family: ClinicalConditionFamilyDefinition;
      prefixLen: number;
      prefix: string;
    } | null = null;

    for (const family of families) {
      if (!passesGuardrails(family, context)) continue;
      if (isExcluded(code, family)) continue;
      for (const rawPrefix of family.icdPrefixes ?? []) {
        const prefix = prefixToken(rawPrefix);
        if (!prefix || !code.startsWith(prefix)) continue;
        if (!bestPrefix || prefix.length > bestPrefix.prefixLen) {
          bestPrefix = { family, prefixLen: prefix.length, prefix };
        }
      }
    }

    if (bestPrefix) {
      return resultFromFamily(bestPrefix.family, code, "icdPrefix", {
        matchedPrefix: bestPrefix.prefix,
      });
    }
  }

  let bestKeyword: {
    family: ClinicalConditionFamilyDefinition;
    tokenLen: number;
    token: string;
  } | null = null;

  for (const family of families) {
    if (!passesGuardrails(family, context)) continue;
    for (const keyword of family.keywords ?? []) {
      const token = normalizeToken(keyword);
      if (token && labelIncludesKeyword(labelText, keyword)) {
        if (!bestKeyword || token.length > bestKeyword.tokenLen) {
          bestKeyword = { family, tokenLen: token.length, token };
        }
      }
    }
  }

  if (bestKeyword) {
    return resultFromFamily(bestKeyword.family, code, "keyword", {
      matchedKeyword: bestKeyword.token,
    });
  }

  return {
    familyId: null,
    family: null,
    templateId: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
    matchLevel: "generic",
  };
}

/** True when ICD resolution succeeded — keyword must not override an existing ICD match. */
export function conditionFamilyKeywordWouldOverrideIcdMatch(input: {
  code?: string;
  displayName?: string;
  label?: string;
  context?: ClinicalConditionFamilyResolveContext;
}): boolean {
  const code = normalizeIcdCode(input.code ?? "");
  if (!code) return false;
  const icdOnly = resolveClinicalConditionFamily({ ...input, displayName: "", label: "" });
  if (icdOnly.matchLevel === "generic") return false;
  const withLabel = resolveClinicalConditionFamily(input);
  return (
    withLabel.matchLevel === "keyword" &&
    icdOnly.templateId !== withLabel.templateId
  );
}
