/**
 * MEDUI.CP.1F.1 — One canonical authority for Care Plan template clinical text.
 * Template i18n keys are catalog descriptors — never persisted or shown as clinical narrative.
 */

import { enterpriseCarePlanTemplateClinicalTextEn } from "./enterpriseCarePlanTemplateClinicalText.en.js";
import { enterpriseCarePlanTemplateClinicalTextFr } from "./enterpriseCarePlanTemplateClinicalText.fr.js";
import type { CarePlanTemplateDefinition } from "./enterpriseInterdisciplinaryCarePlansD4b6.js";

export type CarePlanClinicalLocale = "en" | "fr";

export const CARE_PLAN_TEMPLATE_I18N_PREFIX =
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.";

const CLINICAL_ROOT_BY_LOCALE = {
  en: enterpriseCarePlanTemplateClinicalTextEn,
  fr: enterpriseCarePlanTemplateClinicalTextFr,
} as const;

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function flattenClinicalCatalog(locale: CarePlanClinicalLocale): Map<string, string> {
  const root = CLINICAL_ROOT_BY_LOCALE[locale];
  const flat = new Map<string, string>();

  function walk(node: unknown, prefix: string[]) {
    if (node === null || node === undefined || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const next = [...prefix, key];
      if (typeof value === "string") {
        flat.set(`${CARE_PLAN_TEMPLATE_I18N_PREFIX}${next.join(".")}`, value);
      } else if (value && typeof value === "object") {
        walk(value, next);
      }
    }
  }

  walk(root, []);
  return flat;
}

const FLAT_CATALOG_EN = flattenClinicalCatalog("en");
const FLAT_CATALOG_FR = flattenClinicalCatalog("fr");

/** Exact allowlist of canonical template localization keys (never fuzzy-match narrative). */
export const CANONICAL_CARE_PLAN_TEMPLATE_I18N_KEYS: ReadonlySet<string> = (() => {
  const keys = new Set<string>();
  for (const k of FLAT_CATALOG_EN.keys()) keys.add(k);
  for (const k of FLAT_CATALOG_FR.keys()) keys.add(k);
  return keys;
})();

export function isCanonicalCarePlanTemplateI18nKey(value: string): boolean {
  return CANONICAL_CARE_PLAN_TEMPLATE_I18N_KEYS.has(value.trim());
}

export function looksLikeCarePlanTemplateI18nKey(value: string): boolean {
  const v = value.trim();
  return v.startsWith(CARE_PLAN_TEMPLATE_I18N_PREFIX);
}

export function resolveCarePlanTemplateI18nKey(
  key: string,
  locale: CarePlanClinicalLocale = "fr"
): string | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  const catalog = locale === "en" ? FLAT_CATALOG_EN : FLAT_CATALOG_FR;
  const resolved = catalog.get(trimmed);
  if (resolved) return resolved;
  // Nested deferred templates use keys like ...templates.deferred.copd.title
  const fromNested = getByPath(CLINICAL_ROOT_BY_LOCALE[locale], trimmed.replace(CARE_PLAN_TEMPLATE_I18N_PREFIX, ""));
  return typeof fromNested === "string" ? fromNested : null;
}

/**
 * Resolve persisted or template-descriptor text to clinician-readable narrative.
 * Unknown strings pass through unchanged (clinician-authored content).
 * Recognized exact keys try the requested locale, then the alternate locale.
 * Never invent translations for free-text clinician narrative.
 */
export function resolveCarePlanClinicalNarrative(
  value: string | null | undefined,
  locale: CarePlanClinicalLocale = "fr"
): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!isCanonicalCarePlanTemplateI18nKey(raw)) return raw;
  const primary = resolveCarePlanTemplateI18nKey(raw, locale);
  if (primary) return primary;
  const alternate = resolveCarePlanTemplateI18nKey(raw, locale === "en" ? "fr" : "en");
  return alternate ?? raw;
}

/**
 * MEDUI.CP.1F.2 — Clinician-facing Care Plan narrative.
 * Same authority as resolveCarePlanClinicalNarrative; never returns a raw
 * canonical template i18n key as UI fallback.
 */
export function resolveCarePlanClinicalNarrativeForClinician(
  value: string | null | undefined,
  locale: CarePlanClinicalLocale = "fr",
  safeFallback = "—"
): string {
  const resolved = resolveCarePlanClinicalNarrative(value, locale);
  if (!resolved) return "";
  if (isCanonicalCarePlanTemplateI18nKey(resolved)) return safeFallback;
  return resolved;
}

export type ResolvedEnterpriseCarePlanTemplateClinicalText = {
  title: string;
  description: string;
  components: Array<{
    componentId: string;
    kind: CarePlanTemplateDefinition["components"][number]["kind"];
    title: string;
    body: string;
    disciplineHint: CarePlanTemplateDefinition["components"][number]["disciplineHint"];
    safetyDoesNotAuthorizePrecaution: boolean;
    isRecommendationNotOrder: true;
  }>;
};

export function resolveEnterpriseCarePlanTemplateClinicalText(input: {
  template: CarePlanTemplateDefinition;
  locale?: CarePlanClinicalLocale;
}): ResolvedEnterpriseCarePlanTemplateClinicalText {
  const locale = input.locale ?? "fr";
  const { template } = input;
  return {
    title: resolveCarePlanClinicalNarrative(template.titleKey, locale),
    description: resolveCarePlanClinicalNarrative(template.descriptionKey, locale),
    components: template.components.map((c) => ({
      componentId: c.componentId,
      kind: c.kind,
      title: resolveCarePlanClinicalNarrative(c.titleKey, locale),
      body: resolveCarePlanClinicalNarrative(c.bodyKey, locale),
      disciplineHint: c.disciplineHint,
      safetyDoesNotAuthorizePrecaution: c.safetyDoesNotAuthorizePrecaution,
      isRecommendationNotOrder: c.isRecommendationNotOrder,
    })),
  };
}

/** Default activation locale — product clinical language (French). */
export const CARE_PLAN_ACTIVATION_CLINICAL_LOCALE: CarePlanClinicalLocale = "fr";
