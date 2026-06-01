/**
 * Phase 2E.6B — Wave 2 imaging catalog (workbook wave=2, 2E.6A authorized).
 * Regenerate: node apps/api/prisma/scripts/generate-wave2-imaging-data.mjs
 */

export type Wave2ImagingClassifierTuple = {
  modality: string;
  bodyRegion: string;
  contrastType: string;
  viewCount: string | null;
  laterality: string;
  anatomicSubregion: string | null;
  protocol: string | null;
};

export type Wave2ImagingCatalogSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  legacyModality: string;
  legacyBodyRegion: string;
  implementationBatch: "XR-2" | "CT-2" | "US-1";
  searchText: string;
  classifiers: Wave2ImagingClassifierTuple;
  aliases: string[];
};

export const WAVE2_FORBIDDEN_CATALOG_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "DOPPLER_VEIN",
  "US_ABD",
  "CT_CHEST_CTA",
] as const;

export const WAVE2_IMAGING_BATCH_COUNTS = { xr: 53, ct: 4, us: 4, total: 61 } as const;

export const HAITI_IMAGING_WAVE2_CATALOG: Wave2ImagingCatalogSeed[] = [
  {
    "code": "XR_KNEE_LEFT_SUNRISE",
    "displayNameEn": "Knee X-ray left sunrise",
    "displayNameFr": "Radiographie genou gauche sunrise",
    "legacyModality": "XR",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "XR-2",
    "searchText": "knee x-ray left sunrise radiographie genou gauche sunrise xr_knee_left_sunrise xr genou knee left sunrise sunrise left",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_ONE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_XR_KNEE_SUNRISE"
    },
    "aliases": [
      "Knee Left Sunrise",
      "sunrise left"
    ]
  },
  {
    "code": "XR_KNEE_LEFT_2V",
    "displayNameEn": "Knee X-ray left 2 views",
    "displayNameFr": "Radiographie genou gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "XR-2",
    "searchText": "knee x-ray left 2 views radiographie genou gauche 2 inc. xr_knee_left_2v xr genou knee left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Knee Left 2V"
    ]
  },
  {
    "code": "XR_KNEE_LEFT_3V",
    "displayNameEn": "Knee X-ray left 3 views",
    "displayNameFr": "Radiographie genou gauche 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "XR-2",
    "searchText": "knee x-ray left 3 views radiographie genou gauche 3 inc. xr_knee_left_3v xr genou knee left 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Knee Left 3V"
    ]
  },
  {
    "code": "XR_KNEE_LEFT_4V",
    "displayNameEn": "Knee X-ray left 4 views",
    "displayNameFr": "Radiographie genou gauche 4 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "XR-2",
    "searchText": "knee x-ray left 4 views radiographie genou gauche 4 inc. xr_knee_left_4v xr genou knee left 4v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_FOUR",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Knee Left 4V"
    ]
  },
  {
    "code": "XR_KNEE_RIGHT_SUNRISE",
    "displayNameEn": "Knee X-ray right sunrise",
    "displayNameFr": "Radiographie genou droit sunrise",
    "legacyModality": "XR",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "XR-2",
    "searchText": "knee x-ray right sunrise radiographie genou droit sunrise xr_knee_right_sunrise xr genou knee right sunrise sunrise right",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_ONE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_XR_KNEE_SUNRISE"
    },
    "aliases": [
      "Knee Right Sunrise",
      "sunrise right"
    ]
  },
  {
    "code": "XR_KNEE_RIGHT_2V",
    "displayNameEn": "Knee X-ray right 2 views",
    "displayNameFr": "Radiographie genou droit 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "XR-2",
    "searchText": "knee x-ray right 2 views radiographie genou droit 2 inc. xr_knee_right_2v xr genou knee right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Knee Right 2V"
    ]
  },
  {
    "code": "XR_KNEE_RIGHT_3V",
    "displayNameEn": "Knee X-ray right 3 views",
    "displayNameFr": "Radiographie genou droit 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "XR-2",
    "searchText": "knee x-ray right 3 views radiographie genou droit 3 inc. xr_knee_right_3v xr genou knee right 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Knee Right 3V"
    ]
  },
  {
    "code": "XR_KNEE_RIGHT_4V",
    "displayNameEn": "Knee X-ray right 4 views",
    "displayNameFr": "Radiographie genou droit 4 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "XR-2",
    "searchText": "knee x-ray right 4 views radiographie genou droit 4 inc. xr_knee_right_4v xr genou knee right 4v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_FOUR",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Knee Right 4V"
    ]
  },
  {
    "code": "XR_ANKLE_LEFT_2V",
    "displayNameEn": "Ankle X-ray left 2 views",
    "displayNameFr": "Radiographie cheville gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "CHEVILLE",
    "implementationBatch": "XR-2",
    "searchText": "ankle x-ray left 2 views radiographie cheville gauche 2 inc. xr_ankle_left_2v xr cheville ankle left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ANKLE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Ankle Left 2V"
    ]
  },
  {
    "code": "XR_ANKLE_LEFT_3V",
    "displayNameEn": "Ankle X-ray left 3 views",
    "displayNameFr": "Radiographie cheville gauche 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "CHEVILLE",
    "implementationBatch": "XR-2",
    "searchText": "ankle x-ray left 3 views radiographie cheville gauche 3 inc. xr_ankle_left_3v xr cheville ankle left 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ANKLE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Ankle Left 3V"
    ]
  },
  {
    "code": "XR_ANKLE_RIGHT_2V",
    "displayNameEn": "Ankle X-ray right 2 views",
    "displayNameFr": "Radiographie cheville droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "CHEVILLE",
    "implementationBatch": "XR-2",
    "searchText": "ankle x-ray right 2 views radiographie cheville droite 2 inc. xr_ankle_right_2v xr cheville ankle right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ANKLE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Ankle Right 2V"
    ]
  },
  {
    "code": "XR_ANKLE_RIGHT_3V",
    "displayNameEn": "Ankle X-ray right 3 views",
    "displayNameFr": "Radiographie cheville droite 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "CHEVILLE",
    "implementationBatch": "XR-2",
    "searchText": "ankle x-ray right 3 views radiographie cheville droite 3 inc. xr_ankle_right_3v xr cheville ankle right 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ANKLE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Ankle Right 3V"
    ]
  },
  {
    "code": "XR_FOOT_BILATERAL_2V",
    "displayNameEn": "Foot X-ray bilateral 2 views",
    "displayNameFr": "Radiographie pied bilatérale 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "XR-2",
    "searchText": "foot x-ray bilateral 2 views radiographie pied bilatérale 2 inc. xr_foot_bilateral_2v xr pied foot bilateral 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_BILATERAL",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Foot Bilateral 2V"
    ]
  },
  {
    "code": "XR_FOOT_LEFT_2V",
    "displayNameEn": "Foot X-ray left 2 views",
    "displayNameFr": "Radiographie pied gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "XR-2",
    "searchText": "foot x-ray left 2 views radiographie pied gauche 2 inc. xr_foot_left_2v xr pied foot left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Foot Left 2V"
    ]
  },
  {
    "code": "XR_FOOT_LEFT_3V",
    "displayNameEn": "Foot X-ray left 3 views",
    "displayNameFr": "Radiographie pied gauche 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "XR-2",
    "searchText": "foot x-ray left 3 views radiographie pied gauche 3 inc. xr_foot_left_3v xr pied foot left 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Foot Left 3V"
    ]
  },
  {
    "code": "XR_FOOT_RIGHT_2V",
    "displayNameEn": "Foot X-ray right 2 views",
    "displayNameFr": "Radiographie pied droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "XR-2",
    "searchText": "foot x-ray right 2 views radiographie pied droite 2 inc. xr_foot_right_2v xr pied foot right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Foot Right 2V"
    ]
  },
  {
    "code": "XR_FOOT_RIGHT_3V",
    "displayNameEn": "Foot X-ray right 3 views",
    "displayNameFr": "Radiographie pied droite 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "XR-2",
    "searchText": "foot x-ray right 3 views radiographie pied droite 3 inc. xr_foot_right_3v xr pied foot right 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Foot Right 3V"
    ]
  },
  {
    "code": "XR_CALCANEUS_LEFT_2V",
    "displayNameEn": "Calcaneus X-ray left 2 views",
    "displayNameFr": "Radiographie calcanéus gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "XR-2",
    "searchText": "calcaneus x-ray left 2 views radiographie calcanéus gauche 2 inc. xr_calcaneus_left_2v xr pied os calcis left 2v calcaneus left calcanéus gauche",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_CALCANEUS",
      "protocol": null
    },
    "aliases": [
      "Os Calcis Left 2V",
      "calcaneus left",
      "calcanéus gauche"
    ]
  },
  {
    "code": "XR_CALCANEUS_RIGHT_2V",
    "displayNameEn": "Calcaneus X-ray right 2 views",
    "displayNameFr": "Radiographie calcanéus droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "XR-2",
    "searchText": "calcaneus x-ray right 2 views radiographie calcanéus droite 2 inc. xr_calcaneus_right_2v xr pied os calcis right 2v calcaneus right calcanéus droite",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_CALCANEUS",
      "protocol": null
    },
    "aliases": [
      "Os Calcis Right 2V",
      "calcaneus right",
      "calcanéus droite"
    ]
  },
  {
    "code": "XR_ELBOW_LEFT_2V",
    "displayNameEn": "Elbow X-ray left 2 views",
    "displayNameFr": "Radiographie coude gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "COUDE",
    "implementationBatch": "XR-2",
    "searchText": "elbow x-ray left 2 views radiographie coude gauche 2 inc. xr_elbow_left_2v xr coude elbow left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ELBOW",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Elbow Left 2V"
    ]
  },
  {
    "code": "XR_ELBOW_LEFT_3V",
    "displayNameEn": "Elbow X-ray left 3 views",
    "displayNameFr": "Radiographie coude gauche 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "COUDE",
    "implementationBatch": "XR-2",
    "searchText": "elbow x-ray left 3 views radiographie coude gauche 3 inc. xr_elbow_left_3v xr coude elbow left 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ELBOW",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Elbow Left 3V"
    ]
  },
  {
    "code": "XR_ELBOW_LEFT_4V",
    "displayNameEn": "Elbow X-ray left 4 views",
    "displayNameFr": "Radiographie coude gauche 4 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "COUDE",
    "implementationBatch": "XR-2",
    "searchText": "elbow x-ray left 4 views radiographie coude gauche 4 inc. xr_elbow_left_4v xr coude elbow left 4v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ELBOW",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_FOUR",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Elbow Left 4V"
    ]
  },
  {
    "code": "XR_ELBOW_RIGHT_2V",
    "displayNameEn": "Elbow X-ray right 2 views",
    "displayNameFr": "Radiographie coude droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "COUDE",
    "implementationBatch": "XR-2",
    "searchText": "elbow x-ray right 2 views radiographie coude droite 2 inc. xr_elbow_right_2v xr coude elbow right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ELBOW",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Elbow Right 2V"
    ]
  },
  {
    "code": "XR_ELBOW_RIGHT_3V",
    "displayNameEn": "Elbow X-ray right 3 views",
    "displayNameFr": "Radiographie coude droite 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "COUDE",
    "implementationBatch": "XR-2",
    "searchText": "elbow x-ray right 3 views radiographie coude droite 3 inc. xr_elbow_right_3v xr coude elbow right 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ELBOW",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Elbow Right 3V"
    ]
  },
  {
    "code": "XR_ELBOW_RIGHT_4V",
    "displayNameEn": "Elbow X-ray right 4 views",
    "displayNameFr": "Radiographie coude droite 4 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "COUDE",
    "implementationBatch": "XR-2",
    "searchText": "elbow x-ray right 4 views radiographie coude droite 4 inc. xr_elbow_right_4v xr coude elbow right 4v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ELBOW",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_FOUR",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Elbow Right 4V"
    ]
  },
  {
    "code": "XR_WRIST_LEFT_2V",
    "displayNameEn": "Wrist X-ray left 2 views",
    "displayNameFr": "Radiographie poignet gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "POIGNET",
    "implementationBatch": "XR-2",
    "searchText": "wrist x-ray left 2 views radiographie poignet gauche 2 inc. xr_wrist_left_2v xr poignet wrist left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_WRIST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Wrist Left 2V"
    ]
  },
  {
    "code": "XR_WRIST_LEFT_3V",
    "displayNameEn": "Wrist X-ray left 3 views",
    "displayNameFr": "Radiographie poignet gauche 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "POIGNET",
    "implementationBatch": "XR-2",
    "searchText": "wrist x-ray left 3 views radiographie poignet gauche 3 inc. xr_wrist_left_3v xr poignet wrist left 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_WRIST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Wrist Left 3V"
    ]
  },
  {
    "code": "XR_WRIST_RIGHT_2V",
    "displayNameEn": "Wrist X-ray right 2 views",
    "displayNameFr": "Radiographie poignet droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "POIGNET",
    "implementationBatch": "XR-2",
    "searchText": "wrist x-ray right 2 views radiographie poignet droite 2 inc. xr_wrist_right_2v xr poignet wrist right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_WRIST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Wrist Right 2V"
    ]
  },
  {
    "code": "XR_WRIST_RIGHT_3V",
    "displayNameEn": "Wrist X-ray right 3 views",
    "displayNameFr": "Radiographie poignet droite 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "POIGNET",
    "implementationBatch": "XR-2",
    "searchText": "wrist x-ray right 3 views radiographie poignet droite 3 inc. xr_wrist_right_3v xr poignet wrist right 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_WRIST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Wrist Right 3V"
    ]
  },
  {
    "code": "XR_SHOULDER_LEFT_2V",
    "displayNameEn": "Shoulder X-ray left 2 views",
    "displayNameFr": "Radiographie épaule gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-2",
    "searchText": "shoulder x-ray left 2 views radiographie épaule gauche 2 inc. xr_shoulder_left_2v xr epaule shoulder left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Shoulder Left 2V"
    ]
  },
  {
    "code": "XR_SHOULDER_LEFT_3V",
    "displayNameEn": "Shoulder X-ray left 3 views",
    "displayNameFr": "Radiographie épaule gauche 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-2",
    "searchText": "shoulder x-ray left 3 views radiographie épaule gauche 3 inc. xr_shoulder_left_3v xr epaule shoulder left 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Shoulder Left 3V"
    ]
  },
  {
    "code": "XR_SHOULDER_RIGHT_2V",
    "displayNameEn": "Shoulder X-ray right 2 views",
    "displayNameFr": "Radiographie épaule droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-2",
    "searchText": "shoulder x-ray right 2 views radiographie épaule droite 2 inc. xr_shoulder_right_2v xr epaule shoulder right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Shoulder Right 2V"
    ]
  },
  {
    "code": "XR_SHOULDER_RIGHT_3V",
    "displayNameEn": "Shoulder X-ray right 3 views",
    "displayNameFr": "Radiographie épaule droite 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-2",
    "searchText": "shoulder x-ray right 3 views radiographie épaule droite 3 inc. xr_shoulder_right_3v xr epaule shoulder right 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Shoulder Right 3V"
    ]
  },
  {
    "code": "XR_HAND_LEFT_2V",
    "displayNameEn": "Hand X-ray left 2 views",
    "displayNameFr": "Radiographie main gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "MAIN",
    "implementationBatch": "XR-2",
    "searchText": "hand x-ray left 2 views radiographie main gauche 2 inc. xr_hand_left_2v xr main hand left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HAND",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hand Left 2V"
    ]
  },
  {
    "code": "XR_HAND_LEFT_3V",
    "displayNameEn": "Hand X-ray left 3 views",
    "displayNameFr": "Radiographie main gauche 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "MAIN",
    "implementationBatch": "XR-2",
    "searchText": "hand x-ray left 3 views radiographie main gauche 3 inc. xr_hand_left_3v xr main hand left 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HAND",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hand Left 3V"
    ]
  },
  {
    "code": "XR_HAND_RIGHT_2V",
    "displayNameEn": "Hand X-ray right 2 views",
    "displayNameFr": "Radiographie main droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "MAIN",
    "implementationBatch": "XR-2",
    "searchText": "hand x-ray right 2 views radiographie main droite 2 inc. xr_hand_right_2v xr main hand right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HAND",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hand Right 2V"
    ]
  },
  {
    "code": "XR_HAND_RIGHT_3V",
    "displayNameEn": "Hand X-ray right 3 views",
    "displayNameFr": "Radiographie main droite 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "MAIN",
    "implementationBatch": "XR-2",
    "searchText": "hand x-ray right 3 views radiographie main droite 3 inc. xr_hand_right_3v xr main hand right 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HAND",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hand Right 3V"
    ]
  },
  {
    "code": "XR_HIP_BILATERAL_WITH_PELVIS",
    "displayNameEn": "Hip X-ray bilateral with pelvis",
    "displayNameFr": "Radiographie hanche bilatérale avec bassin",
    "legacyModality": "XR",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "XR-2",
    "searchText": "hip x-ray bilateral with pelvis radiographie hanche bilatérale avec bassin xr_hip_bilateral_with_pelvis xr hanche hip bilateral with pelvis",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_BILATERAL",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hip Bilateral with Pelvis"
    ]
  },
  {
    "code": "XR_HIP_LEFT_1V",
    "displayNameEn": "Hip X-ray left 1 view",
    "displayNameFr": "Radiographie hanche gauche 1 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "XR-2",
    "searchText": "hip x-ray left 1 view radiographie hanche gauche 1 inc. xr_hip_left_1v xr hanche hip left 1v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_ONE",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hip Left 1V"
    ]
  },
  {
    "code": "XR_HIP_LEFT_2V",
    "displayNameEn": "Hip X-ray left 2 views",
    "displayNameFr": "Radiographie hanche gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "XR-2",
    "searchText": "hip x-ray left 2 views radiographie hanche gauche 2 inc. xr_hip_left_2v xr hanche hip left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hip Left 2V"
    ]
  },
  {
    "code": "XR_HIP_RIGHT_1V",
    "displayNameEn": "Hip X-ray right 1 view",
    "displayNameFr": "Radiographie hanche droite 1 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "XR-2",
    "searchText": "hip x-ray right 1 view radiographie hanche droite 1 inc. xr_hip_right_1v xr hanche hip right 1v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_ONE",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hip Right 1V"
    ]
  },
  {
    "code": "XR_HIP_RIGHT_2V",
    "displayNameEn": "Hip X-ray right 2 views",
    "displayNameFr": "Radiographie hanche droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "XR-2",
    "searchText": "hip x-ray right 2 views radiographie hanche droite 2 inc. xr_hip_right_2v xr hanche hip right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Hip Right 2V"
    ]
  },
  {
    "code": "XR_HUMERUS_LEFT_2V",
    "displayNameEn": "Humerus X-ray left 2 views",
    "displayNameFr": "Radiographie humérus gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "BRAS",
    "implementationBatch": "XR-2",
    "searchText": "humerus x-ray left 2 views radiographie humérus gauche 2 inc. xr_humerus_left_2v xr bras humerus left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ARM",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Humerus Left 2V"
    ]
  },
  {
    "code": "XR_HUMERUS_RIGHT_2V",
    "displayNameEn": "Humerus X-ray right 2 views",
    "displayNameFr": "Radiographie humérus droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "BRAS",
    "implementationBatch": "XR-2",
    "searchText": "humerus x-ray right 2 views radiographie humérus droite 2 inc. xr_humerus_right_2v xr bras humerus right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ARM",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Humerus Right 2V"
    ]
  },
  {
    "code": "XR_FEMUR_LEFT_2V",
    "displayNameEn": "Femur X-ray left 2 views",
    "displayNameFr": "Radiographie fémur gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "CUISSE",
    "implementationBatch": "XR-2",
    "searchText": "femur x-ray left 2 views radiographie fémur gauche 2 inc. xr_femur_left_2v xr cuisse femur left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_THIGH",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Femur Left 2V"
    ]
  },
  {
    "code": "XR_FEMUR_RIGHT_2V",
    "displayNameEn": "Femur X-ray right 2 views",
    "displayNameFr": "Radiographie fémur droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "CUISSE",
    "implementationBatch": "XR-2",
    "searchText": "femur x-ray right 2 views radiographie fémur droite 2 inc. xr_femur_right_2v xr cuisse femur right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_THIGH",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Femur Right 2V"
    ]
  },
  {
    "code": "XR_FOREARM_LEFT_2V",
    "displayNameEn": "Forearm X-ray left 2 views",
    "displayNameFr": "Radiographie avant-bras gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "AVANT-BRAS",
    "implementationBatch": "XR-2",
    "searchText": "forearm x-ray left 2 views radiographie avant-bras gauche 2 inc. xr_forearm_left_2v xr avant-bras forearm left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOREARM",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Forearm Left 2V"
    ]
  },
  {
    "code": "XR_FOREARM_RIGHT_2V",
    "displayNameEn": "Forearm X-ray right 2 views",
    "displayNameFr": "Radiographie avant-bras droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "AVANT-BRAS",
    "implementationBatch": "XR-2",
    "searchText": "forearm x-ray right 2 views radiographie avant-bras droite 2 inc. xr_forearm_right_2v xr avant-bras forearm right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOREARM",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Forearm Right 2V"
    ]
  },
  {
    "code": "XR_TIB_FIB_LEFT_2V",
    "displayNameEn": "Tibia/fibula X-ray left 2 views",
    "displayNameFr": "Radiographie tibia-péroné gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "JAMBE",
    "implementationBatch": "XR-2",
    "searchText": "tibia/fibula x-ray left 2 views radiographie tibia-péroné gauche 2 inc. xr_tib_fib_left_2v xr jambe tibia fibula left 2v tib fib left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_LEG",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Tibia Fibula Left 2V",
      "Tib Fib Left 2V"
    ]
  },
  {
    "code": "XR_TIB_FIB_RIGHT_2V",
    "displayNameEn": "Tibia/fibula X-ray right 2 views",
    "displayNameFr": "Radiographie tibia-péroné droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "JAMBE",
    "implementationBatch": "XR-2",
    "searchText": "tibia/fibula x-ray right 2 views radiographie tibia-péroné droite 2 inc. xr_tib_fib_right_2v xr jambe tibia fibula right 2v tib fib right 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_LEG",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Tibia Fibula Right 2V",
      "Tib Fib Right 2V"
    ]
  },
  {
    "code": "XR_PELVIS_AP",
    "displayNameEn": "Pelvis X-ray AP",
    "displayNameFr": "Radiographie bassin AP",
    "legacyModality": "XR",
    "legacyBodyRegion": "BASSIN",
    "implementationBatch": "XR-2",
    "searchText": "pelvis x-ray ap radiographie bassin ap xr_pelvis_ap xr bassin pelvis ap",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_PELVIS",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_ONE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Pelvis AP"
    ]
  },
  {
    "code": "XR_PELVIS_COMPLETE",
    "displayNameEn": "Pelvis X-ray complete",
    "displayNameFr": "Radiographie bassin complète",
    "legacyModality": "XR",
    "legacyBodyRegion": "BASSIN",
    "implementationBatch": "XR-2",
    "searchText": "pelvis x-ray complete radiographie bassin complète xr_pelvis_complete xr bassin pelvis complete",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_PELVIS",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_COMPLETE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Pelvis Complete"
    ]
  },
  {
    "code": "XR_INFANT_FOOT_LEFT_2V",
    "displayNameEn": "Infant foot X-ray left 2 views",
    "displayNameFr": "Radiographie pied nourrisson gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "XR-2",
    "searchText": "infant foot x-ray left 2 views radiographie pied nourrisson gauche 2 inc. xr_infant_foot_left_2v xr pied infant foot left 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_INFANT_EXTREMITY",
      "protocol": null
    },
    "aliases": [
      "Infant Foot Left 2V"
    ]
  },
  {
    "code": "CTA_LOWER_EXTREMITY_LEFT",
    "displayNameEn": "CTA lower extremity left",
    "displayNameFr": "Angioscanner membre inférieur gauche",
    "legacyModality": "CTA",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "CT-2",
    "searchText": "cta lower extremity left angioscanner membre inférieur gauche cta_lower_extremity_left cta membre inf cta lower extremity left cta le left angioscanner membre inférieur gauche",
    "classifiers": {
      "modality": "MODALITY_CTA",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_ANGIOGRAPHIC",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CTA Lower Extremity Left",
      "cta le left",
      "angioscanner membre inférieur gauche"
    ]
  },
  {
    "code": "CTA_LOWER_EXTREMITY_RIGHT",
    "displayNameEn": "CTA lower extremity right",
    "displayNameFr": "Angioscanner membre inférieur droit",
    "legacyModality": "CTA",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "CT-2",
    "searchText": "cta lower extremity right angioscanner membre inférieur droit cta_lower_extremity_right cta membre inf cta lower extremity right cta le right angioscanner membre inférieur droit",
    "classifiers": {
      "modality": "MODALITY_CTA",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_ANGIOGRAPHIC",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CTA Lower Extremity Right",
      "cta le right",
      "angioscanner membre inférieur droit"
    ]
  },
  {
    "code": "CTA_UPPER_EXTREMITY_LEFT",
    "displayNameEn": "CTA upper extremity left",
    "displayNameFr": "Angioscanner membre supérieur gauche",
    "legacyModality": "CTA",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "CT-2",
    "searchText": "cta upper extremity left angioscanner membre supérieur gauche cta_upper_extremity_left cta membre sup cta upper extremity left cta ue left angioscanner membre supérieur gauche",
    "classifiers": {
      "modality": "MODALITY_CTA",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_ANGIOGRAPHIC",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CTA Upper Extremity Left",
      "cta ue left",
      "angioscanner membre supérieur gauche"
    ]
  },
  {
    "code": "CTA_UPPER_EXTREMITY_RIGHT",
    "displayNameEn": "CTA upper extremity right",
    "displayNameFr": "Angioscanner membre supérieur droit",
    "legacyModality": "CTA",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "CT-2",
    "searchText": "cta upper extremity right angioscanner membre supérieur droit cta_upper_extremity_right cta membre sup cta upper extremity right cta ue right angioscanner membre supérieur droit",
    "classifiers": {
      "modality": "MODALITY_CTA",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_ANGIOGRAPHIC",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CTA Upper Extremity Right",
      "cta ue right",
      "angioscanner membre supérieur droit"
    ]
  },
  {
    "code": "US_THYROID",
    "displayNameEn": "Thyroid ultrasound",
    "displayNameFr": "Échographie thyroïde",
    "legacyModality": "US",
    "legacyBodyRegion": "THYROIDE",
    "implementationBatch": "US-1",
    "searchText": "thyroid ultrasound échographie thyroïde us_thyroid us thyroide thyroid ultrasound échographie thyroïde echo thyroid",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_THYROID",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_THYROID",
      "protocol": null
    },
    "aliases": [
      "Thyroid Ultrasound",
      "échographie thyroïde",
      "echo thyroid"
    ]
  },
  {
    "code": "US_AORTA",
    "displayNameEn": "Aorta ultrasound",
    "displayNameFr": "Échographie aorte",
    "legacyModality": "US",
    "legacyBodyRegion": "AORTE",
    "implementationBatch": "US-1",
    "searchText": "aorta ultrasound échographie aorte us_aorta us aorte aorta ultrasound échographie aorte echo aorta",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_AORTA",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_AORTA",
      "protocol": null
    },
    "aliases": [
      "Aorta Ultrasound",
      "échographie aorte",
      "echo aorta"
    ]
  },
  {
    "code": "US_BLADDER",
    "displayNameEn": "Bladder ultrasound",
    "displayNameFr": "Échographie vessie",
    "legacyModality": "US",
    "legacyBodyRegion": "VESSIE",
    "implementationBatch": "US-1",
    "searchText": "bladder ultrasound échographie vessie us_bladder us vessie bladder ultrasound échographie vessie echo bladder",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_BLADDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_BLADDER",
      "protocol": null
    },
    "aliases": [
      "Bladder Ultrasound",
      "échographie vessie",
      "echo bladder"
    ]
  },
  {
    "code": "US_CHEST",
    "displayNameEn": "Chest ultrasound",
    "displayNameFr": "Échographie thorax",
    "legacyModality": "US",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "US-1",
    "searchText": "chest ultrasound échographie thorax us_chest us thorax chest ultrasound échographie thorax echo chest",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Chest Ultrasound",
      "échographie thorax",
      "echo chest"
    ]
  }
];
