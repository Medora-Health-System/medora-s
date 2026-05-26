/**
 * Phase 19Y.19 — renal/urology/electrolyte-risk discharge template governance.
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

export type ProviderDischargeTemplateRenalElectrolyteSafety = {
  akiSensitive?: boolean;
  electrolyteSensitive?: boolean;
  dehydrationSensitive?: boolean;
  dialysisSensitive?: boolean;
  renalColicSensitive?: boolean;
  urinaryRetentionSensitive?: boolean;
  utiSensitive?: boolean;
  pyelonephritisSensitive?: boolean;
  hematuriaSensitive?: boolean;
  catheterSensitive?: boolean;
  requiresHydrationPrecautions?: boolean;
  requiresDialysisEscalation?: boolean;
  requiresUrinaryObstructionEscalation?: boolean;
  requiresElectrolyteEscalation?: boolean;
  requiresCatheterPrecautions?: boolean;
  requiresNephrologyFollowUp?: boolean;
  requiresUrologyFollowUp?: boolean;
  requiresResultInterpretationCaution?: boolean;
};

const NEPHROLOGY_FOLLOW_UP_SPECIALTIES = new Set(["NEPHROLOGY", "PRIMARY_CARE"]);
const UROLOGY_FOLLOW_UP_SPECIALTIES = new Set(["UROLOGY", "PRIMARY_CARE"]);

export function isRenalElectrolyteProviderDischargeTemplateCandidate(
  template: Pick<ProviderDischargeTemplate, "id">
): boolean {
  return (
    template.id.startsWith("renal_") ||
    template.id.startsWith("urology_") ||
    template.id.startsWith("electrolyte_") ||
    template.id.startsWith("dialysis_")
  );
}

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "kidney-failure-ruled-out", pattern: /\bkidney failure ruled out\b/i },
  { id: "aki-resolved", pattern: /\baki resolved\b/i },
  { id: "kidney-function-normal", pattern: /\bkidney function normal\b/i },
  { id: "renal-function-normal", pattern: /\brenal function normal\b/i },
  { id: "creatinine-normal", pattern: /\bcreatinine normal\b/i },
  { id: "creatinine-improved", pattern: /\bcreatinine improved\b/i },
  { id: "obstruction-resolved", pattern: /\bobstruction resolved\b/i },
  { id: "no-obstruction", pattern: /\bno obstruction\b/i },
  { id: "no-kidney-stone", pattern: /\bno kidney stone\b/i },
  { id: "stone-passed", pattern: /\bstone passed\b/i },
  { id: "dialysis-not-needed", pattern: /\bdialysis not needed\b/i },
  { id: "kidneys-stable", pattern: /\bkidneys stable\b/i },
  { id: "potassium-normal", pattern: /\bpotassium normal\b/i },
  { id: "sodium-normal", pattern: /\bsodium normal\b/i },
  { id: "magnesium-normal", pattern: /\bmagnesium normal\b/i },
  { id: "phosphorus-normal", pattern: /\bphosphorus normal\b/i },
  { id: "electrolytes-normal", pattern: /\belectrolytes normal\b/i },
  { id: "labs-normal", pattern: /\blabs normal\b/i },
  { id: "dehydration-resolved", pattern: /\bdehydration resolved\b/i },
  { id: "infection-cleared", pattern: /\binfection cleared\b/i },
  { id: "uti-ruled-out", pattern: /\buti ruled out\b/i },
  { id: "pyelonephritis-ruled-out", pattern: /\bpyelonephritis ruled out\b/i },
  { id: "urine-normal", pattern: /\burine normal\b/i },
  { id: "medically-cleared", pattern: /\bmedically cleared\b/i },
  { id: "safe-for-discharge", pattern: /\bsafe for discharge\b/i },
  { id: "low-risk", pattern: /\blow risk\b/i },
  { id: "sepsis-ruled-out", pattern: /\bsepsis ruled out\b/i },
  { id: "kidney-stone-ruled-out", pattern: /\bkidney stone ruled out\b/i },
];

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_RESULT_INTERPRETATION_FORBIDDEN_PHRASES: readonly {
  id: string;
  pattern: RegExp;
}[] = [
  { id: "labs-reassuring", pattern: /\blabs reassuring\b/i },
  { id: "imaging-reassuring", pattern: /\bimaging reassuring\b/i },
  { id: "ct-negative", pattern: /\bct negative\b/i },
  { id: "ultrasound-normal", pattern: /\bultrasound normal\b/i },
  { id: "kidney-function-stable", pattern: /\bkidney function stable\b/i },
  { id: "creatinine-stable", pattern: /\bcreatinine stable\b/i },
  { id: "electrolytes-stable", pattern: /\belectrolytes stable\b/i },
  { id: "no-acute-findings", pattern: /\bno acute findings\b/i },
  { id: "renal-function-improved", pattern: /\brenal function improved\b/i },
];

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_HYDRATION_MARKERS = [
  "unable to keep fluids down",
  "worsening vomiting",
  "dizziness",
  "weakness",
  "dehydration",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_HYDRATION_MARKERS = [
  "incapable de garder les liquides",
  "vomissements",
  "étourdissements",
  "faiblesse",
  "déshydratation",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_DIALYSIS_MARKERS = [
  "missed dialysis",
  "shortness of breath",
  "swelling",
  "chest pain",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_DIALYSIS_MARKERS = [
  "dialyse manquée",
  "essoufflement",
  "enflure",
  "douleur thoracique",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_OBSTRUCTION_MARKERS = [
  "inability to urinate",
  "worsening flank pain",
  "fever",
  "vomiting",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_OBSTRUCTION_MARKERS = [
  "incapacité à uriner",
  "douleur au flanc",
  "fièvre",
  "vomissements",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_ELECTROLYTE_MARKERS = [
  "weakness",
  "palpitations",
  "fainting",
  "confusion",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_ELECTROLYTE_MARKERS = [
  "faiblesse",
  "palpitations",
  "évanouissement",
  "confusion",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_CATHETER_MARKERS = [
  "catheter not draining",
  "blood in urine",
  "fever",
  "worsening pain",
] as const;

export const PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_CATHETER_MARKERS = [
  "cathéter ne draine pas",
  "sang dans les urines",
  "fièvre",
  "douleur croissante",
] as const;

function blobIncludesAny(blob: string, markers: readonly string[]): boolean {
  const lower = blob.toLowerCase();
  return markers.some((marker) => lower.includes(marker.toLowerCase()));
}

function scanMarkersMissing(blob: string, markers: readonly string[]): boolean {
  return !blobIncludesAny(blob, markers);
}

function followUpSpecialtyInSet(row: ProviderDischargeFollowUpRow, allowed: Set<string>): boolean {
  return allowed.has(row.specialty.trim().toUpperCase());
}

function scanForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  blob: string,
  rules: readonly { id: string; pattern: RegExp }[],
  category: string
): string[] {
  const hits: string[] = [];
  for (const rule of rules) {
    if (rule.pattern.test(blob)) {
      hits.push(`${templateId}: renal-electrolyte ${category} forbidden phrase (${rule.id}) in ${locale}`);
    }
  }
  return hits;
}

function idRequiresUtiSensitiveFlag(templateId: string): boolean {
  const id = templateId.toLowerCase();
  return /(^|_)uti(_|$)/.test(id);
}

function idRequiresSensitiveFlag(templateId: string): Array<{
  needle: string;
  flag: keyof ProviderDischargeTemplateRenalElectrolyteSafety;
  label: string;
}> {
  const id = templateId.toLowerCase();
  const rules: Array<{
    needle: string;
    flag: keyof ProviderDischargeTemplateRenalElectrolyteSafety;
    label: string;
  }> = [];
  if (id.includes("aki")) rules.push({ needle: "aki", flag: "akiSensitive", label: "akiSensitive" });
  if (id.includes("electrolyte") || id.includes("potassium") || id.includes("sodium") || id.includes("magnesium")) {
    rules.push({ needle: "electrolyte", flag: "electrolyteSensitive", label: "electrolyteSensitive" });
  }
  if (id.includes("dialysis")) {
    rules.push({ needle: "dialysis", flag: "dialysisSensitive", label: "dialysisSensitive" });
  }
  if (id.includes("renal_colic") || id.includes("kidney_stone") || id.includes("flank")) {
    rules.push({ needle: "renal_colic", flag: "renalColicSensitive", label: "renalColicSensitive" });
  }
  if (id.includes("retention")) {
    rules.push({ needle: "retention", flag: "urinaryRetentionSensitive", label: "urinaryRetentionSensitive" });
  }
  if (idRequiresUtiSensitiveFlag(id)) {
    rules.push({ needle: "uti", flag: "utiSensitive", label: "utiSensitive" });
  }
  if (id.includes("pyelo")) {
    rules.push({ needle: "pyelo", flag: "pyelonephritisSensitive", label: "pyelonephritisSensitive" });
  }
  if (id.includes("hematuria")) {
    rules.push({ needle: "hematuria", flag: "hematuriaSensitive", label: "hematuriaSensitive" });
  }
  if (id.includes("catheter") || id.includes("foley")) {
    rules.push({ needle: "catheter", flag: "catheterSensitive", label: "catheterSensitive" });
  }
  return rules;
}

function validateRenalElectrolyteSafetyMetadata(template: ProviderDischargeTemplate): string[] {
  const prefix = `[${template.id}]`;
  const errors: string[] = [];
  const safety = template.renalElectrolyteSafety;

  if (!safety || typeof safety !== "object") {
    errors.push(`${prefix} renal-electrolyte template must define renalElectrolyteSafety`);
    return errors;
  }

  for (const rule of idRequiresSensitiveFlag(template.id)) {
    if (safety[rule.flag] !== true) {
      errors.push(`${prefix} id contains "${rule.needle}" and must set ${rule.label}: true`);
    }
  }

  if (safety.requiresNephrologyFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, NEPHROLOGY_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(`${prefix} requiresNephrologyFollowUp but no nephrology/primary care follow-up row`);
    }
  }

  if (safety.requiresUrologyFollowUp === true) {
    const rows = template.defaultFollowUps ?? [];
    const hasFollowUp = rows.some((row) => followUpSpecialtyInSet(row, UROLOGY_FOLLOW_UP_SPECIALTIES));
    if (!hasFollowUp) {
      errors.push(`${prefix} requiresUrologyFollowUp but no urology/primary care follow-up row`);
    }
  }

  return errors;
}

export function scanProviderDischargeRenalElectrolyteForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FORBIDDEN_PHRASES,
    "general"
  );
}

export function scanProviderDischargeRenalElectrolyteResultInterpretationForbiddenPhrases(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return scanForbiddenPhrases(
    templateId,
    locale,
    suggestedTextBodyBlob(body),
    PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_RESULT_INTERPRETATION_FORBIDDEN_PHRASES,
    "result interpretation"
  );
}

export function scanProviderDischargeRenalElectrolyteHydrationPrecautionsLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_HYDRATION_MARKERS
    : PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_HYDRATION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: renal-electrolyte ${locale} body missing hydration precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeRenalElectrolyteDialysisEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_DIALYSIS_MARKERS
    : PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_DIALYSIS_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: renal-electrolyte ${locale} body missing dialysis escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeRenalElectrolyteUrinaryObstructionEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_OBSTRUCTION_MARKERS
    : PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_OBSTRUCTION_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: renal-electrolyte ${locale} body missing urinary obstruction escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeRenalElectrolyteElectrolyteEscalationLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_ELECTROLYTE_MARKERS
    : PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_ELECTROLYTE_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: renal-electrolyte ${locale} body missing electrolyte escalation wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function scanProviderDischargeRenalElectrolyteCatheterPrecautionsLanguage(
  templateId: string,
  locale: ProviderDischargeTemplateLocale,
  body: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  const blob = suggestedTextBodyBlob(body).toLowerCase();
  const markers =
    locale === "en" ?
      PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_EN_CATHETER_MARKERS
    : PROVIDER_DISCHARGE_RENAL_ELECTROLYTE_FR_CATHETER_MARKERS;
  if (scanMarkersMissing(blob, markers)) {
    return [
      `${templateId}: renal-electrolyte ${locale} body missing catheter precaution wording (expected one of: ${markers.join(", ")})`,
    ];
  }
  return [];
}

export function validateProviderDischargeRenalElectrolyteTemplateGovernance(
  template: ProviderDischargeTemplate
): string[] {
  if (!isRenalElectrolyteProviderDischargeTemplateCandidate(template)) return [];

  const errors: string[] = [...validateRenalElectrolyteSafetyMetadata(template)];
  const prefix = `[${template.id}]`;
  const safety = template.renalElectrolyteSafety;
  if (!safety) return errors;

  for (const locale of ["en", "fr"] as const) {
    let body: ProviderDischargeTemplateSuggestedTextBody;
    try {
      body = getProviderDischargeSuggestedTextBody(template, locale);
    } catch (err) {
      errors.push(`${prefix} cannot validate renal-electrolyte governance for ${locale}: ${String(err)}`);
      continue;
    }

    errors.push(...scanProviderDischargeRenalElectrolyteForbiddenPhrases(template.id, locale, body));

    if (safety.requiresResultInterpretationCaution === true) {
      errors.push(...scanProviderDischargeRenalElectrolyteResultInterpretationForbiddenPhrases(template.id, locale, body));
    }

    if (safety.requiresHydrationPrecautions === true) {
      errors.push(...scanProviderDischargeRenalElectrolyteHydrationPrecautionsLanguage(template.id, locale, body));
    }

    if (safety.requiresDialysisEscalation === true) {
      errors.push(...scanProviderDischargeRenalElectrolyteDialysisEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresUrinaryObstructionEscalation === true) {
      errors.push(...scanProviderDischargeRenalElectrolyteUrinaryObstructionEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresElectrolyteEscalation === true) {
      errors.push(...scanProviderDischargeRenalElectrolyteElectrolyteEscalationLanguage(template.id, locale, body));
    }

    if (safety.requiresCatheterPrecautions === true) {
      errors.push(...scanProviderDischargeRenalElectrolyteCatheterPrecautionsLanguage(template.id, locale, body));
    }
  }

  return errors;
}

export function normalizeRenalElectrolyteSafetyForHash(
  safety: ProviderDischargeTemplateRenalElectrolyteSafety | undefined
): Record<string, boolean> | null {
  if (!safety) return null;
  const keys = [
    "akiSensitive",
    "electrolyteSensitive",
    "dehydrationSensitive",
    "dialysisSensitive",
    "renalColicSensitive",
    "urinaryRetentionSensitive",
    "utiSensitive",
    "pyelonephritisSensitive",
    "hematuriaSensitive",
    "catheterSensitive",
    "requiresHydrationPrecautions",
    "requiresDialysisEscalation",
    "requiresUrinaryObstructionEscalation",
    "requiresElectrolyteEscalation",
    "requiresCatheterPrecautions",
    "requiresNephrologyFollowUp",
    "requiresUrologyFollowUp",
    "requiresResultInterpretationCaution",
  ] as const satisfies readonly (keyof ProviderDischargeTemplateRenalElectrolyteSafety)[];
  const out: Record<string, boolean> = {};
  for (const key of [...keys].sort()) {
    if (safety[key] === true) out[key] = true;
  }
  return Object.keys(out).length ? out : null;
}
