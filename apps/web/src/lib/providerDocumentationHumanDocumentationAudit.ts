/**
 * MEDUI — Permanent Human Documentation Governance (Medical Exam chief complaint remediation).
 * Gold Standard = Track C + Human Documentation Audit (both required).
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  PEDIATRIC_CROUP_COMPLAINT_INTEL,
  PEDIATRIC_DEHYDRATION_COMPLAINT_INTEL,
  PEDIATRIC_FEVER_COMPLAINT_INTEL,
  PEDIATRIC_RASH_COMPLAINT_INTEL,
  PEDIATRIC_RSV_LIKE_ILLNESS_COMPLAINT_INTEL,
  PEDIATRIC_SEIZURE_COMPLAINT_INTEL,
  STROKE_SYMPTOMS_COMPLAINT_INTEL,
  WEAKNESS_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  ALTERED_MENTAL_STATUS_COMPLAINT_V1_INTEL,
  BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL,
  FOCAL_WEAKNESS_COMPLAINT_V1_INTEL,
  GAIT_INSTABILITY_FALLS_NEURO_COMPLAINT_V1_INTEL,
  NUMBNESS_TINGLING_COMPLAINT_V1_INTEL,
} from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";
import {
  AFIB_RAPID_RATE_COMPLAINT_V1_INTEL,
  CHF_SYMPTOMS_COMPLAINT_V1_INTEL,
  EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
  EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
  GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
  HYPERTENSION_COMPLAINT_V1_INTEL,
  LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
  NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  PALPITATIONS_COMPLAINT_V1_INTEL,
} from "./providerDocumentationCardiacComplaintIntelligence19Mdm4";
import { auditTrackCi18nMessageValues } from "./providerDocumentationComplaintIntelligenceTrackC";
import { providerDocumentationNeuroStrokeWeaknessComplaintIntelEn } from "@/i18n/messages/providerDocumentationNeuroStrokeWeaknessComplaintIntel.en";
import { providerDocumentationPediatricLegacyComplaintIntelEn } from "@/i18n/messages/providerDocumentationPediatricLegacyComplaintIntel.en";
import { providerDocumentationCardiacNonChestPainComplaintIntelEn } from "@/i18n/messages/providerDocumentationCardiacNonChestPainComplaintIntel.en";
import { providerDocumentationDizzinessVertigoComplaintIntelEn } from "@/i18n/messages/providerDocumentationDizzinessVertigoComplaintIntel.en";

/** Forbidden rendered phrases outside mdmDataReviewed (substring match, case-insensitive). */
export const HUMAN_DOC_FORBIDDEN_RENDERED_PHRASES = [
  "review completed",
  "history obtained",
  "assessment completed",
  "exam completed",
  "evaluation completed",
  "considered in differential",
  "consider documenting",
  "discussed with patient",
  "findings reviewed",
  "symptoms reviewed",
  "reviewed and discussed",
  "document if verified",
  "review whether",
  "if applicable",
  "if indicated",
  "if documented",
  "if performed",
  "if obtained",
  "if given",
  "if examined",
  "if present",
  "when clinically",
  "summarized",
  "assess for",
  "historian used",
  "follow-up recommended",
  "return advised",
  "disposition discussed",
  "plan discussed",
  "return precautions discussed",
  "oral rehydration discussed",
  "observation recommended",
  "oxygen requirement assessed",
  "therapy recommended",
  "section completed",
  "risk reviewed",
  "data reviewed",
  "sticky note",
  "governance",
  "workflow",
  "fragment",
  "template",
  "chip",
] as const;

/** Standalone forbidden tokens (word-boundary match outside mdmDataReviewed). */
export const HUMAN_DOC_FORBIDDEN_RENDERED_TOKENS = [
  "reviewed",
  "assessed",
  "considered",
  "completed",
] as const;

/** Known robotic return noun chains (exact or substring). */
export const HUMAN_DOC_FORBIDDEN_NOUN_CHAIN_RETURNS = [
  "return lethargy breathing dehydration fever",
  "return pain fever vomiting",
  "return chest pain shortness breath",
  "return weakness numbness speech",
  "return recurrent seizures altered mental status",
  "return worsening rash fever breathing difficulty",
  "return persistent vomiting no urine output",
  "return worsening stridor respiratory distress",
  "return worsening breathing poor feeding apnea",
] as const;

/** Allowed diagnostic-review phrasing inside mdmDataReviewed only. */
export const HUMAN_DOC_ALLOWED_DATA_REVIEWED_PATTERNS = [
  /\breviewed$/i,
  /\brevue$/i,
  /\brevu$/i,
] as const;

/** Robotic / non-clinical rendered patterns (values outside mdmDataReviewed). */
export const HUMAN_DOC_ROBOTIC_VALUE_PATTERNS = [
  /^uri$/i,
  /^uti$/i,
  /\bnon toxic\b/i,
  /\biv fluids\b/,
  /\bin ed\b/i,
] as const;

export const HUMAN_DOC_REQUIRED_SAMPLE_SECTIONS = [
  "HPI:",
  "ROS+:",
  "ROS−:",
  "Exam:",
  "Reassessment:",
  "MDM Working Assessment:",
  "MDM Differential:",
  "MDM Data Reviewed:",
  "MDM Risk Stratification:",
  "MDM Reasoning:",
  "Clinical Impression:",
  "Plan:",
  "Disposition:",
] as const;

export type HumanDocViolationCategory =
  | "forbidden-phrase"
  | "forbidden-token"
  | "workflow"
  | "robotic"
  | "internal-terminology"
  | "noun-chain-return"
  | "track-c"
  | "meta-documentation";

export type HumanDocViolation = {
  phase: string;
  templateId: string;
  section: string;
  key: string;
  value: string;
  category: HumanDocViolationCategory;
  phrase: string;
};

export type HumanDocumentationAuditFamily = {
  phase: string;
  requiredSamplesPerTemplate: number;
  templates: ReadonlyArray<{
    templateId: string;
    bundle: ProviderDocumentationComplaintIntelligence;
    namespace: string;
  }>;
  messageSource: Record<string, Record<string, string>>;
};

export const HUMAN_DOCUMENTATION_AUDIT_FAMILIES: readonly HumanDocumentationAuditFamily[] = [
  {
    phase: "MEDUI.ED.ME.2V-RA",
    requiredSamplesPerTemplate: 20,
    templates: [
      { templateId: "fever", bundle: PEDIATRIC_FEVER_COMPLAINT_INTEL, namespace: "pediatricFever" },
      { templateId: "seizure", bundle: PEDIATRIC_SEIZURE_COMPLAINT_INTEL, namespace: "pediatricSeizure" },
      { templateId: "pediatric_rash", bundle: PEDIATRIC_RASH_COMPLAINT_INTEL, namespace: "pediatricRash" },
      { templateId: "dehydration", bundle: PEDIATRIC_DEHYDRATION_COMPLAINT_INTEL, namespace: "pediatricDehydration" },
      { templateId: "croup", bundle: PEDIATRIC_CROUP_COMPLAINT_INTEL, namespace: "pediatricCroup" },
      {
        templateId: "rsv_like_illness",
        bundle: PEDIATRIC_RSV_LIKE_ILLNESS_COMPLAINT_INTEL,
        namespace: "pediatricRsvLikeIllness",
      },
    ],
    messageSource: providerDocumentationPediatricLegacyComplaintIntelEn,
  },
  {
    phase: "MEDUI.ED.ME.2W-R",
    requiredSamplesPerTemplate: 20,
    templates: [
      { templateId: "stroke_symptoms", bundle: STROKE_SYMPTOMS_COMPLAINT_INTEL, namespace: "stroke" },
      { templateId: "weakness", bundle: WEAKNESS_COMPLAINT_INTEL, namespace: "weakness" },
      {
        templateId: "altered_mental_status_complaint_v1",
        bundle: ALTERED_MENTAL_STATUS_COMPLAINT_V1_INTEL,
        namespace: "alteredMentalStatusComplaintV1",
      },
      {
        templateId: "focal_weakness_complaint_v1",
        bundle: FOCAL_WEAKNESS_COMPLAINT_V1_INTEL,
        namespace: "focalWeaknessComplaintV1",
      },
      {
        templateId: "numbness_tingling_complaint_v1",
        bundle: NUMBNESS_TINGLING_COMPLAINT_V1_INTEL,
        namespace: "numbnessTinglingComplaintV1",
      },
      {
        templateId: "gait_instability_falls_neuro_complaint_v1",
        bundle: GAIT_INSTABILITY_FALLS_NEURO_COMPLAINT_V1_INTEL,
        namespace: "gaitInstabilityFallsNeuroComplaintV1",
      },
      {
        templateId: "back_pain_neuro_red_flags_complaint_v1",
        bundle: BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL,
        namespace: "backPainNeuroRedFlagsComplaintV1",
      },
    ],
    messageSource: providerDocumentationNeuroStrokeWeaknessComplaintIntelEn,
  },
  {
    phase: "MEDUI.ED.ME.2Y-R",
    requiredSamplesPerTemplate: 20,
    templates: [
      { templateId: "palpitations_complaint_v1", bundle: PALPITATIONS_COMPLAINT_V1_INTEL, namespace: "palpitationsComplaintV1" },
      { templateId: "hypertension_complaint_v1", bundle: HYPERTENSION_COMPLAINT_V1_INTEL, namespace: "hypertensionComplaintV1" },
      {
        templateId: "leg_swelling_dvt_complaint_v1",
        bundle: LEG_SWELLING_DVT_COMPLAINT_V1_INTEL,
        namespace: "legSwellingDvtComplaintV1",
      },
      { templateId: "chf_symptoms_complaint_v1", bundle: CHF_SYMPTOMS_COMPLAINT_V1_INTEL, namespace: "chfSymptomsComplaintV1" },
      { templateId: "afib_rapid_rate_complaint_v1", bundle: AFIB_RAPID_RATE_COMPLAINT_V1_INTEL, namespace: "afibRapidRateComplaintV1" },
      {
        templateId: "generalized_weakness_cardiac_equivalent_complaint_v1",
        bundle: GENERALIZED_WEAKNESS_CARDIAC_EQUIVALENT_COMPLAINT_V1_INTEL,
        namespace: "generalizedWeaknessCardiacEquivalentComplaintV1",
      },
      { templateId: "near_syncope_complaint_v1", bundle: NEAR_SYNCOPE_COMPLAINT_V1_INTEL, namespace: "nearSyncopeComplaintV1" },
      {
        templateId: "exertional_dyspnea_complaint_v1",
        bundle: EXERTIONAL_DYSPNEA_COMPLAINT_V1_INTEL,
        namespace: "exertionalDyspneaComplaintV1",
      },
      {
        templateId: "edema_volume_overload_complaint_v1",
        bundle: EDEMA_VOLUME_OVERLOAD_COMPLAINT_V1_INTEL,
        namespace: "edemaVolumeOverloadComplaintV1",
      },
    ],
    messageSource: {
      ...providerDocumentationCardiacNonChestPainComplaintIntelEn,
      nearSyncopeComplaintV1: providerDocumentationDizzinessVertigoComplaintIntelEn.nearSyncopeComplaintV1,
    },
  },
  // Future phases register here:
  // MEDUI.ED.ME.2Z-R — Renal / Metabolic / Endocrine
  // MEDUI.ED.ME.2AA-R — GI Extensions
  // MEDUI.ED.ME.2X-R — Psychiatric / Behavioral
  // MEDUI.ED.ME.2AB-R — Legacy Adult Utilities
  // ENTERPRISE-CLEANUP
];

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

export function isDataReviewedSection(section: string): boolean {
  return section === "Data reviewed";
}

export function isDataReviewedKey(key: string): boolean {
  return key.toLowerCase().includes("reviewed");
}

export function messagesForBundle(
  bundle: ProviderDocumentationComplaintIntelligence,
  messageSource: Record<string, Record<string, string>>
): Record<string, string> {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject = messageSource[namespace] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    const value = namespaceObject[key];
    if (value) out[key] = value;
  }
  return out;
}

export function sectionEntriesForBundle(
  bundle: ProviderDocumentationComplaintIntelligence
): Array<{ section: string; keys: string[] }> {
  return [
    { section: "HPI", keys: (bundle.hpi ?? []).map(fragmentKeySuffix) },
    { section: "ROS positive", keys: (bundle.rosImportantPositives ?? []).map(fragmentKeySuffix) },
    { section: "ROS negative", keys: (bundle.rosImportantNegatives ?? []).map(fragmentKeySuffix) },
    { section: "ROS red flag", keys: (bundle.rosRedFlags ?? []).map(fragmentKeySuffix) },
    {
      section: "Exam",
      keys: Object.values(bundle.physicalExam ?? {})
        .flat()
        .map(fragmentKeySuffix),
    },
    { section: "Working assessment", keys: (bundle.mdmWorkingAssessment ?? []).map(fragmentKeySuffix) },
    { section: "Differential", keys: (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix) },
    { section: "Risk stratification", keys: (bundle.mdmRiskStratification ?? []).map(fragmentKeySuffix) },
    { section: "Medical reasoning", keys: (bundle.mdmClinicalRationale ?? []).map(fragmentKeySuffix) },
    { section: "Impression", keys: (bundle.clinicalImpression ?? []).map(fragmentKeySuffix) },
    { section: "Plan", keys: (bundle.mdmPlanSummary ?? []).map(fragmentKeySuffix) },
    { section: "Disposition", keys: (bundle.mdmAdmitObserveDischarge ?? []).map(fragmentKeySuffix) },
    { section: "Follow-up disposition", keys: (bundle.followUpDisposition ?? []).map(fragmentKeySuffix) },
    { section: "Data reviewed", keys: (bundle.mdmDataReviewed ?? []).map(fragmentKeySuffix) },
    { section: "Reassessment", keys: (bundle.reassessment ?? []).map(fragmentKeySuffix) },
  ];
}

function isRoboticReturnPhrase(value: string): boolean {
  const lower = value.toLowerCase();
  for (const phrase of HUMAN_DOC_FORBIDDEN_NOUN_CHAIN_RETURNS) {
    if (lower.includes(phrase)) return true;
  }
  const roboticNounChain = /^return [a-z]+ [a-z]+ [a-z]+ [a-z]+$/i.test(value);
  const hasClinicalConnectors = /(for|or|if|to|with|given|in|the|,)/i.test(value);
  return roboticNounChain && !hasClinicalConnectors;
}

function isAllowedDataReviewedValue(value: string): boolean {
  return HUMAN_DOC_ALLOWED_DATA_REVIEWED_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

export function auditHumanDocumentationValues(input: {
  phase: string;
  templateId: string;
  bundle: ProviderDocumentationComplaintIntelligence;
  messages: Record<string, string>;
}): HumanDocViolation[] {
  const { phase, templateId, bundle, messages } = input;
  const violations: HumanDocViolation[] = [];

  for (const { section, keys } of sectionEntriesForBundle(bundle)) {
    for (const key of keys) {
      const value = messages[key];
      if (!value) continue;
      const allowReviewLanguage = isDataReviewedSection(section);

      if (!allowReviewLanguage) {
        const lower = value.toLowerCase();

        for (const phrase of HUMAN_DOC_FORBIDDEN_RENDERED_PHRASES) {
          if (lower.includes(phrase)) {
            violations.push({
              phase,
              templateId,
              section,
              key,
              value,
              category: ["sticky note", "chip", "fragment", "template", "governance", "workflow"].some((t) =>
                phrase.includes(t)
              )
                ? "internal-terminology"
                : ["discussed", "recommended", "advised"].some((t) => phrase.includes(t))
                  ? "workflow"
                  : "forbidden-phrase",
              phrase,
            });
          }
        }

        for (const token of HUMAN_DOC_FORBIDDEN_RENDERED_TOKENS) {
          const tokenPattern = new RegExp(`\\b${token}\\b`, "i");
          if (tokenPattern.test(value)) {
            violations.push({
              phase,
              templateId,
              section,
              key,
              value,
              category: "forbidden-token",
              phrase: token,
            });
          }
        }

        for (const pattern of HUMAN_DOC_ROBOTIC_VALUE_PATTERNS) {
          if (pattern.test(value)) {
            violations.push({
              phase,
              templateId,
              section,
              key,
              value,
              category: "robotic",
              phrase: pattern.source,
            });
          }
        }

        if (isRoboticReturnPhrase(value)) {
          violations.push({
            phase,
            templateId,
            section,
            key,
            value,
            category: "noun-chain-return",
            phrase: "return noun chain",
          });
        }
      } else if (!isAllowedDataReviewedValue(value)) {
        violations.push({
          phase,
          templateId,
          section,
          key,
          value,
          category: "forbidden-phrase",
          phrase: "data reviewed value must end with reviewed/revue",
        });
      }

      if (/\bhistorian used\b/i.test(value)) {
        violations.push({
          phase,
          templateId,
          section,
          key,
          value,
          category: "meta-documentation",
          phrase: "historian used",
        });
      }
    }
  }

  const chartReadyMessages = Object.fromEntries(
    Object.entries(messages).filter(([key]) => !isDataReviewedKey(key))
  );
  const dataReviewedMessages = Object.fromEntries(
    Object.entries(messages).filter(([key]) => isDataReviewedKey(key))
  );
  for (const line of auditTrackCi18nMessageValues(chartReadyMessages)) {
    violations.push({
      phase,
      templateId,
      section: "Track C",
      key: line,
      value: "",
      category: "track-c",
      phrase: line,
    });
  }
  for (const line of auditTrackCi18nMessageValues(dataReviewedMessages, { allowReviewLanguage: true })) {
    violations.push({
      phase,
      templateId,
      section: "Data reviewed",
      key: line,
      value: "",
      category: "track-c",
      phrase: line,
    });
  }

  return violations;
}

export function auditHumanDocumentationForFamilyTemplate(
  family: HumanDocumentationAuditFamily,
  templateId: string
): HumanDocViolation[] {
  const template = family.templates.find((item) => item.templateId === templateId);
  if (!template) {
    throw new Error(`Template "${templateId}" is not registered in family ${family.phase}`);
  }
  const messages = messagesForBundle(template.bundle, family.messageSource);
  return auditHumanDocumentationValues({
    phase: family.phase,
    templateId,
    bundle: template.bundle,
    messages,
  });
}

export function assertHumanDocumentationAuditPasses(
  templateId: string,
  violations: HumanDocViolation[]
): void {
  if (violations.length === 0) return;
  const lines = violations.map(
    (violation) =>
      `[${violation.category}] ${violation.templateId} / ${violation.section} / ${violation.key}: "${violation.phrase}" in "${violation.value}"`
  );
  throw new Error(
    `Human Documentation Audit failed for "${templateId}":\n- ${lines.join("\n- ")}`
  );
}

export function renderHumanDocumentationSampleNote(
  bundle: ProviderDocumentationComplaintIntelligence,
  messages: Record<string, string>,
  sampleIndex: number
): string {
  const pick = (keys: string[], offset: number) => {
    if (keys.length === 0) return null;
    const key = keys[(sampleIndex + offset) % keys.length];
    const text = messages[key];
    return text ? { key, text } : null;
  };

  const suffixKeys = (keys: string[] | undefined) => (keys ?? []).map(fragmentKeySuffix);

  const hpi = pick(suffixKeys(bundle.hpi), 0);
  const rosPos = pick(suffixKeys(bundle.rosImportantPositives), 2);
  const rosNeg = pick(suffixKeys(bundle.rosImportantNegatives), 4);
  const exam = pick(
    Object.values(bundle.physicalExam ?? {})
      .flat()
      .map(fragmentKeySuffix),
    6
  );
  const reassess = pick(suffixKeys(bundle.reassessment), 8);
  const working = pick(suffixKeys(bundle.mdmWorkingAssessment), 10);
  const differential = pick(suffixKeys(bundle.mdmDifferentialSynthesis), 12);
  const dataReviewed = pick(suffixKeys(bundle.mdmDataReviewed), 14);
  const risk = pick(suffixKeys(bundle.mdmRiskStratification), 16);
  const reasoning = pick(suffixKeys(bundle.mdmClinicalRationale), 18);
  const impression = pick(suffixKeys(bundle.clinicalImpression), 20);
  const plan = pick(suffixKeys(bundle.mdmPlanSummary), 22);
  const disp = pick(suffixKeys(bundle.followUpDisposition), 24);

  const parts = [
    hpi ? `HPI: ${hpi.text}` : null,
    rosPos ? `ROS+: ${rosPos.text}` : null,
    rosNeg ? `ROS−: ${rosNeg.text}` : null,
    exam ? `Exam: ${exam.text}` : null,
    reassess ? `Reassessment: ${reassess.text}` : null,
    working ? `MDM Working Assessment: ${working.text}` : null,
    differential ? `MDM Differential: ${differential.text}` : null,
    dataReviewed ? `MDM Data Reviewed: ${dataReviewed.text}` : null,
    risk ? `MDM Risk Stratification: ${risk.text}` : null,
    reasoning ? `MDM Reasoning: ${reasoning.text}` : null,
    impression ? `Clinical Impression: ${impression.text}` : null,
    plan ? `Plan: ${plan.text}` : null,
    disp ? `Disposition: ${disp.text}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

export function buildHumanDocumentationSamples(input: {
  bundle: ProviderDocumentationComplaintIntelligence;
  messages: Record<string, string>;
  count?: number;
}): string[] {
  const count = input.count ?? 20;
  return Array.from({ length: count }, (_, index) =>
    renderHumanDocumentationSampleNote(input.bundle, input.messages, index)
  );
}

export function buildHumanDocumentationSamplesForFamilyTemplate(
  family: HumanDocumentationAuditFamily,
  templateId: string,
  count?: number
): string[] {
  const template = family.templates.find((item) => item.templateId === templateId);
  if (!template) {
    throw new Error(`Template "${templateId}" is not registered in family ${family.phase}`);
  }
  const messages = messagesForBundle(template.bundle, family.messageSource);
  return buildHumanDocumentationSamples({
    bundle: template.bundle,
    messages,
    count: count ?? family.requiredSamplesPerTemplate,
  });
}

export function assertHumanDocumentationSampleNoteComplete(sample: string): void {
  for (const section of HUMAN_DOC_REQUIRED_SAMPLE_SECTIONS) {
    if (!sample.includes(section)) {
      throw new Error(`Rendered sample missing required section "${section}"`);
    }
  }
}
