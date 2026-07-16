/**
 * Official ICD-10-CM scope for soft tissue / wound infection (Phase 13).
 * Emergency-relevant infection ranges only. Eye preseptal cellulitis (L03.213),
 * ENT deep-neck (J36/J39/K12.2), and bite/FB trauma ownership remain outside
 * or are explicitly de-collided in the routing certifier.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

export const SOFT_TISSUE_WOUND_INFECTIONS_SCOPE_FAMILIES: IcdScopeFamily[] = [
  // Purulent cutaneous
  { id: "sti_cutaneous_abscess_furuncle_carbuncle", label: "Cutaneous abscess, furuncle and carbuncle", prefixes: ["L02"] },
  // Cellulitis / lymphangitis (includes finger/toe; preseptal L03.213 de-collided in routing)
  { id: "sti_cellulitis_lymphangitis", label: "Cellulitis and acute lymphangitis", prefixes: ["L03"] },
  { id: "sti_erysipelas", label: "Erysipelas", prefixes: ["A46"] },
  { id: "sti_other_local_skin_infection", label: "Other local infections of skin and subcutaneous tissue", prefixes: ["L08.8", "L08.9"] },
  // Deep / necrotizing
  { id: "sti_necrotizing_fasciitis", label: "Necrotizing fasciitis", prefixes: ["M72.6"] },
  { id: "sti_gas_gangrene", label: "Gas gangrene", prefixes: ["A48.0"] },
  { id: "sti_infective_myositis", label: "Infective myositis / pyomyositis", prefixes: ["M60.0"] },
  { id: "sti_infective_tenosynovitis", label: "Infective (teno)synovitis", prefixes: ["M65.1"] },
  { id: "sti_infective_bursitis", label: "Infective bursitis", prefixes: ["M71.1"] },
  { id: "sti_fournier", label: "Fournier gangrene", prefixes: ["N49.3"] },
  // Postoperative / wound disruption
  { id: "sti_infection_following_procedure", label: "Infection following a procedure", prefixes: ["T81.4"] },
  { id: "sti_wound_disruption", label: "Disruption of wound / dehiscence", prefixes: ["T81.3"] },
  // Pilonidal / hidradenitis
  { id: "sti_pilonidal_abscess", label: "Pilonidal cyst/sinus with abscess", prefixes: ["L05.0"] },
  { id: "sti_hidradenitis", label: "Hidradenitis suppurativa", prefixes: ["L73.2"] },
  // Diabetic foot ulcer / dermatitis (combination coding preserved; not a generic infection invent)
  { id: "sti_diabetic_foot_ulcer", label: "Type 2 DM with foot ulcer / dermatitis", prefixes: ["E11.62"] },
];

export function selectSoftTissueWoundInfectionsScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, SOFT_TISSUE_WOUND_INFECTIONS_SCOPE_FAMILIES, opts);
}

export function selectNecrotizingSoftTissueScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [
      { id: "nsti", label: "Necrotizing fasciitis", prefixes: ["M72.6"] },
      { id: "gas_gangrene", label: "Gas gangrene", prefixes: ["A48.0"] },
      { id: "fournier", label: "Fournier", prefixes: ["N49.3"] },
    ],
    opts,
  );
}

export function selectInfectiveTenosynovitisScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [{ id: "infective_tenosynovitis", label: "Infective tenosynovitis", prefixes: ["M65.1"] }],
    opts,
  );
}

export function selectPostoperativeWoundComplicationScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [
      { id: "ssi", label: "Infection following procedure", prefixes: ["T81.4"] },
      { id: "dehiscence", label: "Wound disruption", prefixes: ["T81.3"] },
    ],
    opts,
  );
}

export function selectPurulentCutaneousScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [{ id: "l02", label: "Cutaneous abscess/furuncle/carbuncle", prefixes: ["L02"] }],
    opts,
  );
}

export function selectCellulitisScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(rows, [{ id: "l03", label: "Cellulitis", prefixes: ["L03"] }], opts);
}

export function selectDiabeticFootUlcerScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
) {
  return selectScopedCodes(
    rows,
    [{ id: "e11_62", label: "DM2 foot ulcer/dermatitis", prefixes: ["E11.62"] }],
    opts,
  );
}
