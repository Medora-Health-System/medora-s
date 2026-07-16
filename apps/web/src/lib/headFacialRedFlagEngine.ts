export type HeadFacialRedFlagCategory =
  | "intracranial_emergency"
  | "anticoagulated_head"
  | "basilar_skull"
  | "airway_ocular"
  | "septal_hematoma_csf"
  | "non_accidental_trauma";

export type HeadFacialRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type HeadFacialRedFlagResolution = {
  categories: HeadFacialRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const DEFINITIONS: Array<{ category: HeadFacialRedFlagCategory; pattern: RegExp; prompt: string }> = [
  {
    category: "intracranial_emergency",
    pattern:
      /gcs (drop|decline|deteriorat)|worsening headache|repeated vomiting|persistent vomiting|seizure|fixed.*pupil|dilated pupil|anisocoria|unequal pupils|posturing|focal (weakness|deficit)|widening pulse pressure|cushing|deteriorating mental status|subdural|epidural|subarachnoid|intraparenchymal|diffuse axonal/,
    prompt:
      "Document mental status trend, pupil examination, and repeat neurologic exam. Possible evolving intracranial hemorrhage or elevated intracranial pressure requires clinician-directed evaluation; a single reassuring exam does not exclude a delayed bleed.",
  },
  {
    category: "anticoagulated_head",
    pattern:
      /anticoagul|warfarin|apixaban|rivaroxaban|dabigatran|heparin|antiplatelet|aspirin|clopidogrel|coagulopath|liver disease|inr elevated/,
    prompt:
      "Document anticoagulant or antiplatelet use, reversal-agent consideration, and the lower threshold for neuroimaging or repeat imaging in anticoagulated head trauma.",
  },
  {
    category: "basilar_skull",
    pattern:
      /battle sign|raccoon eyes|periorbital ecchymosis|hemotympanum|csf otorrhea|csf rhinorrhea|otorrhea|rhinorrhea|basilar skull/,
    prompt:
      "Document Battle sign, periorbital ecchymosis, hemotympanum, and CSF leak findings concerning for basilar skull fracture. Avoid nasogastric or nasotracheal instrumentation until this is addressed with the clinician.",
  },
  {
    category: "airway_ocular",
    pattern:
      /airway compromise|stridor|expanding (neck|hematoma)|globe rupture|open globe|vision loss|diplopia|entrapment|afferent pupillary defect|proptosis|orbital compartment/,
    prompt:
      "Document airway patency, visual acuity, extraocular movements, and the urgency of ophthalmology or airway evaluation when globe injury or airway compromise is suspected.",
  },
  {
    category: "septal_hematoma_csf",
    pattern: /septal hematoma|nasal septal|clear rhinorrhea|halo sign/,
    prompt:
      "Document septal hematoma or CSF leak findings. Septal hematoma requires prompt evaluation to prevent cartilage necrosis and is distinct from an uncomplicated nasal fracture.",
  },
  {
    category: "non_accidental_trauma",
    pattern:
      /non-?accidental|inconsistent (mechanism|history)|delayed presentation|caregiver concern|inflicted injury|suspicious injury pattern|child abuse|elder abuse|intimate partner violence/,
    prompt:
      "Document mechanism consistency, injury pattern, and mandated-reporting considerations when non-accidental trauma is a concern; involve social work per facility protocol.",
  },
];

/** Documentation advisory only. It never establishes a diagnosis or places an order. */
export function resolveHeadFacialRedFlags(input: HeadFacialRedFlagInput): HeadFacialRedFlagResolution {
  const text = normalize([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function headFacialRedFlagWarnings(input: HeadFacialRedFlagInput): string[] {
  return resolveHeadFacialRedFlags(input).prompts;
}
