/**
 * Phase 2E.4A — Wave 1 imaging catalog (workbook wave=1, W2.2 authorized).
 * Regenerate: node apps/api/prisma/scripts/generate-wave1-imaging-data.mjs
 */

export type Wave1ImagingClassifierTuple = {
  modality: string;
  bodyRegion: string;
  contrastType: string;
  viewCount: string | null;
  laterality: string;
  anatomicSubregion: string | null;
  protocol: string | null;
};

export type Wave1ImagingCatalogSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  legacyModality: string;
  legacyBodyRegion: string;
  implementationBatch: "XR-1" | "CT-1" | "MRI-1";
  searchText: string;
  classifiers: Wave1ImagingClassifierTuple;
  aliases: string[];
};

export const WAVE1_FORBIDDEN_CATALOG_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "DOPPLER_VEIN",
  "US_ABD",
  "CT_CHEST_CTA",
] as const;

export const WAVE1_XR_CHEST_TUPLE_ALIASES = [
  "Chest 1V Decub",
  "Chest Post Intubation",
] as const;

export const WAVE1_IMAGING_BATCH_COUNTS = { xr: 19, ct: 7, mri: 11, total: 37 } as const;

export const HAITI_IMAGING_WAVE1_CATALOG: Wave1ImagingCatalogSeed[] = [
  {
    "code": "XR_ABDOMEN_1V",
    "displayNameEn": "Abdomen X-ray 1 view",
    "displayNameFr": "Radiographie abdomen 1 incidence",
    "legacyModality": "XR",
    "legacyBodyRegion": "ABDOMEN",
    "implementationBatch": "XR-1",
    "searchText": "abdomen x-ray 1 view radiographie abdomen 1 incidence xr_abdomen_1v xr abdomen abdomen 1v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ABDOMEN",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_ONE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Abdomen 1V"
    ]
  },
  {
    "code": "XR_ABDOMEN_2V",
    "displayNameEn": "Abdomen X-ray 2 views",
    "displayNameFr": "Radiographie abdomen 2 incidences",
    "legacyModality": "XR",
    "legacyBodyRegion": "ABDOMEN",
    "implementationBatch": "XR-1",
    "searchText": "abdomen x-ray 2 views radiographie abdomen 2 incidences xr_abdomen_2v xr abdomen abdomen 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ABDOMEN",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "Abdomen 2V"
    ]
  },
  {
    "code": "XR_ABDOMEN_3V_ACUTE",
    "displayNameEn": "Abdomen X-ray 3 views acute series",
    "displayNameFr": "Radiographie abdomen série aiguë 3 inc.",
    "legacyModality": "XR",
    "legacyBodyRegion": "ABDOMEN",
    "implementationBatch": "XR-1",
    "searchText": "abdomen x-ray 3 views acute series radiographie abdomen série aiguë 3 inc. xr_abdomen_3v_acute xr abdomen abdomen 3v acute series",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_ABDOMEN",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": "PROTOCOL_XR_ABDOMEN_ACUTE_SERIES"
    },
    "aliases": [
      "Abdomen 3V Acute Series"
    ]
  },
  {
    "code": "XR_RIBS_LEFT_WITH_CXR",
    "displayNameEn": "Left ribs with chest X-ray",
    "displayNameFr": "Côtes gauches avec thorax",
    "legacyModality": "XR",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "XR-1",
    "searchText": "left ribs with chest x-ray côtes gauches avec thorax xr_ribs_left_with_cxr xr thorax ribs left with cxr",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_RIBS",
      "protocol": null
    },
    "aliases": [
      "Ribs Left with CXR"
    ]
  },
  {
    "code": "XR_RIBS_RIGHT_WITH_CXR",
    "displayNameEn": "Right ribs with chest X-ray",
    "displayNameFr": "Côtes droites avec thorax",
    "legacyModality": "XR",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "XR-1",
    "searchText": "right ribs with chest x-ray côtes droites avec thorax xr_ribs_right_with_cxr xr thorax ribs right with cxr",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_RIBS",
      "protocol": null
    },
    "aliases": [
      "Ribs Right with CXR"
    ]
  },
  {
    "code": "XR_CSPINE_1V_LATERAL",
    "displayNameEn": "C-spine X-ray 1 view lateral",
    "displayNameFr": "Rachis cervical 1 inc. latérale",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS CERVICAL",
    "implementationBatch": "XR-1",
    "searchText": "c-spine x-ray 1 view lateral rachis cervical 1 inc. latérale xr_cspine_1v_lateral xr rachis cervical c-spine 1v lateral",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE_CERVICAL",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_ONE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_CERVICAL",
      "protocol": null
    },
    "aliases": [
      "C-Spine 1V Lateral"
    ]
  },
  {
    "code": "XR_CSPINE_2_3V",
    "displayNameEn": "C-spine X-ray 2–3 views",
    "displayNameFr": "Rachis cervical 2–3 incidences",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS CERVICAL",
    "implementationBatch": "XR-1",
    "searchText": "c-spine x-ray 2–3 views rachis cervical 2–3 incidences xr_cspine_2_3v xr rachis cervical c-spine 2-3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE_CERVICAL",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_CERVICAL",
      "protocol": null
    },
    "aliases": [
      "C-Spine 2-3V"
    ]
  },
  {
    "code": "XR_CSPINE_3V_UPRIGHT",
    "displayNameEn": "C-spine X-ray 3 views upright",
    "displayNameFr": "Rachis cervical 3 inc. debout",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS CERVICAL",
    "implementationBatch": "XR-1",
    "searchText": "c-spine x-ray 3 views upright rachis cervical 3 inc. debout xr_cspine_3v_upright xr rachis cervical c-spine 3v upright",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE_CERVICAL",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_CERVICAL",
      "protocol": "PROTOCOL_XR_CSPINE_UPRIGHT"
    },
    "aliases": [
      "C-Spine 3V Upright"
    ]
  },
  {
    "code": "XR_CSPINE_COMPLETE",
    "displayNameEn": "C-spine X-ray complete",
    "displayNameFr": "Rachis cervical série complète",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS CERVICAL",
    "implementationBatch": "XR-1",
    "searchText": "c-spine x-ray complete rachis cervical série complète xr_cspine_complete xr rachis cervical c-spine complete",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE_CERVICAL",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_COMPLETE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_CERVICAL",
      "protocol": null
    },
    "aliases": [
      "C-Spine Complete"
    ]
  },
  {
    "code": "XR_LSPINE_2V",
    "displayNameEn": "Lumbar spine X-ray 2 views",
    "displayNameFr": "Rachis lombaire 2 incidences",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "XR-1",
    "searchText": "lumbar spine x-ray 2 views rachis lombaire 2 incidences xr_lspine_2v xr rachis l-spine 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": null
    },
    "aliases": [
      "L-Spine 2V"
    ]
  },
  {
    "code": "XR_LSPINE_2V_UPRIGHT",
    "displayNameEn": "Lumbar spine X-ray 2 views upright",
    "displayNameFr": "Rachis lombaire 2 inc. debout",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "XR-1",
    "searchText": "lumbar spine x-ray 2 views upright rachis lombaire 2 inc. debout xr_lspine_2v_upright xr rachis l-spine 2v upright",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": "PROTOCOL_XR_CSPINE_UPRIGHT"
    },
    "aliases": [
      "L-Spine 2V Upright"
    ]
  },
  {
    "code": "XR_LSPINE_3V",
    "displayNameEn": "Lumbar spine X-ray 3 views",
    "displayNameFr": "Rachis lombaire 3 incidences",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "XR-1",
    "searchText": "lumbar spine x-ray 3 views rachis lombaire 3 incidences xr_lspine_3v xr rachis l-spine 3v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": null
    },
    "aliases": [
      "L-Spine 3V"
    ]
  },
  {
    "code": "XR_LSPINE_3V_UPRIGHT",
    "displayNameEn": "Lumbar spine X-ray 3 views upright",
    "displayNameFr": "Rachis lombaire 3 inc. debout",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "XR-1",
    "searchText": "lumbar spine x-ray 3 views upright rachis lombaire 3 inc. debout xr_lspine_3v_upright xr rachis l-spine 3v upright",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": "PROTOCOL_XR_CSPINE_UPRIGHT"
    },
    "aliases": [
      "L-Spine 3V Upright"
    ]
  },
  {
    "code": "XR_TSPINE_2V",
    "displayNameEn": "Thoracic spine X-ray 2 views",
    "displayNameFr": "Rachis thoracique 2 incidences",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS THORACIC",
    "implementationBatch": "XR-1",
    "searchText": "thoracic spine x-ray 2 views rachis thoracique 2 incidences xr_tspine_2v xr rachis thoracic t-spine 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE_THORACIC",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_THORACIC",
      "protocol": null
    },
    "aliases": [
      "T-Spine 2V"
    ]
  },
  {
    "code": "XR_TSPINE_3V_UPRIGHT",
    "displayNameEn": "Thoracic spine X-ray 3 views upright",
    "displayNameFr": "Rachis thoracique 3 inc. debout",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS THORACIC",
    "implementationBatch": "XR-1",
    "searchText": "thoracic spine x-ray 3 views upright rachis thoracique 3 inc. debout xr_tspine_3v_upright xr rachis thoracic t-spine 3v upright",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE_THORACIC",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_THREE",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_THORACIC",
      "protocol": "PROTOCOL_XR_CSPINE_UPRIGHT"
    },
    "aliases": [
      "T-Spine 3V Upright"
    ]
  },
  {
    "code": "XR_THORACOLUMBAR_2V",
    "displayNameEn": "Thoracolumbar spine X-ray 2 views",
    "displayNameFr": "Rachis thoraco-lombaire 2 incidences",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "XR-1",
    "searchText": "thoracolumbar spine x-ray 2 views rachis thoraco-lombaire 2 incidences xr_thoracolumbar_2v xr rachis thoracolumbar spine 2v",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": null
    },
    "aliases": [
      "Thoracolumbar Spine 2V"
    ]
  },
  {
    "code": "XR_SACRUM_COCCYX_2V",
    "displayNameEn": "Sacrum and coccyx X-ray",
    "displayNameFr": "Sacrum et coccyx",
    "legacyModality": "XR",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "XR-1",
    "searchText": "sacrum and coccyx x-ray sacrum et coccyx xr_sacrum_coccyx_2v xr rachis coccyx and sacrum sacrum and coccyx sacrum coccyx",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_SACRUM_COCCYX",
      "protocol": null
    },
    "aliases": [
      "Coccyx and Sacrum",
      "Sacrum and Coccyx",
      "sacrum coccyx"
    ]
  },
  {
    "code": "XR_RIBS_LEFT",
    "displayNameEn": "Left ribs X-ray",
    "displayNameFr": "Radiographie côtes gauches",
    "legacyModality": "XR",
    "legacyBodyRegion": "RIBS",
    "implementationBatch": "XR-1",
    "searchText": "left ribs x-ray radiographie côtes gauches xr_ribs_left xr ribs ribs left",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_RIBS",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_LEFT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_RIBS",
      "protocol": null
    },
    "aliases": [
      "Ribs Left"
    ]
  },
  {
    "code": "XR_RIBS_RIGHT",
    "displayNameEn": "Right ribs X-ray",
    "displayNameFr": "Radiographie côtes droites",
    "legacyModality": "XR",
    "legacyBodyRegion": "RIBS",
    "implementationBatch": "XR-1",
    "searchText": "right ribs x-ray radiographie côtes droites xr_ribs_right xr ribs ribs right",
    "classifiers": {
      "modality": "MODALITY_XR",
      "bodyRegion": "BODY_REGION_RIBS",
      "contrastType": "CONTRAST_TYPE_NONE",
      "viewCount": "VIEW_COUNT_TWO",
      "laterality": "LATERALITY_RIGHT",
      "anatomicSubregion": "ANATOMIC_SUBREGION_RIBS",
      "protocol": null
    },
    "aliases": [
      "Ribs Right"
    ]
  },
  {
    "code": "CT_HEAD_W_CONTRAST",
    "displayNameEn": "CT head with IV contrast",
    "displayNameFr": "TDM tête avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "head",
    "implementationBatch": "CT-1",
    "searchText": "ct head with iv contrast tdm tête avec contraste iv ct_head_w_contrast ct head ct head w iv contrast",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_HEAD",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT Head w IV Contrast"
    ]
  },
  {
    "code": "CT_CHEST_W_IV_CONTRAST",
    "displayNameEn": "CT chest with IV contrast",
    "displayNameFr": "TDM thorax avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "CT-1",
    "searchText": "ct chest with iv contrast tdm thorax avec contraste iv ct_chest_w_iv_contrast ct thorax ct chest w iv contrast",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT Chest w IV Contrast"
    ]
  },
  {
    "code": "CT_CHEST_W_WO_CONTRAST",
    "displayNameEn": "CT chest with and without IV contrast",
    "displayNameFr": "TDM thorax avec et sans contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "THORAX",
    "implementationBatch": "CT-1",
    "searchText": "ct chest with and without iv contrast tdm thorax avec et sans contraste iv ct_chest_w_wo_contrast ct thorax ct chest w&wo iv contrast",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_CHEST",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT Chest w&wo IV Contrast"
    ]
  },
  {
    "code": "CT_ABDOMEN_PELVIS_W_IV_CONTRAST",
    "displayNameEn": "CT abdomen/pelvis with IV contrast",
    "displayNameFr": "TDM abdomen/pelvis avec contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "ABDOMEN/PELVIS",
    "implementationBatch": "CT-1",
    "searchText": "ct abdomen/pelvis with iv contrast tdm abdomen/pelvis avec contraste iv ct_abdomen_pelvis_w_iv_contrast ct abdomen/pelvis ct abdomen/pelvis w iv contrast ct abdomen w iv contrast",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_ABDOMEN_PELVIS",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT Abdomen/Pelvis w IV Contrast",
      "CT Abdomen w IV Contrast"
    ]
  },
  {
    "code": "CT_ABDOMEN_PELVIS_W_WO_CONTRAST",
    "displayNameEn": "CT abdomen/pelvis with and without IV contrast",
    "displayNameFr": "TDM abdomen/pelvis avec et sans contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "ABDOMEN/PELVIS",
    "implementationBatch": "CT-1",
    "searchText": "ct abdomen/pelvis with and without iv contrast tdm abdomen/pelvis avec et sans contraste iv ct_abdomen_pelvis_w_wo_contrast ct abdomen/pelvis ct abdomen/pelvis w&wo iv contrast ct abdomen w&wo iv contrast",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_ABDOMEN_PELVIS",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT Abdomen/Pelvis w&wo IV Contrast",
      "CT Abdomen w&wo IV Contrast"
    ]
  },
  {
    "code": "CT_PELVIS_WO_CONTRAST",
    "displayNameEn": "CT pelvis without IV contrast",
    "displayNameFr": "TDM pelvis sans contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "PELVIS",
    "implementationBatch": "CT-1",
    "searchText": "ct pelvis without iv contrast tdm pelvis sans contraste iv ct_pelvis_wo_contrast ct pelvis ct pelvis wo iv contrast",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_PELVIS",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT Pelvis wo IV Contrast"
    ]
  },
  {
    "code": "CT_PELVIS_W_WO_CONTRAST",
    "displayNameEn": "CT pelvis with and without IV contrast",
    "displayNameFr": "TDM pelvis avec et sans contraste IV",
    "legacyModality": "CT",
    "legacyBodyRegion": "PELVIS",
    "implementationBatch": "CT-1",
    "searchText": "ct pelvis with and without iv contrast tdm pelvis avec et sans contraste iv ct_pelvis_w_wo_contrast ct pelvis ct pelvis w&wo iv contrast",
    "classifiers": {
      "modality": "MODALITY_CT",
      "bodyRegion": "BODY_REGION_PELVIS",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "CT Pelvis w&wo IV Contrast"
    ]
  },
  {
    "code": "MRI_BRAIN_W_CONTRAST",
    "displayNameEn": "MRI brain with contrast",
    "displayNameFr": "IRM cérébrale avec contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "head",
    "implementationBatch": "MRI-1",
    "searchText": "mri brain with contrast irm cérébrale avec contraste mri_brain_w_contrast mri head mri head w contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_HEAD",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Head w Contrast"
    ]
  },
  {
    "code": "MRI_BRAIN_W_WO_CONTRAST",
    "displayNameEn": "MRI brain with and without contrast",
    "displayNameFr": "IRM cérébrale avec et sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "head",
    "implementationBatch": "MRI-1",
    "searchText": "mri brain with and without contrast irm cérébrale avec et sans contraste mri_brain_w_wo_contrast mri head mri head w&wo contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_HEAD",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": null,
      "protocol": null
    },
    "aliases": [
      "MRI Head w&wo Contrast"
    ]
  },
  {
    "code": "MRI_CSPINE_WO_CONTRAST",
    "displayNameEn": "MRI cervical spine without contrast",
    "displayNameFr": "IRM rachis cervical sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS CERVICAL",
    "implementationBatch": "MRI-1",
    "searchText": "mri cervical spine without contrast irm rachis cervical sans contraste mri_cspine_wo_contrast mri rachis cervical mri c-spine wo contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE_CERVICAL",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_CERVICAL",
      "protocol": null
    },
    "aliases": [
      "MRI C-Spine wo Contrast"
    ]
  },
  {
    "code": "MRI_CSPINE_W_CONTRAST",
    "displayNameEn": "MRI cervical spine with contrast",
    "displayNameFr": "IRM rachis cervical avec contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS CERVICAL",
    "implementationBatch": "MRI-1",
    "searchText": "mri cervical spine with contrast irm rachis cervical avec contraste mri_cspine_w_contrast mri rachis cervical mri c-spine w contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE_CERVICAL",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_CERVICAL",
      "protocol": null
    },
    "aliases": [
      "MRI C-Spine w Contrast"
    ]
  },
  {
    "code": "MRI_CSPINE_W_WO_CONTRAST",
    "displayNameEn": "MRI cervical spine with and without contrast",
    "displayNameFr": "IRM rachis cervical avec et sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS CERVICAL",
    "implementationBatch": "MRI-1",
    "searchText": "mri cervical spine with and without contrast irm rachis cervical avec et sans contraste mri_cspine_w_wo_contrast mri rachis cervical mri c-spine w&wo contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE_CERVICAL",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_CERVICAL",
      "protocol": null
    },
    "aliases": [
      "MRI C-Spine w&wo Contrast"
    ]
  },
  {
    "code": "MRI_LSPINE_WO_CONTRAST",
    "displayNameEn": "MRI lumbar spine without contrast",
    "displayNameFr": "IRM rachis lombaire sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "MRI-1",
    "searchText": "mri lumbar spine without contrast irm rachis lombaire sans contraste mri_lspine_wo_contrast mri rachis mri l-spine wo contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": null
    },
    "aliases": [
      "MRI L-Spine wo Contrast"
    ]
  },
  {
    "code": "MRI_LSPINE_W_CONTRAST",
    "displayNameEn": "MRI lumbar spine with contrast",
    "displayNameFr": "IRM rachis lombaire avec contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "MRI-1",
    "searchText": "mri lumbar spine with contrast irm rachis lombaire avec contraste mri_lspine_w_contrast mri rachis mri l-spine w contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": null
    },
    "aliases": [
      "MRI L-Spine w Contrast"
    ]
  },
  {
    "code": "MRI_LSPINE_W_WO_CONTRAST",
    "displayNameEn": "MRI lumbar spine with and without contrast",
    "displayNameFr": "IRM rachis lombaire avec et sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS",
    "implementationBatch": "MRI-1",
    "searchText": "mri lumbar spine with and without contrast irm rachis lombaire avec et sans contraste mri_lspine_w_wo_contrast mri rachis mri l-spine w&wo contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
      "protocol": null
    },
    "aliases": [
      "MRI L-Spine w&wo Contrast"
    ]
  },
  {
    "code": "MRI_TSPINE_WO_CONTRAST",
    "displayNameEn": "MRI thoracic spine without contrast",
    "displayNameFr": "IRM rachis thoracique sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS THORACIC",
    "implementationBatch": "MRI-1",
    "searchText": "mri thoracic spine without contrast irm rachis thoracique sans contraste mri_tspine_wo_contrast mri rachis thoracic mri t-spine wo contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE_THORACIC",
      "contrastType": "CONTRAST_TYPE_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_THORACIC",
      "protocol": null
    },
    "aliases": [
      "MRI T-Spine wo Contrast"
    ]
  },
  {
    "code": "MRI_TSPINE_W_CONTRAST",
    "displayNameEn": "MRI thoracic spine with contrast",
    "displayNameFr": "IRM rachis thoracique avec contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS THORACIC",
    "implementationBatch": "MRI-1",
    "searchText": "mri thoracic spine with contrast irm rachis thoracique avec contraste mri_tspine_w_contrast mri rachis thoracic mri t-spine w contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE_THORACIC",
      "contrastType": "CONTRAST_TYPE_WITH",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_THORACIC",
      "protocol": null
    },
    "aliases": [
      "MRI T-Spine w Contrast"
    ]
  },
  {
    "code": "MRI_TSPINE_W_WO_CONTRAST",
    "displayNameEn": "MRI thoracic spine with and without contrast",
    "displayNameFr": "IRM rachis thoracique avec et sans contraste",
    "legacyModality": "MRI",
    "legacyBodyRegion": "RACHIS THORACIC",
    "implementationBatch": "MRI-1",
    "searchText": "mri thoracic spine with and without contrast irm rachis thoracique avec et sans contraste mri_tspine_w_wo_contrast mri rachis thoracic mri t-spine w&wo contrast",
    "classifiers": {
      "modality": "MODALITY_MRI",
      "bodyRegion": "BODY_REGION_SPINE_THORACIC",
      "contrastType": "CONTRAST_TYPE_WITH_AND_WITHOUT",
      "viewCount": null,
      "laterality": "LATERALITY_UNSPECIFIED",
      "anatomicSubregion": "ANATOMIC_SUBREGION_SPINE_THORACIC",
      "protocol": null
    },
    "aliases": [
      "MRI T-Spine w&wo Contrast"
    ]
  }
];
