/**
 * Phase 19Y.11 — behavioral health & substance-use discharge template governance.
 */

import type {
  ProviderDischargeTemplateLocale,
  ProviderDischargeTemplateSuggestedTextBody,
} from "./providerDischargeTemplateLocale";
import {
  getProviderDischargeSuggestedTextBody,
  suggestedTextBodyBlob,
} from "./providerDischargeTemplateLocale";
import type { ProviderDischargeTemplate } from "./providerDischargeTemplateRegistry";
import type { ProviderDischargeFollowUpRow } from "./providerDischargeDocumentationModel";

export type ProviderDischargeTemplateBehavioralHealthSafety = {
  requiresSafetyPlan?: boolean;
  requiresCrisisResources?: boolean;
  requiresSelfHarmEscalation?: boolean;
  requiresHomicideRiskEscalation?: boolean;
  requiresSubstanceUseResources?: boolean;
  requiresWithdrawalPrecautions?: boolean;
  requiresCapacityCaution?: boolean;
  requiresPrivacySensitiveWording?: boolean;
  requiresBehavioralHealthFollowUp?: boolean;
};

const BEHAVIORAL_HEALTH_FOLLOW_UP_SPECIALTIES = new Set([
  "BEHAVIORAL_HEALTH",
  "PSYCHIATRY",
  "CRISIS_CLINIC",
  "SUBSTANCE_USE",
  "SUBSTANCE_USE_TREATMENT",
]);

export function isBehavioralHealthProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id" | "specialtyCategory">
): boolean {
  if (template.id.startsWith("behavioral_health_") || template.id.startsWith("bh_")) return true;
  return false;
}

export const PROVIDER_DISCHARGE_BH_FORBIDDEN_PHRASES: readonly { id: string; pattern: RegExp }[] = [
  { id: "psychiatrically-cleared", pattern: /\bpsychiatrically cleared\b/i },
  { id: "cleared-by-psychiatry", pattern: /\bcleared by psychiatry\b/i },
  { id: "denies-si", pattern: /\bdenies si\b/i },
  { id: "denies-hi", pattern: /\bdenies hi\b/i },
  { id: "no-suicidal-ideation", pattern: /\bno suicidal ideation\b/i },
  { id: "no-homicidal-ideation", pattern: /\bno homicidal ideation\b/i },
  { id: "no-hallucinations", pattern: /\bno hallucinations\b/i },
  { id: "no-delusions", pattern: /\bno delusions\b/i },
  { id: "low-suicide-risk", pattern: /\blow risk for suicide\b/i },
  { id: "safe-for-discharge", pattern: /\bsafe for discharge\b/i },
  { id: "has-capacity", pattern: /\bhas capacity\b/i },
  { id: "lacks-capacity", pattern: /\blacks capacity\b/i },
  { id: "competent", pattern: /\bcompetent\b/i },
  { id: "incompetent", pattern: /\bincompetent\b/i },
  { id: "intoxication-resolved", pattern: /\bintoxication resolved\b/i },
  { id: "clinically-sober", pattern: /\bclinically sober\b/i },
  { id: "withdrawal-ruled-out", pattern: /\bwithdrawal ruled out\b/i },
  { id: "no-withdrawal-risk", pattern: /\bno withdrawal risk\b/i },
  { id: "medically-cleared", pattern: /\bmedically cleared\b/i },
  { id: "sud-ruled-out", pattern: /\bsubstance use disorder ruled out\b/i },
];

export const PROVIDER_DISCHARGE_BH_EN_ESCALATION_MARKERS = [
  "thoughts of self-harm",
  "thoughts of harming others",
  "worsening hallucinations",
  "confusion",
  "severe agitation",
  "withdrawal symptoms",
  "call 911",
  "crisis line",
  "return immediately",
] as const;

export const PROVIDER_DISCHARGE_BH_FR_ESCALATION_MARKERS = [
  "idées de se faire du mal",
  "idées de faire du mal à autrui",
  "hallucinations qui s'aggravent",
  "confusion",
  "agitation sévère",
  "symptômes de sevrage",
  "appelez le 911",
  "ligne de crise",
  "retournez immédiatement",
] as const;

export const PROVIDER_DISCHARGE_BH_EN_CRISIS_RESOURCE_MARKERS = [
  "crisis line",
  "call 911",
  "crisis resources",
  "return immediately",
  "thoughts of self-harm",
] as const;

export const PROVIDER_DISCHARGE_BH_FR_CRISIS_RESOURCE_MARKERS = [
  "ligne de crise",
  "appelez le 911",
  "ressources de crise",
  "retournez immédiatement",
  "idées de se faire du mal",
] as const;

export const PROVIDER_DISCHARGE_BH_EN_SUBSTANCE_RESOURCE_MARKERS = [
  "substance use treatment",
  "recovery resources",
  "avoid alcohol",
  "avoid substances",
  "behavioral health",
  "substance use follow-up",
] as const;

export const PROVIDER_DISCHARGE_BH_FR_SUBSTANCE_RESOURCE_MARKERS = [
  "traitement des troubles liés aux substances",
  "ressources de rétablissement",
  "évitez l'alcool",
  "évitez les substances",
  "santé comportementale",
  "suivi en usage de substances",
] as const;

export const PROVIDER_DISCHARGE_BH_EN_WITHDRAWAL_MARKERS = [
  "withdrawal symptoms",
  "symptoms of withdrawal",
] as const;

export const PROVIDER_DISCHARGE_BH_FR_WITHDRAWAL_MARKERS = [
  "symptômes de sevrage",
  "signes de sevrage",
] as const;

export const PROVIDER_DISCHARGE_BH_PRIVACY_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "partner-named", pattern: /\bpartner (?:named|is|was)\b/i },
  { id: "family-named", pattern: /\bfamily member (?:named|is|was)\b/i },
  { id: "assault-confirmed", pattern: /\bassault (?:was )?confirmed\b/i },
  { id: "abuse-confirmed", pattern: /\babuse (?:was )?confirmed\b/i },
  { id: "consent-was", pattern: /\bconsent was\b/i },
  { id: "legal-conclusion", pattern: /\blegal conclusion\b/i },
  { id: "involuntary-hold", pattern: /\binvoluntary hold\b/i },
  { id: "held-involuntarily", pattern: /\bheld involuntarily\b/i },
  { id: "no-assault", pattern: /\bno assault occurred\b/i },
];

function scanMarkersMissing(blob: string, markers: readonly string[]): boolean {
  return !markers.some((marker) => blob.includes(marker.toLowerCase()));
}

function followUpSpecialtyMatchesBehavioralHealth(row: ProviderDischargeFollowUpRow): boolean {
  return BEHAVIORAL_HEALTH_FOLLOW_UP_SPECIALTIES.has(row.specialty.trim().toUpperCase());
}

function validateBehavioralHealthSafetyMetadata(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];
  const safety = template.behavioralHealthSafety;

  if (!safety || typeof safety !== "object") {
    errors.push(`${prefix} behavioral health template must define behavioralHealthSafety`);
    return errors;
  }

  if (
    (template.id.includes("self_harm") || template.id.includes("suicide")) &&
    safety.requiresCrisisResources !== true
  ) {
    errors.push(`${prefix} self-harm/suicide template must set requiresCrisisResources: true`);
  }

  if (
    (template.id.includes("self_harm") || template.id.includes("suicide")) &&
    safety.requiresSelfHarmEscalation !== true
  ) {
    errors.push(`${prefix} self-harm/suicide template must set requiresSelfHarmEscalation: true`);
  }

  if (template.id.includes("substance") && safety.requiresSubstanceUseResources !== true) {
    errors.push(`${prefix} substance-use template must set requiresSubstanceUseResources: true`);
  }

  if (template.id.includes("withdrawal") && safety.requiresWithdrawalPrecautions !== true) {
    errors.push(`${prefix} withdrawal-sensitive template must set requiresWithdrawalPrecautions: true`);
  }

  if (safety.requiresBehavioralHealthFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasBhFollowUp = rows.some((row) => followUpSpecialtyMatchesBehavioralHealth(row));
    if (!hasBhFollowUp) {
      errors.push(
        `${prefix} requiresBehavioralHealthFollowUp but no behavioral health follow-up defaultFollowUps row`
      );
    }
  }

  return errors;
}

export function scanProviderDischargeBehavioralHealthForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_BH_FORBIDDEN_PHRASES) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: behavioral health forbidden phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

export function scanProviderDischargeBehavioralHealthEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_BH_EN_ESCALATION_MARKERS
    : PROVIDER_DISCHARGE_BH_FR_ESCALATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: behavioral health ${locale} body missing escalation language (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeBehavioralHealthCrisisResources(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_BH_EN_CRISIS_RESOURCE_MARKERS
    : PROVIDER_DISCHARGE_BH_FR_CRISIS_RESOURCE_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: behavioral health ${locale} body missing crisis resource wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeBehavioralHealthSubstanceUseResources(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_BH_EN_SUBSTANCE_RESOURCE_MARKERS
    : PROVIDER_DISCHARGE_BH_FR_SUBSTANCE_RESOURCE_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: behavioral health ${locale} body missing substance-use resource wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeBehavioralHealthWithdrawalPrecautions(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_BH_EN_WITHDRAWAL_MARKERS
    : PROVIDER_DISCHARGE_BH_FR_WITHDRAWAL_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: behavioral health ${locale} body missing withdrawal precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeBehavioralHealthPrivacyContent(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_BH_PRIVACY_FORBIDDEN_PHRASES) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: behavioral health privacy violation (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

export function validateProviderDischargeBehavioralHealthTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isBehavioralHealthProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateBehavioralHealthSafetyMetadata(template)];
  const prefix = `[${template.id}]`;
  const safety = template.behavioralHealthSafety;
  if (!safety) return errors;

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate behavioral health governance for ${locale}: ${String(err)}`);
      continue;
    }

    errors.push(...scanProviderDischargeBehavioralHealthEscalationLanguage(template.id, locale, body));
    errors.push(...scanProviderDischargeBehavioralHealthForbiddenPhrases(template.id, locale, body));

    if (safety.requiresCrisisResources === true) {
      errors.push(...scanProviderDischargeBehavioralHealthCrisisResources(template.id, locale, body));
    }

    if (safety.requiresSubstanceUseResources === true) {
      errors.push(...scanProviderDischargeBehavioralHealthSubstanceUseResources(template.id, locale, body));
    }

    if (safety.requiresWithdrawalPrecautions === true) {
      errors.push(...scanProviderDischargeBehavioralHealthWithdrawalPrecautions(template.id, locale, body));
    }

    if (safety.requiresPrivacySensitiveWording === true) {
      errors.push(...scanProviderDischargeBehavioralHealthPrivacyContent(template.id, locale, body));
    }
  }

  return errors;
}

export function scanProviderDischargeBehavioralHealthTemplateGovernanceWarnings(
  template: ProviderDischargeTemplate
): string[] {
  if (!isBehavioralHealthProviderDischargeTemplateCandidate(template)) return [];
  if (!template.behavioralHealthSafety?.requiresPrivacySensitiveWording) return [];

  const warnings: string[] = [];
  for (const locale of ["en", "fr"] as const) {
    try {
      const body = getProviderDischargeSuggestedTextBody(template, locale);
      const blob = suggestedTextBodyBlob(body).toLowerCase();
      if (!blob.includes("private") && !blob.includes("confidential") && !blob.includes("confidentiel")) {
        warnings.push(
          `${template.id}: behavioral health ${locale} privacy-sensitive template missing neutral privacy wording`
        );
      }
    } catch {
      // Body errors handled by validateProviderDischargeBehavioralHealthTemplateGovernance.
    }
  }
  return warnings;
}

export function normalizeBehavioralHealthSafetyForHash(
  safety: ProviderDischargeTemplateBehavioralHealthSafety | undefined
): Record<string, boolean> | null {
  if (!safety) return null;
  const keys = [
    "requiresSafetyPlan",
    "requiresCrisisResources",
    "requiresSelfHarmEscalation",
    "requiresHomicideRiskEscalation",
    "requiresSubstanceUseResources",
    "requiresWithdrawalPrecautions",
    "requiresCapacityCaution",
    "requiresPrivacySensitiveWording",
    "requiresBehavioralHealthFollowUp",
  ] as const satisfies readonly (keyof ProviderDischargeTemplateBehavioralHealthSafety)[];
  const out: Record<string, boolean> = {};
  for (const key of keys) {
    if (safety[key] === true) out[key] = true;
  }
  return Object.keys(out).length ? out : null;
}
