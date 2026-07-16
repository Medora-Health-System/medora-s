export type SpineRedFlagCategory =
  | "cauda_equina"
  | "infection"
  | "malignancy"
  | "fracture"
  | "vascular_mimic";

export type SpineRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type SpineRedFlagResolution = {
  categories: SpineRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const DEFINITIONS: Array<{ category: SpineRedFlagCategory; pattern: RegExp; prompt: string }> = [
  {
    category: "cauda_equina",
    pattern:
      /cauda|conus|saddle|perineal|bowel.*bladder|bladder.*bowel|urinary retention|overflow incontinence|incontinence|bilateral (leg |sciatica|weakness)|progressive motor/,
    prompt:
      "Document bowel/bladder function, saddle sensation, lower-extremity strength, and urgency of evaluation. Possible cauda equina/conus medullaris syndrome requires urgent evaluation.",
  },
  {
    category: "infection",
    pattern:
      /epidural abscess|discitis|osteomyelitis|spinal infection|fever|chills|iv ?dru|ivdu|immunocomprom|immunosuppress|bacteremia|dialysis|transplant|spinal (injection|procedure|surgery)/,
    prompt:
      "Document fever, infection risk factors, neurologic findings, and clinician-directed evaluation for spinal infection. Do not rely on the classic triad being present.",
  },
  {
    category: "malignancy",
    pattern: /malignan|cancer|metastat|weight loss|night pain|pathologic fracture|oncolog/,
    prompt: "Document cancer history, unexplained weight loss, night pain, neurologic findings, and oncology/spine consultation considerations.",
  },
  {
    category: "fracture",
    pattern:
      /fracture|compression fracture|burst|s12|s22\.0|s22\.1|s32\.0|trauma|fall|osteoporos|steroid|midline tenderness|deformity/,
    prompt: "Document mechanism, midline tenderness, neurologic examination, imaging rationale, and pathologic versus traumatic context when known.",
  },
  {
    category: "vascular_mimic",
    pattern:
      /aortic|aneurysm|dissection|pulsatile|tearing|syncope|hypotension|abdominal pain|flank pain|vascular/,
    prompt: "Document vascular symptoms, abdominal examination, pulses, and clinician-directed evaluation for vascular causes of back pain.",
  },
];

/** Documentation advisory only. It never establishes a diagnosis or places an order. */
export function resolveSpineRedFlags(input: SpineRedFlagInput): SpineRedFlagResolution {
  const text = normalize([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function spineRedFlagWarnings(input: SpineRedFlagInput): string[] {
  return resolveSpineRedFlags(input).prompts;
}
