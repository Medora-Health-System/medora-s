/**
 * Official ICD-10-CM scope for psychiatric and behavioral health (Phase 18).
 *
 * Ownership notes:
 * - Phase 16 (toxicology) retains exclusive routing for T36–T50 medication poisoning,
 *   F10.1/F10.2 intoxication/withdrawal medical pathways, and broad F10–F19 substance use.
 *   Phase 18 includes F1x.x4/x5 psychotic/withdrawal-delirium and F05 for coverage presence only.
 * - Intentional poisoning (T40.x2 etc.) mechanism ownership stays Phase 16; Phase 18 covers
 *   R45.851, T14.91, and X71–X83 self-harm external causes without duplicating T36–T50.
 * - T74/T76/Y07 abuse/neglect and forensic overlap are coverage presence; exclusive forensic
 *   ownership is preserved outside this phase.
 * - F60 personality, F63 impulse, and G30 Alzheimer flood deliberately excluded.
 * - O24 gestational diabetes and broad obstetric chapters are not claimed; F53 puerperal mental
 *   is included with postpartum psychiatric provenance distinct from OB O* routing.
 * - Capacity/refusal Z-codes are encounter/context coverage; do not invent capacity diagnoses.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

type OfficialRow = Parameters<typeof selectScopedCodes>[0][number];

/** Intentional self-harm external cause codes (X71–X83); included carefully for coverage presence. */
const INTENTIONAL_SELF_HARM_EXTERNAL_CAUSE_PREFIXES = [
  "X71",
  "X72",
  "X73",
  "X74",
  "X75",
  "X76",
  "X77",
  "X78",
  "X80",
  "X81",
  "X82",
  "X83",
] as const;

export const SUICIDE_SELF_HARM_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "psych_suicide_r45851", label: "Suicidal ideation", prefixes: ["R45.851"] },
  { id: "psych_suicide_r45850", label: "Homicidal ideation", prefixes: ["R45.850"] },
  { id: "psych_suicide_t1491", label: "Suicide attempt", prefixes: ["T14.91"] },
  {
    id: "psych_suicide_x71_x83",
    label: "Intentional self-harm external causes (X71–X83)",
    prefixes: [...INTENTIONAL_SELF_HARM_EXTERNAL_CAUSE_PREFIXES],
  },
  {
    id: "psych_suicide_r451",
    label: "Restlessness and agitation (symptom overlap with behavioral agitation)",
    prefixes: ["R45.1"],
  },
  {
    id: "psych_suicide_r4589",
    label: "Other emotional symptoms",
    prefixes: ["R45.89"],
  },
  { id: "psych_suicide_z915", label: "Personal history of self-harm", prefixes: ["Z91.5"] },
  {
    id: "psych_suicide_z9151",
    label: "Personal history of nonsuicidal self-harm (verify FY2026 catalog)",
    prefixes: ["Z91.51"],
  },
  {
    id: "psych_suicide_z9152",
    label: "Personal history of suicidal self-harm (verify FY2026 catalog)",
    prefixes: ["Z91.52"],
  },
];

export const PSYCHOTIC_MOOD_ANXIETY_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "psych_f20_f29", label: "Schizophrenia spectrum and psychotic disorders", prefixes: ["F20", "F21", "F22", "F23", "F24", "F25", "F28", "F29"] },
  { id: "psych_f30_f39", label: "Mood disorders", prefixes: ["F30", "F31", "F32", "F33", "F34", "F39"] },
  {
    id: "psych_f40_f48",
    label: "Anxiety, OCD, stress, dissociative, somatoform (F40–F45, F48; F46/F47 excluded)",
    prefixes: ["F40", "F41", "F42", "F43", "F44", "F45", "F48"],
  },
  { id: "psych_catatonia_f061", label: "Catatonic disorder due to known physiological condition", prefixes: ["F06.1"] },
  {
    id: "psych_catatonia_f202",
    label: "Catatonic schizophrenia",
    prefixes: ["F20.2"],
  },
];

export const EATING_DISORDER_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "psych_f50", label: "Eating disorders", prefixes: ["F50"] },
];

export const PUERPERAL_MENTAL_SCOPE_FAMILIES: IcdScopeFamily[] = [
  {
    id: "psych_f53",
    label: "Mental and behavioral disorders associated with the puerperium",
    prefixes: ["F53"],
  },
];

export const NEURODEVELOPMENTAL_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "psych_f84", label: "Autism spectrum disorder", prefixes: ["F84"] },
  { id: "psych_f70_f79", label: "Intellectual disabilities", prefixes: ["F70", "F71", "F72", "F73", "F78", "F79"] },
  { id: "psych_f90", label: "ADHD", prefixes: ["F90"] },
  { id: "psych_f91", label: "Conduct disorders", prefixes: ["F91"] },
  {
    id: "psych_f98",
    label: "Other behavioral/emotional disorders with onset in childhood (light coverage)",
    prefixes: ["F98"],
  },
];

export const DELIRIUM_COGNITIVE_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "psych_f05", label: "Delirium", prefixes: ["F05"] },
  { id: "psych_f01_f03", label: "Dementia (incl. behavioral disturbance variants)", prefixes: ["F01", "F02", "F03"] },
  { id: "psych_r410", label: "Disorientation", prefixes: ["R41.0"] },
  { id: "psych_r4182", label: "Altered mental status", prefixes: ["R41.82"] },
  {
    id: "psych_r413",
    label: "Other amnesia",
    prefixes: ["R41.3"],
  },
];

/** Coverage presence only; Phase 16 owns primary intoxication/withdrawal routing for F10.1/F10.2. */
export const SUBSTANCE_INDUCED_PSYCH_SCOPE_FAMILIES: IcdScopeFamily[] = [
  {
    id: "psych_substance_f1x_psychotic_withdrawal_delirium",
    label: "Substance-induced psychotic disorder and withdrawal delirium (F1x.x4/x5; coverage presence)",
    prefixes: ["F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19"],
    includeDescriptionKeywords: ["psychotic", "withdrawal delirium", "delirium tremens"],
  },
];

export const REFUSAL_LEGAL_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "psych_z532", label: "Procedure not carried out because of patient's decision", prefixes: ["Z53.2"] },
  { id: "psych_z539", label: "Procedure not carried out, unspecified", prefixes: ["Z53.9"] },
  { id: "psych_z9119", label: "Patient's noncompliance with medical treatment and regimen", prefixes: ["Z91.19"] },
  { id: "psych_z75", label: "Problems related to medical facilities and availability of care", prefixes: ["Z75"] },
  { id: "psych_z046", label: "Encounter for general psychiatric examination", prefixes: ["Z04.6"] },
  {
    id: "psych_z0389",
    label: "Encounter for observation for other suspected diseases and conditions",
    prefixes: ["Z03.89"],
  },
];

/** Abuse/neglect/trafficking overlap — coverage presence; forensic ownership preserved elsewhere. */
export const ABUSE_NEGLECT_COVERAGE_FAMILIES: IcdScopeFamily[] = [
  { id: "psych_abuse_t74", label: "Confirmed abuse", prefixes: ["T74"] },
  { id: "psych_abuse_t76", label: "Suspected abuse", prefixes: ["T76"] },
  {
    id: "psych_abuse_y07",
    label: "Perpetrator of maltreatment and neglect (light coverage)",
    prefixes: ["Y07"],
  },
];

export const PSYCHIATRIC_BEHAVIORAL_SCOPE_FAMILIES: IcdScopeFamily[] = [
  ...SUICIDE_SELF_HARM_SCOPE_FAMILIES,
  ...PSYCHOTIC_MOOD_ANXIETY_SCOPE_FAMILIES,
  ...EATING_DISORDER_SCOPE_FAMILIES,
  ...PUERPERAL_MENTAL_SCOPE_FAMILIES,
  ...NEURODEVELOPMENTAL_SCOPE_FAMILIES,
  ...DELIRIUM_COGNITIVE_SCOPE_FAMILIES,
  ...SUBSTANCE_INDUCED_PSYCH_SCOPE_FAMILIES,
  ...REFUSAL_LEGAL_SCOPE_FAMILIES,
  ...ABUSE_NEGLECT_COVERAGE_FAMILIES,
];

export function selectPsychiatricBehavioralScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, PSYCHIATRIC_BEHAVIORAL_SCOPE_FAMILIES, opts);
}

export function selectSuicideSelfHarmScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, SUICIDE_SELF_HARM_SCOPE_FAMILIES, opts);
}

export function selectPsychoticMoodAnxietyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, PSYCHOTIC_MOOD_ANXIETY_SCOPE_FAMILIES, opts);
}

export function selectDeliriumCognitiveScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, DELIRIUM_COGNITIVE_SCOPE_FAMILIES, opts);
}

export function selectNeurodevelopmentalScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, NEURODEVELOPMENTAL_SCOPE_FAMILIES, opts);
}

export function selectEatingDisorderScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, EATING_DISORDER_SCOPE_FAMILIES, opts);
}

export function selectPuerperalMentalScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, PUERPERAL_MENTAL_SCOPE_FAMILIES, opts);
}

export function selectRefusalLegalScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, REFUSAL_LEGAL_SCOPE_FAMILIES, opts);
}
