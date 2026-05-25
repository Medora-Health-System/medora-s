/**
 * Phase 19Y.9 — OB/GYN discharge template governance (metadata + validators).
 * Hooks only in this phase; no OB/GYN diagnosis templates yet.
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

export type ProviderDischargeTemplateObGynSafety = {
  pregnancySensitive?: boolean;
  requiresPregnancyStatusDocumentation?: boolean;
  requiresEctopicPrecautions?: boolean;
  requiresBleedingPrecautions?: boolean;
  requiresPelvicPainPrecautions?: boolean;
  requiresSexualHealthPrivacyWarning?: boolean;
  requiresOBGynFollowUp?: boolean;
};

const OBGYN_FOLLOW_UP_SPECIALTIES = new Set(["OBGYN", "OB_GYN", "OBSTETRICS_GYNECOLOGY"]);
const EMERGENCY_FOLLOW_UP_SPECIALTIES = new Set(["EMERGENCY", "EMERGENCY_MEDICINE"]);

export function isObGynProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id" | "specialtyCategory">
): boolean {
  if (template.id.startsWith("obgyn_")) return true;
  const category = template.specialtyCategory?.trim().toLowerCase();
  return category === "obgyn" || category === "ob_gyn";
}

export const PROVIDER_DISCHARGE_OBGYN_PREGNANCY_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "pregnancy-ruled-out", pattern: /\bpregnancy ruled out\b/i },
  { id: "ectopic-ruled-out", pattern: /\bectopic ruled out\b/i },
  { id: "miscarriage-ruled-out", pattern: /\bmiscarriage ruled out\b/i },
  { id: "not-pregnant", pattern: /\bnot pregnant\b/i },
  { id: "fht-normal", pattern: /\bfetal heart tones normal\b/i },
  { id: "ultrasound-normal", pattern: /\bultrasound normal\b/i },
  { id: "hcg-negative", pattern: /\bhcg negative\b/i },
  { id: "no-ectopic", pattern: /\bno ectopic\b/i },
  { id: "no-miscarriage", pattern: /\bno miscarriage\b/i },
  { id: "viable-pregnancy", pattern: /\bviable pregnancy\b/i },
  { id: "stable-pregnancy", pattern: /\bstable pregnancy\b/i },
  { id: "safe-for-discharge", pattern: /\bsafe for discharge\b/i },
  { id: "benign-bleeding", pattern: /\bbenign bleeding\b/i },
  { id: "nothing-serious", pattern: /\bnothing serious\b/i },
];

export const PROVIDER_DISCHARGE_OBGYN_EN_ESCALATION_MARKERS = [
  "return immediately",
  "seek emergency care",
  "heavy bleeding",
  "severe pelvic pain",
  "fainting",
  "shoulder pain",
  "fever",
  "worsening symptoms",
] as const;

export const PROVIDER_DISCHARGE_OBGYN_FR_ESCALATION_MARKERS = [
  "retournez immédiatement",
  "consultez en urgence",
  "saignement abondant",
  "douleur pelvienne intense",
  "évanouissement",
  "douleur à l'épaule",
  "douleur à l’épaule",
  "fièvre",
  "aggravation",
] as const;

/** Privacy hooks for future sexual-health / STI / assault-adjacent templates. */
export const PROVIDER_DISCHARGE_OBGYN_PRIVACY_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "partner-named", pattern: /\bpartner (?:named|is|was)\b/i },
  { id: "boyfriend-named", pattern: /\bboyfriend (?:named|is|was)\b/i },
  { id: "husband-named", pattern: /\bhusband (?:named|is|was)\b/i },
  { id: "assault-confirmed", pattern: /\bassault (?:was )?confirmed\b/i },
  { id: "assault-documented", pattern: /\bassault (?:was )?documented\b/i },
  { id: "reported-assault-by", pattern: /\breported assault by\b/i },
  { id: "consent-was", pattern: /\bconsent was\b/i },
  { id: "no-assault", pattern: /\bno assault occurred\b/i },
  { id: "legal-conclusion", pattern: /\blegal conclusion\b/i },
];

function obGynSafetyFlagRequired(
  safety: ProviderDischargeTemplateObGynSafety | undefined,
  flag: keyof ProviderDischargeTemplateObGynSafety
): boolean {
  return safety?.[flag] === true;
}

function validateObGynSafetyMetadata(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];
  const safety = template.obGynSafety;

  if (!safety || typeof safety !== "object") {
    errors.push(`${prefix} OB/GYN template must define obGynSafety`);
    return errors;
  }

  if (safety.pregnancySensitive === true && safety.requiresPregnancyStatusDocumentation !== true) {
    errors.push(
      `${prefix} pregnancySensitive template must set requiresPregnancyStatusDocumentation: true`
    );
  }

  if (template.id.includes("ectopic") && safety.requiresEctopicPrecautions !== true) {
    errors.push(`${prefix} ectopic-sensitive template must set requiresEctopicPrecautions: true`);
  }

  if (template.id.includes("bleeding") && safety.requiresBleedingPrecautions !== true) {
    errors.push(`${prefix} bleeding-sensitive template must set requiresBleedingPrecautions: true`);
  }

  if (template.id.includes("pelvic") && safety.requiresPelvicPainPrecautions !== true) {
    errors.push(`${prefix} pelvic-pain template must set requiresPelvicPainPrecautions: true`);
  }

  if (
    safety.pregnancySensitive === true &&
    !obGynSafetyFlagRequired(safety, "requiresOBGynFollowUp")
  ) {
    const rows = template.defaultFollowUps ?? [];
    const hasObGynOrEmergency = rows.some((row) => followUpSpecialtyMatchesObGynOrEmergency(row));
    if (!hasObGynOrEmergency) {
      errors.push(
        `${prefix} pregnancySensitive template should include OB/GYN or emergency defaultFollowUps row`
      );
    }
  }

  if (safety.requiresOBGynFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasObGyn = rows.some((row) => followUpSpecialtyMatchesObGyn(row));
    if (!hasObGyn) {
      errors.push(`${prefix} requiresOBGynFollowUp but no OB/GYN defaultFollowUps row`);
    }
  }

  return errors;
}

function followUpSpecialtyMatchesObGyn(row: ProviderDischargeFollowUpRow): boolean {
  return OBGYN_FOLLOW_UP_SPECIALTIES.has(row.specialty.trim().toUpperCase());
}

function followUpSpecialtyMatchesObGynOrEmergency(row: ProviderDischargeFollowUpRow): boolean {
  const specialty = row.specialty.trim().toUpperCase();
  return OBGYN_FOLLOW_UP_SPECIALTIES.has(specialty) || EMERGENCY_FOLLOW_UP_SPECIALTIES.has(specialty);
}

function scanMarkersMissing(blob: string, markers: readonly string[]): boolean {
  return !markers.some((marker) => blob.includes(marker.toLowerCase()));
}

export function scanProviderDischargeObGynPregnancyForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_OBGYN_PREGNANCY_FORBIDDEN_PHRASES) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: OB/GYN forbidden pregnancy phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

export function scanProviderDischargeObGynEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_OBGYN_EN_ESCALATION_MARKERS
    : PROVIDER_DISCHARGE_OBGYN_FR_ESCALATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: OB/GYN ${locale} body missing escalation language (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeObGynPrivacyContent(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body);
  const hits: string[] = [];
  for (const rule of PROVIDER_DISCHARGE_OBGYN_PRIVACY_FORBIDDEN_PHRASES) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: OB/GYN privacy violation (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

export function validateProviderDischargeObGynTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isObGynProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateObGynSafetyMetadata(template)];
  const prefix = `[${template.id}]`;

  if (!template.obGynSafety) return errors;

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate OB/GYN governance for ${locale}: ${String(err)}`);
      continue;
    }

    errors.push(...scanProviderDischargeObGynEscalationLanguage(template.id, locale, body));

    if (template.obGynSafety.pregnancySensitive === true) {
      errors.push(...scanProviderDischargeObGynPregnancyForbiddenPhrases(template.id, locale, body));
    }

    if (template.obGynSafety.requiresSexualHealthPrivacyWarning === true) {
      errors.push(...scanProviderDischargeObGynPrivacyContent(template.id, locale, body));
    }
  }

  return errors;
}

export function scanProviderDischargeObGynTemplateGovernanceWarnings(
  template: ProviderDischargeTemplate
): string[] {
  if (!isObGynProviderDischargeTemplateCandidate(template)) return [];
  if (!template.obGynSafety?.requiresSexualHealthPrivacyWarning) return [];

  const warnings: string[] = [];
  for (const locale of ["en", "fr"] as const) {
    try {
      const body = getProviderDischargeSuggestedTextBody(template, locale);
      const blob = suggestedTextBodyBlob(body).toLowerCase();
      if (!blob.includes("privacy") && !blob.includes("confidential") && !blob.includes("confidentialité")) {
        warnings.push(
          `${template.id}: OB/GYN ${locale} privacy-sensitive template missing explicit privacy/confidentiality wording`
        );
      }
    } catch {
      // Body errors handled by validateProviderDischargeObGynTemplateGovernance.
    }
  }
  return warnings;
}

/** Stable OB/GYN safety object for governance hashes. */
export function normalizeObGynSafetyForHash(
  safety: ProviderDischargeTemplateObGynSafety | undefined
): Record<string, boolean> | null {
  if (!safety) return null;
  const keys = [
    "pregnancySensitive",
    "requiresPregnancyStatusDocumentation",
    "requiresEctopicPrecautions",
    "requiresBleedingPrecautions",
    "requiresPelvicPainPrecautions",
    "requiresSexualHealthPrivacyWarning",
    "requiresOBGynFollowUp",
  ] as const satisfies readonly (keyof ProviderDischargeTemplateObGynSafety)[];
  const out: Record<string, boolean> = {};
  for (const key of keys) {
    if (safety[key] === true) out[key] = true;
  }
  return Object.keys(out).length ? out : null;
}
