/**
 * MEDUI.ED.DISCHARGE.I18N_CERTIFICATION.1 / I18N_REMEDIATION.1
 * Complete ED discharge localization certification — audit orchestrator.
 */

import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import type { SupportedLanguage } from "@/i18n/config";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import {
  auditProviderDischargeFollowUpTimingLocaleCoverage,
  localizeProviderDischargeFollowUpTiming,
  PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE,
  PROVIDER_DISCHARGE_FORBIDDEN_ENGLISH_TIMING_IN_FR,
  resolveProviderDischargeFollowUpTimingCanonicalKey,
} from "./providerDischargeFollowUpTimingLocale";
import {
  applyProviderDischargeTemplateToCard,
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { extractSharedFieldsFromTemplate } from "./providerDischargeSharedPlanningMerge";
import {
  getProviderDischargeSuggestedTextBody,
  PROVIDER_DISCHARGE_FORBIDDEN_ENGLISH_PHRASES_IN_FR,
  PROVIDER_DISCHARGE_FORBIDDEN_FRENCH_TOKENS_IN_EN,
  PROVIDER_DISCHARGE_TEMPLATE_LOCALES,
  scanProviderDischargeSuggestedTextEnglishContaminationInFr,
  scanProviderDischargeSuggestedTextFrenchContaminationInEn,
  suggestedTextBodyBlob,
  type ProviderDischargeTemplateLocale,
  type ProviderDischargeTemplateSuggestedTextBody,
} from "./providerDischargeTemplateLocale";
import {
  genericDischargeEmptyDiagnosisLabel,
  personalizeGenericDischargeTemplateBody,
} from "./providerDischargeTemplateGoldStandard";
import { MEDICATION_RISK_DISCHARGE_RULES } from "./providerDischargeMedicationRiskRules";
import {
  PATIENT_SPECIFIC_DISCHARGE_RULES,
  resolvePatientSpecificDischargeAdditions,
} from "./providerDischargePatientSpecificAdditions";
import { validateProviderDischargeTemplateRegistry } from "./providerDischargeTemplateRegistryValidator";
import {
  emptyProviderDischargeDocumentationForm,
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  type ProviderDischargeDiagnosisCard,
} from "./providerDischargeDocumentationModel";

export type LocalizationAuditSeverity = "SAFE" | "WARNING" | "FAIL";

export type DischargeContentSourceRow = {
  source: string;
  localeAware: boolean;
  hardcoded: boolean;
  translated: boolean;
  missingFr: boolean;
  notes: string;
};

export type LanguageLeakageFinding = {
  id: string;
  severity: LocalizationAuditSeverity;
  source: string;
  detail: string;
};

export type TemplateParityRow = {
  templateId: string;
  hasEn: boolean;
  hasFr: boolean;
  missingSections: string[];
  partialFr: boolean;
  mismatchedSections: string[];
};

export type LocalizationCertificationDecision = "I18N_READY" | "I18N_NOT_READY";

const REQUIRED_TEMPLATE_SECTIONS: (keyof ProviderDischargeTemplateSuggestedTextBody)[] = [
  "description",
  "diagnosisInstructions",
  "medicationTreatment",
  "returnPrecautions",
];

const OUTPUT_SURFACE_FORBIDDEN_IN_FR = [
  ...PROVIDER_DISCHARGE_FORBIDDEN_ENGLISH_PHRASES_IN_FR.map((r) => r.pattern),
  ...PROVIDER_DISCHARGE_FORBIDDEN_ENGLISH_TIMING_IN_FR,
];
const OUTPUT_SURFACE_FORBIDDEN_IN_EN = PROVIDER_DISCHARGE_FORBIDDEN_FRENCH_TOKENS_IN_EN;

function sectionMissing(body: ProviderDischargeTemplateSuggestedTextBody, key: keyof ProviderDischargeTemplateSuggestedTextBody): boolean {
  const v = body[key];
  return typeof v !== "string" || !v.trim();
}

function buildContentInventory(): DischargeContentSourceRow[] {
  return [
    {
      source: "providerDischargeTemplateRegistry",
      localeAware: true,
      hardcoded: false,
      translated: true,
      missingFr: false,
      notes: "All templates use suggestedText.en/fr via providerDischargeTemplateSuggestedTextCatalog",
    },
    {
      source: "providerDischargeTemplateGoldStandard",
      localeAware: true,
      hardcoded: true,
      translated: true,
      missingFr: false,
      notes: "genericDischargeEmptyDiagnosisLabel(en/fr); personalizeGenericDischargeTemplateBody(locale)",
    },
    {
      source: "providerDischargeTemplateSuggestedTextCatalog",
      localeAware: true,
      hardcoded: true,
      translated: true,
      missingFr: false,
      notes: "localizedSuggestedText(en, fr) for every catalog export",
    },
    {
      source: "family templates (condition family resolver)",
      localeAware: true,
      hardcoded: false,
      translated: true,
      missingFr: false,
      notes: "Routes to registry template IDs — same locale-separated suggestedText bodies",
    },
    {
      source: "generic_ed_discharge_v1",
      localeAware: true,
      hardcoded: true,
      translated: true,
      missingFr: false,
      notes: "GENERIC_ED_DISCHARGE_SUGGESTED_TEXT has full EN/FR sections",
    },
    {
      source: "providerDischargePatientSpecificAdditions",
      localeAware: true,
      hardcoded: true,
      translated: true,
      missingFr: false,
      notes: "Rule text: Record<en|fr>; strict locale resolution — no EN fallback",
    },
    {
      source: "providerDischargeMedicationRiskRules",
      localeAware: true,
      hardcoded: true,
      translated: true,
      missingFr: false,
      notes: "MEDICATION_RISK_DISCHARGE_RULES text.en/fr; strict locale resolution — no EN fallback",
    },
    {
      source: "follow-up text (registry defaultFollowUps + form)",
      localeAware: true,
      hardcoded: false,
      translated: true,
      missingFr: false,
      notes: "Canonical EN keys in registry; localized via providerDischargeFollowUpTimingLocale at extract/render",
    },
    {
      source: "return precautions (template bodies + gold standard suffix)",
      localeAware: true,
      hardcoded: true,
      translated: true,
      missingFr: false,
      notes: "Locale-specific template narrative + ED_DISCHARGE_UNIVERSAL_RETURN_SUFFIX_*",
    },
    {
      source: "discharge print packet (DischargePrintLayout)",
      localeAware: true,
      hardcoded: false,
      translated: true,
      missingFr: false,
      notes: "printT() + language param; provider block via buildProviderDischargeDocumentationSummaryBlock(locale)",
    },
    {
      source: "discharge preview (EmergencyDispositionPanel)",
      localeAware: true,
      hardcoded: false,
      translated: true,
      missingFr: false,
      notes: "buildProviderDischargeDocumentationPreviewSections(form, language)",
    },
    {
      source: "discharge summary block",
      localeAware: true,
      hardcoded: false,
      translated: true,
      missingFr: false,
      notes: "buildProviderDischargeDocumentationSummaryBlock(dischargeJson, locale)",
    },
    {
      source: "ER packet output",
      localeAware: true,
      hardcoded: false,
      translated: true,
      missingFr: false,
      notes: "getDischargePrintHtml(..., language)",
    },
    {
      source: "saved discharge JSON rendering",
      localeAware: true,
      hardcoded: false,
      translated: true,
      missingFr: false,
      notes: "Follow-up timing re-localized at render; narrative stored at apply locale",
    },
  ];
}

function auditTemplateParity(): TemplateParityRow[] {
  return PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.map((template) => {
    const missingSections: string[] = [];
    const mismatchedSections: string[] = [];
    let hasEn = false;
    let hasFr = false;
    let partialFr = false;

    try {
      const en = getProviderDischargeSuggestedTextBody(template, "en");
      const fr = getProviderDischargeSuggestedTextBody(template, "fr");
      hasEn = REQUIRED_TEMPLATE_SECTIONS.every((k) => !sectionMissing(en, k));
      hasFr = REQUIRED_TEMPLATE_SECTIONS.every((k) => !sectionMissing(fr, k));
      for (const key of REQUIRED_TEMPLATE_SECTIONS) {
        if (sectionMissing(en, key)) missingSections.push(`en.${key}`);
        if (sectionMissing(fr, key)) missingSections.push(`fr.${key}`);
      }
      partialFr = hasFr && missingSections.some((s) => s.startsWith("fr."));
      for (const key of REQUIRED_TEMPLATE_SECTIONS) {
        const enLen = (en[key] as string)?.trim().length ?? 0;
        const frLen = (fr[key] as string)?.trim().length ?? 0;
        if (enLen > 80 && frLen > 0 && frLen < enLen * 0.35) {
          mismatchedSections.push(key);
        }
      }
    } catch {
      missingSections.push("unreadable suggestedText");
    }

    return {
      templateId: template.id,
      hasEn,
      hasFr,
      missingSections,
      partialFr,
      mismatchedSections,
    };
  });
}

function auditPatientSpecificRules(): LanguageLeakageFinding[] {
  const findings: LanguageLeakageFinding[] = [];
  for (const rule of PATIENT_SPECIFIC_DISCHARGE_RULES) {
    if (!rule.text.en?.trim()) {
      findings.push({
        id: `patient-specific-${rule.id}-missing-en`,
        severity: "FAIL",
        source: "providerDischargePatientSpecificAdditions",
        detail: `${rule.id} missing text.en`,
      });
    }
    if (!rule.text.fr?.trim()) {
      findings.push({
        id: `patient-specific-${rule.id}-missing-fr`,
        severity: "FAIL",
        source: "providerDischargePatientSpecificAdditions",
        detail: `${rule.id} missing text.fr`,
      });
    }
  }
  return findings;
}

function auditMedicationRules(): LanguageLeakageFinding[] {
  const findings: LanguageLeakageFinding[] = [];
  for (const rule of MEDICATION_RISK_DISCHARGE_RULES) {
    if (!rule.text.en?.trim() || !rule.text.fr?.trim()) {
      findings.push({
        id: `medication-${rule.id}-missing-locale`,
        severity: "FAIL",
        source: "providerDischargeMedicationRiskRules",
        detail: `${rule.id} missing en or fr text`,
      });
    }
  }
  return findings;
}

function auditFollowUpTimingRegistryCoverage(): LanguageLeakageFinding[] {
  const findings: LanguageLeakageFinding[] = [];
  const coverageGaps = auditProviderDischargeFollowUpTimingLocaleCoverage();
  for (const gap of coverageGaps) {
    findings.push({
      id: `follow-up-locale-${gap}`,
      severity: "FAIL",
      source: "providerDischargeFollowUpTimingLocale",
      detail: `Missing locale pair for ${gap}`,
    });
  }

  for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
    for (const row of template.defaultFollowUps ?? []) {
      const timing = row.timing.trim();
      if (!timing) continue;
      if (!PROVIDER_DISCHARGE_FOLLOW_UP_TIMING_LOCALE[timing]) {
        findings.push({
          id: `follow-up-unmapped-${template.id}-${row.id}`,
          severity: "FAIL",
          source: "providerDischargeTemplateRegistry.defaultFollowUps",
          detail: `Template ${template.id} timing "${timing}" has no centralized locale mapping`,
        });
      }
      const frTiming = localizeProviderDischargeFollowUpTiming(timing, "fr");
      if (frTiming === timing && !resolveProviderDischargeFollowUpTimingCanonicalKey(timing)) {
        findings.push({
          id: `follow-up-not-localized-${template.id}-${row.id}`,
          severity: "FAIL",
          source: "providerDischargeFollowUpTimingLocale",
          detail: `Timing "${timing}" not localized for FR`,
        });
      }
    }
  }
  return findings;
}

function auditGenericFallback(): { ok: boolean; findings: LanguageLeakageFinding[] } {
  const findings: LanguageLeakageFinding[] = [];
  const generic =
    PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID)!;
  for (const locale of PROVIDER_DISCHARGE_TEMPLATE_LOCALES) {
    const body = getProviderDischargeSuggestedTextBody(generic, locale);
    for (const key of REQUIRED_TEMPLATE_SECTIONS) {
      if (sectionMissing(body, key)) {
        findings.push({
          id: `generic-${locale}-${key}`,
          severity: "FAIL",
          source: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
          detail: `Missing ${locale}.${key}`,
        });
      }
    }
  }
  for (const locale of PROVIDER_DISCHARGE_TEMPLATE_LOCALES) {
    const frBody = getProviderDischargeSuggestedTextBody(generic, locale);
    const personalized = personalizeGenericDischargeTemplateBody(frBody, "", locale);
    const fallback = genericDischargeEmptyDiagnosisLabel(locale).toLowerCase();
    if (locale === "fr" && personalized.description.toLowerCase().includes("your condition")) {
      findings.push({
        id: "generic-fr-empty-label-en-fallback",
        severity: "FAIL",
        source: "providerDischargeTemplateGoldStandard.personalizeGenericDischargeTemplateBody",
        detail: 'Empty diagnosis label injects English "your condition" into FR generic template',
      });
    }
    if (!personalized.description.toLowerCase().includes(fallback)) {
      findings.push({
        id: `generic-${locale}-empty-label-missing-fallback`,
        severity: "FAIL",
        source: "providerDischargeTemplateGoldStandard.personalizeGenericDischargeTemplateBody",
        detail: `Empty diagnosis label missing locale fallback for ${locale}`,
      });
    }
  }
  return { ok: findings.filter((f) => f.severity === "FAIL").length === 0, findings };
}

function sampleDischargeJson(locale: ProviderDischargeTemplateLocale): unknown {
  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: "R07.9",
    displayName: locale === "fr" ? "Douleur thoracique" : "Chest pain",
  });
  let card: ProviderDischargeDiagnosisCard = {
    id: "cert-card-1",
    sourceEncounterDiagnosisId: "dx-1",
    code: "R07.9",
    displayName: locale === "fr" ? "Douleur thoracique" : "Chest pain",
    isPrimaryDiagnosis: true,
    displayOrder: 0,
    description: "",
    diagnosisInstructions: "",
    medicationTreatment: "",
    returnPrecautions: "",
    followUps: [],
    medicationLines: [],
  };
  card = applyProviderDischargeTemplateToCard(card, resolved, { locale, overwriteExisting: true, providerConfirmed: true });
  const shared = extractSharedFieldsFromTemplate(resolved.template, locale);
  const form = {
    ...emptyProviderDischargeDocumentationForm(),
    diagnosisRefs: [
      {
        encounterDiagnosisId: "dx-1",
        code: "R07.9",
        label: card.displayName,
        isPrimary: true,
      },
    ],
    diagnosisDocs: [card],
    returnPrecautions: shared.returnPrecautions || card.returnPrecautions,
    followUps: shared.defaultFollowUps?.length ? shared.defaultFollowUps : [],
  };
  return mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
}

function scanBlobForCrossLanguage(blob: string, locale: SupportedLanguage): string[] {
  const hits: string[] = [];
  if (locale === "fr") {
    for (const pattern of OUTPUT_SURFACE_FORBIDDEN_IN_FR) {
      if (pattern.test(blob)) hits.push(pattern.source);
    }
  } else {
    const lower = blob.toLowerCase();
    for (const token of OUTPUT_SURFACE_FORBIDDEN_IN_EN) {
      if (lower.includes(token.toLowerCase())) hits.push(token);
    }
  }
  return hits;
}

function auditOutputSurfaces(): LanguageLeakageFinding[] {
  const findings: LanguageLeakageFinding[] = [];
  const locales: SupportedLanguage[] = ["fr", "en"];

  for (const locale of locales) {
    const dischargeJson = sampleDischargeJson(locale);
    const form = hydrateProviderDischargeDocumentationForm(dischargeJson);
    const summary = buildProviderDischargeDocumentationSummaryBlock(dischargeJson, locale)?.lines.join("\n") ?? "";
    const preview = buildProviderDischargeDocumentationPreviewSections(form, dischargeJson, locale)
      .flatMap((s) => [s.title, ...s.lines])
      .join("\n");
    const additions = resolvePatientSpecificDischargeAdditions({
      templateIds: ["chest_pain_v1"],
      context: { patientAgeYears: 72, medicationNames: ["warfarin"] },
      locale,
    })
      .map((a) => a.text)
      .join("\n");

    const printHtml = getDischargePrintHtml({
      language: locale,
      patient: { firstName: "Test", lastName: "Patient", dob: "1980-01-01", sex: "male", mrn: "MRN1" },
      encounter: {
        createdAt: "2026-06-01T12:00:00.000Z",
        dischargeSummaryJson: dischargeJson,
      },
      facilityName: locale === "fr" ? "Clinique Medora" : "Medora Clinic",
    });

    for (const [surface, blob] of [
      ["summary block", summary],
      ["preview sections", preview],
      ["patient-specific additions", additions],
      ["discharge print HTML", printHtml],
    ] as const) {
      const hits = scanBlobForCrossLanguage(blob, locale);
      if (hits.length) {
        findings.push({
          id: `output-${locale}-${surface.replace(/\s+/g, "-")}`,
          severity: "FAIL",
          source: surface,
          detail: `${locale.toUpperCase()} output contains cross-language markers: ${hits.slice(0, 3).join(", ")}`,
        });
      }
    }
  }

  return findings;
}

function auditRegistryAndContamination(): LanguageLeakageFinding[] {
  const findings: LanguageLeakageFinding[] = [];
  const registryResult = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
  for (const err of registryResult.errors) {
    const isContamination =
      err.includes("forbidden French token") ||
      err.includes("forbidden English phrase") ||
      err.includes("locale-separated");
    findings.push({
      id: `registry-${findings.length + 1}`,
      severity: isContamination ? "FAIL" : "WARNING",
      source: "providerDischargeTemplateRegistryValidator",
      detail: err,
    });
  }
  return findings;
}

function countHardcodedEnglishInPatientRuleTitles(): number {
  return PATIENT_SPECIFIC_DISCHARGE_RULES.filter((r) => /^[A-Za-z]/.test(r.title)).length;
}

export type LocalizationCertificationReport = {
  ticket: "MEDUI.ED.DISCHARGE.I18N_REMEDIATION.1";
  generatedAt: string;
  contentInventory: DischargeContentSourceRow[];
  languageLeakage: LanguageLeakageFinding[];
  templateParity: TemplateParityRow[];
  patientSpecificFindings: LanguageLeakageFinding[];
  genericFallbackFindings: LanguageLeakageFinding[];
  followUpTimingFindings: LanguageLeakageFinding[];
  outputSurfaceFindings: LanguageLeakageFinding[];
  metrics: {
    templatesAudited: number;
    enCoveragePercent: number;
    frCoveragePercent: number;
    languageLeakageCount: number;
    hardcodedStringCount: number;
    missingTranslationCount: number;
    hardcodedPatientFacingStringCount: number;
  };
  decision: LocalizationCertificationDecision;
  blockers: string[];
};

export function certifyDischargeLocalization(): LocalizationCertificationReport {
  const contentInventory = buildContentInventory();
  const templateParity = auditTemplateParity();
  const patientSpecificFindings = auditPatientSpecificRules();
  const medicationFindings = auditMedicationRules();
  const followUpTimingFindings = auditFollowUpTimingRegistryCoverage();
  const genericFallback = auditGenericFallback();
  const outputSurfaceFindings = auditOutputSurfaces();
  const registryFindings = auditRegistryAndContamination();

  const languageLeakage = [
    ...registryFindings.filter((f) => f.severity === "FAIL"),
    ...patientSpecificFindings.filter((f) => f.severity === "FAIL"),
    ...medicationFindings.filter((f) => f.severity === "FAIL"),
    ...followUpTimingFindings.filter((f) => f.severity === "FAIL"),
    ...genericFallback.findings.filter((f) => f.severity === "FAIL"),
    ...outputSurfaceFindings,
  ];

  const templatesAudited = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.length;
  const enComplete = templateParity.filter((t) => t.hasEn).length;
  const frComplete = templateParity.filter((t) => t.hasFr).length;
  const missingTranslationCount =
    templateParity.reduce((n, t) => n + t.missingSections.length, 0) +
    patientSpecificFindings.filter((f) => f.id.includes("missing-fr")).length +
    medicationFindings.filter((f) => f.id.includes("missing")).length +
    followUpTimingFindings.filter((f) => f.severity === "FAIL").length;

  const hardcodedPatientFacingStringCount =
    PATIENT_SPECIFIC_DISCHARGE_RULES.length * 2 + MEDICATION_RISK_DISCHARGE_RULES.length * 2;

  const hardcodedStringCount =
    countHardcodedEnglishInPatientRuleTitles() + hardcodedPatientFacingStringCount;

  const blockers: string[] = [];
  if (languageLeakage.length > 0) {
    blockers.push(`Language leakage findings: ${languageLeakage.length}`);
  }
  if (frComplete < templatesAudited) {
    blockers.push(`Template FR parity incomplete: ${templatesAudited - frComplete} templates`);
  }
  if (patientSpecificFindings.some((f) => f.severity === "FAIL")) {
    blockers.push("Patient-specific addition missing FR/EN text");
  }
  if (followUpTimingFindings.some((f) => f.severity === "FAIL")) {
    blockers.push("Follow-up timing localization incomplete");
  }
  if (genericFallback.findings.some((f) => f.severity === "FAIL")) {
    blockers.push("Generic fallback localization failure");
  }
  if (outputSurfaceFindings.length > 0) {
    blockers.push("Output surface cross-language leakage detected");
  }

  const decision: LocalizationCertificationDecision =
    blockers.length === 0 ? "I18N_READY" : "I18N_NOT_READY";

  return {
    ticket: "MEDUI.ED.DISCHARGE.I18N_REMEDIATION.1",
    generatedAt: new Date().toISOString(),
    contentInventory,
    languageLeakage: [
      ...registryFindings,
      ...patientSpecificFindings,
      ...medicationFindings,
      ...followUpTimingFindings,
      ...genericFallback.findings,
      ...outputSurfaceFindings,
    ],
    templateParity,
    patientSpecificFindings,
    genericFallbackFindings: genericFallback.findings,
    followUpTimingFindings,
    outputSurfaceFindings,
    metrics: {
      templatesAudited,
      enCoveragePercent: Number(((enComplete / templatesAudited) * 100).toFixed(1)),
      frCoveragePercent: Number(((frComplete / templatesAudited) * 100).toFixed(1)),
      languageLeakageCount: languageLeakage.length,
      hardcodedStringCount,
      missingTranslationCount,
      hardcodedPatientFacingStringCount,
    },
    decision,
    blockers,
  };
}

/** Scan one template body pair for contamination (used in tests). */
export function scanTemplateLocaleContamination(
  templateId: string,
  en: ProviderDischargeTemplateSuggestedTextBody,
  fr: ProviderDischargeTemplateSuggestedTextBody
): string[] {
  return [
    ...scanProviderDischargeSuggestedTextFrenchContaminationInEn(templateId, en),
    ...scanProviderDischargeSuggestedTextEnglishContaminationInFr(templateId, fr),
  ];
}

/** Returns true when rendered narrative contains only locale-appropriate tokens. */
export function renderedDischargeNarrativeIsMonolingual(blob: string, locale: SupportedLanguage): boolean {
  return scanBlobForCrossLanguage(blob, locale).length === 0;
}

export { suggestedTextBodyBlob, scanBlobForCrossLanguage };
