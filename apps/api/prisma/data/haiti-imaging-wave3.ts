/**
 * Phase 2E.7B — Wave 3 imaging catalog (workbook wave=3, 2E.7A authorized).
 * Regenerate: node apps/api/prisma/scripts/generate-wave3-imaging-data.mjs
 */

export type Wave3ImagingClassifierTuple = {
  modality: string;
  bodyRegion: string;
  contrastType: string;
  viewCount: string | null;
  laterality: string;
  anatomicSubregion: string | null;
  protocol: string | null;
};

export type Wave3ImagingCatalogSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  legacyModality: string;
  legacyBodyRegion: string;
  implementationBatch: "MRI-2" | "MRA-1" | "US-2" | "US-3" | "FL-1" | "NM-1";
  searchText: string;
  classifiers: Wave3ImagingClassifierTuple;
  aliases: string[];
};

export const WAVE3_FORBIDDEN_CATALOG_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "DOPPLER_VEIN",
  "US_ABD",
  "CT_CHEST_CTA",
] as const;

export const WAVE3_IMAGING_BATCH_COUNTS = { mri2: 14, mra1: 5, us2: 10, us3: 3, fl1: 4, nm1: 5, total: 41 } as const;

export const HAITI_IMAGING_WAVE3_CATALOG: Wave3ImagingCatalogSeed[] = [
  {
    "code": "MRI_CHOLANGIOGRAM",
    "displayNameEn": "MRI cholangiogram",
    "displayNameFr": "IRM cholangiographie",
    "legacyModality": "MRI",
    "legacyBodyRegion": "FOIE",
    "implementationBatch": "MRI-2",
    "searchText": "mri cholangiogram irm cholangiographie mri_cholangiogram mri foie mrcp cholangiogram irm cholédoque",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_HEPATOBILIARY",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_BILIARY",
      "protocol": "PROTOCOL_MRI_CHOLANGIOGRAM"
    },
    "aliases": [
      "MRCP",
      "cholangiogram",
      "IRM cholédoque"
    ]
  },
  {
    "code": "MRI_HIP_BILATERAL_WO_CONTRAST",
    "displayNameEn": "MRI hip bilateral without contrast",
    "displayNameFr": "IRM hanche bilatérale sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "MRI-2",
    "searchText": "mri hip bilateral without contrast irm hanche bilatérale sans contraste mri_hip_bilateral_wo_contrast mri hanche mri hip bilateral irm hanche bilatérale",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_BILATERAL",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Hip Bilateral",
      "IRM hanche bilatérale"
    ]
  },
  {
    "code": "MRI_HIP_LEFT_WO_CONTRAST",
    "displayNameEn": "MRI hip left without contrast",
    "displayNameFr": "IRM hanche gauche sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "MRI-2",
    "searchText": "mri hip left without contrast irm hanche gauche sans contraste mri_hip_left_wo_contrast mri hanche mri hip left irm hanche gauche",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Hip Left",
      "IRM hanche gauche"
    ]
  },
  {
    "code": "MRI_HIP_RIGHT_WO_CONTRAST",
    "displayNameEn": "MRI hip right without contrast",
    "displayNameFr": "IRM hanche droite sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "MRI-2",
    "searchText": "mri hip right without contrast irm hanche droite sans contraste mri_hip_right_wo_contrast mri hanche mri hip right irm hanche droite",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Hip Right",
      "IRM hanche droite"
    ]
  },
  {
    "code": "MRI_KNEE_LEFT",
    "displayNameEn": "MRI knee left",
    "displayNameFr": "IRM genou gauche",
    "legacyModality": "MRI",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "MRI-2",
    "searchText": "mri knee left irm genou gauche mri_knee_left mri genou mri knee left knee mri left irm genou gauche",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Knee Left",
      "knee MRI left",
      "IRM genou gauche"
    ]
  },
  {
    "code": "MRI_KNEE_RIGHT",
    "displayNameEn": "MRI knee right",
    "displayNameFr": "IRM genou droit",
    "legacyModality": "MRI",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "MRI-2",
    "searchText": "mri knee right irm genou droit mri_knee_right mri genou mri knee right knee mri right irm genou droit",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Knee Right",
      "knee MRI right",
      "IRM genou droit"
    ]
  },
  {
    "code": "MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST",
    "displayNameEn": "MRI lower extremity left with and without contrast",
    "displayNameFr": "IRM membre inférieur gauche avec et sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "MRI-2",
    "searchText": "mri lower extremity left with and without contrast irm membre inférieur gauche avec et sans contraste mri_lower_extremity_left_w_wo_contrast mri membre inf mri le left w&wo irm membre inférieur gauche",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI LE Left w&wo",
      "IRM membre inférieur gauche"
    ]
  },
  {
    "code": "MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST",
    "displayNameEn": "MRI lower extremity right with and without contrast",
    "displayNameFr": "IRM membre inférieur droit avec et sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "MRI-2",
    "searchText": "mri lower extremity right with and without contrast irm membre inférieur droit avec et sans contraste mri_lower_extremity_right_w_wo_contrast mri membre inf mri le right w&wo irm membre inférieur droit",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI LE Right w&wo",
      "IRM membre inférieur droit"
    ]
  },
  {
    "code": "MRI_PELVIS",
    "displayNameEn": "MRI pelvis",
    "displayNameFr": "IRM pelvis",
    "legacyModality": "MRI",
    "legacyBodyRegion": "BASSIN",
    "implementationBatch": "MRI-2",
    "searchText": "mri pelvis irm pelvis mri_pelvis mri bassin mri pelvis irm pelvis",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_PELVIS",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Pelvis",
      "IRM pelvis"
    ]
  },
  {
    "code": "MRI_PELVIS_LIMITED",
    "displayNameEn": "MRI pelvis limited",
    "displayNameFr": "IRM pelvis limitée",
    "legacyModality": "MRI",
    "legacyBodyRegion": "BASSIN",
    "implementationBatch": "MRI-2",
    "searchText": "mri pelvis limited irm pelvis limitée mri_pelvis_limited mri bassin mri pelvis limited irm pelvis limitée",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_PELVIS",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Pelvis Limited",
      "IRM pelvis limitée"
    ]
  },
  {
    "code": "MRI_SELLA",
    "displayNameEn": "MRI sella",
    "displayNameFr": "IRM selle turcique",
    "legacyModality": "MRI",
    "legacyBodyRegion": "TETE",
    "implementationBatch": "MRI-2",
    "searchText": "mri sella irm selle turcique mri_sella mri tete mri sella irm selle turcique",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_HEAD",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SELLA",
      "protocol": null
    },
    "aliases": [
      "MRI Sella",
      "IRM selle turcique"
    ]
  },
  {
    "code": "MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST",
    "displayNameEn": "MRI upper extremity left without contrast",
    "displayNameFr": "IRM membre supérieur gauche sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "MRI-2",
    "searchText": "mri upper extremity left without contrast irm membre supérieur gauche sans contraste mri_upper_extremity_left_wo_contrast mri membre sup mri ue left wo irm membre supérieur gauche",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI UE Left wo",
      "IRM membre supérieur gauche"
    ]
  },
  {
    "code": "MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST",
    "displayNameEn": "MRI upper extremity right without contrast",
    "displayNameFr": "IRM membre supérieur droit sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "MRI-2",
    "searchText": "mri upper extremity right without contrast irm membre supérieur droit sans contraste mri_upper_extremity_right_wo_contrast mri membre sup mri ue right wo irm membre supérieur droit",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI UE Right wo",
      "IRM membre supérieur droit"
    ]
  },
  {
    "code": "MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST",
    "displayNameEn": "MRI upper extremity right with and without contrast",
    "displayNameFr": "IRM membre supérieur droit avec et sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "MRI-2",
    "searchText": "mri upper extremity right with and without contrast irm membre supérieur droit avec et sans contraste mri_upper_extremity_right_w_wo_contrast mri membre sup mri ue right w&wo",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI UE Right w&wo"
    ]
  },
  {
    "code": "MRA_BRAIN",
    "displayNameEn": "MRA brain",
    "displayNameFr": "ARM cérébrale",
    "legacyModality": "MRA",
    "legacyBodyRegion": "TETE",
    "implementationBatch": "MRA-1",
    "searchText": "mra brain arm cérébrale mra_brain mra tete mra brain arm cérébrale",
    "classifiers": {
      "modality": "MODALITY_MRA",
      "bodyRegion": "BODY_REGION_HEAD",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRA Brain",
      "ARM cérébrale"
    ]
  },
  {
    "code": "MRA_CAROTID_W_CONTRAST",
    "displayNameEn": "MRA carotid with contrast",
    "displayNameFr": "ARM carotides avec contraste",
    "legacyModality": "MRA",
    "legacyBodyRegion": "TETE COU",
    "implementationBatch": "MRA-1",
    "searchText": "mra carotid with contrast arm carotides avec contraste mra_carotid_w_contrast mra tete cou mra carotid w contrast arm carotides avec contraste",
    "classifiers": {
      "modality": "MODALITY_MRA",
      "bodyRegion": "BODY_REGION_HEAD_NECK",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_CAROTID",
      "protocol": null
    },
    "aliases": [
      "MRA Carotid w Contrast",
      "ARM carotides avec contraste"
    ]
  },
  {
    "code": "MRA_CAROTID_WO_CONTRAST",
    "displayNameEn": "MRA carotid without contrast",
    "displayNameFr": "ARM carotides sans contraste",
    "legacyModality": "MRA",
    "legacyBodyRegion": "TETE COU",
    "implementationBatch": "MRA-1",
    "searchText": "mra carotid without contrast arm carotides sans contraste mra_carotid_wo_contrast mra tete cou mra carotid wo contrast arm carotides sans contraste",
    "classifiers": {
      "modality": "MODALITY_MRA",
      "bodyRegion": "BODY_REGION_HEAD_NECK",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_CAROTID",
      "protocol": null
    },
    "aliases": [
      "MRA Carotid wo Contrast",
      "ARM carotides sans contraste"
    ]
  },
  {
    "code": "MRA_LE_LEFT_W_CONTRAST",
    "displayNameEn": "MRA lower extremity left with contrast",
    "displayNameFr": "ARM membre inférieur gauche avec contraste",
    "legacyModality": "MRA",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "MRA-1",
    "searchText": "mra lower extremity left with contrast arm membre inférieur gauche avec contraste mra_le_left_w_contrast mra membre inf mra le left arm membre inférieur gauche",
    "classifiers": {
      "modality": "MODALITY_MRA",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRA LE Left",
      "ARM membre inférieur gauche"
    ]
  },
  {
    "code": "MRA_LE_RIGHT_W_CONTRAST",
    "displayNameEn": "MRA lower extremity right with contrast",
    "displayNameFr": "ARM membre inférieur droit avec contraste",
    "legacyModality": "MRA",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "MRA-1",
    "searchText": "mra lower extremity right with contrast arm membre inférieur droit avec contraste mra_le_right_w_contrast mra membre inf mra le right arm membre inférieur droit",
    "classifiers": {
      "modality": "MODALITY_MRA",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRA LE Right",
      "ARM membre inférieur droit"
    ]
  },
  {
    "code": "US_CAROTID_DUPLEX",
    "displayNameEn": "Carotid duplex ultrasound",
    "displayNameFr": "Échographie duplex carotidienne",
    "legacyModality": "US",
    "legacyBodyRegion": "TETE COU",
    "implementationBatch": "US-2",
    "searchText": "carotid duplex ultrasound échographie duplex carotidienne us_carotid_duplex us tete cou carotid duplex carotid duplex duplex carotidien",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_HEAD_NECK",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_CAROTID",
      "protocol": "PROTOCOL_US_DOPPLER_ARTERIAL"
    },
    "aliases": [
      "Carotid Duplex",
      "carotid duplex",
      "duplex carotidien"
    ]
  },
  {
    "code": "US_ARTERIAL_DOPPLER_LE_BILATERAL",
    "displayNameEn": "Lower extremity arterial Doppler bilateral",
    "displayNameFr": "Doppler artériel membres inférieurs bilatéral",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "US-2",
    "searchText": "lower extremity arterial doppler bilateral doppler artériel membres inférieurs bilatéral us_arterial_doppler_le_bilateral us membre inf le arterial doppler bilateral doppler artériel mi bilatéral",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_BILATERAL",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_ARTERIAL"
    },
    "aliases": [
      "LE Arterial Doppler Bilateral",
      "Doppler artériel MI bilatéral"
    ]
  },
  {
    "code": "US_ARTERIAL_DOPPLER_LE_LEFT",
    "displayNameEn": "Lower extremity arterial Doppler left",
    "displayNameFr": "Doppler artériel membre inférieur gauche",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "US-2",
    "searchText": "lower extremity arterial doppler left doppler artériel membre inférieur gauche us_arterial_doppler_le_left us membre inf le arterial doppler left doppler artériel mi gauche",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_ARTERIAL"
    },
    "aliases": [
      "LE Arterial Doppler Left",
      "Doppler artériel MI gauche"
    ]
  },
  {
    "code": "US_ARTERIAL_DOPPLER_LE_RIGHT",
    "displayNameEn": "Lower extremity arterial Doppler right",
    "displayNameFr": "Doppler artériel membre inférieur droit",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "US-2",
    "searchText": "lower extremity arterial doppler right doppler artériel membre inférieur droit us_arterial_doppler_le_right us membre inf le arterial doppler right doppler artériel mi droit",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_ARTERIAL"
    },
    "aliases": [
      "LE Arterial Doppler Right",
      "Doppler artériel MI droit"
    ]
  },
  {
    "code": "US_VENOUS_DOPPLER_UE_BILATERAL",
    "displayNameEn": "Upper extremity venous Doppler bilateral",
    "displayNameFr": "Doppler veineux membres supérieurs bilatéral",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "US-2",
    "searchText": "upper extremity venous doppler bilateral doppler veineux membres supérieurs bilatéral us_venous_doppler_ue_bilateral us membre sup ue venous doppler bilateral doppler veineux ms bilatéral",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_BILATERAL",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_VENOUS"
    },
    "aliases": [
      "UE Venous Doppler Bilateral",
      "Doppler veineux MS bilatéral"
    ]
  },
  {
    "code": "US_VENOUS_DOPPLER_UE_LEFT",
    "displayNameEn": "Upper extremity venous Doppler left",
    "displayNameFr": "Doppler veineux membre supérieur gauche",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "US-2",
    "searchText": "upper extremity venous doppler left doppler veineux membre supérieur gauche us_venous_doppler_ue_left us membre sup ue venous doppler left doppler veineux ms gauche",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_VENOUS"
    },
    "aliases": [
      "UE Venous Doppler Left",
      "Doppler veineux MS gauche"
    ]
  },
  {
    "code": "US_VENOUS_DOPPLER_UE_RIGHT",
    "displayNameEn": "Upper extremity venous Doppler right",
    "displayNameFr": "Doppler veineux membre supérieur droit",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "US-2",
    "searchText": "upper extremity venous doppler right doppler veineux membre supérieur droit us_venous_doppler_ue_right us membre sup ue venous doppler right doppler veineux ms droit",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_VENOUS"
    },
    "aliases": [
      "UE Venous Doppler Right",
      "Doppler veineux MS droit"
    ]
  },
  {
    "code": "US_ARTERIAL_DOPPLER_UE_BILATERAL",
    "displayNameEn": "Upper extremity arterial Doppler bilateral",
    "displayNameFr": "Doppler artériel membres supérieurs bilatéral",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "US-2",
    "searchText": "upper extremity arterial doppler bilateral doppler artériel membres supérieurs bilatéral us_arterial_doppler_ue_bilateral us membre sup ue arterial doppler bilateral doppler artériel ms bilatéral",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_BILATERAL",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_ARTERIAL"
    },
    "aliases": [
      "UE Arterial Doppler Bilateral",
      "Doppler artériel MS bilatéral"
    ]
  },
  {
    "code": "US_ARTERIAL_DOPPLER_UE_LEFT",
    "displayNameEn": "Upper extremity arterial Doppler left",
    "displayNameFr": "Doppler artériel membre supérieur gauche",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "US-2",
    "searchText": "upper extremity arterial doppler left doppler artériel membre supérieur gauche us_arterial_doppler_ue_left us membre sup ue arterial doppler left",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_ARTERIAL"
    },
    "aliases": [
      "UE Arterial Doppler Left"
    ]
  },
  {
    "code": "US_ARTERIAL_DOPPLER_UE_RIGHT",
    "displayNameEn": "Upper extremity arterial Doppler right",
    "displayNameFr": "Doppler artériel membre supérieur droit",
    "legacyModality": "US",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "US-2",
    "searchText": "upper extremity arterial doppler right doppler artériel membre supérieur droit us_arterial_doppler_ue_right us membre sup ue arterial doppler right",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_US_DOPPLER_ARTERIAL"
    },
    "aliases": [
      "UE Arterial Doppler Right"
    ]
  },
  {
    "code": "US_BREAST_BILATERAL",
    "displayNameEn": "Breast ultrasound bilateral",
    "displayNameFr": "Échographie mammaire bilatérale",
    "legacyModality": "US",
    "legacyBodyRegion": "SEIN",
    "implementationBatch": "US-3",
    "searchText": "breast ultrasound bilateral échographie mammaire bilatérale us_breast_bilateral us sein breast us bilateral échographie mammaire bilatérale",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_BREAST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_BILATERAL",
      "anatomicSubregion": "ANATOMIC_SUBREGION_BREAST",
      "protocol": null
    },
    "aliases": [
      "Breast US Bilateral",
      "échographie mammaire bilatérale"
    ]
  },
  {
    "code": "US_BREAST_LEFT",
    "displayNameEn": "Breast ultrasound left",
    "displayNameFr": "Échographie mammaire gauche",
    "legacyModality": "US",
    "legacyBodyRegion": "SEIN",
    "implementationBatch": "US-3",
    "searchText": "breast ultrasound left échographie mammaire gauche us_breast_left us sein breast us left échographie mammaire gauche",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_BREAST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_BREAST",
      "protocol": null
    },
    "aliases": [
      "Breast US Left",
      "échographie mammaire gauche"
    ]
  },
  {
    "code": "US_BREAST_RIGHT",
    "displayNameEn": "Breast ultrasound right",
    "displayNameFr": "Échographie mammaire droite",
    "legacyModality": "US",
    "legacyBodyRegion": "SEIN",
    "implementationBatch": "US-3",
    "searchText": "breast ultrasound right échographie mammaire droite us_breast_right us sein breast us right échographie mammaire droite",
    "classifiers": {
      "modality": "MODALITY_US",
      "bodyRegion": "BODY_REGION_BREAST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_BREAST",
      "protocol": null
    },
    "aliases": [
      "Breast US Right",
      "échographie mammaire droite"
    ]
  },
  {
    "code": "FL_ESOPHAGRAM",
    "displayNameEn": "Esophagram",
    "displayNameFr": "Œsophagogramme",
    "legacyModality": "FL",
    "legacyBodyRegion": "ABDOMEN",
    "implementationBatch": "FL-1",
    "searchText": "esophagram œsophagogramme fl_esophagram fl abdomen esophagram swallow study œsophagogramme",
    "classifiers": {
      "modality": "MODALITY_FL",
      "bodyRegion": "BODY_REGION_ABDOMEN",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_FL_ESOPHAGRAM"
    },
    "aliases": [
      "Esophagram",
      "swallow study",
      "œsophagogramme"
    ]
  },
  {
    "code": "FL_LINE_PLACEMENT",
    "displayNameEn": "Fluoroscopic line placement",
    "displayNameFr": "Pose de ligne sous fluoroscopie",
    "legacyModality": "FL",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "FL-1",
    "searchText": "fluoroscopic line placement pose de ligne sous fluoroscopie fl_line_placement fl thorax line placement fluoro fluoro line",
    "classifiers": {
      "modality": "MODALITY_FL",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_FL_LINE_PLACEMENT"
    },
    "aliases": [
      "Line Placement Fluoro",
      "fluoro line"
    ]
  },
  {
    "code": "FL_TUBE_PLACEMENT",
    "displayNameEn": "Fluoroscopic tube placement",
    "displayNameFr": "Pose de sonde sous fluoroscopie",
    "legacyModality": "FL",
    "legacyBodyRegion": "ABDOMEN",
    "implementationBatch": "FL-1",
    "searchText": "fluoroscopic tube placement pose de sonde sous fluoroscopie fl_tube_placement fl abdomen tube placement fluoro fluoro tube",
    "classifiers": {
      "modality": "MODALITY_FL",
      "bodyRegion": "BODY_REGION_ABDOMEN",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_FL_TUBE_PLACEMENT"
    },
    "aliases": [
      "Tube Placement Fluoro",
      "fluoro tube"
    ]
  },
  {
    "code": "FL_LUMBAR_PUNCTURE",
    "displayNameEn": "Lumbar puncture (fluoroscopic guidance)",
    "displayNameFr": "Ponction lombaire (guidage fluoroscopique)",
    "legacyModality": "FL",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "FL-1",
    "searchText": "lumbar puncture (fluoroscopic guidance) ponction lombaire (guidage fluoroscopique) fl_lumbar_puncture fl rachis lumbar puncture fluoro ponction lombaire fluoroscopie",
    "classifiers": {
      "modality": "MODALITY_FL",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": "PROTOCOL_FL_LUMBAR_PUNCTURE"
    },
    "aliases": [
      "Lumbar Puncture Fluoro",
      "ponction lombaire fluoroscopie"
    ]
  },
  {
    "code": "NM_HIDA",
    "displayNameEn": "HIDA scan",
    "displayNameFr": "Scintigraphie HIDA",
    "legacyModality": "NM",
    "legacyBodyRegion": "FOIE",
    "implementationBatch": "NM-1",
    "searchText": "hida scan scintigraphie hida nm_hida nm foie hida hida scan scintigraphie hida",
    "classifiers": {
      "modality": "MODALITY_NM",
      "bodyRegion": "BODY_REGION_HEPATOBILIARY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_BILIARY",
      "protocol": "PROTOCOL_NM_HIDA"
    },
    "aliases": [
      "HIDA",
      "HIDA Scan",
      "scintigraphie HIDA"
    ]
  },
  {
    "code": "NM_GB_EMPTYING",
    "displayNameEn": "Gallbladder emptying study",
    "displayNameFr": "Étude d'évacuation vésiculaire",
    "legacyModality": "NM",
    "legacyBodyRegion": "FOIE",
    "implementationBatch": "NM-1",
    "searchText": "gallbladder emptying study étude d'évacuation vésiculaire nm_gb_emptying nm foie gb emptying gallbladder emptying évacuation vésiculaire",
    "classifiers": {
      "modality": "MODALITY_NM",
      "bodyRegion": "BODY_REGION_HEPATOBILIARY",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_BILIARY",
      "protocol": "PROTOCOL_NM_GALLBLADDER_EMPTYING"
    },
    "aliases": [
      "GB Emptying",
      "gallbladder emptying",
      "évacuation vésiculaire"
    ]
  },
  {
    "code": "NM_VQ_PERFUSION",
    "displayNameEn": "V/Q scan — perfusion",
    "displayNameFr": "Scintigraphie V/Q — perfusion",
    "legacyModality": "NM",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "NM-1",
    "searchText": "v/q scan — perfusion scintigraphie v/q — perfusion nm_vq_perfusion nm thorax vq perfusion scintigraphie v/q perfusion",
    "classifiers": {
      "modality": "MODALITY_NM",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_NM_VQ_PERFUSION"
    },
    "aliases": [
      "VQ Perfusion",
      "scintigraphie V/Q perfusion"
    ]
  },
  {
    "code": "NM_VQ_VENTILATION",
    "displayNameEn": "V/Q scan — ventilation",
    "displayNameFr": "Scintigraphie V/Q — ventilation",
    "legacyModality": "NM",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "NM-1",
    "searchText": "v/q scan — ventilation scintigraphie v/q — ventilation nm_vq_ventilation nm thorax vq ventilation scintigraphie v/q ventilation",
    "classifiers": {
      "modality": "MODALITY_NM",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_NM_VQ_VENTILATION"
    },
    "aliases": [
      "VQ Ventilation",
      "scintigraphie V/Q ventilation"
    ]
  },
  {
    "code": "NM_VQ_COMBINED",
    "displayNameEn": "V/Q scan — combined perfusion/ventilation",
    "displayNameFr": "Scintigraphie V/Q — perfusion et ventilation",
    "legacyModality": "NM",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "NM-1",
    "searchText": "v/q scan — combined perfusion/ventilation scintigraphie v/q — perfusion et ventilation nm_vq_combined nm thorax vq combined vq scan scintigraphie v/q",
    "classifiers": {
      "modality": "MODALITY_NM",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_NM_VQ_COMBINED"
    },
    "aliases": [
      "VQ Combined",
      "vq scan",
      "scintigraphie V/Q"
    ]
  }
];
