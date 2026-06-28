/**
 * MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVE_1_ACTIVATION.1
 * Search alias supplement for newly activated Wave 1 medications only.
 */

export type Wave1SearchAliasEntry = {
  catalogCode: string;
  genericName: string;
  aliases: readonly string[];
  searchTerms: readonly string[];
};

function entry(
  catalogCode: string,
  genericName: string,
  aliases: readonly string[],
  searchTerms: readonly string[]
): Wave1SearchAliasEntry {
  return { catalogCode, genericName, aliases, searchTerms };
}

export const ENTERPRISE_FORMULARY_WAVE_1_SEARCH_ALIAS_MANIFEST: Wave1SearchAliasEntry[] = [
  entry("ACETAMINOPHEN_10_MG_ML_INJECTABLE_INTRAVEINEUSE", "Acetaminophen", ["tylenol iv", "paracetamol iv", "apap iv"], ["acetaminophen", "paracetamol", "tylenol"]),
  entry("ACETAMINOPHEN_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE", "Acetaminophen", ["tylenol ivpb", "paracetamol perfusion"], ["acetaminophen ivpb", "apap infusion"]),
  entry("AMPICILLIN_SULBACTAM_3_G_POUDRE_INTRAVEINEUSE", "Ampicillin sulbactam", ["unasyn", "amp sulbactam"], ["ampicillin sulbactam", "unasyn 3g"]),
  entry("AMPICILLIN_SULBACTAM_1_5_G_POUDRE_INTRAVEINEUSE", "Ampicillin sulbactam", ["unasyn", "amp sulbactam"], ["ampicillin sulbactam", "unasyn 1.5g"]),
  entry("IMIPENEM_CILASTATIN_500_MG_POUDRE_INTRAVEINEUSE", "Imipenem cilastatin", ["primaxin", "imipenem"], ["imipenem", "primaxin"]),
  entry("IMIPENEM_CILASTATIN_250_MG_POUDRE_INTRAVEINEUSE", "Imipenem cilastatin", ["primaxin", "imipenem"], ["imipenem 250"]),
  entry("ERTAPENEM_1_G_POUDRE_INTRAVEINEUSE", "Ertapenem", ["invanz", "ertapenem"], ["ertapenem", "invanz"]),
  entry("CIPROFLOXACIN_400_MG_200_ML_PERFUSION_INTRAVEINEUSE", "Ciprofloxacin", ["cipro iv", "ciprofloxacin iv"], ["cipro", "ciprofloxacin perfusion"]),
  entry("LEVOFLOXACIN_750_MG_150_ML_PERFUSION_INTRAVEINEUSE", "Levofloxacin", ["levaquin iv", "levo iv"], ["levofloxacin", "levaquin"]),
  entry("ONDANSETRON_4_MG_5_ML_SOLUTION_BUVABLE_ORALE", "Ondansetron", ["zofran solution", "ondansetron liquid"], ["ondansetron oral", "zofran"]),
  entry("ALBUTEROL_0_083_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE", "Albuterol", ["salbutamol neb", "proventil neb", "ventolin neb"], ["albuterol neb", "salbutamol"]),
  entry("FLUTICASONE_SALMETEROL_100_50_MCG_INHALATEUR_INHALEE", "Fluticasone salmeterol", ["advair", "fluticasone salmeterol"], ["advair", "fluticasone"]),
  entry("METOPROLOL_SUCCINATE_50_MG_COMPRIME_ORALE", "Metoprolol succinate", ["toprol", "metoprolol xl"], ["metoprolol succinate", "toprol xl"]),
  entry("BISOPROLOL_5_MG_COMPRIME_ORALE", "Bisoprolol", ["zebeta", "bisoprolol"], ["bisoprolol"]),
  entry("GABAPENTIN_600_MG_COMPRIME_ORALE", "Gabapentin", ["neurontin", "gabapentin"], ["gabapentin 600"]),
];

export function buildWave1SearchQueryExpansions(): Readonly<Record<string, readonly string[]>> {
  const map = new Map<string, Set<string>>();
  const add = (key: string, ...extra: string[]) => {
    const k = key.trim().toLowerCase();
    if (k.length < 2) return;
    let set = map.get(k);
    if (!set) {
      set = new Set<string>();
      map.set(k, set);
    }
    set.add(k);
    for (const value of extra) {
      const t = value.trim().toLowerCase();
      if (t.length >= 2) set.add(t);
    }
  };

  for (const row of ENTERPRISE_FORMULARY_WAVE_1_SEARCH_ALIAS_MANIFEST) {
    add(row.genericName);
    for (const alias of row.aliases) add(alias, row.genericName);
    for (const term of row.searchTerms) add(term, row.genericName);
  }

  const out: Record<string, readonly string[]> = {};
  for (const [key, set] of map) out[key] = [...set];
  return out;
}

export function certifyWave1SearchAlias(catalogCode: string, searchTerm: string): boolean {
  const row = ENTERPRISE_FORMULARY_WAVE_1_SEARCH_ALIAS_MANIFEST.find((entry) => entry.catalogCode === catalogCode);
  if (!row) return false;
  const normalized = searchTerm.trim().toLowerCase();
  return (
    row.genericName.toLowerCase().includes(normalized) ||
    row.aliases.some((alias) => alias.toLowerCase().includes(normalized) || normalized.includes(alias.toLowerCase())) ||
    row.searchTerms.some((term) => term.toLowerCase().includes(normalized) || normalized.includes(term.toLowerCase()))
  );
}
