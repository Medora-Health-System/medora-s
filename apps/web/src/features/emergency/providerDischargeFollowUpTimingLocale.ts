/**
 * MEDUI.ED.DISCHARGE.I18N_REMEDIATION.1 — centralized follow-up timing localization.
 * Registry stores canonical EN keys only; localized at extract/render time.
 */

import type { SupportedLanguage } from "@/i18n/config";
import type { ProviderDischargeFollowUpRow } from "./providerDischargeDocumentationModel";

export type ProviderDischargeFollowUpTimingLocale = SupportedLanguage;

/** MEDUI.ED.DISCHARGE.DIAGNOSIS_INSTRUCTIONS.1 — canonical EN follow-up window keys (registry-internal). */
export const ED_DEFAULT_PCP_FOLLOW_UP_TIMING = "within 1–2 days";
export const ED_DEFAULT_SPECIALIST_FOLLOW_UP_TIMING = "within 1–2 days or as clinically appropriate";
export const ED_DEFAULT_PCP_FOLLOW_UP_TIMING_OR_DIRECTED = "within 1–2 days or as directed";

type LocalizedPair = { en: string; fr: string };

/** Canonical EN registry timing / follow-up window keys → localized display strings. */
export const PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE: Record<string, LocalizedPair> = {
  [ED_DEFAULT_PCP_FOLLOW_UP_TIMING]: {
    en: ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
    fr: "dans 1 à 2 jours",
  },
  [ED_DEFAULT_SPECIALIST_FOLLOW_UP_TIMING]: {
    en: ED_DEFAULT_SPECIALIST_FOLLOW_UP_TIMING,
    fr: "dans 1 à 2 jours ou selon l'avis clinique",
  },
  [ED_DEFAULT_PCP_FOLLOW_UP_TIMING_OR_DIRECTED]: {
    en: ED_DEFAULT_PCP_FOLLOW_UP_TIMING_OR_DIRECTED,
    fr: "dans 1 à 2 jours ou selon les directives",
  },
  "within 1–2 days for high-risk wounds": {
    en: "within 1–2 days for high-risk wounds",
    fr: "dans 1 à 2 jours pour les plaies à haut risque",
  },
  "within 24 hours": { en: "within 24 hours", fr: "dans les 24 heures" },
  "within 1 week": { en: "within 1 week", fr: "dans 1 semaine" },
  "within 2 weeks": { en: "within 2 weeks", fr: "dans 2 semaines" },
  "within 1–3 days if fever persists": {
    en: "within 1–3 days if fever persists",
    fr: "dans 1 à 3 jours si la fièvre persiste",
  },
  "within 1–3 days or as directed": {
    en: "within 1–3 days or as directed",
    fr: "dans 1 à 3 jours ou selon les directives",
  },
  "within 24–72 hours or as directed": {
    en: "within 24–72 hours or as directed",
    fr: "dans les 24 à 72 heures ou selon les directives",
  },
  "within 3–7 days or as directed": {
    en: "within 3–7 days or as directed",
    fr: "dans 3 à 7 jours ou selon les directives",
  },
  "3–5 days if advised": { en: "3–5 days if advised", fr: "3 à 5 jours si recommandé" },
  "as directed": { en: "as directed", fr: "selon les directives" },
  "as directed by dialysis team": {
    en: "as directed by dialysis team",
    fr: "selon les directives de l'équipe de dialyse",
  },
  "for recurrent or severe symptoms": {
    en: "for recurrent or severe symptoms",
    fr: "en cas de symptômes récurrents ou graves",
  },
  "for persistent or recurrent symptoms": {
    en: "for persistent or recurrent symptoms",
    fr: "en cas de symptômes persistants ou récurrents",
  },
  "for persistent vestibular symptoms": {
    en: "for persistent vestibular symptoms",
    fr: "en cas de symptômes vestibulaires persistants",
  },
  "for recurrent or complicated illness": {
    en: "for recurrent or complicated illness",
    fr: "en cas de maladie récurrente ou compliquée",
  },
  "for recurrent or complicated symptoms": {
    en: "for recurrent or complicated symptoms",
    fr: "en cas de symptômes récurrents ou compliqués",
  },
  "for recurrent or persistent bleeding": {
    en: "for recurrent or persistent bleeding",
    fr: "en cas de saignement récurrent ou persistant",
  },
  "for recurrent or worsening symptoms": {
    en: "for recurrent or worsening symptoms",
    fr: "en cas de symptômes récurrents ou aggravés",
  },
  "for wound check or suture removal if advised": {
    en: "for wound check or suture removal if advised",
    fr: "pour contrôle de plaie ou retrait de sutures si recommandé",
  },
  "for persistent concussion symptoms": {
    en: "for persistent concussion symptoms",
    fr: "en cas de symptômes persistants de commotion",
  },
  "for allergy follow-up as arranged": {
    en: "for allergy follow-up as arranged",
    fr: "pour suivi allergologique selon les arrangements prévus",
  },
  "if bleeding recurs": { en: "if bleeding recurs", fr: "si les saignements réapparaissent" },
  "if breathing symptoms persist or worsen": {
    en: "if breathing symptoms persist or worsen",
    fr: "si les symptômes respiratoires persistent ou s'aggravent",
  },
  "if breathing symptoms recur or worsen": {
    en: "if breathing symptoms recur or worsen",
    fr: "si les symptômes respiratoires réapparaissent ou s'aggravent",
  },
  "if hydration concerns persist": {
    en: "if hydration concerns persist",
    fr: "si les préoccupations d'hydratation persistent",
  },
  "if new or worsening symptoms develop": {
    en: "if new or worsening symptoms develop",
    fr: "si de nouveaux symptômes apparaissent ou si l'état s'aggrave",
  },
  "if rash spreads or concerns develop": {
    en: "if rash spreads or concerns develop",
    fr: "si l'éruption s'étend ou si de nouvelles préoccupations apparaissent",
  },
  "if symptoms persist": { en: "if symptoms persist", fr: "si les symptômes persistent" },
  "if symptoms persist beyond expected recovery": {
    en: "if symptoms persist beyond expected recovery",
    fr: "si les symptômes persistent au-delà de la récupération attendue",
  },
  "if symptoms recur before cardiology follow-up": {
    en: "if symptoms recur before cardiology follow-up",
    fr: "si les symptômes réapparaissent avant le suivi cardiologique",
  },
  "if vomiting persists beyond expected recovery": {
    en: "if vomiting persists beyond expected recovery",
    fr: "si les vomissements persistent au-delà de la récupération attendue",
  },
  "if worsening or recurrent": {
    en: "if worsening or recurrent",
    fr: "en cas d'aggravation ou de récidive",
  },
  "Allergy / Immunology if recurrent or trigger unclear": {
    en: "Allergy / Immunology if recurrent or trigger unclear",
    fr: "Allergologie / immunologie si récidive ou déclencheur incertain",
  },
  "Behavioral health / substance-use resources as appropriate": {
    en: "Behavioral health / substance-use resources as appropriate",
    fr: "Ressources en santé comportementale / consommation selon le cas",
  },
  "Behavioral health follow-up as appropriate": {
    en: "Behavioral health follow-up as appropriate",
    fr: "Suivi en santé comportementale selon le cas",
  },
  "Endocrinology follow-up as directed": {
    en: "Endocrinology follow-up as directed",
    fr: "Suivi endocrinologique selon les directives",
  },
};

export const PROVIDER_DISCHARGE_FOLLOW_UP_COMMENTS_LOCALE: Record<string, LocalizedPair> = {
  "Dentist or oral surgery as directed": {
    en: "Dentist or oral surgery as directed",
    fr: "Dentiste ou chirurgie buccale selon les directives",
  },
};

const EN_TO_FR_TIMING = new Map<string, string>();
const FR_TO_EN_TIMING = new Map<string, string>();

for (const pair of Object.values(PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE)) {
  EN_TO_FR_TIMING.set(pair.en, pair.fr);
  FR_TO_EN_TIMING.set(pair.fr.toLowerCase(), pair.en);
}

function normalizeDash(s: string): string {
  return s.replace(/\u2013/g, "–").replace(/\u2014/g, "—").trim();
}

/** Resolve stored timing (EN canonical or already localized) back to canonical EN key. */
export function resolveProviderDischargeFollowUpTimingCanonicalKey(timing: string): string | null {
  const normalized = normalizeDash(timing);
  if (PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE[normalized]) return normalized;
  const fromFr = FR_TO_EN_TIMING.get(normalized.toLowerCase());
  if (fromFr) return fromFr;
  for (const [canonical, pair] of Object.entries(PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE)) {
    if (pair.fr.toLowerCase() === normalized.toLowerCase()) return canonical;
    if (pair.en.toLowerCase() === normalized.toLowerCase()) return canonical;
  }
  return null;
}

export function localizeProviderDischargeFollowUpTiming(
  timing: string,
  locale: ProviderDischargeFollowUpTimingLocale
): string {
  const trimmed = normalizeDash(timing);
  if (!trimmed) return "";
  const canonical = resolveProviderDischargeFollowUpTimingCanonicalKey(trimmed) ?? trimmed;
  const pair = PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE[canonical];
  if (!pair) return trimmed;
  return locale === "fr" ? pair.fr : pair.en;
}

export function localizeProviderDischargeFollowUpComments(
  comments: string,
  locale: ProviderDischargeFollowUpTimingLocale
): string {
  const trimmed = comments.trim();
  if (!trimmed) return "";
  const pair = PROVIDER_DISCHARGE_FOLLOW_UP_COMMENTS_LOCALE[trimmed];
  if (!pair) return trimmed;
  return locale === "fr" ? pair.fr : pair.en;
}

export function localizeProviderDischargeFollowUpRow(
  row: ProviderDischargeFollowUpRow,
  locale: ProviderDischargeFollowUpTimingLocale
): ProviderDischargeFollowUpRow {
  return {
    ...row,
    timing: localizeProviderDischargeFollowUpTiming(row.timing, locale),
    comments: localizeProviderDischargeFollowUpComments(row.comments, locale),
  };
}

export function localizeProviderDischargeFollowUpRows(
  rows: ProviderDischargeFollowUpRow[],
  locale: ProviderDischargeFollowUpTimingLocale
): ProviderDischargeFollowUpRow[] {
  return rows.map((row) => localizeProviderDischargeFollowUpRow(row, locale));
}

/** Certification: every registry canonical timing key must have FR text. */
export function auditProviderDischargeFollowUpTimingLocaleCoverage(): string[] {
  const missing: string[] = [];
  for (const [key, pair] of Object.entries(PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE)) {
    if (!pair.en?.trim() || !pair.fr?.trim()) {
      missing.push(`timing:${key}`);
    }
  }
  for (const [key, pair] of Object.entries(PROVIDER_DISCHARGE_FOLLOW_UP_COMMENTS_LOCALE)) {
    if (!pair.en?.trim() || !pair.fr?.trim()) {
      missing.push(`comments:${key}`);
    }
  }
  return missing;
}

/** English timing tokens that must not appear in FR patient-facing output. */
export const PROVIDER_DISCHARGE_FORBIDDEN_ENGLISH_TIMING_IN_FR: readonly RegExp[] = [
  /\bwithin\s+\d/i,
  /\bwithin\s+24\b/i,
  /\bwithin\s+1–2\s+days\b/i,
  /\bas directed\b/i,
  /\bas clinically appropriate\b/i,
  /\bif symptoms persist\b/i,
  /\bfor recurrent\b/i,
  /\byour condition\b/i,
];
