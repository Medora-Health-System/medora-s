import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";

/** Pick one catalog row for an order-set reference list (registry order wins). */
export function pickOrderSetCatalogMatch(input: {
  referenceCodes: readonly string[];
  matches: readonly CatalogSearchItemDto[];
}): { item: CatalogSearchItemDto | null; ambiguous: boolean } {
  const referenceCodesOrdered = [
    ...new Set(input.referenceCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)),
  ];
  const acceptable = new Set(referenceCodesOrdered);

  const acceptableMatches = input.matches.filter((row) => acceptable.has(row.code.toUpperCase()));

  for (const code of referenceCodesOrdered) {
    const codeMatches = acceptableMatches.filter((row) => row.code.toUpperCase() === code);
    if (codeMatches.length === 1) {
      return { item: codeMatches[0]!, ambiguous: false };
    }
    if (codeMatches.length > 1) {
      return { item: null, ambiguous: true };
    }
  }

  if (acceptableMatches.length === 1) {
    return { item: acceptableMatches[0]!, ambiguous: false };
  }

  if (acceptableMatches.length > 1) {
    for (const code of referenceCodesOrdered) {
      const match = acceptableMatches.find((row) => row.code.toUpperCase() === code);
      if (match) return { item: match, ambiguous: false };
    }
    return { item: null, ambiguous: true };
  }

  if (input.matches.length === 1 && acceptable.has(input.matches[0]!.code.toUpperCase())) {
    return { item: input.matches[0]!, ambiguous: false };
  }

  return { item: null, ambiguous: input.matches.length > 1 };
}
