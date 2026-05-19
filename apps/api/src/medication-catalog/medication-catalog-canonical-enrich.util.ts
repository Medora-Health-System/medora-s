import type { CatalogSearchItemDto } from "../order-catalog/dto/catalog-search-item.dto";
import type { CatalogCanonicalReadMetadata } from "../medication-master/catalog-canonical-read.types";

/** Attach read-only canonical metadata; preserves CatalogMedication `id` / `code`. */
export function enrichMedicationSearchItemsWithCanonical(
  items: CatalogSearchItemDto[],
  metadataByCatalogId: Map<string, CatalogCanonicalReadMetadata>
): CatalogSearchItemDto[] {
  if (metadataByCatalogId.size === 0) return items;

  return items.map((item) => {
    if (item.type !== "MEDICATION") return item;
    const canonical = metadataByCatalogId.get(item.id);
    if (!canonical) return item;

    const mergedAliases = [
      ...(item.metadata?.commonAliases ?? []),
      ...canonical.canonicalAliases,
    ];
    const uniqueAliases = [...new Set(mergedAliases.map((a) => a.trim()).filter((a) => a.length >= 2))].slice(
      0,
      10
    );

    return {
      ...item,
      metadata: {
        ...item.metadata,
        commonAliases: uniqueAliases.length > 0 ? uniqueAliases : item.metadata?.commonAliases,
        canonicalReadOnly: {
          matchConfidence: canonical.matchConfidence,
          badges: { ...canonical.badges },
          canonicalAliases: canonical.canonicalAliases,
        },
      },
    };
  });
}
