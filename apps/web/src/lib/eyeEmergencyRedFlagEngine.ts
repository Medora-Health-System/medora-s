export type EyeEmergencyRedFlagCategory =
  | "open_globe"
  | "acute_glaucoma"
  | "retinal_detachment"
  | "retinal_vascular"
  | "orbital_cellulitis"
  | "endophthalmitis"
  | "chemical_injury"
  | "corneal_ulcer"
  | "vision_loss"
  | "orbital_compartment"
  | "contact_lens_keratitis";

export type EyeEmergencyRedFlagInput = {
  code?: string;
  displayName?: string;
  documentedFlags?: readonly string[];
};

export type EyeEmergencyRedFlagResolution = {
  categories: EyeEmergencyRedFlagCategory[];
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const DEFINITIONS: Array<{ category: EyeEmergencyRedFlagCategory; pattern: RegExp; prompt: string }> = [
  {
    category: "open_globe",
    pattern:
      /open globe|globe rupture|ruptured globe|penetrating (eye|ocular|globe) injury|extrusion of (intraocular|globe) contents|teardrop pupil|peaked pupil|positive seidel/,
    prompt:
      "Do not measure intraocular pressure when an open globe is suspected — IOP measurement is contraindicated and can extrude intraocular contents. Place a rigid shield without pressure patching, avoid manipulating the eye, and document the urgency of ophthalmology evaluation.",
  },
  {
    category: "acute_glaucoma",
    pattern:
      /acute angle.?closure glaucoma|angle.?closure glaucoma|acutely elevated (intraocular pressure|iop)|halos around lights|fixed mid.?dilated pupil|steamy cornea/,
    prompt:
      "Document intraocular pressure, pupil size and reactivity, and corneal clarity. Acute angle-closure glaucoma is vision-threatening and requires urgent ophthalmology evaluation; a single normal-appearing eye exam does not exclude it.",
  },
  {
    category: "retinal_detachment",
    pattern:
      /retinal detachment|curtain (coming down|over vision)|shadow in (peripheral )?vision|sudden shower of floaters|photopsia with new floaters/,
    prompt:
      "Document onset and pattern of flashes, floaters, and any curtain or shadow effect in the visual field. New retinal detachment concern requires urgent ophthalmology evaluation independent of visual acuity findings.",
  },
  {
    category: "retinal_vascular",
    pattern:
      /central retinal artery occlusion|\bcrao\b|central retinal vein occlusion|\bcrvo\b|sudden painless (vision loss|monocular vision loss)|amaurosis fugax/,
    prompt:
      "Document time of onset, painless versus painful vision loss, and vascular risk factors. Sudden painless monocular vision loss concerning for retinal vascular occlusion is time-sensitive and requires urgent evaluation.",
  },
  {
    category: "orbital_cellulitis",
    pattern:
      /orbital cellulitis|proptosis with pain|painful (limitation|restriction) of (eye|extraocular) movement|ophthalmoplegia with fever|afferent pupillary defect with orbital signs/,
    prompt:
      "Document proptosis, pain with extraocular movement, visual acuity, and fever. Orbital cellulitis is a vision- and life-threatening infection distinct from preseptal (periorbital) cellulitis and requires urgent evaluation.",
  },
  {
    category: "endophthalmitis",
    pattern:
      /endophthalmitis|panophthalmitis|hypopyon after (surgery|injection|trauma)|severe pain after (intraocular|eye) surgery/,
    prompt:
      "Document recent intraocular surgery, injection, or penetrating trauma, pain severity, and hypopyon. Endophthalmitis is vision-threatening and requires emergent ophthalmology evaluation.",
  },
  {
    category: "chemical_injury",
    pattern:
      /chemical (splash|exposure|burn) (to the )?eye|alkali (exposure|burn)|acid (exposure|burn) (to the )?eye|corrosive exposure to (the )?eye/,
    prompt:
      "Irrigation should not be delayed for pH testing, visual acuity, or history-taking in a suspected chemical eye exposure. Document irrigation volume, duration, and pH normalization; alkali exposures are higher risk than acid exposures.",
  },
  {
    category: "corneal_ulcer",
    pattern:
      /corneal ulcer|corneal infiltrate with (contact lens|discharge)|hypopyon|mooren'?s ulcer|microbial keratitis/,
    prompt:
      "Document corneal infiltrate size, location, and hypopyon. Corneal ulcer is distinct from a simple corneal abrasion and requires urgent ophthalmology evaluation; it is not treated with a routine abrasion discharge pathway.",
  },
  {
    category: "vision_loss",
    pattern:
      /(sudden|acute|new) (vision loss|blindness)|painless vision loss|vision loss in one eye|monocular vision loss/,
    prompt:
      "Document laterality, onset, and painful versus painless character of the vision loss. Any acute vision loss is a red flag warranting urgent ophthalmology evaluation until a benign cause is confirmed by the treating clinician.",
  },
  {
    category: "orbital_compartment",
    pattern:
      /orbital compartment syndrome|tense (proptotic |proptosis )?orbit|afferent pupillary defect after (facial|orbital) trauma|retrobulbar hemorrhage/,
    prompt:
      "Document intraocular pressure, proptosis, and visual acuity trend after orbital trauma. Orbital compartment syndrome from retrobulbar hemorrhage is a time-critical, vision-threatening emergency that may require emergent lateral canthotomy per clinician judgment.",
  },
  {
    category: "contact_lens_keratitis",
    pattern:
      /contact lens.*(keratitis|ulcer|infection|infiltrate)|overnight (contact lens|lens) wear.*(pain|redness)|pseudomonas keratitis|acanthamoeba/,
    prompt:
      "Document contact lens wear pattern (including overnight or extended wear), lens hygiene, and corneal findings. Contact-lens-associated keratitis carries a higher risk of aggressive microbial infection and should not be treated as simple conjunctivitis.",
  },
];

/** Documentation advisory only. It never establishes a diagnosis, orders a test, or sets disposition. */
export function resolveEyeEmergencyRedFlags(input: EyeEmergencyRedFlagInput): EyeEmergencyRedFlagResolution {
  const text = normalize([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const matched = DEFINITIONS.filter((definition) => definition.pattern.test(text));
  return {
    categories: matched.map((definition) => definition.category),
    prompts: matched.map((definition) => definition.prompt),
  };
}

export function eyeEmergencyRedFlagWarnings(input: EyeEmergencyRedFlagInput): string[] {
  return resolveEyeEmergencyRedFlags(input).prompts;
}

/** Safety gate: true whenever any documented finding is consistent with an open globe. */
export function isIopContraindicatedByRedFlags(input: EyeEmergencyRedFlagInput): boolean {
  return resolveEyeEmergencyRedFlags(input).categories.includes("open_globe");
}
