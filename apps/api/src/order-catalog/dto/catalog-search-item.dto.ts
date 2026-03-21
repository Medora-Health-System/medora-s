import { z } from "zod";

/** Normalized catalog row for autocomplete + future offline index (lightweight JSON). */
export const catalogSearchItemTypeSchema = z.enum(["MEDICATION", "LAB_TEST", "IMAGING_STUDY"]);
export type CatalogSearchItemType = z.infer<typeof catalogSearchItemTypeSchema>;

export type CatalogSearchItemDto = {
  id: string;
  code: string;
  type: CatalogSearchItemType;
  displayNameFr: string;
  secondaryText?: string;
  searchText?: string;
  /** MEDICATION: favoris inventaire (optionnel). */
  isFavorite?: boolean;
  /** MEDICATION: marqueur catalogue prioritaire. */
  isEssential?: boolean;
  metadata?: {
    strength?: string;
    dosageForm?: string;
    route?: string;
    category?: string;
    modality?: string;
    bodyRegion?: string;
  };
};

export const catalogSearchQuerySchema = z.object({
  q: z
    .string()
    .min(2, "Au moins 2 caractères")
    .max(200)
    .transform((s) => s.trim()),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  favoritesFirst: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export type CatalogSearchQuery = z.infer<typeof catalogSearchQuerySchema>;
