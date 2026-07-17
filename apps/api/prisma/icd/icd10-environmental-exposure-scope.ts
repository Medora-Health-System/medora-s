/**
 * Official ICD-10-CM scope for environmental exposure (Phase 15).
 *
 * Deliberate dual-listings (documented here per the Phase 14 L73.2 precedent —
 * see icd10-dermatology-scope.ts header — a code may be owned by two
 * certification scopes when clinical reality genuinely overlaps two systems):
 *
 * - T33–T35 (frostbite) are dual-listed with the burn/corrosion certifier
 *   (Phase 5, see icd10-burn-scope.ts FROSTBITE_SCOPE_FAMILIES). The burn
 *   phase keeps them for burn-unit/tissue-injury-phase ownership; this phase
 *   keeps them for cold-exposure-mechanism ownership. Both routing
 *   certifiers assert the dual-listing is intentional and that generic
 *   thermal burn codes (T20–T32) never steal frostbite ownership.
 * - T75.0 (lightning) and T75.4 (electrocution) are dual-listed with the
 *   burn/corrosion certifier (Phase 5, see icd10-burn-scope.ts
 *   ELECTRICAL_SCOPE_FAMILIES). Burn keeps them for tissue-injury ownership;
 *   this phase keeps them for environmental-mechanism ownership.
 * - T70.0/T70.1 (otitic/sinus barotrauma) and T70.8/T70.9 (other/unspecified
 *   pressure effects) are dual-listed with the blast/polytrauma certifier
 *   (Phase 7, see icd10-blast-polytrauma-scope.ts BLAST_POLYTRAUMA_SCOPE_FAMILIES,
 *   family id "blast_barotrauma"). This phase includes all four T70 codes for
 *   diving/altitude coverage completeness, but the routing certifier flags
 *   T70.0/T70.1 as ENT/blast-owned context (not an environmental-exclusive
 *   steal) and documents the T70.8/T70.9 carve as an intentional dual-list
 *   with blast, not a routing regression.
 *
 * Deliberately excluded (owned by other certified phases; never claimed here):
 * - L55 sunburn — owned by the burn certifier (Phase 5, SUNBURN_SCOPE_FAMILIES).
 *   If X32 (exposure to sunlight) is included below, it is external-cause
 *   context only and must never route ahead of L55 for sunburn ownership.
 * - T20–T32 thermal burns — owned by the burn certifier (Phase 5).
 * - T27 smoke inhalation — owned by the burn certifier (Phase 5).
 * - T58 carbon monoxide (toxic effect of gas) — deliberately left for a
 *   future toxicology-scoped certifier (Phase 16). Not claimed here.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

type OfficialRow = Parameters<typeof selectScopedCodes>[0][number];

// A. Heat illness (internal effect + external-cause context).
export const HEAT_ILLNESS_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "env_heat_illness_t67", label: "Effects of heat and light", prefixes: ["T67"] },
  { id: "env_heat_external_x30", label: "Exposure to excessive natural heat", prefixes: ["X30"] },
  { id: "env_heat_external_w92", label: "Exposure to excessive man-made heat", prefixes: ["W92"] },
  // X32 (exposure to sunlight) is optional external-cause context. Sunburn (L55) stays
  // burn-owned (Phase 5) — this family never claims L55 and routing must not steal it.
  { id: "env_heat_external_x32_sunlight_optional", label: "Exposure to sunlight (optional; L55 stays burn-owned)", prefixes: ["X32"] },
];

// B. Cold illness (systemic; internal effect + external-cause context). Frostbite (T33-T35)
// is intentionally a separate dual-listed family — see header note.
export const COLD_ILLNESS_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "env_cold_hypothermia_t68", label: "Hypothermia", prefixes: ["T68"] },
  { id: "env_cold_other_effects_t69", label: "Other effects of reduced temperature", prefixes: ["T69"] },
  { id: "env_cold_external_x31", label: "Exposure to excessive natural cold", prefixes: ["X31"] },
  { id: "env_cold_external_w93", label: "Exposure to excessive man-made cold", prefixes: ["W93"] },
];

// C. Frostbite — deliberate dual-list with Phase 5 burn certifier (see header note).
export const FROSTBITE_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "env_frostbite_t33", label: "Frostbite superficial (dual-listed w/ Phase 5 burn)", prefixes: ["T33"] },
  { id: "env_frostbite_t34", label: "Frostbite with tissue necrosis (dual-listed w/ Phase 5 burn)", prefixes: ["T34"] },
  { id: "env_frostbite_t35", label: "Frostbite involving multiple/unspecified sites (dual-listed w/ Phase 5 burn)", prefixes: ["T35"] },
];

// D. Submersion / drowning (internal effect + compact drowning external-cause set).
// Deliberately does not pull the entire V90/W16 watercraft/diving-board families —
// only the compact non-vehicular drowning/submersion mechanism codes.
export const SUBMERSION_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "env_submersion_effect_t751", label: "Unspecified effects of drowning and nonfatal submersion", prefixes: ["T75.1"] },
  { id: "env_drowning_bathtub_w65", label: "Drowning/submersion while in bathtub", prefixes: ["W65"] },
  { id: "env_drowning_pool_w67", label: "Drowning/submersion while in swimming-pool", prefixes: ["W67"] },
  { id: "env_drowning_natural_water_w69", label: "Drowning/submersion while in natural water", prefixes: ["W69"] },
  { id: "env_drowning_other_w73", label: "Other cause of drowning and submersion", prefixes: ["W73"] },
  { id: "env_drowning_unspecified_w74", label: "Unspecified cause of drowning and submersion", prefixes: ["W74"] },
];

// E. Lightning / electrocution — deliberate dual-list with Phase 5 burn certifier
// (see header note) — plus electrical external-cause context.
export const ELECTRICAL_LIGHTNING_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "env_lightning_t750", label: "Effects of lightning (dual-listed w/ Phase 5 burn)", prefixes: ["T75.0"] },
  { id: "env_electrocution_t754", label: "Electrocution (dual-listed w/ Phase 5 burn)", prefixes: ["T75.4"] },
  { id: "env_electrical_external_w85", label: "Exposure to electric transmission lines", prefixes: ["W85"] },
  { id: "env_electrical_external_w86", label: "Exposure to other specified electric current", prefixes: ["W86"] },
];

// F. Altitude / diving / pressure effects. T70.0/T70.1 and T70.8/T70.9 are deliberate
// dual-lists with the Phase 7 blast/polytrauma certifier (see header note) — included
// here for coverage completeness, flagged (not stolen) by the routing certifier.
export const ALTITUDE_DIVING_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "env_barotrauma_otitic_t700", label: "Otitic barotrauma (ENT/blast-owned context; env coverage only)", prefixes: ["T70.0"] },
  { id: "env_barotrauma_sinus_t701", label: "Sinus barotrauma (ENT/blast-owned context; env coverage only)", prefixes: ["T70.1"] },
  { id: "env_altitude_t702", label: "Other/unspecified effects of high altitude", prefixes: ["T70.2"] },
  { id: "env_decompression_t703", label: "Caisson disease [decompression sickness]", prefixes: ["T70.3"] },
  { id: "env_pressure_fluids_t704", label: "Effects of high-pressure fluids (diving-related)", prefixes: ["T70.4"] },
  { id: "env_pressure_other_t708", label: "Other effects of air pressure and water pressure (dual-listed w/ Phase 7 blast)", prefixes: ["T70.8"] },
  { id: "env_pressure_unspecified_t709", label: "Effect of air pressure/water pressure, unspecified (dual-listed w/ Phase 7 blast)", prefixes: ["T70.9"] },
];

// G. Radiation sickness + exposure external-cause context. W89 (welding light) is
// optionally included alongside the mandated W88/W90 pair.
export const RADIATION_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "env_radiation_sickness_t66", label: "Radiation sickness, unspecified", prefixes: ["T66"] },
  { id: "env_radiation_external_ionizing_w88", label: "Exposure to ionizing radiation", prefixes: ["W88"] },
  { id: "env_radiation_external_welding_light_w89_optional", label: "Exposure to welding light (optional)", prefixes: ["W89"] },
  { id: "env_radiation_external_nonionizing_w90", label: "Exposure to nonionizing radiation", prefixes: ["W90"] },
];

export const ENVIRONMENTAL_EXPOSURE_SCOPE_FAMILIES: IcdScopeFamily[] = [
  ...HEAT_ILLNESS_SCOPE_FAMILIES,
  ...COLD_ILLNESS_SCOPE_FAMILIES,
  ...FROSTBITE_SCOPE_FAMILIES,
  ...SUBMERSION_SCOPE_FAMILIES,
  ...ELECTRICAL_LIGHTNING_SCOPE_FAMILIES,
  ...ALTITUDE_DIVING_SCOPE_FAMILIES,
  ...RADIATION_SCOPE_FAMILIES,
];

export function selectEnvironmentalExposureScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, ENVIRONMENTAL_EXPOSURE_SCOPE_FAMILIES, opts);
}

export function selectHeatIllnessScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, HEAT_ILLNESS_SCOPE_FAMILIES, opts);
}

export function selectColdIllnessScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, COLD_ILLNESS_SCOPE_FAMILIES, opts);
}

export function selectFrostbiteScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, FROSTBITE_SCOPE_FAMILIES, opts);
}

export function selectSubmersionScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, SUBMERSION_SCOPE_FAMILIES, opts);
}

export function selectElectricalLightningScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, ELECTRICAL_LIGHTNING_SCOPE_FAMILIES, opts);
}

export function selectAltitudeDivingScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, ALTITUDE_DIVING_SCOPE_FAMILIES, opts);
}

export function selectRadiationScopedCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, RADIATION_SCOPE_FAMILIES, opts);
}
