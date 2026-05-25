/**
 * Phase 19Y.2 — centralized provider discharge template registry.
 * All clinical suggestion text lives here — not in React UI components.
 */

import {
  computeProviderDischargeTemplateAppliedHash,
} from "./providerDischargeTemplateAppliedHash";
import {
  newDefaultFollowUpRow,
  newDiagnosisDocId,
  newFollowUpRowId,
  type ProviderDischargeDiagnosisCard,
  type ProviderDischargeFollowUpRow,
  type ProviderDischargeMedicationLine,
} from "./providerDischargeDocumentationModel";

export type ProviderDischargeTemplateMatchLevel = "icdExact" | "icdFamily" | "keyword" | "generic";

export type ProviderDischargeTemplateSourceReference = {
  label: string;
  url?: string;
  publisher?: string;
  accessedAt?: string;
};

export type ProviderDischargeTemplate = {
  id: string;
  version: string;
  title: string;
  /** Governance metadata — not shown in patient UI; not used for billing. */
  specialtyCategory?: string;
  riskCategory?: string;
  diagnosisMappings: {
    icdExact?: string[];
    icdFamily?: string[];
    keyword?: string[];
  };
  sourceReferences: ProviderDischargeTemplateSourceReference[];
  defaultFollowUps?: ProviderDischargeFollowUpRow[];
  suggestedText: {
    description: string;
    diagnosisInstructions: string;
    medicationTreatment: string;
    returnPrecautions: string;
    returnWorkSchool?: string;
    treatment?: string;
  };
};

export type ProviderDischargeTemplateResolveResult = {
  template: ProviderDischargeTemplate;
  matchLevel: ProviderDischargeTemplateMatchLevel;
};

export const GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID = "generic_ed_discharge_v1";

export const PROVIDER_DISCHARGE_TEMPLATE_REGISTRY: readonly ProviderDischargeTemplate[] = [
  {
    id: "chest_pain_v1",
    version: "1.0.0",
    title: "Chest pain discharge documentation",
    specialtyCategory: "cardiology",
    riskCategory: "moderate",
    diagnosisMappings: {
      icdExact: ["R07.9", "I21.9", "I20.9"],
      icdFamily: ["R07", "I20", "I21", "I22"],
      keyword: ["chest pain", "angina", "thoracic pain", "douleur thoracique"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Angina",
        url: "https://medlineplus.gov/angina.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: "2026-05-01",
      },
    ],
    suggestedText: {
      description:
        "You were evaluated in the emergency department for chest pain. Based on today's evaluation and tests, no condition requiring hospital admission was identified at this time. Your symptoms may still need outpatient follow-up.",
      diagnosisInstructions:
        "Rest as needed. Take medications only as prescribed or directed by your clinician. Avoid driving or operating machinery if you take sedating pain medicine.",
      medicationTreatment:
        "Take medications only as prescribed or directed during this visit. Do not start new medications without clinician guidance.",
      returnPrecautions:
        "Return immediately or call emergency services if chest pain returns or worsens, you have shortness of breath, fainting, heavy sweating, new weakness, or other concerning symptoms.",
    },
  },
  {
    id: "abdominal_pain_family_v1",
    version: "1.0.0",
    title: "Abdominal pain (ICD family) discharge documentation",
    specialtyCategory: "emergency_medicine",
    riskCategory: "moderate",
    diagnosisMappings: {
      icdFamily: ["R10", "K35", "K37", "K80"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Abdominal pain",
        url: "https://medlineplus.gov/ency/article/003120.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: "2026-05-01",
      },
    ],
    suggestedText: {
      description:
        "Abdominal pain can have many causes, and some conditions may evolve over time after an emergency visit.",
      diagnosisInstructions:
        "Stay hydrated. Eat a light diet as tolerated unless your clinician advised otherwise. Avoid foods or medicines that worsen symptoms if you were told to do so.",
      medicationTreatment:
        "Take pain or anti-nausea medicines only as prescribed. Avoid aspirin or NSAIDs unless directed by your clinician.",
      returnPrecautions:
        "Return for care if pain worsens, fever develops, vomiting persists, you see blood in stool or vomit, faint, develop new abdominal swelling, or cannot keep fluids down.",
    },
  },
  {
    id: "abdominal_pain_keyword_v1",
    version: "1.0.0",
    title: "Abdominal pain (keyword) discharge documentation",
    specialtyCategory: "emergency_medicine",
    riskCategory: "moderate",
    diagnosisMappings: {
      keyword: ["abdominal pain", "belly pain", "douleur abdominale"],
    },
    sourceReferences: [
      {
        label: "MedlinePlus — Abdominal pain (keyword fallback)",
        url: "https://medlineplus.gov/ency/article/003120.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
        accessedAt: "2026-05-01",
      },
    ],
    suggestedText: {
      description:
        "You were seen in the emergency department for abdominal pain. Some causes may change after you leave; follow the instructions below and your follow-up plan.",
      diagnosisInstructions:
        "Advance diet as tolerated unless told otherwise. Stay hydrated and rest as needed.",
      medicationTreatment: "Use prescribed medicines only as directed.",
      returnPrecautions:
        "Seek urgent care for worsening pain, fever, persistent vomiting, blood in stool or vomit, fainting, or inability to keep fluids down.",
    },
  },
  {
    id: "wound_laceration_v1",
    version: "1.0.0",
    title: "Wound / laceration discharge documentation",
    specialtyCategory: "wound_care",
    riskCategory: "low_to_moderate",
    diagnosisMappings: {
      icdExact: ["S01.01", "T14.1"],
      icdFamily: ["S01", "S11", "S21", "S31", "S41", "S51", "S61", "S71", "S81", "S91", "T14"],
      keyword: ["laceration", "wound", "cut", "plaie", "suture"],
    },
    sourceReferences: [
      {
        label: "AAST — Wound care discharge instructions",
        url: "https://www.aast.org/",
        publisher: "American Association for the Surgery of Trauma (AAST)",
        accessedAt: "2026-05-01",
      },
    ],
    defaultFollowUps: [{ ...newDefaultFollowUpRow(), specialty: "WOUND_CARE", timing: "3–5 days", id: "wound-care-default" }],
    suggestedText: {
      description:
        "Your wound was evaluated and treated in the emergency department. Healing requires keeping the area clean and monitoring for infection.",
      diagnosisInstructions:
        "Keep the wound clean and dry. Change dressings as instructed. Avoid soaking the wound unless your clinician cleared you to do so.\nWatch for increasing pain, warmth, redness, swelling, drainage, or odor at the wound site.",
      medicationTreatment:
        "Take wound-related antibiotics or pain medicine only as prescribed. Keep dressing supplies as instructed.",
      returnPrecautions:
        "Return for care if you develop fever, spreading redness, pus, worsening pain, bleeding that does not stop, red streaking, numbness, or other concerning changes.",
    },
  },
  {
    id: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
    version: "1.0.0",
    title: "Generic ED discharge documentation",
    specialtyCategory: "emergency_medicine",
    riskCategory: "unspecified",
    diagnosisMappings: {},
    sourceReferences: [
      {
        label: "Medora-S — clinician-authored generic ED discharge scaffold",
        publisher: "Medora-S (internal governance scaffold)",
        accessedAt: "2026-05-01",
      },
    ],
    suggestedText: {
      description: "",
      diagnosisInstructions: "",
      medicationTreatment: "",
      returnPrecautions: "",
    },
  },
] as const;

/** Known clinical paragraph fragments — must exist only in this registry (regression gate). */
export const PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS = [
  "You were evaluated in the emergency department for chest pain",
  "Abdominal pain can have many causes",
  "Your wound was evaluated and treated in the emergency department",
  "Return immediately or call emergency services if chest pain returns",
] as const;

function normalizeIcdCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

function normalizeMatchToken(value: string): string {
  return value.trim().toLowerCase();
}

function familyPrefix(raw: string): string {
  return normalizeIcdCode(raw.replace(/\.\*$/, "").replace(/\*$/, ""));
}

function nonGenericTemplates(): ProviderDischargeTemplate[] {
  return PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter((t) => t.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
}

function genericTemplate(): ProviderDischargeTemplate {
  return PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID)!;
}

export function resolveProviderDischargeTemplateForDiagnosis(input: {
  code?: string;
  displayName?: string;
  label?: string;
}): ProviderDischargeTemplateResolveResult {
  const code = normalizeIcdCode(input.code ?? "");
  const labelText = normalizeMatchToken(
    [input.displayName, input.label, input.code].filter(Boolean).join(" ")
  );

  for (const template of nonGenericTemplates()) {
    for (const exact of template.diagnosisMappings.icdExact ?? []) {
      if (code && normalizeIcdCode(exact) === code) {
        return { template, matchLevel: "icdExact" };
      }
    }
  }

  let bestFamily: { template: ProviderDischargeTemplate; prefixLen: number } | null = null;
  for (const template of nonGenericTemplates()) {
    for (const family of template.diagnosisMappings.icdFamily ?? []) {
      const prefix = familyPrefix(family);
      if (code && prefix && code.startsWith(prefix)) {
        if (!bestFamily || prefix.length > bestFamily.prefixLen) {
          bestFamily = { template, prefixLen: prefix.length };
        }
      }
    }
  }
  if (bestFamily) {
    return { template: bestFamily.template, matchLevel: "icdFamily" };
  }

  for (const template of nonGenericTemplates()) {
    for (const keyword of template.diagnosisMappings.keyword ?? []) {
      const token = normalizeMatchToken(keyword);
      if (token && labelText.includes(token)) {
        return { template, matchLevel: "keyword" };
      }
    }
  }

  return { template: genericTemplate(), matchLevel: "generic" };
}

export type BuildProviderDischargeCardInput = {
  sourceEncounterDiagnosisId: string;
  code: string;
  displayName: string;
  displayOrder: number;
  isPrimaryDiagnosis: boolean;
  applyTemplateSuggestion?: boolean;
  actor?: { displayName?: string; appliedAt?: string };
};

export function buildProviderDischargeCardFromDiagnosis(
  input: BuildProviderDischargeCardInput
): ProviderDischargeDiagnosisCard {
  const card: ProviderDischargeDiagnosisCard = {
    id: newDiagnosisDocId(),
    sourceEncounterDiagnosisId: input.sourceEncounterDiagnosisId,
    encounterDiagnosisId: input.sourceEncounterDiagnosisId,
    code: input.code,
    displayName: input.displayName,
    isPrimaryDiagnosis: input.isPrimaryDiagnosis,
    displayOrder: input.displayOrder,
    description: "",
    diagnosisInstructions: "",
    medicationTreatment: "",
    treatment: "",
    returnPrecautions: "",
    returnWorkSchool: "",
    followUps: [newDefaultFollowUpRow()],
    medicationLines: [],
  };

  if (!input.applyTemplateSuggestion) return card;

  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: input.code,
    displayName: input.displayName,
  });

  if (resolved.matchLevel === "generic") return card;

  return applyProviderDischargeTemplateToCard(card, resolved, {
    actor: input.actor,
    providerConfirmed: false,
    overwriteExisting: false,
  });
}

export function applyProviderDischargeTemplateToCard(
  card: ProviderDischargeDiagnosisCard,
  resolved: ProviderDischargeTemplateResolveResult,
  options?: {
    actor?: { displayName?: string; appliedAt?: string };
    overwriteExisting?: boolean;
    providerConfirmed?: boolean;
  }
): ProviderDischargeDiagnosisCard {
  const { template, matchLevel } = resolved;
  const overwrite = options?.overwriteExisting === true;
  const text = template.suggestedText;
  const sourceReferences = template.sourceReferences.map((r) => r.label);

  const next: ProviderDischargeDiagnosisCard = { ...card };

  if (overwrite || !next.description.trim()) next.description = text.description;
  if (overwrite || !next.diagnosisInstructions.trim()) next.diagnosisInstructions = text.diagnosisInstructions;
  if (overwrite || !next.medicationTreatment.trim()) next.medicationTreatment = text.medicationTreatment;
  if (text.treatment && (overwrite || !(next.treatment ?? "").trim())) next.treatment = text.treatment;
  if (overwrite || !next.returnPrecautions.trim()) next.returnPrecautions = text.returnPrecautions;
  if (text.returnWorkSchool && (overwrite || !(next.returnWorkSchool ?? "").trim())) {
    next.returnWorkSchool = text.returnWorkSchool;
  }

  if (
    template.defaultFollowUps?.length &&
    (overwrite || !next.followUps.some((r) => r.providerOrFacility.trim() || r.timing.trim()))
  ) {
    next.followUps = template.defaultFollowUps.map((row) => ({
      ...row,
      id: newFollowUpRowId(),
    }));
  }

  next.templateMeta = {
    templateId: template.id,
    templateVersion: template.version,
    matchLevel,
    sourceReferences,
    templateAppliedHash: computeProviderDischargeTemplateAppliedHash(template),
    ...(template.specialtyCategory?.trim() ? { specialtyCategory: template.specialtyCategory.trim() } : {}),
    ...(template.riskCategory?.trim() ? { riskCategory: template.riskCategory.trim() } : {}),
    appliedAt: options?.actor?.appliedAt,
    appliedByDisplayName: options?.actor?.displayName,
    providerConfirmed: options?.providerConfirmed ?? false,
  };
  next.sourceTemplateId = template.id;
  next.sourceVersion = template.version;

  return next;
}
