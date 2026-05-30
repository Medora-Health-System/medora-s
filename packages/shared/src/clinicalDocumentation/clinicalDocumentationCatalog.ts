import type {
  ClinicalDocumentationCard,
  ClinicalDocumentationCategory,
  ClinicalDocumentationCareSetting,
} from "./clinicalDocumentationTypes.js";

/** Catalog visibility status (distinct from workflow `implementationStatus`). */
export const CLINICAL_DOCUMENTATION_CATALOG_STATUSES = [
  "ACTIVE",
  "DEPRECATED",
  "HIDDEN",
] as const;

export type ClinicalDocumentationCatalogStatus =
  (typeof CLINICAL_DOCUMENTATION_CATALOG_STATUSES)[number];

export type ClinicalDocumentationCatalogGovernance = {
  catalogStatus?: ClinicalDocumentationCatalogStatus;
  supersededBy?: string;
  legacyOf?: string;
  aliases?: readonly string[];
  keywords?: readonly string[];
  /** When false, card is excluded from the All tab (may still appear in category tabs). */
  visibleInAll?: boolean;
  /** Additional category tabs where this card should appear (primary `category` is always included). */
  categories?: readonly ClinicalDocumentationCategory[];
};

export type ResolvedClinicalDocumentationCard = ClinicalDocumentationCard & {
  catalogStatus: ClinicalDocumentationCatalogStatus;
  supersededBy?: string;
  legacyOf?: string;
  aliases: readonly string[];
  keywords: readonly string[];
  visibleInAll: boolean;
  categories: readonly ClinicalDocumentationCategory[];
};

/**
 * EDOC.CATALOG.1 — governance overrides for superseded foundation/duplicate cards.
 * Card IDs are never removed; hidden cards remain resolvable for saved entries and export.
 */
export const CLINICAL_DOCUMENTATION_CATALOG_GOVERNANCE: Readonly<
  Record<string, ClinicalDocumentationCatalogGovernance>
> = {
  flow_neuro_checks: {
    catalogStatus: "HIDDEN",
    supersededBy: "neuro_checks",
    visibleInAll: false,
  },
  stroke_neuro_checks: {
    catalogStatus: "HIDDEN",
    supersededBy: "neuro_checks",
    visibleInAll: false,
  },
  neuro_checks: {
    categories: ["STROKE_DOCUMENTATION", "NEUROLOGICAL_DOCUMENTATION"],
    keywords: ["neuro checks", "neurological checks"],
  },
  score_nihss: {
    catalogStatus: "HIDDEN",
    supersededBy: "stroke_nihss",
    visibleInAll: false,
  },
  stroke_nihss: {
    categories: ["SCORES_AND_SCREENS", "NEUROLOGICAL_DOCUMENTATION"],
    aliases: ["NIH Stroke Scale", "NIHSS assessment"],
  },
  nihss_assessment: {
    categories: ["STROKE_DOCUMENTATION", "SCORES_AND_SCREENS"],
    visibleInAll: false,
  },
  nihss_reassessment: {
    categories: ["NEUROLOGICAL_DOCUMENTATION"],
  },
  score_cincinnati_stroke: {
    catalogStatus: "HIDDEN",
    supersededBy: "stroke_cincinnati",
    visibleInAll: false,
  },
  stroke_cincinnati: {
    categories: ["SCORES_AND_SCREENS"],
  },
  score_van: {
    catalogStatus: "HIDDEN",
    supersededBy: "stroke_van_assessment",
    visibleInAll: false,
  },
  stroke_van_assessment: {
    categories: ["SCORES_AND_SCREENS"],
  },
  score_abcd2: {
    catalogStatus: "HIDDEN",
    supersededBy: "stroke_abcd2",
    visibleInAll: false,
  },
  score_gcs: {
    catalogStatus: "HIDDEN",
    supersededBy: "glasgow_coma_scale",
    visibleInAll: false,
  },
  glasgow_coma_scale: {
    categories: ["SCORES_AND_SCREENS", "NEUROLOGICAL_DOCUMENTATION"],
  },
  glasgow_coma_scale_assessment: {
    categories: ["STROKE_DOCUMENTATION", "SCORES_AND_SCREENS"],
    visibleInAll: false,
  },
  post_thrombolytic_monitoring: {
    categories: ["NEUROLOGICAL_DOCUMENTATION"],
    keywords: ["post thrombolytic", "post-thrombolytic monitoring"],
  },
  neurological_post_thrombolytic_monitoring: {
    visibleInAll: false,
  },
  cardiac_continuous_monitoring: {
    catalogStatus: "HIDDEN",
    supersededBy: "continuous_cardiac_monitoring",
    visibleInAll: false,
  },
  cardiac_ekg_12_lead: {
    catalogStatus: "HIDDEN",
    supersededBy: "ecg_12_lead_documentation",
    visibleInAll: false,
  },
  cardiac_rhythm_strip: {
    catalogStatus: "HIDDEN",
    supersededBy: "rhythm_strip_documentation",
    visibleInAll: false,
  },
  resp_oxygen_therapy: {
    catalogStatus: "HIDDEN",
    supersededBy: "oxygen_therapy_initiation",
    visibleInAll: false,
  },
  resp_nebulizer: {
    catalogStatus: "HIDDEN",
    supersededBy: "nebulizer_reassessment",
    visibleInAll: false,
  },
  flow_respiratory_therapy: {
    catalogStatus: "HIDDEN",
    supersededBy: "resp_assessment",
    visibleInAll: false,
  },
  flow_blood_product_administration: {
    catalogStatus: "HIDDEN",
    supersededBy: "blood_product_verification",
    visibleInAll: false,
  },
  proc_foley_monitoring: {
    catalogStatus: "HIDDEN",
    supersededBy: "foley_catheter_monitoring",
    visibleInAll: false,
  },
  proc_chest_tube: {
    catalogStatus: "HIDDEN",
    supersededBy: "chest_tube_monitoring",
    visibleInAll: false,
  },
  proc_central_line: {
    catalogStatus: "HIDDEN",
    supersededBy: "central_line_assessment",
    visibleInAll: false,
  },
  proc_intubation_monitoring: {
    catalogStatus: "HIDDEN",
    supersededBy: "endotracheal_tube_monitoring",
    visibleInAll: false,
  },
  flow_procedural_sedation: {
    catalogStatus: "HIDDEN",
    supersededBy: "sedation_pre_assessment",
    visibleInAll: false,
  },
  proc_sedation_monitoring: {
    catalogStatus: "HIDDEN",
    supersededBy: "sedation_monitoring",
    visibleInAll: false,
  },
  safety_belongings_checklist: {
    catalogStatus: "HIDDEN",
    supersededBy: "belongings_inventory",
    visibleInAll: false,
  },
  score_fall_risk: {
    catalogStatus: "HIDDEN",
    supersededBy: "morse_fall_risk_assessment",
    visibleInAll: false,
  },
  safety_fall_precautions: {
    catalogStatus: "HIDDEN",
    supersededBy: "safety_precautions_documentation",
    visibleInAll: false,
  },
  safety_suicide_precautions: {
    catalogStatus: "HIDDEN",
    supersededBy: "suicide_precautions_documentation",
    visibleInAll: false,
  },
  safety_behavioral_observation: {
    catalogStatus: "HIDDEN",
    supersededBy: "behavioral_observation",
    visibleInAll: false,
  },
  safety_elopement_risk: {
    catalogStatus: "HIDDEN",
    supersededBy: "elopement_risk_assessment",
    visibleInAll: false,
  },
  flow_sepsis_monitoring: {
    catalogStatus: "HIDDEN",
    supersededBy: "sepsis_screening",
    visibleInAll: false,
  },
  score_sepsis_screen: {
    catalogStatus: "HIDDEN",
    supersededBy: "sepsis_screening",
    visibleInAll: false,
  },
  score_sirs: {
    catalogStatus: "HIDDEN",
    supersededBy: "sirs_assessment",
    visibleInAll: false,
  },
  score_qsofa: {
    catalogStatus: "HIDDEN",
    supersededBy: "qsofa_assessment",
    visibleInAll: false,
  },
  sirs_assessment: {
    categories: ["SCORES_AND_SCREENS"],
  },
  qsofa_assessment: {
    categories: ["SCORES_AND_SCREENS"],
  },
  sepsis_screening: {
    categories: ["SCORES_AND_SCREENS"],
  },
  flow_cpr_record: { visibleInAll: false },
  flow_thrombolytic_stroke: {
    catalogStatus: "HIDDEN",
    supersededBy: "stroke_tnk",
    visibleInAll: false,
  },
  flow_restraint_monitoring: {
    catalogStatus: "HIDDEN",
    supersededBy: "safety_restraint_reassessment",
    visibleInAll: false,
  },
  flow_telemetry_monitoring: {
    catalogStatus: "HIDDEN",
    supersededBy: "telemetry_reassessment",
    visibleInAll: false,
  },
  flow_cardiac_monitoring: {
    catalogStatus: "HIDDEN",
    supersededBy: "continuous_cardiac_monitoring",
    visibleInAll: false,
  },
  flow_observation_monitoring: { visibleInAll: false },
  cardiac_telemetry_initiation: {
    catalogStatus: "HIDDEN",
    supersededBy: "continuous_cardiac_monitoring",
    visibleInAll: false,
  },
  cardiac_telemetry_discontinuation: {
    catalogStatus: "HIDDEN",
    supersededBy: "continuous_cardiac_monitoring",
    visibleInAll: false,
  },
  resp_incentive_spirometry: {
    catalogStatus: "HIDDEN",
    supersededBy: "resp_peak_flow",
    visibleInAll: false,
  },
  stroke_reassessment: {
    catalogStatus: "HIDDEN",
    supersededBy: "neurological_reassessment",
    visibleInAll: false,
  },
};

export function getClinicalDocumentationCatalogGovernance(
  cardId: string
): ClinicalDocumentationCatalogGovernance | undefined {
  return CLINICAL_DOCUMENTATION_CATALOG_GOVERNANCE[cardId];
}

export function resolveClinicalDocumentationCard(
  card: ClinicalDocumentationCard
): ResolvedClinicalDocumentationCard {
  const gov = CLINICAL_DOCUMENTATION_CATALOG_GOVERNANCE[card.id] ?? {};
  const catalogStatus = gov.catalogStatus ?? "ACTIVE";
  const visibleInAll =
    gov.visibleInAll ??
    (catalogStatus !== "ACTIVE"
      ? false
      : card.implementationStatus === "AVAILABLE");
  return {
    ...card,
    catalogStatus,
    supersededBy: gov.supersededBy,
    legacyOf: gov.legacyOf,
    aliases: gov.aliases ?? [],
    keywords: gov.keywords ?? [],
    visibleInAll,
    categories: gov.categories ?? [],
  };
}

export function getClinicalDocumentationCardCategories(
  card: ClinicalDocumentationCard
): ClinicalDocumentationCategory[] {
  const resolved = resolveClinicalDocumentationCard(card);
  const set = new Set<ClinicalDocumentationCategory>([card.category, ...resolved.categories]);
  return [...set];
}

export function isClinicalDocumentationCardCatalogHidden(
  card: ClinicalDocumentationCard
): boolean {
  const status = resolveClinicalDocumentationCard(card).catalogStatus;
  return status === "HIDDEN" || status === "DEPRECATED";
}

export function isClinicalDocumentationCardVisibleInHub(
  card: ClinicalDocumentationCard,
  options: {
    category?: ClinicalDocumentationCategory | "ALL";
    includeHidden?: boolean;
  } = {}
): boolean {
  if (options.includeHidden) return true;
  const resolved = resolveClinicalDocumentationCard(card);
  if (resolved.catalogStatus === "HIDDEN" || resolved.catalogStatus === "DEPRECATED") {
    return false;
  }
  if (options.category === "ALL" || options.category === undefined) {
    if (!resolved.visibleInAll) return false;
    if (card.implementationStatus === "FOUNDATION_ONLY" && resolved.supersededBy) {
      return false;
    }
    return true;
  }
  return getClinicalDocumentationCardCategories(card).includes(options.category);
}

export function listVisibleClinicalDocumentationCards(
  cards: readonly ClinicalDocumentationCard[],
  options: {
    careSetting?: ClinicalDocumentationCareSetting;
    category?: ClinicalDocumentationCategory | "ALL";
  } = {}
): ClinicalDocumentationCard[] {
  return cards.filter((card) => {
    if (options.careSetting && !card.careSettings.includes(options.careSetting)) {
      return false;
    }
    return isClinicalDocumentationCardVisibleInHub(card, { category: options.category ?? "ALL" });
  });
}

export function searchVisibleClinicalDocumentationCards(
  cards: readonly ClinicalDocumentationCard[],
  query: string,
  locale: "en" | "fr" = "en",
  options: {
    careSetting?: ClinicalDocumentationCareSetting;
    category?: ClinicalDocumentationCategory | "ALL";
  } = {}
): ClinicalDocumentationCard[] {
  const visible = listVisibleClinicalDocumentationCards(cards, options);
  const q = query.trim().toLowerCase();
  if (!q) return visible;
  return visible.filter((card) => {
    const resolved = resolveClinicalDocumentationCard(card);
    const title = locale === "fr" ? card.titleFr : card.titleEn;
    const desc = locale === "fr" ? card.descriptionFr : card.descriptionEn;
    const categoryLabels = getClinicalDocumentationCardCategories(card).join(" ");
    const haystack = [
      title,
      desc,
      card.id,
      categoryLabels,
      ...card.tags,
      ...card.searchAliases,
      ...resolved.aliases,
      ...resolved.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function countVisibleClinicalDocumentationCardsByCategory(
  cards: readonly ClinicalDocumentationCard[],
  category: ClinicalDocumentationCategory,
  careSetting?: ClinicalDocumentationCareSetting
): number {
  return listVisibleClinicalDocumentationCards(cards, { careSetting, category }).length;
}

export function assertVisibleAllCatalogHasNoDuplicateTitles(
  cards: readonly ClinicalDocumentationCard[],
  locale: "en" | "fr" = "en"
): void {
  const visible = listVisibleClinicalDocumentationCards(cards, { category: "ALL" });
  const titles = new Map<string, string[]>();
  for (const card of visible) {
    const title = locale === "fr" ? card.titleFr : card.titleEn;
    const ids = titles.get(title) ?? [];
    ids.push(card.id);
    titles.set(title, ids);
  }
  for (const [title, ids] of titles) {
    if (ids.length > 1) {
      throw new Error(`Duplicate visible All-tab title "${title}": ${ids.join(", ")}`);
    }
  }
}
