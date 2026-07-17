/**
 * Official ICD-10-CM scope for toxicology and envenomation (Phase 16).
 *
 * Ownership notes:
 * - T58 carbon monoxide is claimed here (Phase 15 environmental deliberately excluded it).
 * - T63 envenomation is claimed here; ordinary nonvenomous animal bites (W54/W55/W50) are not.
 * - T36–T50 medication poisoning keeps poisoning vs adverse-effect (5) vs underdosing (6) structure.
 * - F10–F19 substance intoxication/withdrawal is included for coverage; psychiatric primary
 *   disease ownership remains outside this exclusive steal list.
 * - G90.81 serotonin syndrome and G21.0 malignant neuroleptic syndrome are official syndromes.
 * - D74.8/D74.9 acquired/unspecified methemoglobinemia (congenital D74.0 not primary tox ownership).
 *
 * Official naming note: acetaminophen appears as "4-Aminophenol derivatives" (T39.1*).
 * Ethylene glycol appears under glycols (T52.3*).
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

type OfficialRow = Parameters<typeof selectScopedCodes>[0][number];

export const MEDICATION_POISONING_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "tox_med_t36", label: "Poisoning by systemic antibiotics", prefixes: ["T36"] },
  { id: "tox_med_t37", label: "Poisoning by other systemic anti-infectives/antiparasitics", prefixes: ["T37"] },
  { id: "tox_med_t38", label: "Poisoning by hormones and synthetic substitutes", prefixes: ["T38"] },
  { id: "tox_med_t39", label: "Poisoning by nonopioid analgesics/antipyretics/antirheumatics", prefixes: ["T39"] },
  { id: "tox_med_t40", label: "Poisoning by narcotics and psychodysleptics", prefixes: ["T40"] },
  { id: "tox_med_t41", label: "Poisoning by anesthetics and therapeutic gases", prefixes: ["T41"] },
  { id: "tox_med_t42", label: "Poisoning by antiepileptic/sedative-hypnotic/antiparkinsonism", prefixes: ["T42"] },
  { id: "tox_med_t43", label: "Poisoning by psychotropic drugs NEC", prefixes: ["T43"] },
  { id: "tox_med_t44", label: "Poisoning by drugs primarily affecting the autonomic nervous system", prefixes: ["T44"] },
  { id: "tox_med_t45", label: "Poisoning by primarily systemic and hematological agents", prefixes: ["T45"] },
  { id: "tox_med_t46", label: "Poisoning by agents primarily affecting the cardiovascular system", prefixes: ["T46"] },
  { id: "tox_med_t47", label: "Poisoning by agents primarily affecting the GI system", prefixes: ["T47"] },
  { id: "tox_med_t48", label: "Poisoning by agents primarily acting on smooth/skeletal muscle and respiratory", prefixes: ["T48"] },
  { id: "tox_med_t49", label: "Poisoning by topical agents primarily affecting skin/mucous membrane", prefixes: ["T49"] },
  { id: "tox_med_t50", label: "Poisoning by diuretics and other/unspecified drugs", prefixes: ["T50"] },
];

export const NONMEDICINAL_TOXIC_EFFECT_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "tox_nonmed_t51", label: "Toxic effect of alcohol", prefixes: ["T51"] },
  { id: "tox_nonmed_t52", label: "Toxic effect of organic solvents", prefixes: ["T52"] },
  { id: "tox_nonmed_t53", label: "Toxic effect of halogen derivatives of aliphatic/aromatic hydrocarbons", prefixes: ["T53"] },
  { id: "tox_nonmed_t54", label: "Toxic effect of corrosive substances", prefixes: ["T54"] },
  { id: "tox_nonmed_t55", label: "Toxic effect of soaps and detergents", prefixes: ["T55"] },
  { id: "tox_nonmed_t56", label: "Toxic effect of metals", prefixes: ["T56"] },
  { id: "tox_nonmed_t57", label: "Toxic effect of other inorganic substances", prefixes: ["T57"] },
  { id: "tox_nonmed_t58", label: "Toxic effect of carbon monoxide", prefixes: ["T58"] },
  { id: "tox_nonmed_t59", label: "Toxic effect of other gases, fumes and vapors", prefixes: ["T59"] },
  { id: "tox_nonmed_t60", label: "Toxic effect of pesticides", prefixes: ["T60"] },
  { id: "tox_nonmed_t61", label: "Toxic effect of noxious substances eaten as seafood", prefixes: ["T61"] },
  { id: "tox_nonmed_t62", label: "Toxic effect of other noxious substances eaten as food", prefixes: ["T62"] },
  { id: "tox_nonmed_t64", label: "Toxic effect of aflatoxin and other mycotoxin food contaminants", prefixes: ["T64"] },
  { id: "tox_nonmed_t65", label: "Toxic effect of other and unspecified substances", prefixes: ["T65"] },
];

export const ENVENOMATION_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "tox_envenomation_t63", label: "Toxic effect of contact with venomous animals", prefixes: ["T63"] },
];

export const SUBSTANCE_USE_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "tox_substance_f10", label: "Alcohol related disorders", prefixes: ["F10"] },
  { id: "tox_substance_f11", label: "Opioid related disorders", prefixes: ["F11"] },
  { id: "tox_substance_f12", label: "Cannabis related disorders", prefixes: ["F12"] },
  { id: "tox_substance_f13", label: "Sedative/hypnotic/anxiolytic related disorders", prefixes: ["F13"] },
  { id: "tox_substance_f14", label: "Cocaine related disorders", prefixes: ["F14"] },
  { id: "tox_substance_f15", label: "Other stimulant related disorders", prefixes: ["F15"] },
  { id: "tox_substance_f16", label: "Hallucinogen related disorders", prefixes: ["F16"] },
  { id: "tox_substance_f17", label: "Nicotine dependence", prefixes: ["F17"] },
  { id: "tox_substance_f18", label: "Inhalant related disorders", prefixes: ["F18"] },
  { id: "tox_substance_f19", label: "Other psychoactive substance related disorders", prefixes: ["F19"] },
];

export const TOXIDROME_SYNDROME_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "tox_serotonin_g9081", label: "Serotonin syndrome", prefixes: ["G90.81"] },
  { id: "tox_nms_g210", label: "Malignant neuroleptic syndrome", prefixes: ["G21.0"] },
  { id: "tox_methemoglobin_d748", label: "Other methemoglobinemias", prefixes: ["D74.8"] },
  { id: "tox_methemoglobin_d749", label: "Methemoglobinemia, unspecified", prefixes: ["D74.9"] },
];

export const INHALED_INDUSTRIAL_TOXIC_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "tox_inhaled_co_t58", label: "Carbon monoxide", prefixes: ["T58"] },
  { id: "tox_inhaled_gases_t59", label: "Other gases/fumes/vapors", prefixes: ["T59"] },
  { id: "tox_inhaled_inorganic_t57", label: "Other inorganic substances (incl. cyanide context)", prefixes: ["T57"] },
];

export const TOXICOLOGY_ENVENOMATION_SCOPE_FAMILIES: IcdScopeFamily[] = [
  ...MEDICATION_POISONING_SCOPE_FAMILIES,
  ...NONMEDICINAL_TOXIC_EFFECT_SCOPE_FAMILIES,
  ...ENVENOMATION_SCOPE_FAMILIES,
  ...SUBSTANCE_USE_SCOPE_FAMILIES,
  ...TOXIDROME_SYNDROME_SCOPE_FAMILIES,
];

export function selectToxicologyEnvenomationScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, TOXICOLOGY_ENVENOMATION_SCOPE_FAMILIES, opts);
}

export function selectMedicationPoisoningScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, MEDICATION_POISONING_SCOPE_FAMILIES, opts);
}

export function selectNonmedicinalToxicEffectScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, NONMEDICINAL_TOXIC_EFFECT_SCOPE_FAMILIES, opts);
}

export function selectSubstanceUseScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, SUBSTANCE_USE_SCOPE_FAMILIES, opts);
}

export function selectEnvenomationScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, ENVENOMATION_SCOPE_FAMILIES, opts);
}

export function selectInhaledIndustrialToxicScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, INHALED_INDUSTRIAL_TOXIC_SCOPE_FAMILIES, opts);
}

export function selectToxidromeSyndromeScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, TOXIDROME_SYNDROME_SCOPE_FAMILIES, opts);
}
