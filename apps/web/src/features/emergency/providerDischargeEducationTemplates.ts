/**
 * Phase 19Y — editable discharge education suggestions (not AI; provider-controlled).
 * Source metadata is for engineering/audit only — not shown in patient-facing UI.
 */

export type ProviderDischargeEducationSource = {
  id: string;
  title: string;
  url: string;
  publisher: string;
};

export type ProviderDischargeEducationTemplate = {
  id: string;
  /** ICD-10 prefixes or keyword tokens (lowercase) used for suggestion matching only. */
  match: { icdPrefixes?: string[]; keywords?: string[] };
  description: string;
  instructions: string;
  returnPrecautions: string;
  /** Optional wound-care line merged into instructions when template applies. */
  woundCare?: string;
  sources: ProviderDischargeEducationSource[];
};

/**
 * Starting templates derived from public patient-education sources (MedlinePlus, AAST wound care).
 * Wording is paraphrased for editable suggestion text — provider must review before save.
 */
export const PROVIDER_DISCHARGE_EDUCATION_TEMPLATES: readonly ProviderDischargeEducationTemplate[] = [
  {
    id: "chest_pain",
    match: {
      icdPrefixes: ["I20", "I21", "I22", "R07"],
      keywords: ["chest pain", "angina", "thoracic pain", "douleur thoracique"],
    },
    description:
      "You were evaluated in the emergency department for chest pain. Based on today's evaluation and tests, no condition requiring hospital admission was identified at this time. Your symptoms may still need outpatient follow-up.",
    instructions:
      "Rest as needed. Take medications only as prescribed or directed by your clinician. Avoid driving or operating machinery if you take sedating pain medicine.",
    returnPrecautions:
      "Return immediately or call emergency services if chest pain returns or worsens, you have shortness of breath, fainting, heavy sweating, new weakness, or other concerning symptoms.",
    sources: [
      {
        id: "medlineplus-angina",
        title: "MedlinePlus — Angina",
        url: "https://medlineplus.gov/angina.html",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
      },
    ],
  },
  {
    id: "abdominal_pain",
    match: {
      icdPrefixes: ["R10", "K35", "K37", "K80"],
      keywords: ["abdominal pain", "belly pain", "douleur abdominale"],
    },
    description:
      "Abdominal pain can have many causes, and some conditions may evolve over time after an emergency visit.",
    instructions:
      "Stay hydrated. Eat a light diet as tolerated unless your clinician advised otherwise. Avoid foods or medicines that worsen symptoms if you were told to do so.",
    returnPrecautions:
      "Return for care if pain worsens, fever develops, vomiting persists, you see blood in stool or vomit, faint, develop new abdominal swelling, or cannot keep fluids down.",
    sources: [
      {
        id: "medlineplus-abdominal-pain",
        title: "MedlinePlus — Abdominal pain",
        url: "https://medlineplus.gov/ency/article/003120.htm",
        publisher: "U.S. National Library of Medicine (MedlinePlus)",
      },
    ],
  },
  {
    id: "wound_laceration",
    match: {
      icdPrefixes: ["S01", "S11", "S21", "S31", "S41", "S51", "S61", "S71", "S81", "S91", "T14.1"],
      keywords: ["laceration", "wound", "cut", "plaie", "suture"],
    },
    description:
      "Your wound was evaluated and treated in the emergency department. Healing requires keeping the area clean and monitoring for infection.",
    instructions:
      "Keep the wound clean and dry. Change dressings as instructed. Avoid soaking the wound unless your clinician cleared you to do so.",
    woundCare:
      "Watch for increasing pain, warmth, redness, swelling, drainage, or odor at the wound site.",
    returnPrecautions:
      "Return for care if you develop fever, spreading redness, pus, worsening pain, bleeding that does not stop, red streaking, numbness, or other concerning changes.",
    sources: [
      {
        id: "aast-wound-care",
        title: "AAST — Wound care discharge instructions",
        url: "https://www.aast.org/",
        publisher: "American Association for the Surgery of Trauma (AAST)",
      },
    ],
  },
] as const;

export function normalizeEducationMatchToken(value: string): string {
  return value.trim().toLowerCase();
}

/** Best-effort template match from diagnosis code/label — suggestion only. */
export function matchProviderDischargeEducationTemplate(input: {
  code?: string;
  label?: string;
}): ProviderDischargeEducationTemplate | null {
  const code = normalizeEducationMatchToken(input.code ?? "");
  const label = normalizeEducationMatchToken(input.label ?? "");
  for (const template of PROVIDER_DISCHARGE_EDUCATION_TEMPLATES) {
    const prefixes = template.match.icdPrefixes ?? [];
    if (prefixes.some((p) => code.startsWith(normalizeEducationMatchToken(p)))) {
      return template;
    }
    const keywords = template.match.keywords ?? [];
    if (keywords.some((k) => label.includes(normalizeEducationMatchToken(k)))) {
      return template;
    }
  }
  return null;
}

export function buildEducationSuggestionFromTemplate(
  template: ProviderDischargeEducationTemplate
): { description: string; instructions: string; returnPrecautions: string } {
  const instructions = template.woundCare
    ? `${template.instructions}\n${template.woundCare}`
    : template.instructions;
  return {
    description: template.description,
    instructions,
    returnPrecautions: template.returnPrecautions,
  };
}
