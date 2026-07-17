/**
 * Phase 17 (Commit 1) — OB/GYN / urology red-flag screening (documentation advisory only).
 * Mirrors `toxicologyToxidromeRedFlagEngine.ts` (Phase 16). Never establishes a diagnosis,
 * never dates a pregnancy, never interprets ultrasound, never orders medications or RhIG,
 * never admits, never transfers, never medically clears, and never requests a consult.
 */

export type ObGynUrologyRedFlagCategory =
  | "ruptured_ectopic_concern"
  | "severe_preeclampsia_eclampsia_hellp"
  | "placental_emergency"
  | "cord_prolapse_or_imminent_delivery"
  | "ovarian_torsion_concern"
  | "testicular_torsion_concern"
  | "infected_obstructed_stone"
  | "fournier_concern"
  | "postpartum_hemorrhage"
  | "urinary_sepsis_shock";

export type ObGynUrologyRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type ObGynUrologyRedFlagResolution = {
  categories: ObGynUrologyRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const NO_AUTONOMOUS_ACTION_SUFFIX =
  "This module does not autonomously diagnose, date a pregnancy, interpret ultrasound, select medications or RhIG, admit, transfer, medically clear, or request a consult — those remain the treating clinician's decisions.";

const DEFINITIONS: Array<{
  category: ObGynUrologyRedFlagCategory;
  pattern: RegExp;
  prompt: string;
}> = [
  {
    category: "ruptured_ectopic_concern",
    pattern:
      /ruptured ectopic|ectopic pregnancy with (shock|hemoperitoneum|syncope|hypotension)|hemodynamically unstable ectopic|shoulder pain with ectopic|free fluid with ectopic/,
    prompt:
      "Document pregnancy test, beta-hCG trend if obtained, pelvic pain, vaginal bleeding, hemodynamic status, and surgical/obstetric consultation if arranged. Do not state ectopic excluded or fetal viability confirmed. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "severe_preeclampsia_eclampsia_hellp",
    pattern:
      /severe preeclampsia|eclampsia|hellp|hypertensive emergency (in )?pregnancy|seizure in pregnancy|headache with (hypertension|preeclampsia)|epigastric pain with (hypertension|preeclampsia)/,
    prompt:
      "Document blood pressure, neurologic status, headache, visual changes, epigastric/RUQ pain, labs if obtained (platelets, LFTs, creatinine), and fetal status if assessed. Do not auto-diagnose HELLP or eclampsia. Magnesium and antihypertensives remain MAR-owned if administered. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "placental_emergency",
    pattern:
      /placental abruption|abruptio placentae|placenta previa|previa with bleeding|antepartum hemorrhage|vaginal bleeding in (late|third) trimester/,
    prompt:
      "Document gestational age if known, bleeding amount, abdominal pain, uterine tone, fetal heart rate if obtained, and prior ultrasound findings if documented. Do not perform or prompt digital cervical exam when previa is unresolved. Do not confirm fetal well-being. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "cord_prolapse_or_imminent_delivery",
    pattern:
      /cord prolapse|prolapsed cord|umbilical cord (prolapse|visible)|imminent delivery|active labor with (rupture|bleeding)|precipitous delivery/,
    prompt:
      "Document cervical exam findings if performed, membrane status, fetal heart rate if obtained, and delivery location readiness. Do not diagnose labor stage or recommend transfer autonomously. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "ovarian_torsion_concern",
    pattern:
      /ovarian torsion|adnexal torsion|torsion (of ovary|concern)|sudden pelvic pain with (nausea|vomiting)|whirlpool sign|absent ovarian flow/,
    prompt:
      "Document onset, laterality, nausea/vomiting, pelvic exam, and imaging if obtained. Doppler flow presence does not exclude torsion. Do not state torsion excluded. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "testicular_torsion_concern",
    pattern:
      /testicular torsion|torsion of testis|acute scrotum with (nausea|vomiting)|high.?riding testis|absent cremasteric reflex|sudden scrotal pain/,
    prompt:
      "Document onset, laterality, scrotal exam, Doppler if obtained, and time from symptom onset. Doppler presence does not exclude torsion. Do not state torsion excluded. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "infected_obstructed_stone",
    pattern:
      /infected (obstructive )?stone|obstructive pyelonephritis|sepsis with (stone|hydronephrosis)|urosepsis with obstruction|pyonephrosis/,
    prompt:
      "Document fever, flank pain, urinary symptoms, imaging if obtained, and hemodynamic status. Antibiotics and drainage remain clinician-selected and MAR-recorded if administered. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "fournier_concern",
    pattern:
      /fournier|scrotal (gangrene|necrosis)|perineal necrotizing|necrotizing (soft tissue|infection) (of )?(perineum|scrotum|genital)/,
    prompt:
      "Document perineal/scrotal exam, pain out of proportion, crepitus, systemic toxicity, and overlap with Phase 13 NSTI ownership. This module documents overlap only — does not own Fournier disposition. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "postpartum_hemorrhage",
    pattern:
      /postpartum hemorrhage|pp hemorrhage|heavy bleeding after delivery|uterine atony|retained products|post.?partum (bleeding|hemorrhage)/,
    prompt:
      "Document delivery date/time if known, estimated blood loss if documented, uterine tone, vital signs, and prior obstetric interventions. Do not invent Apgar scores or delivery details. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
  {
    category: "urinary_sepsis_shock",
    pattern:
      /urinary sepsis|urosepsis|pyelonephritis with (shock|hypotension)|septic shock.*(urinary|pyelonephritis|uti)|anuric sepsis/,
    prompt:
      "Document fever, urinary symptoms, hemodynamic status, lactate if obtained, and source control plan if documented. Antibiotics remain MAR-owned if administered. " +
      NO_AUTONOMOUS_ACTION_SUFFIX,
  },
];

/** Documentation advisory only. Never establishes a diagnosis or autonomous treatment action. */
export function resolveObGynUrologyRedFlags(
  input: ObGynUrologyRedFlagInput
): ObGynUrologyRedFlagResolution {
  const text = normalize(
    [input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" ")
  );
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function obGynUrologyRedFlagWarnings(input: ObGynUrologyRedFlagInput): string[] {
  return resolveObGynUrologyRedFlags(input).prompts;
}

/** Safety gate: true whenever documented findings raise a high-risk OB/GYN or urology concern. */
export function isObGynUrologyLifeThreateningFlagged(input: ObGynUrologyRedFlagInput): boolean {
  const categories = resolveObGynUrologyRedFlags(input).categories;
  return (
    categories.includes("ruptured_ectopic_concern") ||
    categories.includes("severe_preeclampsia_eclampsia_hellp") ||
    categories.includes("placental_emergency") ||
    categories.includes("cord_prolapse_or_imminent_delivery") ||
    categories.includes("ovarian_torsion_concern") ||
    categories.includes("testicular_torsion_concern") ||
    categories.includes("infected_obstructed_stone") ||
    categories.includes("postpartum_hemorrhage") ||
    categories.includes("urinary_sepsis_shock")
  );
}
