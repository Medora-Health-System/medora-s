/**
 * Phase 12 — ENT emergency red-flag screening (documentation advisory only).
 * Mirrors `eyeEmergencyRedFlagEngine.ts` (Phase 11). This module never establishes a
 * diagnosis, never autonomously starts antibiotics, never manages the airway, never
 * requests a consult, and never sets a disposition — it only screens documented text for
 * patterns that warrant clinician attention and returns advisory prompts.
 */

export type EntEmergencyRedFlagCategory =
  | "malignant_otitis_externa"
  | "mastoiditis"
  | "sudden_hearing_loss"
  | "central_vertigo"
  | "peritonsillar_abscess"
  | "retropharyngeal_abscess"
  | "deep_neck_infection"
  | "ludwig_angina"
  | "epiglottitis"
  | "airway_compromise"
  | "posterior_epistaxis"
  | "button_battery_foreign_body"
  | "facial_nerve_central_concern"
  | "ramsay_hunt";

export type EntEmergencyRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type EntEmergencyRedFlagResolution = {
  categories: EntEmergencyRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const DEFINITIONS: Array<{ category: EntEmergencyRedFlagCategory; pattern: RegExp; prompt: string }> = [
  {
    category: "malignant_otitis_externa",
    pattern:
      /malignant otitis externa|necrotizing otitis externa|skull base osteomyelitis|otitis externa .*(diabetic|immunocompromised)/,
    prompt:
      "Document diabetes/immunocompromise status, granulation tissue in the ear canal, and cranial nerve findings. Malignant (necrotizing) otitis externa is distinct from routine otitis externa and warrants urgent evaluation; this module does not autonomously start antibiotics, request an ENT consult, or set disposition — those remain the treating clinician's decisions.",
  },
  {
    category: "mastoiditis",
    pattern:
      /mastoiditis|postauricular (swelling|erythema|fluctuance|tenderness)|protruding auricle|auricle (displaced|pushed forward)/,
    prompt:
      "Document postauricular swelling, erythema, and auricle displacement. Mastoiditis is a suppurative complication of otitis media that can extend intracranially; this module does not autonomously start antibiotics, manage the airway, request a consult, or set disposition.",
  },
  {
    category: "sudden_hearing_loss",
    pattern:
      /sudden sensorineural hearing loss|\bssnhl\b|sudden hearing loss|acute unilateral hearing loss/,
    prompt:
      "Document onset timing, laterality, and any associated vertigo or tinnitus. Sudden sensorineural hearing loss is time-sensitive and warrants urgent audiology/ENT evaluation; this module does not autonomously request a consult or set disposition.",
  },
  {
    category: "central_vertigo",
    pattern:
      /central vertigo|vertigo with (dysarthria|diplopia|ataxia|dysphagia)|posterior circulation stroke|cerebellar (stroke|infarct)|truncal ataxia|direction.?changing nystagmus|vertical nystagmus|gaze.?evoked nystagmus|hints exam (abnormal|concerning|suspicious)/,
    prompt:
      "Document nystagmus character, gait/truncal stability, and any associated neurologic symptoms. Findings concerning for central vertigo require urgent neurologic evaluation; HINTS documentation here is never a validated automated stroke rule-out and never autonomously excludes stroke — see `hintsExaminationSafety.ts`.",
  },
  {
    category: "peritonsillar_abscess",
    pattern:
      /peritonsillar abscess|quinsy|trismus with (uvular deviation|muffled voice)|uvular deviation with (trismus|fullness)/,
    prompt:
      "Document trismus, uvular deviation, and peritonsillar fullness or bulge. Peritonsillar abscess is distinct from uncomplicated pharyngitis/tonsillitis; this module does not autonomously start antibiotics, request a consult, or set disposition.",
  },
  {
    category: "retropharyngeal_abscess",
    pattern:
      /retropharyngeal abscess|prevertebral (soft tissue )?swelling|widened prevertebral space|neck (stiffness|extension limited) with (fever|drooling)/,
    prompt:
      "Document neck range of motion, drooling, and posterior pharyngeal wall fullness. Retropharyngeal abscess can progress to airway compromise or mediastinitis; this module does not autonomously manage the airway, start antibiotics, request a consult, or set disposition.",
  },
  {
    category: "deep_neck_infection",
    pattern:
      /deep neck (space )?infection|parapharyngeal abscess|necrotizing fasciitis of the neck|rapidly progressive neck (swelling|infection)/,
    prompt:
      "Document the extent and rate of progression of neck swelling, crepitus, and systemic toxicity. Deep neck space infections can threaten the airway and major vessels; this module does not autonomously manage the airway, start antibiotics, request a consult, or set disposition.",
  },
  {
    category: "ludwig_angina",
    pattern:
      /ludwig'?s? angina|bilateral submandibular (swelling|induration)|tongue elevation with floor of mouth swelling|woody induration of the floor of (the )?mouth/,
    prompt:
      "Document floor-of-mouth induration, tongue elevation/displacement, and airway status. Ludwig angina is an airway emergency; this module does not autonomously manage the airway, start antibiotics, request a consult, or set disposition — immediate airway-capable clinician involvement is a bedside decision, not an automated one.",
  },
  {
    category: "epiglottitis",
    pattern:
      /epiglottitis|thumbprint sign|stridor with (drooling|tripod position)|muffled.?hot.?potato voice with stridor/,
    prompt:
      "Avoid agitating the patient or instrumenting the oropharynx when epiglottitis is suspected — direct visualization or palpation can precipitate complete airway obstruction. Document stridor, drooling, tripod positioning, and voice quality only from a distance; this module does not autonomously manage the airway, request a consult, or set disposition.",
  },
  {
    category: "airway_compromise",
    pattern:
      /airway compromise|impending airway obstruction|stridor at rest|unable to (handle|manage) secretions|air hunger with (stridor|drooling)/,
    prompt:
      "Document stridor, work of breathing, and secretion management at the bedside without delaying escalation for documentation. This module does not autonomously manage the airway, request a consult, or set disposition — airway intervention decisions remain with the treating clinician and airway-capable team.",
  },
  {
    category: "posterior_epistaxis",
    pattern:
      /posterior epistaxis|posterior nosebleed|bleeding (from )?(both nares|posteriorly)|epistaxis .*(hemodynamic|large volume|failed anterior packing)/,
    prompt:
      "Document bleeding laterality, estimated volume, and hemodynamic status. Posterior epistaxis carries higher risk of airway soiling and hemodynamic instability than anterior epistaxis; this module does not autonomously request a consult or set disposition.",
  },
  {
    category: "button_battery_foreign_body",
    pattern:
      /button battery|disc battery.*(nose|nasal|ear|aural|throat|esophagus)/,
    prompt:
      "A button battery foreign body in the nose, ear, or aerodigestive tract requires urgent removal to prevent tissue necrosis, and timing is more urgent than for typical foreign bodies. This module documents the concern only; it does not autonomously perform removal, request a consult, or set disposition.",
  },
  {
    category: "facial_nerve_central_concern",
    pattern:
      /facial (nerve|droop) with (limb weakness|other neurologic deficit)|central facial nerve palsy|forehead sparing (absent|not spared|present with limb weakness)/,
    prompt:
      "Document whether forehead movement is spared and whether other neurologic deficits accompany the facial weakness. Facial weakness with accompanying limb weakness or other neurologic deficits raises concern for a central (stroke) cause distinct from isolated peripheral facial nerve palsy; this module does not autonomously classify central versus peripheral, request a consult, or set disposition.",
  },
  {
    category: "ramsay_hunt",
    pattern:
      /ramsay hunt|herpes zoster oticus|vesicles (in|on) the (ear canal|auricle|pinna)/,
    prompt:
      "Document vesicular rash distribution on the auricle/ear canal and facial nerve function. Ramsay Hunt syndrome (herpes zoster oticus with facial palsy) is distinct from isolated Bell's palsy; this module does not autonomously start antivirals, request a consult, or set disposition.",
  },
];

/** Documentation advisory only. Never establishes a diagnosis, starts a treatment, manages the airway, requests a consult, or sets disposition. */
export function resolveEntEmergencyRedFlags(input: EntEmergencyRedFlagInput): EntEmergencyRedFlagResolution {
  const text = normalize([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function entEmergencyRedFlagWarnings(input: EntEmergencyRedFlagInput): string[] {
  return resolveEntEmergencyRedFlags(input).prompts;
}

/** Safety gate: true whenever documented findings raise an airway-threatening ENT emergency concern. */
export function isEntAirwayEmergencyFlagged(input: EntEmergencyRedFlagInput): boolean {
  const categories = resolveEntEmergencyRedFlags(input).categories;
  return (
    categories.includes("ludwig_angina") ||
    categories.includes("epiglottitis") ||
    categories.includes("airway_compromise") ||
    categories.includes("deep_neck_infection") ||
    categories.includes("retropharyngeal_abscess")
  );
}
