import { z } from "zod";

/** Normalized catalog row for autocomplete + future offline index (lightweight JSON). */
export const catalogSearchItemTypeSchema = z.enum(["MEDICATION", "LAB_TEST", "IMAGING_STUDY", "CARE_PROCEDURE"]);
export type CatalogSearchItemType = z.infer<typeof catalogSearchItemTypeSchema>;

export type CatalogSearchItemDto = {
  id: string;
  code: string;
  type: CatalogSearchItemType;
  displayNameFr: string;
  /** English-primary display (nullable until backfilled). Additive for Phase B clients. */
  displayNameEn?: string | null;
  /** Legacy / internal catalog `name` (unchanged semantics; keep for compatibility). */
  name?: string;
  secondaryText?: string;
  /** M1.7A.3 — locale-specific medication subtitle (additive; legacy `secondaryText` remains FR-first). */
  secondaryTextFr?: string;
  secondaryTextEn?: string;
  searchText?: string;
  /** MEDICATION: favoris inventaire (optionnel). */
  isFavorite?: boolean;
  /** MEDICATION: marqueur catalogue prioritaire. */
  isEssential?: boolean;
  metadata?: {
    strength?: string;
    dosageForm?: string;
    route?: string;
    ndc11?: string;
    billingUnitType?: string;
    isControlled?: boolean;
    controlledSchedule?: string;
    requiresWitness?: boolean;
    requiresDoubleSign?: boolean;
    /** MEDICATION: clinical / safety hints (additive). */
    genericName?: string;
    therapeuticClass?: string;
    administrationType?: string;
    billingClass?: string;
    commonAliases?: string[];
    category?: string;
    modality?: string;
    bodyRegion?: string;
    /** LAB_TEST: suggestion CPT/HCPCS, non appliquée automatiquement. */
    billingCodeDefault?: string;
    executionRoleCategory?: string;
    categoryLabelEn?: string;
    categoryLabelFr?: string;
    documentationTemplateId?: string;
    requiresProviderOrder?: boolean;
    nursingProtocolAllowed?: boolean;
    requiresClinicalNote?: boolean;
    /**
     * Phase 19C.2 — supplemental read-only canonical master hints (search/display only).
     * Never contains canonical concept/product/package UUIDs; ordering still uses `id` (CatalogMedication).
     */
    canonicalReadOnly?: {
      matchConfidence: "LEGACY_LINK";
      badges: {
        edFormulary: boolean;
        rsi: boolean;
        crashCart: boolean;
        infusion: boolean;
        controlled: boolean;
        highAlert: boolean;
        billingReview: boolean;
        ndcPresent: boolean;
      };
      canonicalAliases?: string[];
    };
  };
};

export const catalogSearchPurposeSchema = z.enum(["order", "documentation"]).optional().default("order");

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
  /**
   * Knowledge Expansion Wave 2 — optional EM specialty pack filter (e.g. CARDIOLOGY).
   * Matches pack marker in searchText; does not redesign ordering UI.
   */
  specialtyPack: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]*$/)
    .optional(),
  /** `documentation` skips order-search activation gate (triage home med / allergy history). */
  purpose: catalogSearchPurposeSchema,
});

export const procedureCatalogSearchQuerySchema = z.object({
  q: z
    .string()
    .max(200)
    .transform((s) => s.trim())
    .optional()
    .default(""),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  category: z.string().trim().max(64).optional(),
});

export type CatalogSearchQuery = z.infer<typeof catalogSearchQuerySchema>;
