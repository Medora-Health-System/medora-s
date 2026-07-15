/**
 * Official ICD-10-CM scope for blast injury / polytrauma production certification.
 * The S/T anatomic injury chapters owned by other injury families are deliberately
 * excluded; external-cause codes remain searchable context, not primary anatomy.
 */
import {
  type IcdScopeFamily,
  selectScopedCodes,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";

export const BLAST_POLYTRAUMA_SCOPE_FAMILIES: IcdScopeFamily[] = [
  { id: "polytrauma_multiple_injuries", label: "Unspecified multiple injuries", prefixes: ["T07"] },
  { id: "blast_traumatic_shock", label: "Traumatic shock", prefixes: ["T79.4"] },
  { id: "blast_barotrauma", label: "Blast pressure effects", prefixes: ["T70.0", "T70.1", "T70.8", "T70.9"] },
  { id: "blast_ear_drum", label: "Traumatic rupture of ear drum", prefixes: ["S09.2"] },
  { id: "blast_inner_ear_noise", label: "Noise effects on inner ear", prefixes: ["H83.3"] },
  { id: "blast_explosion_external_cause", label: "Explosion external cause", prefixes: ["W35", "W36", "W37", "W38", "W39", "W40", "X75", "X96", "Y25"] },
  { id: "blast_cave_in", label: "Asphyxiation due to cave-in", prefixes: ["T71.21"] },
];

const EXPLOSION_KEYWORD_FAMILIES: IcdScopeFamily[] = [
  { id: "blast_legal_intervention_explosion", label: "Legal intervention explosion", prefixes: ["Y35", "Y36", "Y37", "Y38"], includeDescriptionKeywords: ["explos"] },
  { id: "blast_transport_explosion", label: "Transport explosion", prefixes: ["V"], includeDescriptionKeywords: ["explos"] },
];

export function selectBlastPolytraumaScopedCodes(
  rows: Parameters<typeof selectScopedCodes>[0],
  opts?: { billableOnly?: boolean },
): ScopedOfficialCode[] {
  return selectScopedCodes(rows, [...BLAST_POLYTRAUMA_SCOPE_FAMILIES, ...EXPLOSION_KEYWORD_FAMILIES], opts);
}
