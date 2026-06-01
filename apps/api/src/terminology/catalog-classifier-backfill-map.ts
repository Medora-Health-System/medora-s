/**
 * Phase 2B.2 / 3C-B1 — static backfill maps (mapping-44 + B1A/B1B contrast ratification).
 */

export const BODY_REGION_LEGACY_TO_CLASSIFIER: Record<string, string> = {
  THORAX: "BODY_REGION_CHEST",
  GENOU: "BODY_REGION_KNEE",
  EPAULE: "BODY_REGION_SHOULDER",
  PIED: "BODY_REGION_FOOT",
  ABDOMEN: "BODY_REGION_ABDOMEN",
  abdomen_ruq: "BODY_REGION_ABDOMEN_RUQ",
  "ABDOMEN/PELVIS": "BODY_REGION_ABDOMEN_PELVIS",
  CERVEAU: "BODY_REGION_HEAD",
  head: "BODY_REGION_HEAD",
  "TETE/COU": "BODY_REGION_HEAD_NECK",
  chest_abdomen_pelvis: "BODY_REGION_CHEST_ABDOMEN_PELVIS",
  OBSTETRICAL: "BODY_REGION_OBSTETRICAL",
  REIN: "BODY_REGION_KIDNEY",
  VASCULAIRE: "BODY_REGION_VASCULAR",
  POIGNET: "BODY_REGION_WRIST",
  CHEVILLE: "BODY_REGION_ANKLE",
  BASSIN: "BODY_REGION_PELVIS",
  PELVIS: "BODY_REGION_PELVIS",
  MUCS: "BODY_REGION_SOFT_TISSUE",
  RACHIS: "BODY_REGION_SPINE",
  "RACHIS CERVICAL": "BODY_REGION_SPINE_CERVICAL",
  scrotum: "BODY_REGION_SCROTUM",
  "MEMBRES INFERIEURS": "BODY_REGION_LOWER_EXTREMITY",
  BRAS: "BODY_REGION_ARM",
  COUDE: "BODY_REGION_ELBOW",
  "AVANT-BRAS": "BODY_REGION_FOREARM",
  MAIN: "BODY_REGION_HAND",
  HANCHE: "BODY_REGION_HIP",
  CUISSE: "BODY_REGION_THIGH",
  JAMBE: "BODY_REGION_LEG",
};

export const MODALITY_LEGACY_TO_CLASSIFIER: Record<string, string> = {
  XR: "MODALITY_XR",
  US: "MODALITY_US",
  CT: "MODALITY_CT",
  MRI: "MODALITY_MRI",
};

/** Catalog code overrides legacy modality string (CTA rows keep modality `CT` in seed). */
export const MODALITY_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  CT_CHEST_CTA: "MODALITY_CTA",
  CTA_CHEST: "MODALITY_CTA",
  CTA_HEAD_NECK: "MODALITY_CTA",
  CTA_ABDOMEN_PELVIS: "MODALITY_CTA",
};

export const LAB_CATEGORY_LEGACY_TO_CLASSIFIER: Record<string, string> = {
  HEMATOLOGIE: "LAB_CATEGORY_HEMATOLOGY",
  BIOCHIMIE: "LAB_CATEGORY_CHEMISTRY",
  ELECTROLYTES: "LAB_CATEGORY_ELECTROLYTES",
  FOIE: "LAB_CATEGORY_HEPATIC",
  CARDIO: "LAB_CATEGORY_CARDIAC",
  CARDIAQUE: "LAB_CATEGORY_CARDIAC",
  COAGULATION: "LAB_CATEGORY_COAGULATION",
  INFLAMMATION: "LAB_CATEGORY_INFLAMMATION",
  ENDOCRINO: "LAB_CATEGORY_ENDOCRINE",
  INFECTIEUX: "LAB_CATEGORY_INFECTIOUS",
  URINAIRE: "LAB_CATEGORY_URINE",
  DIGESTIF: "LAB_CATEGORY_GI",
  URGENCE: "LAB_CATEGORY_EMERGENCY",
  BANQUE_SANG: "LAB_CATEGORY_BLOOD_BANK",
  MICROBIOLOGIE: "LAB_CATEGORY_MICROBIOLOGY",
  GAZ_SANGUINS: "LAB_CATEGORY_BLOOD_GAS",
  TOXICOLOGIE: "LAB_CATEGORY_TOXICOLOGY",
};

/** Catalog code → contrast classifier (mapping-44 APPLY). */
export const CONTRAST_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  XR_CHEST: "CONTRAST_TYPE_NONE",
  XR_CHEST_2V: "CONTRAST_TYPE_NONE",
  XR_KNEE: "CONTRAST_TYPE_NONE",
  XR_FOOT: "CONTRAST_TYPE_NONE",
  XR_ABD_AP: "CONTRAST_TYPE_NONE",
  XR_WRIST: "CONTRAST_TYPE_NONE",
  XR_ANKLE: "CONTRAST_TYPE_NONE",
  XR_SHOULDER: "CONTRAST_TYPE_NONE",
  XR_PELVIS: "CONTRAST_TYPE_NONE",
  XR_ABDOMEN: "CONTRAST_TYPE_NONE",
  XR_HUMERUS: "CONTRAST_TYPE_NONE",
  XR_ELBOW: "CONTRAST_TYPE_NONE",
  XR_FOREARM: "CONTRAST_TYPE_NONE",
  XR_HAND: "CONTRAST_TYPE_NONE",
  XR_HIP: "CONTRAST_TYPE_NONE",
  XR_FEMUR: "CONTRAST_TYPE_NONE",
  XR_TIB_FIB: "CONTRAST_TYPE_NONE",
  US_ABD: "CONTRAST_TYPE_NONE",
  US_OB: "CONTRAST_TYPE_NONE",
  US_RENAL: "CONTRAST_TYPE_NONE",
  DOPPLER_VEIN: "CONTRAST_TYPE_NONE",
  US_OB_FIRST: "CONTRAST_TYPE_NONE",
  US_OB_GROWTH: "CONTRAST_TYPE_NONE",
  US_SOFT: "CONTRAST_TYPE_NONE",
  US_FAST: "CONTRAST_TYPE_NONE",
  US_RUQ_GALLBLADDER: "CONTRAST_TYPE_NONE",
  US_PELVIS: "CONTRAST_TYPE_NONE",
  US_SCROTUM_TESTICULAR: "CONTRAST_TYPE_NONE",
  US_VENOUS_DOPPLER_LE: "CONTRAST_TYPE_NONE",
  US_ABDOMEN: "CONTRAST_TYPE_NONE",
  CT_HEAD_WO_CONTRAST: "CONTRAST_TYPE_WITHOUT",
  CT_CHEST: "CONTRAST_TYPE_WITHOUT",
  CT_SPINE_LUMBAR: "CONTRAST_TYPE_WITHOUT",
  CT_CERVICAL_SPINE: "CONTRAST_TYPE_WITHOUT",
  CT_ABDOMEN_PELVIS: "CONTRAST_TYPE_WITHOUT",
  MRI_BRAIN: "CONTRAST_TYPE_WITHOUT",
  CT_CHEST_CTA: "CONTRAST_TYPE_ANGIOGRAPHIC",
  CTA_CHEST: "CONTRAST_TYPE_ANGIOGRAPHIC",
  CTA_HEAD_NECK: "CONTRAST_TYPE_ANGIOGRAPHIC",
  CTA_ABDOMEN_PELVIS: "CONTRAST_TYPE_ANGIOGRAPHIC",
};

/**
 * Intentional null contrast FK — audit MANUAL_REVIEW, no write (B1B-RAT-CAP-001 / B1B-RAT-MRI-SPINE-001).
 * Includes inactive/predecessor rows (CT_HEAD, CT_ABD).
 */
export const CONTRAST_INTENTIONAL_NULL_IMAGING_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "CT_CHEST_ABDOMEN_PELVIS_TRAUMA",
  "MRI_SPINE",
] as const;

/** @deprecated Use CONTRAST_INTENTIONAL_NULL_IMAGING_CODES */
export const CONTRAST_MANUAL_REVIEW_IMAGING_CODES = CONTRAST_INTENTIONAL_NULL_IMAGING_CODES;

export const VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  XR_CHEST: "VIEW_COUNT_ONE",
  XR_ABD_AP: "VIEW_COUNT_ONE",
  XR_CHEST_2V: "VIEW_COUNT_TWO",
  XR_KNEE: "VIEW_COUNT_UNSPECIFIED",
  XR_FOOT: "VIEW_COUNT_UNSPECIFIED",
  XR_WRIST: "VIEW_COUNT_UNSPECIFIED",
  XR_ANKLE: "VIEW_COUNT_UNSPECIFIED",
  XR_SHOULDER: "VIEW_COUNT_UNSPECIFIED",
  XR_PELVIS: "VIEW_COUNT_UNSPECIFIED",
  XR_ABDOMEN: "VIEW_COUNT_UNSPECIFIED",
  XR_HUMERUS: "VIEW_COUNT_UNSPECIFIED",
  XR_ELBOW: "VIEW_COUNT_UNSPECIFIED",
  XR_FOREARM: "VIEW_COUNT_UNSPECIFIED",
  XR_HAND: "VIEW_COUNT_UNSPECIFIED",
  XR_HIP: "VIEW_COUNT_UNSPECIFIED",
  XR_FEMUR: "VIEW_COUNT_UNSPECIFIED",
  XR_TIB_FIB: "VIEW_COUNT_UNSPECIFIED",
};

/** All 44 Haiti catalog codes receive LATERALITY_UNSPECIFIED (mapping-44). */
export const LATERALITY_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  XR_CHEST: "LATERALITY_UNSPECIFIED",
  XR_CHEST_2V: "LATERALITY_UNSPECIFIED",
  XR_KNEE: "LATERALITY_UNSPECIFIED",
  XR_FOOT: "LATERALITY_UNSPECIFIED",
  XR_ABD_AP: "LATERALITY_UNSPECIFIED",
  XR_WRIST: "LATERALITY_UNSPECIFIED",
  XR_ANKLE: "LATERALITY_UNSPECIFIED",
  XR_SHOULDER: "LATERALITY_UNSPECIFIED",
  XR_PELVIS: "LATERALITY_UNSPECIFIED",
  XR_ABDOMEN: "LATERALITY_UNSPECIFIED",
  XR_HUMERUS: "LATERALITY_UNSPECIFIED",
  XR_ELBOW: "LATERALITY_UNSPECIFIED",
  XR_FOREARM: "LATERALITY_UNSPECIFIED",
  XR_HAND: "LATERALITY_UNSPECIFIED",
  XR_HIP: "LATERALITY_UNSPECIFIED",
  XR_FEMUR: "LATERALITY_UNSPECIFIED",
  XR_TIB_FIB: "LATERALITY_UNSPECIFIED",
  US_ABD: "LATERALITY_UNSPECIFIED",
  US_OB: "LATERALITY_UNSPECIFIED",
  US_RENAL: "LATERALITY_UNSPECIFIED",
  DOPPLER_VEIN: "LATERALITY_UNSPECIFIED",
  US_OB_FIRST: "LATERALITY_UNSPECIFIED",
  US_OB_GROWTH: "LATERALITY_UNSPECIFIED",
  US_SOFT: "LATERALITY_UNSPECIFIED",
  US_FAST: "LATERALITY_UNSPECIFIED",
  US_RUQ_GALLBLADDER: "LATERALITY_UNSPECIFIED",
  US_PELVIS: "LATERALITY_UNSPECIFIED",
  US_SCROTUM_TESTICULAR: "LATERALITY_UNSPECIFIED",
  US_VENOUS_DOPPLER_LE: "LATERALITY_UNSPECIFIED",
  US_ABDOMEN: "LATERALITY_UNSPECIFIED",
  CT_HEAD: "LATERALITY_UNSPECIFIED",
  CT_HEAD_WO_CONTRAST: "LATERALITY_UNSPECIFIED",
  CT_ABD: "LATERALITY_UNSPECIFIED",
  CT_ABDOMEN_PELVIS: "LATERALITY_UNSPECIFIED",
  CT_CHEST: "LATERALITY_UNSPECIFIED",
  CT_CHEST_CTA: "LATERALITY_UNSPECIFIED",
  CT_SPINE_LUMBAR: "LATERALITY_UNSPECIFIED",
  CT_CERVICAL_SPINE: "LATERALITY_UNSPECIFIED",
  CT_CHEST_ABDOMEN_PELVIS_TRAUMA: "LATERALITY_UNSPECIFIED",
  CTA_CHEST: "LATERALITY_UNSPECIFIED",
  CTA_HEAD_NECK: "LATERALITY_UNSPECIFIED",
  CTA_ABDOMEN_PELVIS: "LATERALITY_UNSPECIFIED",
  MRI_BRAIN: "LATERALITY_UNSPECIFIED",
  MRI_SPINE: "LATERALITY_UNSPECIFIED",
};

export const ANATOMIC_SUBREGION_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  CT_CERVICAL_SPINE: "ANATOMIC_SUBREGION_SPINE_CERVICAL",
  CT_SPINE_LUMBAR: "ANATOMIC_SUBREGION_SPINE_LUMBAR",
};

export const PROTOCOL_CATALOG_CODE_TO_CLASSIFIER: Record<string, string> = {
  US_OB_FIRST: "PROTOCOL_US_OB_FIRST_TRIMESTER",
  US_OB_GROWTH: "PROTOCOL_US_OB_LATE_TRIMESTER",
  US_FAST: "PROTOCOL_US_FAST",
  DOPPLER_VEIN: "PROTOCOL_US_DOPPLER_VENOUS",
  US_VENOUS_DOPPLER_LE: "PROTOCOL_US_DOPPLER_VENOUS",
  CT_CHEST_ABDOMEN_PELVIS_TRAUMA: "PROTOCOL_CT_CAP_TRAUMA",
  CT_CHEST_CTA: "PROTOCOL_CTA_CHEST_STANDARD",
  CTA_CHEST: "PROTOCOL_CTA_CHEST_STANDARD",
};

export const IMAGING_CLASSIFIER_FIELD_NAMES = [
  "modalityClassifierId",
  "bodyRegionClassifierId",
  "contrastTypeClassifierId",
  "viewCountClassifierId",
  "lateralityClassifierId",
  "anatomicSubregionClassifierId",
  "protocolClassifierId",
] as const;

export type ImagingClassifierFieldName = (typeof IMAGING_CLASSIFIER_FIELD_NAMES)[number];

export type ImagingClassifierCodeTargets = Record<ImagingClassifierFieldName, string | null>;

export type ImagingCatalogLegacy = {
  modality: string | null;
  bodyRegion: string | null;
};

export type ImagingFieldBackfillDisposition =
  | "APPLY"
  | "MANUAL_REVIEW"
  | "NOT_APPLICABLE";

export type ImagingFieldBackfillPlan = {
  disposition: ImagingFieldBackfillDisposition;
  classifierCode: string | null;
  legacyValue: string | null;
  message?: string;
};

const CLASSIFIER_DOMAIN_BY_FIELD: Record<ImagingClassifierFieldName, string> = {
  modalityClassifierId: "MODALITY",
  bodyRegionClassifierId: "BODY_REGION",
  contrastTypeClassifierId: "CONTRAST_TYPE",
  viewCountClassifierId: "VIEW_COUNT",
  lateralityClassifierId: "LATERALITY",
  anatomicSubregionClassifierId: "ANATOMIC_SUBREGION",
  protocolClassifierId: "PROTOCOL",
};

export function classifierDomainForImagingField(fieldName: ImagingClassifierFieldName): string {
  return CLASSIFIER_DOMAIN_BY_FIELD[fieldName];
}

export function resolveModalityClassifierCode(
  catalogCode: string,
  legacyModality: string | null
): string | null {
  const override = MODALITY_CATALOG_CODE_TO_CLASSIFIER[catalogCode];
  if (override) return override;
  if (!legacyModality) return null;
  return MODALITY_LEGACY_TO_CLASSIFIER[legacyModality] ?? null;
}

export function resolveBodyRegionClassifierCode(legacyBodyRegion: string | null): string | null {
  if (!legacyBodyRegion) return null;
  return BODY_REGION_LEGACY_TO_CLASSIFIER[legacyBodyRegion] ?? null;
}

export function planImagingClassifierField(
  catalogCode: string,
  fieldName: ImagingClassifierFieldName,
  legacy: ImagingCatalogLegacy
): ImagingFieldBackfillPlan {
  switch (fieldName) {
    case "modalityClassifierId": {
      const classifierCode = resolveModalityClassifierCode(catalogCode, legacy.modality);
      return {
        disposition: classifierCode ? "APPLY" : "NOT_APPLICABLE",
        classifierCode,
        legacyValue: legacy.modality,
        message: classifierCode ? undefined : "legacy modality unmapped",
      };
    }
    case "bodyRegionClassifierId": {
      const classifierCode = resolveBodyRegionClassifierCode(legacy.bodyRegion);
      return {
        disposition: classifierCode ? "APPLY" : "NOT_APPLICABLE",
        classifierCode,
        legacyValue: legacy.bodyRegion,
        message: classifierCode ? undefined : "legacy body region unmapped",
      };
    }
    case "contrastTypeClassifierId": {
      if ((CONTRAST_INTENTIONAL_NULL_IMAGING_CODES as readonly string[]).includes(catalogCode)) {
        return {
          disposition: "MANUAL_REVIEW",
          classifierCode: null,
          legacyValue: catalogCode,
          message: "intentional null contrast FK (3C-B1B ratification)",
        };
      }
      const classifierCode = CONTRAST_CATALOG_CODE_TO_CLASSIFIER[catalogCode] ?? null;
      return {
        disposition: classifierCode ? "APPLY" : "NOT_APPLICABLE",
        classifierCode,
        legacyValue: catalogCode,
        message: classifierCode ? undefined : "contrast not mapped for catalog code",
      };
    }
    case "viewCountClassifierId": {
      const classifierCode = VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER[catalogCode] ?? null;
      return {
        disposition: classifierCode ? "APPLY" : "NOT_APPLICABLE",
        classifierCode,
        legacyValue: catalogCode,
        message: classifierCode ? undefined : "view count not applicable",
      };
    }
    case "lateralityClassifierId": {
      const classifierCode = LATERALITY_CATALOG_CODE_TO_CLASSIFIER[catalogCode] ?? null;
      return {
        disposition: classifierCode ? "APPLY" : "NOT_APPLICABLE",
        classifierCode,
        legacyValue: catalogCode,
      };
    }
    case "anatomicSubregionClassifierId": {
      const classifierCode = ANATOMIC_SUBREGION_CATALOG_CODE_TO_CLASSIFIER[catalogCode] ?? null;
      return {
        disposition: classifierCode ? "APPLY" : "NOT_APPLICABLE",
        classifierCode,
        legacyValue: catalogCode,
        message: classifierCode ? undefined : "anatomic subregion not applicable",
      };
    }
    case "protocolClassifierId": {
      const classifierCode = PROTOCOL_CATALOG_CODE_TO_CLASSIFIER[catalogCode] ?? null;
      return {
        disposition: classifierCode ? "APPLY" : "NOT_APPLICABLE",
        classifierCode,
        legacyValue: catalogCode,
        message: classifierCode ? undefined : "protocol not applicable",
      };
    }
    default: {
      const _exhaustive: never = fieldName;
      return _exhaustive;
    }
  }
}

export function resolveImagingClassifierCodeForField(
  catalogCode: string,
  fieldName: ImagingClassifierFieldName,
  legacy: ImagingCatalogLegacy
): string | null {
  const plan = planImagingClassifierField(catalogCode, fieldName, legacy);
  if (plan.disposition === "APPLY") return plan.classifierCode;
  return null;
}

export const LAB_CATEGORY_DESCRIPTION_PREFIX = "Catégorie : ";

export function parseLabCategoryFromDescription(description: string | null | undefined): string | null {
  if (!description?.startsWith(LAB_CATEGORY_DESCRIPTION_PREFIX)) return null;
  const token = description.slice(LAB_CATEGORY_DESCRIPTION_PREFIX.length).trim();
  return token || null;
}
