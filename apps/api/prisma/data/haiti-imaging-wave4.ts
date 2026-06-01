/**
 * Phase 2E.8B — Wave 4 imaging catalog (workbook wave=4, 2E.8A authorized).
 * Regenerate: node apps/api/prisma/scripts/generate-wave4-imaging-data.mjs
 */

export type Wave4ImagingClassifierTuple = {
  modality: string;
  bodyRegion: string;
  contrastType: string;
  viewCount: string | null;
  laterality: string;
  anatomicSubregion: string | null;
  protocol: string | null;
};

export type Wave4ImagingCatalogSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  legacyModality: string;
  legacyBodyRegion: string;
  implementationBatch: "XR-3" | "CT-3";
  searchText: string;
  classifiers: Wave4ImagingClassifierTuple;
  aliases: string[];
};

export const WAVE4_FORBIDDEN_CATALOG_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "DOPPLER_VEIN",
  "US_ABD",
  "CT_CHEST_CTA",
] as const;

export const WAVE4_IMAGING_BATCH_COUNTS = { xr3: 7, ct3: 24, total: 31 } as const;

export const HAITI_IMAGING_WAVE4_CATALOG: Wave4ImagingCatalogSeed[] = [
  {
    "code": "XR_AC_JOINT_BILATERAL_2V",
    "displayNameEn": "AC joints X-ray bilateral 2 views",
    "displayNameFr": "Radiographie articulations AC bilatérales 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-3",
    "searchText": "ac joints x-ray bilateral 2 views radiographie articulations ac bilatérales 2 inc. xr_ac_joint_bilateral_2v xr epaule ac joint bilateral articulation ac bilatérale ac joints",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_BILATERAL",
      "anatomicSubregion": "ANATOMIC_SUBREGION_AC_JOINT",
      "protocol": null
    },
    "aliases": [
      "AC joint bilateral",
      "articulation AC bilatérale",
      "AC joints"
    ]
  },
  {
    "code": "XR_AC_JOINT_LEFT_2V",
    "displayNameEn": "AC joint X-ray left 2 views",
    "displayNameFr": "Radiographie articulation AC gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-3",
    "searchText": "ac joint x-ray left 2 views radiographie articulation ac gauche 2 inc. xr_ac_joint_left_2v xr epaule ac joint left articulation ac gauche",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_AC_JOINT",
      "protocol": null
    },
    "aliases": [
      "AC joint left",
      "articulation AC gauche"
    ]
  },
  {
    "code": "XR_AC_JOINT_RIGHT_2V",
    "displayNameEn": "AC joint X-ray right 2 views",
    "displayNameFr": "Radiographie articulation AC droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-3",
    "searchText": "ac joint x-ray right 2 views radiographie articulation ac droite 2 inc. xr_ac_joint_right_2v xr epaule ac joint right articulation ac droite",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_AC_JOINT",
      "protocol": null
    },
    "aliases": [
      "AC joint right",
      "articulation AC droite"
    ]
  },
  {
    "code": "XR_CLAVICLE_LEFT_2V",
    "displayNameEn": "Clavicle X-ray left 2 views",
    "displayNameFr": "Radiographie clavicule gauche 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-3",
    "searchText": "clavicle x-ray left 2 views radiographie clavicule gauche 2 inc. xr_clavicle_left_2v xr epaule clavicle left clavicule gauche radiographie clavicule gauche",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_CLAVICLE",
      "protocol": null
    },
    "aliases": [
      "clavicle left",
      "clavicule gauche",
      "radiographie clavicule gauche"
    ]
  },
  {
    "code": "XR_CLAVICLE_RIGHT_2V",
    "displayNameEn": "Clavicle X-ray right 2 views",
    "displayNameFr": "Radiographie clavicule droite 2 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-3",
    "searchText": "clavicle x-ray right 2 views radiographie clavicule droite 2 inc. xr_clavicle_right_2v xr epaule clavicle right clavicule droite radiographie clavicule droite",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_CLAVICLE",
      "protocol": null
    },
    "aliases": [
      "clavicle right",
      "clavicule droite",
      "radiographie clavicule droite"
    ]
  },
  {
    "code": "XR_SCAPULA_LEFT",
    "displayNameEn": "Scapula X-ray left",
    "displayNameFr": "Radiographie scapula gauche",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-3",
    "searchText": "scapula x-ray left radiographie scapula gauche xr_scapula_left xr epaule scapula left scapula gauche omoplate gauche",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SCAPULA",
      "protocol": null
    },
    "aliases": [
      "scapula left",
      "scapula gauche",
      "omoplate gauche"
    ]
  },
  {
    "code": "XR_SCAPULA_RIGHT",
    "displayNameEn": "Scapula X-ray right",
    "displayNameFr": "Radiographie scapula droite",
    "legacyModality": "XR",
    "legacyBodyRegion": "EPAULE",
    "implementationBatch": "XR-3",
    "searchText": "scapula x-ray right radiographie scapula droite xr_scapula_right xr epaule scapula right scapula droite omoplate droite",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SHOULDER",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SCAPULA",
      "protocol": null
    },
    "aliases": [
      "scapula right",
      "scapula droite",
      "omoplate droite"
    ]
  },
  {
    "code": "CT_BRAIN_PERFUSION",
    "displayNameEn": "CT brain perfusion",
    "displayNameFr": "TDM perfusion cérébrale",
    "legacyModality": "CT",
    "legacyBodyRegion": "TETE",
    "implementationBatch": "CT-3",
    "searchText": "ct brain perfusion tdm perfusion cérébrale ct_brain_perfusion ct tete brain perfusion ct perfusion cérébrale ct perfusion",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_HEAD",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_CT_BRAIN_PERFUSION"
    },
    "aliases": [
      "brain perfusion CT",
      "perfusion cérébrale",
      "CT perfusion"
    ]
  },
  {
    "code": "CT_FACIAL_WO_CONTRAST",
    "displayNameEn": "CT facial bones without contrast",
    "displayNameFr": "TDM os faciaux sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "VISAGE",
    "implementationBatch": "CT-3",
    "searchText": "ct facial bones without contrast tdm os faciaux sans contraste ct_facial_wo_contrast ct visage facial ct facial bones ct os faciaux",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_FACE",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_FACIAL_BONES",
      "protocol": null
    },
    "aliases": [
      "facial CT",
      "facial bones CT",
      "os faciaux"
    ]
  },
  {
    "code": "CT_MAXILLOFACIAL_WO_CONTRAST",
    "displayNameEn": "CT maxillofacial without contrast",
    "displayNameFr": "TDM maxillo-facial sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "VISAGE",
    "implementationBatch": "CT-3",
    "searchText": "ct maxillofacial without contrast tdm maxillo-facial sans contraste ct_maxillofacial_wo_contrast ct visage maxillofacial ct wo maxillo-facial sans contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_FACE",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_FACIAL_BONES",
      "protocol": null
    },
    "aliases": [
      "maxillofacial CT wo",
      "maxillo-facial sans contraste"
    ]
  },
  {
    "code": "CT_MAXILLOFACIAL_W_IV_CONTRAST",
    "displayNameEn": "CT maxillofacial with IV contrast",
    "displayNameFr": "TDM maxillo-facial avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "VISAGE",
    "implementationBatch": "CT-3",
    "searchText": "ct maxillofacial with iv contrast tdm maxillo-facial avec contraste iv ct_maxillofacial_w_iv_contrast ct visage maxillofacial ct w contrast maxillo-facial avec contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_FACE",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_FACIAL_BONES",
      "protocol": null
    },
    "aliases": [
      "maxillofacial CT w contrast",
      "maxillo-facial avec contraste"
    ]
  },
  {
    "code": "CT_ORBITS_WO_CONTRAST",
    "displayNameEn": "CT orbits without contrast",
    "displayNameFr": "TDM orbites sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "TETE",
    "implementationBatch": "CT-3",
    "searchText": "ct orbits without contrast tdm orbites sans contraste ct_orbits_wo_contrast ct tete orbit ct ct orbits tdm orbites",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_HEAD",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_ORBIT",
      "protocol": null
    },
    "aliases": [
      "orbit CT",
      "CT orbits",
      "TDM orbites"
    ]
  },
  {
    "code": "CT_SINUSES_WO_CONTRAST",
    "displayNameEn": "CT sinuses without contrast",
    "displayNameFr": "TDM sinus sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "SINUS",
    "implementationBatch": "CT-3",
    "searchText": "ct sinuses without contrast tdm sinus sans contraste ct_sinuses_wo_contrast ct sinus sinus ct ct sinuses tdm sinus",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_SINUS",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SINUS",
      "protocol": null
    },
    "aliases": [
      "sinus CT",
      "CT sinuses",
      "TDM sinus"
    ]
  },
  {
    "code": "CT_STN_WO_CONTRAST",
    "displayNameEn": "CT soft tissue neck without contrast",
    "displayNameFr": "TDM parties molles du cou sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "TETE COU",
    "implementationBatch": "CT-3",
    "searchText": "ct soft tissue neck without contrast tdm parties molles du cou sans contraste ct_stn_wo_contrast ct tete cou soft tissue neck ct parties molles du cou",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_HEAD_NECK",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_NECK_SOFT_TISSUE",
      "protocol": null
    },
    "aliases": [
      "soft tissue neck CT",
      "parties molles du cou"
    ]
  },
  {
    "code": "CT_STN_W_IV_CONTRAST",
    "displayNameEn": "CT soft tissue neck with IV contrast",
    "displayNameFr": "TDM parties molles du cou avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "TETE COU",
    "implementationBatch": "CT-3",
    "searchText": "ct soft tissue neck with iv contrast tdm parties molles du cou avec contraste iv ct_stn_w_iv_contrast ct tete cou soft tissue neck ct w contrast cou avec contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_HEAD_NECK",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_NECK_SOFT_TISSUE",
      "protocol": null
    },
    "aliases": [
      "soft tissue neck CT w contrast",
      "cou avec contraste"
    ]
  },
  {
    "code": "CT_STN_W_WO_CONTRAST",
    "displayNameEn": "CT soft tissue neck with and without IV contrast",
    "displayNameFr": "TDM parties molles du cou avec et sans contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "TETE COU",
    "implementationBatch": "CT-3",
    "searchText": "ct soft tissue neck with and without iv contrast tdm parties molles du cou avec et sans contraste iv ct_stn_w_wo_contrast ct tete cou soft tissue neck ct w wo cou avec et sans contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_HEAD_NECK",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_NECK_SOFT_TISSUE",
      "protocol": null
    },
    "aliases": [
      "soft tissue neck CT w wo",
      "cou avec et sans contraste"
    ]
  },
  {
    "code": "CT_TSPINE_WO_CONTRAST",
    "displayNameEn": "CT thoracic spine without contrast",
    "displayNameFr": "TDM rachis thoracique sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "CT-3",
    "searchText": "ct thoracic spine without contrast tdm rachis thoracique sans contraste ct_tspine_wo_contrast ct rachis thoracic spine ct t-spine ct tdm rachis thoracique",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_SPINE_THORACIC",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_THORACIC",
      "protocol": null
    },
    "aliases": [
      "thoracic spine CT",
      "T-spine CT",
      "TDM rachis thoracique"
    ]
  },
  {
    "code": "CT_FOOT_LEFT_WO_CONTRAST",
    "displayNameEn": "CT foot left without contrast",
    "displayNameFr": "TDM pied gauche sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "CT-3",
    "searchText": "ct foot left without contrast tdm pied gauche sans contraste ct_foot_left_wo_contrast ct pied ct foot left tdm pied gauche",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT foot left",
      "TDM pied gauche"
    ]
  },
  {
    "code": "CT_FOOT_RIGHT_WO_CONTRAST",
    "displayNameEn": "CT foot right without contrast",
    "displayNameFr": "TDM pied droit sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "PIED",
    "implementationBatch": "CT-3",
    "searchText": "ct foot right without contrast tdm pied droit sans contraste ct_foot_right_wo_contrast ct pied ct foot right tdm pied droit",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_FOOT",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT foot right",
      "TDM pied droit"
    ]
  },
  {
    "code": "CT_HIP_LEFT_WO_CONTRAST",
    "displayNameEn": "CT hip left without contrast",
    "displayNameFr": "TDM hanche gauche sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "CT-3",
    "searchText": "ct hip left without contrast tdm hanche gauche sans contraste ct_hip_left_wo_contrast ct hanche ct hip left tdm hanche gauche",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT hip left",
      "TDM hanche gauche"
    ]
  },
  {
    "code": "CT_HIP_RIGHT_WO_CONTRAST",
    "displayNameEn": "CT hip right without contrast",
    "displayNameFr": "TDM hanche droite sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "HANCHE",
    "implementationBatch": "CT-3",
    "searchText": "ct hip right without contrast tdm hanche droite sans contraste ct_hip_right_wo_contrast ct hanche ct hip right tdm hanche droite",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_HIP",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT hip right",
      "TDM hanche droite"
    ]
  },
  {
    "code": "CT_KNEE_LEFT_WO_CONTRAST",
    "displayNameEn": "CT knee left without contrast",
    "displayNameFr": "TDM genou gauche sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "CT-3",
    "searchText": "ct knee left without contrast tdm genou gauche sans contraste ct_knee_left_wo_contrast ct genou ct knee left ct knee left tdm genou gauche",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT knee left",
      "ct knee left",
      "TDM genou gauche"
    ]
  },
  {
    "code": "CT_KNEE_RIGHT_WO_CONTRAST",
    "displayNameEn": "CT knee right without contrast",
    "displayNameFr": "TDM genou droit sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "GENOU",
    "implementationBatch": "CT-3",
    "searchText": "ct knee right without contrast tdm genou droit sans contraste ct_knee_right_wo_contrast ct genou ct knee right tdm genou droit",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_KNEE",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT knee right",
      "TDM genou droit"
    ]
  },
  {
    "code": "CT_LOWER_EXTREMITY_LEFT_W_IV_CONTRAST",
    "displayNameEn": "CT lower extremity left with IV contrast",
    "displayNameFr": "TDM membre inférieur gauche avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "CT-3",
    "searchText": "ct lower extremity left with iv contrast tdm membre inférieur gauche avec contraste iv ct_lower_extremity_left_w_iv_contrast ct membre inf ct le left w contrast membre inférieur gauche avec contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT LE left w contrast",
      "membre inférieur gauche avec contraste"
    ]
  },
  {
    "code": "CT_LOWER_EXTREMITY_LEFT_WO_CONTRAST",
    "displayNameEn": "CT lower extremity left without contrast",
    "displayNameFr": "TDM membre inférieur gauche sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "CT-3",
    "searchText": "ct lower extremity left without contrast tdm membre inférieur gauche sans contraste ct_lower_extremity_left_wo_contrast ct membre inf ct le left wo membre inférieur gauche sans contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT LE left wo",
      "membre inférieur gauche sans contraste"
    ]
  },
  {
    "code": "CT_LOWER_EXTREMITY_RIGHT_W_IV_CONTRAST",
    "displayNameEn": "CT lower extremity right with IV contrast",
    "displayNameFr": "TDM membre inférieur droit avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "CT-3",
    "searchText": "ct lower extremity right with iv contrast tdm membre inférieur droit avec contraste iv ct_lower_extremity_right_w_iv_contrast ct membre inf ct le right w contrast membre inférieur droit avec contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT LE right w contrast",
      "membre inférieur droit avec contraste"
    ]
  },
  {
    "code": "CT_LOWER_EXTREMITY_RIGHT_WO_CONTRAST",
    "displayNameEn": "CT lower extremity right without contrast",
    "displayNameFr": "TDM membre inférieur droit sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "MEMBRE INF",
    "implementationBatch": "CT-3",
    "searchText": "ct lower extremity right without contrast tdm membre inférieur droit sans contraste ct_lower_extremity_right_wo_contrast ct membre inf ct le right wo membre inférieur droit sans contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_LOWER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT LE right wo",
      "membre inférieur droit sans contraste"
    ]
  },
  {
    "code": "CT_UPPER_EXTREMITY_LEFT_W_IV_CONTRAST",
    "displayNameEn": "CT upper extremity left with IV contrast",
    "displayNameFr": "TDM membre supérieur gauche avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "CT-3",
    "searchText": "ct upper extremity left with iv contrast tdm membre supérieur gauche avec contraste iv ct_upper_extremity_left_w_iv_contrast ct membre sup ct ue left w contrast membre supérieur gauche avec contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT UE left w contrast",
      "membre supérieur gauche avec contraste"
    ]
  },
  {
    "code": "CT_UPPER_EXTREMITY_LEFT_WO_CONTRAST",
    "displayNameEn": "CT upper extremity left without contrast",
    "displayNameFr": "TDM membre supérieur gauche sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "CT-3",
    "searchText": "ct upper extremity left without contrast tdm membre supérieur gauche sans contraste ct_upper_extremity_left_wo_contrast ct membre sup ct ue left wo membre supérieur gauche sans contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT UE left wo",
      "membre supérieur gauche sans contraste"
    ]
  },
  {
    "code": "CT_UPPER_EXTREMITY_RIGHT_W_IV_CONTRAST",
    "displayNameEn": "CT upper extremity right with IV contrast",
    "displayNameFr": "TDM membre supérieur droit avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "CT-3",
    "searchText": "ct upper extremity right with iv contrast tdm membre supérieur droit avec contraste iv ct_upper_extremity_right_w_iv_contrast ct membre sup ct ue right w contrast membre supérieur droit avec contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT UE right w contrast",
      "membre supérieur droit avec contraste"
    ]
  },
  {
    "code": "CT_UPPER_EXTREMITY_RIGHT_WO_CONTRAST",
    "displayNameEn": "CT upper extremity right without contrast",
    "displayNameFr": "TDM membre supérieur droit sans contraste",
    "legacyModality": "CT",
    "legacyBodyRegion": "MEMBRE SUP",
    "implementationBatch": "CT-3",
    "searchText": "ct upper extremity right without contrast tdm membre supérieur droit sans contraste ct_upper_extremity_right_wo_contrast ct membre sup ct ue right wo membre supérieur droit sans contraste",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_UPPER_EXTREMITY",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT UE right wo",
      "membre supérieur droit sans contraste"
    ]
  }
];
