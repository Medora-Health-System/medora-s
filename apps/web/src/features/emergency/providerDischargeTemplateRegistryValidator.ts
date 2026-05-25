/**
 * Phase 19Y.3A / 19Y.4A — registry governance validator, collision detection, unsafe phrase scanner.
 * Pure helpers for tests and CI; not shown in patient/provider UI.
 */

import {
  buildProviderDischargeTemplateHashPayload,
  computeProviderDischargeTemplateAppliedHash,
} from "./providerDischargeTemplateAppliedHash";
import {
  getProviderDischargeSuggestedTextBody,
  isNonEmptySuggestedTextBody,
  PROVIDER_DISCHARGE_TEMPLATE_LOCALES,
  scanProviderDischargeSuggestedTextEnglishContaminationInFr,
  scanProviderDischargeSuggestedTextFrenchContaminationInEn,
  suggestedTextBodyBlob,
  type ProviderDischargeTemplateLocale,
  type ProviderDischargeTemplateSuggestedText,
} from "./providerDischargeTemplateLocale";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  type ProviderDischargeTemplate,
} from "./providerDischargeTemplateRegistry";
import { validateProviderDischargeTemplateContentIntegrity } from "./providerDischargeTemplateContentIntegrity";
import {
  validateProviderDischargePediatricTemplateGovernance,
  validateProviderDischargeTemplateAgeRange,
} from "./providerDischargeTemplatePediatricGovernance";

export type ProviderDischargeClinicalReviewStatus = "draft" | "reviewed" | "approved";

export type ProviderDischargeRegistryValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type ProviderDischargeRegistryValidationOptions = {
  /** Normalized keywords allowed to appear in more than one template. */
  allowDuplicateKeywordMappings?: readonly string[];
};

/** Explicit allowlist for cross-template keyword collisions (empty by default). */
export const PROVIDER_DISCHARGE_TEMPLATE_KEYWORD_COLLISION_ALLOWLIST = new Set<string>();

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORY_PATTERN = /^[a-z][a-z0-9_]*$/;

const CLINICAL_REVIEW_STATUSES = new Set<ProviderDischargeClinicalReviewStatus>([
  "draft",
  "reviewed",
  "approved",
]);

/** Forbidden phrases implying unsupported findings, exclusions, or billing-adjacent conclusions. */
export const PROVIDER_DISCHARGE_UNSAFE_TEMPLATE_PHRASES: readonly { id: string; pattern: RegExp }[] = [
  { id: "acs-ruled-out", pattern: /\bacs ruled out\b/i },
  { id: "acs-excluded", pattern: /\bacute coronary syndrome ruled out\b/i },
  { id: "mi-ruled-out", pattern: /\bmi ruled out\b/i },
  { id: "pe-ruled-out", pattern: /\bpe ruled out\b/i },
  { id: "stroke-ruled-out", pattern: /\bstroke ruled out\b/i },
  { id: "sepsis-excluded", pattern: /\bsepsis excluded\b/i },
  { id: "ct-was-normal", pattern: /\bct was normal\b/i },
  { id: "ct-normal", pattern: /\bct normal\b/i },
  { id: "xray-normal", pattern: /\bx-?ray normal\b/i },
  { id: "troponins-negative", pattern: /\btroponins? negative\b/i },
  { id: "labs-normal", pattern: /\blabs normal\b/i },
  { id: "ekg-normal", pattern: /\bekg normal\b/i },
  { id: "ecg-normal", pattern: /\becg normal\b/i },
  { id: "no-ischemic-changes", pattern: /\bno ischemic changes\b/i },
  { id: "patient-improved", pattern: /\bpatient improved\b/i },
  { id: "symptoms-resolved", pattern: /\bsymptoms resolved\b/i },
  { id: "consulted-cardiology", pattern: /\bconsulted cardiology\b/i },
  { id: "critical-care", pattern: /\bcritical care\b/i },
  { id: "admitted-for", pattern: /\badmitted for\b/i },
  { id: "diagnosis-confirmed-by", pattern: /\bdiagnosis confirmed by\b/i },
  { id: "no-emergency-condition", pattern: /\bno emergency condition\b/i },
  { id: "medically-cleared", pattern: /\bmedically cleared\b/i },
  { id: "safe-for-discharge", pattern: /\bsafe for discharge\b/i },
];

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function normalizeIcdCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

function normalizeFamilyPrefix(family: string): string {
  return normalizeIcdCode(family.replace(/\.\*$/, "").replace(/\*$/, ""));
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d;
}

function isValidSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalizedSuggestedText(value: unknown): value is ProviderDischargeTemplateSuggestedText {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return o.en != null && typeof o.en === "object" && o.fr != null && typeof o.fr === "object";
}

export function scanProviderDischargeTemplateUnsafePhrases(
  template: ProviderDischargeTemplate,
  locale?: ProviderDischargeTemplateLocale
): string[] {
  const locales = locale ? [locale] : [...PROVIDER_DISCHARGE_TEMPLATE_LOCALES];
  const hits: string[] = [];
  for (const loc of locales) {
    try {
      const body = getProviderDischargeSuggestedTextBody(template, loc);
      const blob = suggestedTextBodyBlob(body);
      for (const rule of PROVIDER_DISCHARGE_UNSAFE_TEMPLATE_PHRASES) {
        if (rule.pattern.test(blob)) {
          hits.push(`${template.id}: unsafe phrase (${rule.id}) in ${loc}`);
        }
      }
    } catch (err) {
      hits.push(`${template.id}: cannot scan unsafe phrases for ${loc}: ${String(err)}`);
    }
  }
  return hits;
}

export function buildProviderDischargeRegistryGovernanceSnapshot(
  registry: readonly ProviderDischargeTemplate[],
  locale: ProviderDischargeTemplateLocale
): Record<string, unknown>[] {
  return [...registry]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((template) => ({
      id: template.id,
      version: template.version,
      locale,
      clinicalReviewStatus: template.clinicalReviewStatus,
      effectiveFrom: template.effectiveFrom,
      effectiveTo: template.effectiveTo ?? null,
      specialtyCategory: template.specialtyCategory ?? null,
      riskCategory: template.riskCategory ?? null,
      diagnosisMappings: {
        icdExact: [...(template.diagnosisMappings.icdExact ?? [])].map(normalizeIcdCode).sort(),
        icdFamily: [...(template.diagnosisMappings.icdFamily ?? [])].map(normalizeFamilyPrefix).sort(),
        keyword: [...(template.diagnosisMappings.keyword ?? [])].map(normalizeKeyword).sort(),
      },
      sourceReferenceLabels: template.sourceReferences.map((ref) => ref.label.trim()).sort(),
      suggestedTextContentHash: computeProviderDischargeTemplateAppliedHash(template, locale),
      templateAppliedHash: computeProviderDischargeTemplateAppliedHash(template, locale),
    }));
}

export function computeProviderDischargeRegistryGovernanceSnapshotHash(
  registry: readonly ProviderDischargeTemplate[],
  locale: ProviderDischargeTemplateLocale
): string {
  return computeProviderDischargeTemplateAppliedHash(
    {
      id: `__registry_governance_snapshot__${locale}__`,
      version: "1.0.0",
      suggestedText: {
        en: {
          description: stableStringify(buildProviderDischargeRegistryGovernanceSnapshot(registry, locale)),
          diagnosisInstructions: "",
          medicationTreatment: "",
          returnPrecautions: "",
        },
        fr: {
          description: "",
          diagnosisInstructions: "",
          medicationTreatment: "",
          returnPrecautions: "",
        },
      },
      sourceReferences: [{ label: `registry-governance-snapshot-${locale}` }],
      clinicalReviewStatus: "approved",
      effectiveFrom: "1970-01-01",
    },
    "en"
  );
}

export function validateProviderDischargeTemplateRegistry(
  registry: readonly ProviderDischargeTemplate[],
  options?: ProviderDischargeRegistryValidationOptions
): ProviderDischargeRegistryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allowDuplicateKeywords = new Set(
    [...PROVIDER_DISCHARGE_TEMPLATE_KEYWORD_COLLISION_ALLOWLIST, ...(options?.allowDuplicateKeywordMappings ?? [])].map(
      normalizeKeyword
    )
  );

  const seenIds = new Set<string>();
  const exactOwners = new Map<string, string>();
  const familyOwners = new Map<string, string>();
  const keywordOwners = new Map<string, string>();

  for (const template of registry) {
    const prefix = `[${template.id}]`;

    if (seenIds.has(template.id)) {
      errors.push(`${prefix} duplicate template id`);
    }
    seenIds.add(template.id);

    if (!template.version?.trim()) {
      errors.push(`${prefix} missing template version`);
    } else if (!SEMVER_PATTERN.test(template.version.trim())) {
      errors.push(`${prefix} invalid semver: ${template.version}`);
    }

    if (!template.title?.trim()) {
      errors.push(`${prefix} missing title`);
    }

    if (!template.specialtyCategory?.trim()) {
      errors.push(`${prefix} missing specialtyCategory`);
    } else if (!CATEGORY_PATTERN.test(template.specialtyCategory.trim())) {
      errors.push(`${prefix} invalid specialtyCategory format: ${template.specialtyCategory}`);
    }

    if (!template.riskCategory?.trim()) {
      errors.push(`${prefix} missing riskCategory`);
    } else if (!CATEGORY_PATTERN.test(template.riskCategory.trim())) {
      errors.push(`${prefix} invalid riskCategory format: ${template.riskCategory}`);
    }

    if (!template.clinicalReviewStatus) {
      errors.push(`${prefix} missing clinicalReviewStatus`);
    } else if (!CLINICAL_REVIEW_STATUSES.has(template.clinicalReviewStatus)) {
      errors.push(`${prefix} invalid clinicalReviewStatus: ${template.clinicalReviewStatus}`);
    }

    if (!template.effectiveFrom?.trim()) {
      errors.push(`${prefix} missing effectiveFrom`);
    } else if (!isValidIsoDate(template.effectiveFrom.trim())) {
      errors.push(`${prefix} invalid effectiveFrom date: ${template.effectiveFrom}`);
    }

    if (template.effectiveTo !== undefined && template.effectiveTo !== null) {
      const to = template.effectiveTo.trim();
      if (!to) {
        errors.push(`${prefix} effectiveTo is empty when provided`);
      } else if (!isValidIsoDate(to)) {
        errors.push(`${prefix} invalid effectiveTo date: ${template.effectiveTo}`);
      } else if (template.effectiveFrom && isValidIsoDate(template.effectiveFrom.trim())) {
        if (to < template.effectiveFrom.trim()) {
          errors.push(`${prefix} effectiveTo is before effectiveFrom`);
        }
      }
    }

    if (!template.sourceReferences?.length) {
      errors.push(`${prefix} missing sourceReferences`);
    } else {
      template.sourceReferences.forEach((ref, idx) => {
        if (!ref.label?.trim()) {
          errors.push(`${prefix} sourceReferences[${idx}] missing label`);
        }
        if (ref.url?.trim() && !isValidSourceUrl(ref.url.trim())) {
          errors.push(`${prefix} sourceReferences[${idx}] invalid url: ${ref.url}`);
        }
      });
    }

    if (!template.suggestedText || typeof template.suggestedText !== "object") {
      errors.push(`${prefix} missing suggestedText object`);
    } else if (!isLocalizedSuggestedText(template.suggestedText)) {
      errors.push(`${prefix} suggestedText must be locale-separated (en/fr)`);
    } else {
      for (const locale of PROVIDER_DISCHARGE_TEMPLATE_LOCALES) {
        if (!template.suggestedText[locale]) {
          errors.push(`${prefix} missing suggestedText.${locale}`);
        }
      }
    }

    const isGeneric = template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID;
    const mappings = template.diagnosisMappings ?? {};
    const hasMappings =
      (mappings.icdExact?.length ?? 0) > 0 ||
      (mappings.icdFamily?.length ?? 0) > 0 ||
      (mappings.keyword?.length ?? 0) > 0;

    if (!isGeneric && !hasMappings) {
      errors.push(`${prefix} missing diagnosis mappings`);
    }

    if (isLocalizedSuggestedText(template.suggestedText)) {
      for (const locale of PROVIDER_DISCHARGE_TEMPLATE_LOCALES) {
        const body = template.suggestedText[locale];
        if (!body) {
          errors.push(`${prefix} missing suggestedText.${locale} body`);
          continue;
        }
        if (!isGeneric && !isNonEmptySuggestedTextBody(body)) {
          errors.push(`${prefix} non-generic template has empty suggestedText.${locale}`);
        }
        if (locale === "en") {
          errors.push(...scanProviderDischargeSuggestedTextFrenchContaminationInEn(template.id, body));
        }
        if (locale === "fr") {
          errors.push(...scanProviderDischargeSuggestedTextEnglishContaminationInFr(template.id, body));
        }
      }
    }

    errors.push(...scanProviderDischargeTemplateUnsafePhrases(template));
    if (isLocalizedSuggestedText(template.suggestedText)) {
      errors.push(...validateProviderDischargeTemplateContentIntegrity(template));
    }
    errors.push(...validateProviderDischargeTemplateAgeRange(template));
    errors.push(...validateProviderDischargePediatricTemplateGovernance(template));

    for (const exact of mappings.icdExact ?? []) {
      const code = normalizeIcdCode(exact);
      if (!code) continue;
      const owner = exactOwners.get(code);
      if (owner && owner !== template.id) {
        errors.push(`${prefix} duplicate icdExact mapping ${code} (also in ${owner})`);
      } else {
        exactOwners.set(code, template.id);
      }
    }

    for (const family of mappings.icdFamily ?? []) {
      const prefixCode = normalizeFamilyPrefix(family);
      if (!prefixCode) continue;
      const owner = familyOwners.get(prefixCode);
      if (owner && owner !== template.id) {
        errors.push(`${prefix} duplicate icdFamily mapping ${prefixCode} (also in ${owner})`);
      } else {
        familyOwners.set(prefixCode, template.id);
      }
    }

    for (const keyword of mappings.keyword ?? []) {
      const token = normalizeKeyword(keyword);
      if (!token) continue;
      const owner = keywordOwners.get(token);
      if (owner && owner !== template.id && !allowDuplicateKeywords.has(token)) {
        errors.push(`${prefix} duplicate keyword mapping "${token}" (also in ${owner})`);
      } else if (!owner) {
        keywordOwners.set(token, template.id);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
