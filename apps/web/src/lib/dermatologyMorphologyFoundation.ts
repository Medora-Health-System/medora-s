/**
 * Phase 14 — dermatology morphology documentation foundation. Mirrors the descriptive,
 * non-diagnostic pattern used by `glasgowComaScaleFoundation.ts` and the Phase 12/13
 * red-flag engines: this module only names standard dermatologic morphology terms
 * (primary lesion type, secondary change, distribution pattern, appearance feature) and
 * detects mentions of them in free text so a chart note can be described in standard
 * terminology. It never infers a diagnosis from the morphology it detects — morphology
 * description and diagnosis are kept strictly separate, and the treating clinician remains
 * responsible for the actual assessment.
 */

export type PrimaryLesionType =
  | "macule"
  | "patch"
  | "papule"
  | "plaque"
  | "nodule"
  | "tumor"
  | "vesicle"
  | "bulla"
  | "pustule"
  | "wheal"
  | "cyst"
  | "erosion"
  | "ulcer";

export type SecondaryChange =
  | "scale"
  | "crust"
  | "excoriation"
  | "fissure"
  | "lichenification"
  | "atrophy"
  | "scar"
  | "eschar"
  | "necrosis";

export type DistributionPattern =
  | "localized"
  | "generalized"
  | "unilateral"
  | "bilateral"
  | "symmetric"
  | "asymmetric"
  | "dermatomal"
  | "linear"
  | "annular"
  | "targetoid"
  | "reticular"
  | "flexural"
  | "extensor"
  | "acral"
  | "palm_sole"
  | "intertriginous"
  | "sun_exposed"
  | "mucosal"
  | "periorificial"
  | "scalp"
  | "genital"
  | "multiple_regions";

export type AppearanceFeature =
  | "blanching"
  | "nonblanching"
  | "palpable"
  | "nonpalpable"
  | "confluent"
  | "discrete"
  | "sharply_demarcated"
  | "poorly_demarcated"
  | "grouped"
  | "clustered"
  | "honey_crusted"
  | "silvery_scale"
  | "central_clearing"
  | "umbilicated"
  | "burrow"
  | "herald_patch"
  | "christmas_tree"
  | "nikolsky_if_tested"
  | "skin_tenderness"
  | "dusky_violaceous"
  | "epidermal_detachment";

export type DermatologyMorphologyFindings = {
  primaryLesionTypes: PrimaryLesionType[];
  secondaryChanges: SecondaryChange[];
  distributionPatterns: DistributionPattern[];
  appearanceFeatures: AppearanceFeature[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const PRIMARY_LESION_PATTERNS: Array<{ value: PrimaryLesionType; pattern: RegExp }> = [
  { value: "macule", pattern: /\bmacules?\b/ },
  { value: "patch", pattern: /\bpatch(es)?\b/ },
  { value: "papule", pattern: /\bpapules?\b/ },
  { value: "plaque", pattern: /\bplaques?\b/ },
  { value: "nodule", pattern: /\bnodules?\b/ },
  { value: "tumor", pattern: /\btumors?\b/ },
  { value: "vesicle", pattern: /\bvesicles?\b/ },
  { value: "bulla", pattern: /\bbull(a|ae)\b/ },
  { value: "pustule", pattern: /\bpustules?\b/ },
  { value: "wheal", pattern: /\bwheals?\b/ },
  { value: "cyst", pattern: /\bcysts?\b/ },
  { value: "erosion", pattern: /\berosions?\b/ },
  { value: "ulcer", pattern: /\bulcers?\b/ },
];

const SECONDARY_CHANGE_PATTERNS: Array<{ value: SecondaryChange; pattern: RegExp }> = [
  { value: "scale", pattern: /\bscal(e|y|ing)\b/ },
  { value: "crust", pattern: /\bcrust(ing|ed)?\b/ },
  { value: "excoriation", pattern: /\bexcoriations?\b/ },
  { value: "fissure", pattern: /\bfissures?\b/ },
  { value: "lichenification", pattern: /\blichenif(ication|ied)\b/ },
  { value: "atrophy", pattern: /\batroph(y|ic)\b/ },
  { value: "scar", pattern: /\bscar(ring|s)?\b/ },
  { value: "eschar", pattern: /\beschar\b/ },
  { value: "necrosis", pattern: /\bnecrosis|\bnecrotic\b/ },
];

const DISTRIBUTION_PATTERN_PATTERNS: Array<{ value: DistributionPattern; pattern: RegExp }> = [
  { value: "localized", pattern: /\blocalized\b/ },
  { value: "generalized", pattern: /\bgeneralized\b/ },
  { value: "unilateral", pattern: /\bunilateral\b/ },
  { value: "bilateral", pattern: /\bbilateral\b/ },
  { value: "symmetric", pattern: /\bsymmetric(al)?\b/ },
  { value: "asymmetric", pattern: /\basymmetric(al)?\b/ },
  { value: "dermatomal", pattern: /\bdermatomal\b/ },
  { value: "linear", pattern: /\blinear\b/ },
  { value: "annular", pattern: /\bannular\b/ },
  { value: "targetoid", pattern: /\btargetoid\b/ },
  { value: "reticular", pattern: /\breticular\b/ },
  { value: "flexural", pattern: /\bflexural|\bflexures?\b/ },
  { value: "extensor", pattern: /\bextensor (surface|surfaces)?\b/ },
  { value: "acral", pattern: /\bacral\b/ },
  { value: "palm_sole", pattern: /\bpalms? and soles?\b|\bpalmoplantar\b/ },
  { value: "intertriginous", pattern: /\bintertriginous|\bskin folds?\b/ },
  { value: "sun_exposed", pattern: /\bsun.exposed\b/ },
  { value: "mucosal", pattern: /\bmucosal\b/ },
  { value: "periorificial", pattern: /\bperiorificial\b/ },
  { value: "scalp", pattern: /\bscalp\b/ },
  { value: "genital", pattern: /\bgenital(ia)?\b/ },
  { value: "multiple_regions", pattern: /\bmultiple (body )?regions\b|\bwidespread\b/ },
];

const APPEARANCE_FEATURE_PATTERNS: Array<{ value: AppearanceFeature; pattern: RegExp }> = [
  { value: "nonblanching", pattern: /\bnon.?blanching\b/ },
  { value: "blanching", pattern: /\bblanching\b/ },
  { value: "nonpalpable", pattern: /\bnon.?palpable\b/ },
  { value: "palpable", pattern: /\bpalpable\b/ },
  { value: "confluent", pattern: /\bconfluent\b/ },
  { value: "discrete", pattern: /\bdiscrete\b/ },
  { value: "sharply_demarcated", pattern: /\bsharply demarcated\b/ },
  { value: "poorly_demarcated", pattern: /\bpoorly demarcated\b/ },
  { value: "grouped", pattern: /\bgrouped\b/ },
  { value: "clustered", pattern: /\bclustered\b/ },
  { value: "honey_crusted", pattern: /\bhoney.crusted\b|\bhoney.colored crust\b/ },
  { value: "silvery_scale", pattern: /\bsilvery scale\b/ },
  { value: "central_clearing", pattern: /\bcentral clearing\b/ },
  { value: "umbilicated", pattern: /\bumbilicated\b/ },
  { value: "burrow", pattern: /\bburrows?\b/ },
  { value: "herald_patch", pattern: /\bherald patch\b/ },
  { value: "christmas_tree", pattern: /\bchristmas.tree (pattern|distribution)\b/ },
  { value: "nikolsky_if_tested", pattern: /\bnikolsky\b/ },
  { value: "skin_tenderness", pattern: /\bskin tenderness\b|\btender skin\b/ },
  { value: "dusky_violaceous", pattern: /\bdusky\b|\bviolaceous\b/ },
  { value: "epidermal_detachment", pattern: /\bepidermal detachment|\bskin sloughing|\bsheet.?like (skin )?detachment\b/ },
];

/**
 * Documentation advisory only. Detects standard dermatologic morphology vocabulary already
 * present in free text so it can be echoed back in a chart note. Never establishes a
 * diagnosis from the detected morphology.
 */
export function parseDermatologyMorphologyFromText(text = ""): DermatologyMorphologyFindings {
  const normalized = normalize(text);
  return {
    primaryLesionTypes: PRIMARY_LESION_PATTERNS.filter((entry) => entry.pattern.test(normalized)).map(
      (entry) => entry.value
    ),
    secondaryChanges: SECONDARY_CHANGE_PATTERNS.filter((entry) => entry.pattern.test(normalized)).map(
      (entry) => entry.value
    ),
    distributionPatterns: DISTRIBUTION_PATTERN_PATTERNS.filter((entry) => entry.pattern.test(normalized)).map(
      (entry) => entry.value
    ),
    appearanceFeatures: APPEARANCE_FEATURE_PATTERNS.filter((entry) => entry.pattern.test(normalized)).map(
      (entry) => entry.value
    ),
  };
}
