/** Normalize alias text for MedicationSearchAlias.normalizedAlias */
export function normalizeMedicationAlias(alias: string): string {
  return alias
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function collectPromotionAliases(raw: Record<string, string>): Array<{
  alias: string;
  normalizedAlias: string;
  aliasType: string;
}> {
  const seen = new Set<string>();
  const out: Array<{ alias: string; normalizedAlias: string; aliasType: string }> = [];

  const add = (value: string | undefined, aliasType: string) => {
    if (!value?.trim()) return;
    const alias = value.trim().slice(0, 256);
    const normalizedAlias = normalizeMedicationAlias(alias);
    if (normalizedAlias.length < 2) return;
    if (seen.has(normalizedAlias)) return;
    seen.add(normalizedAlias);
    out.push({ alias, normalizedAlias, aliasType });
  };

  add(raw.generic_name, "GENERIC");
  add(raw.brand_name, "BRAND");
  add(raw.display_name_fr, "DISPLAY_FR");
  add(raw.display_name_en, "DISPLAY_EN");

  for (const part of (raw.aliases ?? "").split("|")) add(part, "ALIAS");
  for (const part of (raw.ed_quick_search_keywords ?? "").split("|")) add(part, "KEYWORD");

  return out;
}
