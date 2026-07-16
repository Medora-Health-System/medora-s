/**
 * Official ICD-10-CM scope for dermatology (Phase 14).
 *
 * Deliberately excludes codes already owned by Phase 13 (soft tissue / wound
 * infection): L02, L03, A46, L08.8, L08.9, M72.6, A48.0, M60.0, M65.1, M71.1,
 * N49.3, T81.3, T81.4, L05.0. Hidradenitis suppurativa (L73.2) is the one
 * deliberate dual-listing — Phase 13 keeps it for acute abscess/infection
 * ownership while dermatology keeps it for chronic inflammatory disease
 * coverage; the routing certifier asserts this dual-listing is intentional
 * and does not regress Phase 13 ownership.
 *
 * Also excludes L55 (sunburn) — owned by the burn/corrosion certifier
 * (Phase 5, see icd10-burn-scope.ts SUNBURN_SCOPE_FAMILIES) — to avoid a
 * cross-phase scope collision.
 *
 * Deliberately omitted after review of the official FY2026 order file:
 * - AGEP ("acute generalized exanthematous pustulosis") has no dedicated
 *   official ICD-10-CM code; not invented per certification policy.
 * - M33 (dermatomyositis) is not included: the official subcodes describe
 *   the systemic myositis disease, not a distinct cutaneous-only code, so
 *   it is left to a future rheumatology-scoped certifier.
 * - D69 (purpura / hemorrhagic conditions) is not included: every subcode
 *   is a hematologic diagnosis (thrombocytopenia, platelet defects) rather
 *   than a dermatology-exclusive skin code.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

type OfficialRow = Parameters<typeof selectScopedCodes>[0][number];

// A. Bacterial dermatology (Phase 13 infection ownership preserved; see header note).
const BACTERIAL_DERMATOLOGY_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_impetigo", label: "Impetigo", prefixes: ["L01"] },
  { id: "derm_pyoderma_erythrasma", label: "Pyoderma / erythrasma", prefixes: ["L08.0", "L08.1"] },
  { id: "derm_hidradenitis", label: "Hidradenitis suppurativa (chronic inflammatory, dual-listed w/ Phase 13)", prefixes: ["L73.2"] },
  { id: "derm_cutaneous_anthrax", label: "Cutaneous anthrax", prefixes: ["A22.0"] },
];

// B. Viral dermatoses.
const VIRAL_DERMATOLOGY_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_viral_hsv", label: "Herpesviral (HSV) infections", prefixes: ["B00"] },
  { id: "derm_viral_varicella", label: "Varicella", prefixes: ["B01"] },
  { id: "derm_viral_zoster", label: "Zoster (herpes zoster)", prefixes: ["B02"] },
  { id: "derm_viral_measles", label: "Measles", prefixes: ["B05"] },
  { id: "derm_viral_rubella", label: "Rubella", prefixes: ["B06"] },
  { id: "derm_viral_warts", label: "Viral warts", prefixes: ["B07"] },
  { id: "derm_viral_skin_mucous_lesions_other", label: "Other viral infections w/ skin & mucous membrane lesions (incl. molluscum, HFMD)", prefixes: ["B08"] },
  { id: "derm_viral_skin_mucous_lesions_unspecified", label: "Unspecified viral infection w/ skin & mucous membrane lesions", prefixes: ["B09"] },
];

// C. Fungal dermatoses.
const FUNGAL_DERMATOLOGY_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_fungal_dermatophytosis", label: "Dermatophytosis (tinea)", prefixes: ["B35"] },
  { id: "derm_fungal_superficial_mycoses_other", label: "Other superficial mycoses", prefixes: ["B36"] },
  { id: "derm_fungal_cutaneous_candidiasis", label: "Candidiasis of skin and nail", prefixes: ["B37.2"] },
];

// D. Parasitic / infestation dermatoses.
const PARASITIC_DERMATOLOGY_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_parasitic_scabies", label: "Scabies", prefixes: ["B86"] },
  { id: "derm_parasitic_pediculosis", label: "Pediculosis and phthiriasis", prefixes: ["B85"] },
  { id: "derm_parasitic_hookworm_cutaneous_larva_migrans", label: "Hookworm disease (incl. cutaneous larva migrans)", prefixes: ["B76"] },
];

// E. Allergic / inflammatory dermatoses.
const INFLAMMATORY_DERMATOLOGY_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_atopic_dermatitis", label: "Atopic dermatitis", prefixes: ["L20"] },
  { id: "derm_seborrheic_dermatitis", label: "Seborrheic dermatitis", prefixes: ["L21"] },
  { id: "derm_diaper_dermatitis", label: "Diaper dermatitis", prefixes: ["L22"] },
  { id: "derm_allergic_contact_dermatitis", label: "Allergic contact dermatitis", prefixes: ["L23"] },
  { id: "derm_irritant_contact_dermatitis", label: "Irritant contact dermatitis", prefixes: ["L24"] },
  { id: "derm_unspecified_contact_dermatitis", label: "Unspecified contact dermatitis", prefixes: ["L25"] },
  { id: "derm_dermatitis_internal_substances", label: "Dermatitis due to substances taken internally (incl. drug)", prefixes: ["L27"] },
  { id: "derm_lichen_simplex_prurigo", label: "Lichen simplex chronicus and prurigo", prefixes: ["L28"] },
  { id: "derm_pruritus", label: "Pruritus", prefixes: ["L29"] },
  { id: "derm_other_unspecified_dermatitis", label: "Other and unspecified dermatitis (incl. intertrigo L30.4)", prefixes: ["L30"] },
  { id: "derm_psoriasis", label: "Psoriasis", prefixes: ["L40"] },
  { id: "derm_pityriasis_rosea", label: "Pityriasis rosea", prefixes: ["L42"] },
  { id: "derm_lichen_planus", label: "Lichen planus", prefixes: ["L43"] },
  { id: "derm_urticaria", label: "Urticaria (coverage only — anaphylaxis ownership stays with allergy/emergency modules)", prefixes: ["L50"] },
  { id: "derm_rosacea", label: "Rosacea", prefixes: ["L71"] },
  { id: "derm_photodermatitis_acute_uv", label: "Acute skin changes due to ultraviolet radiation (photodermatitis)", prefixes: ["L56"] },
];

// F. Drug reaction / life-threatening dermatoses.
const EMERGENCY_DRUG_REACTION_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_em_sjs_ten", label: "Erythema multiforme / Stevens-Johnson syndrome / toxic epidermal necrolysis", prefixes: ["L51"] },
  { id: "derm_dress", label: "Drug reaction with eosinophilia and systemic symptoms (DRESS)", prefixes: ["D72.12"] },
];

// G. Autoimmune / vascular dermatoses (deliberately narrow — see header note on M33/D69).
const AUTOIMMUNE_VASCULAR_DERMATOLOGY_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_cutaneous_lupus", label: "Lupus erythematosus (cutaneous)", prefixes: ["L93"] },
  { id: "derm_vasculitis_limited_to_skin", label: "Vasculitis limited to skin", prefixes: ["L95"] },
  { id: "derm_erythema_nodosum", label: "Erythema nodosum", prefixes: ["L52"] },
  { id: "derm_pyoderma_gangrenosum", label: "Pyoderma gangrenosum", prefixes: ["L88"] },
];

// H. Bullous dermatoses.
const BULLOUS_DERMATOLOGY_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_pemphigus", label: "Pemphigus", prefixes: ["L10"] },
  { id: "derm_pemphigoid", label: "Pemphigoid", prefixes: ["L12"] },
  { id: "derm_other_bullous_disorders", label: "Other bullous disorders", prefixes: ["L13"] },
  { id: "derm_bullous_disorders_elsewhere", label: "Bullous disorders in diseases classified elsewhere", prefixes: ["L14"] },
];

// I. Neoplasms and precursor lesions.
const NEOPLASM_DERMATOLOGY_FAMILIES: IcdScopeFamily[] = [
  { id: "derm_melanoma", label: "Malignant melanoma of skin", prefixes: ["C43"] },
  { id: "derm_other_malignant_skin_neoplasm", label: "Other and unspecified malignant neoplasm of skin", prefixes: ["C44"] },
  { id: "derm_melanoma_in_situ", label: "Melanoma in situ", prefixes: ["D03"] },
  { id: "derm_carcinoma_in_situ_skin", label: "Carcinoma in situ of skin", prefixes: ["D04"] },
  { id: "derm_melanocytic_nevi", label: "Melanocytic nevi", prefixes: ["D22"] },
  { id: "derm_other_benign_skin_neoplasm", label: "Other benign neoplasms of skin", prefixes: ["D23"] },
  { id: "derm_actinic_keratosis", label: "Actinic keratosis (malignancy precursor)", prefixes: ["L57.0"] },
  { id: "derm_seborrheic_keratosis", label: "Seborrheic keratosis", prefixes: ["L82"] },
];

export const DERMATOLOGY_SCOPE_FAMILIES: IcdScopeFamily[] = [
  ...BACTERIAL_DERMATOLOGY_FAMILIES,
  ...VIRAL_DERMATOLOGY_FAMILIES,
  ...FUNGAL_DERMATOLOGY_FAMILIES,
  ...PARASITIC_DERMATOLOGY_FAMILIES,
  ...INFLAMMATORY_DERMATOLOGY_FAMILIES,
  ...EMERGENCY_DRUG_REACTION_FAMILIES,
  ...AUTOIMMUNE_VASCULAR_DERMATOLOGY_FAMILIES,
  ...BULLOUS_DERMATOLOGY_FAMILIES,
  ...NEOPLASM_DERMATOLOGY_FAMILIES,
];

export function selectDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, DERMATOLOGY_SCOPE_FAMILIES, opts);
}

export function selectBacterialDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, BACTERIAL_DERMATOLOGY_FAMILIES, opts);
}

export function selectViralDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, VIRAL_DERMATOLOGY_FAMILIES, opts);
}

export function selectFungalDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, FUNGAL_DERMATOLOGY_FAMILIES, opts);
}

export function selectParasiticDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, PARASITIC_DERMATOLOGY_FAMILIES, opts);
}

export function selectInflammatoryDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, INFLAMMATORY_DERMATOLOGY_FAMILIES, opts);
}

export function selectEmergencyDrugReactionScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, EMERGENCY_DRUG_REACTION_FAMILIES, opts);
}

export function selectAutoimmuneVascularDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, AUTOIMMUNE_VASCULAR_DERMATOLOGY_FAMILIES, opts);
}

export function selectBullousDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, BULLOUS_DERMATOLOGY_FAMILIES, opts);
}

export function selectNeoplasmDermatologyScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, NEOPLASM_DERMATOLOGY_FAMILIES, opts);
}
