/**
 * Phase 2B.2 — MRV classifier seed manifest (Haiti foundation slice).
 */
export type MrvClassifierSeedEntry = {
  domain: string;
  code: string;
  sortPriority: number;
  labels: { fr: string; en: string };
  aliases: string[];
};

export const MRV_CLASSIFIER_FOUNDATION: MrvClassifierSeedEntry[] = [
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_ABDOMEN",
    "sortPriority": 100,
    "labels": {
      "fr": "Abdomen",
      "en": "Abdomen"
    },
    "aliases": [
      "ABDOMEN"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_ABDOMEN_PELVIS",
    "sortPriority": 110,
    "labels": {
      "fr": "Abdomen / pelvis",
      "en": "Abdomen / pelvis"
    },
    "aliases": [
      "ABDOMEN/PELVIS"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_ABDOMEN_RUQ",
    "sortPriority": 120,
    "labels": {
      "fr": "Abdomen (hypochondre droit)",
      "en": "RUQ abdomen"
    },
    "aliases": [
      "abdomen_ruq"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_ANKLE",
    "sortPriority": 130,
    "labels": {
      "fr": "Cheville",
      "en": "Ankle"
    },
    "aliases": [
      "CHEVILLE"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_ARM",
    "sortPriority": 140,
    "labels": {
      "fr": "Bras",
      "en": "Arm"
    },
    "aliases": [
      "BRAS"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_CHEST",
    "sortPriority": 150,
    "labels": {
      "fr": "Thorax",
      "en": "Chest"
    },
    "aliases": [
      "THORAX"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_CHEST_ABDOMEN_PELVIS",
    "sortPriority": 160,
    "labels": {
      "fr": "Thorax / abdomen / pelvis",
      "en": "Chest / abdomen / pelvis"
    },
    "aliases": [
      "chest_abdomen_pelvis"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_ELBOW",
    "sortPriority": 170,
    "labels": {
      "fr": "Coude",
      "en": "Elbow"
    },
    "aliases": [
      "COUDE"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_FOOT",
    "sortPriority": 180,
    "labels": {
      "fr": "Pied",
      "en": "Foot"
    },
    "aliases": [
      "PIED"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_FOREARM",
    "sortPriority": 190,
    "labels": {
      "fr": "Avant-bras",
      "en": "Forearm"
    },
    "aliases": [
      "AVANT-BRAS"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_HAND",
    "sortPriority": 200,
    "labels": {
      "fr": "Main",
      "en": "Hand"
    },
    "aliases": [
      "MAIN"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_HEAD",
    "sortPriority": 210,
    "labels": {
      "fr": "Tête",
      "en": "Head"
    },
    "aliases": [
      "head",
      "CERVEAU"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_HEAD_NECK",
    "sortPriority": 220,
    "labels": {
      "fr": "Tête / cou",
      "en": "Head / neck"
    },
    "aliases": [
      "TETE/COU"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_HIP",
    "sortPriority": 230,
    "labels": {
      "fr": "Hanche",
      "en": "Hip"
    },
    "aliases": [
      "HANCHE"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_KIDNEY",
    "sortPriority": 240,
    "labels": {
      "fr": "Rein",
      "en": "Kidney"
    },
    "aliases": [
      "REIN"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_KNEE",
    "sortPriority": 250,
    "labels": {
      "fr": "Genou",
      "en": "Knee"
    },
    "aliases": [
      "GENOU"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_LEG",
    "sortPriority": 260,
    "labels": {
      "fr": "Jambe",
      "en": "Leg"
    },
    "aliases": [
      "JAMBE"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_LOWER_EXTREMITY",
    "sortPriority": 270,
    "labels": {
      "fr": "Membres inférieurs",
      "en": "Lower extremity"
    },
    "aliases": [
      "MEMBRES INFERIEURS"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_OBSTETRICAL",
    "sortPriority": 280,
    "labels": {
      "fr": "Obstétrical",
      "en": "Obstetrical"
    },
    "aliases": [
      "OBSTETRICAL"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_PELVIS",
    "sortPriority": 290,
    "labels": {
      "fr": "Bassin",
      "en": "Pelvis"
    },
    "aliases": [
      "BASSIN",
      "PELVIS"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_SCROTUM",
    "sortPriority": 300,
    "labels": {
      "fr": "Scrotum",
      "en": "Scrotum"
    },
    "aliases": [
      "scrotum"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_SHOULDER",
    "sortPriority": 310,
    "labels": {
      "fr": "Épaule",
      "en": "Shoulder"
    },
    "aliases": [
      "EPAULE"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_SOFT_TISSUE",
    "sortPriority": 320,
    "labels": {
      "fr": "Tissus mous",
      "en": "Soft tissue"
    },
    "aliases": [
      "MUCS"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_SPINE",
    "sortPriority": 330,
    "labels": {
      "fr": "Rachis",
      "en": "Spine"
    },
    "aliases": [
      "RACHIS"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_SPINE_CERVICAL",
    "sortPriority": 340,
    "labels": {
      "fr": "Rachis cervical",
      "en": "Cervical spine"
    },
    "aliases": [
      "RACHIS CERVICAL"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_THIGH",
    "sortPriority": 350,
    "labels": {
      "fr": "Cuisse",
      "en": "Thigh"
    },
    "aliases": [
      "CUISSE"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_VASCULAR",
    "sortPriority": 360,
    "labels": {
      "fr": "Vasculaire",
      "en": "Vascular"
    },
    "aliases": [
      "VASCULAIRE"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_WRIST",
    "sortPriority": 370,
    "labels": {
      "fr": "Poignet",
      "en": "Wrist"
    },
    "aliases": [
      "POIGNET"
    ]
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_BREAST",
    "sortPriority": 380,
    "labels": {
      "fr": "Sein",
      "en": "Breast"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_THYROID",
    "sortPriority": 390,
    "labels": {
      "fr": "Thyroïde",
      "en": "Thyroid"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_BLADDER",
    "sortPriority": 400,
    "labels": {
      "fr": "Vessie",
      "en": "Bladder"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_GROIN",
    "sortPriority": 410,
    "labels": {
      "fr": "Aine",
      "en": "Groin"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_AXILLA",
    "sortPriority": 420,
    "labels": {
      "fr": "Aisselle",
      "en": "Axilla"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_AORTA",
    "sortPriority": 430,
    "labels": {
      "fr": "Aorte",
      "en": "Aorta"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_UPPER_EXTREMITY",
    "sortPriority": 440,
    "labels": {
      "fr": "Membre supérieur",
      "en": "Upper extremity"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_NECK",
    "sortPriority": 450,
    "labels": {
      "fr": "Cou",
      "en": "Neck"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_FACE",
    "sortPriority": 460,
    "labels": {
      "fr": "Face",
      "en": "Face"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_SINUS",
    "sortPriority": 470,
    "labels": {
      "fr": "Sinus",
      "en": "Sinuses"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_RIBS",
    "sortPriority": 480,
    "labels": {
      "fr": "Côtes",
      "en": "Ribs"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_STERNUM",
    "sortPriority": 490,
    "labels": {
      "fr": "Sternum",
      "en": "Sternum"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_SPINE_THORACIC",
    "sortPriority": 500,
    "labels": {
      "fr": "Rachis thoracique",
      "en": "Thoracic spine"
    },
    "aliases": []
  },
  {
    "domain": "BODY_REGION",
    "code": "BODY_REGION_HEPATOBILIARY",
    "sortPriority": 510,
    "labels": {
      "fr": "Hépatobiliaire",
      "en": "Hepatobiliary"
    },
    "aliases": []
  },
  {
    "domain": "MODALITY",
    "code": "MODALITY_XR",
    "sortPriority": 10,
    "labels": {
      "fr": "Radiographie",
      "en": "X-ray"
    },
    "aliases": [
      "XR"
    ]
  },
  {
    "domain": "MODALITY",
    "code": "MODALITY_US",
    "sortPriority": 20,
    "labels": {
      "fr": "Échographie",
      "en": "Ultrasound"
    },
    "aliases": [
      "US"
    ]
  },
  {
    "domain": "MODALITY",
    "code": "MODALITY_CT",
    "sortPriority": 30,
    "labels": {
      "fr": "Tomodensitométrie",
      "en": "CT"
    },
    "aliases": [
      "CT"
    ]
  },
  {
    "domain": "MODALITY",
    "code": "MODALITY_MRI",
    "sortPriority": 40,
    "labels": {
      "fr": "IRM",
      "en": "MRI"
    },
    "aliases": [
      "MRI"
    ]
  },
  {
    "domain": "MODALITY",
    "code": "MODALITY_CTA",
    "sortPriority": 50,
    "labels": {
      "fr": "Angioscanner",
      "en": "CT angiography"
    },
    "aliases": [
      "CTA"
    ]
  },
  {
    "domain": "MODALITY",
    "code": "MODALITY_MRA",
    "sortPriority": 60,
    "labels": {
      "fr": "ARM",
      "en": "MR angiography"
    },
    "aliases": [
      "MRA"
    ]
  },
  {
    "domain": "MODALITY",
    "code": "MODALITY_NM",
    "sortPriority": 70,
    "labels": {
      "fr": "Médecine nucléaire",
      "en": "Nuclear medicine"
    },
    "aliases": [
      "NM"
    ]
  },
  {
    "domain": "MODALITY",
    "code": "MODALITY_FL",
    "sortPriority": 80,
    "labels": {
      "fr": "Fluoroscopie",
      "en": "Fluoroscopy"
    },
    "aliases": [
      "FL"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_BLOOD_BANK",
    "sortPriority": 500,
    "labels": {
      "fr": "Banque de sang",
      "en": "Blood bank"
    },
    "aliases": [
      "BANQUE_SANG"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_BLOOD_GAS",
    "sortPriority": 510,
    "labels": {
      "fr": "Gaz sanguins",
      "en": "Blood gas"
    },
    "aliases": [
      "GAZ_SANGUINS"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_CARDIAC",
    "sortPriority": 520,
    "labels": {
      "fr": "Cardiaque",
      "en": "Cardiac"
    },
    "aliases": [
      "CARDIO",
      "CARDIAQUE"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_CHEMISTRY",
    "sortPriority": 530,
    "labels": {
      "fr": "Biochimie",
      "en": "Chemistry"
    },
    "aliases": [
      "BIOCHIMIE"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_COAGULATION",
    "sortPriority": 540,
    "labels": {
      "fr": "Coagulation",
      "en": "Coagulation"
    },
    "aliases": [
      "COAGULATION"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_ELECTROLYTES",
    "sortPriority": 550,
    "labels": {
      "fr": "Électrolytes",
      "en": "Electrolytes"
    },
    "aliases": [
      "ELECTROLYTES"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_EMERGENCY",
    "sortPriority": 560,
    "labels": {
      "fr": "Urgence",
      "en": "Emergency"
    },
    "aliases": [
      "URGENCE"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_ENDOCRINE",
    "sortPriority": 570,
    "labels": {
      "fr": "Endocrino",
      "en": "Endocrine"
    },
    "aliases": [
      "ENDOCRINO"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_GI",
    "sortPriority": 580,
    "labels": {
      "fr": "Digestif",
      "en": "Gastrointestinal"
    },
    "aliases": [
      "DIGESTIF"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_HEMATOLOGY",
    "sortPriority": 590,
    "labels": {
      "fr": "Hématologie",
      "en": "Hematology"
    },
    "aliases": [
      "HEMATOLOGIE"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_HEPATIC",
    "sortPriority": 600,
    "labels": {
      "fr": "Foie",
      "en": "Hepatic"
    },
    "aliases": [
      "FOIE"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_INFECTIOUS",
    "sortPriority": 610,
    "labels": {
      "fr": "Infectieux",
      "en": "Infectious disease"
    },
    "aliases": [
      "INFECTIEUX"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_INFLAMMATION",
    "sortPriority": 620,
    "labels": {
      "fr": "Inflammation",
      "en": "Inflammation"
    },
    "aliases": [
      "INFLAMMATION"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_MICROBIOLOGY",
    "sortPriority": 630,
    "labels": {
      "fr": "Microbiologie",
      "en": "Microbiology"
    },
    "aliases": [
      "MICROBIOLOGIE"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_TOXICOLOGY",
    "sortPriority": 640,
    "labels": {
      "fr": "Toxicologie",
      "en": "Toxicology"
    },
    "aliases": [
      "TOXICOLOGIE"
    ]
  },
  {
    "domain": "LAB_CATEGORY",
    "code": "LAB_CATEGORY_URINE",
    "sortPriority": 650,
    "labels": {
      "fr": "Urinaire",
      "en": "Urine"
    },
    "aliases": [
      "URINAIRE"
    ]
  },
  {
    "domain": "VIEW_COUNT",
    "code": "VIEW_COUNT_TWO",
    "sortPriority": 700,
    "labels": {
      "fr": "Deux incidences",
      "en": "Two views"
    },
    "aliases": [
      "2V"
    ]
  },
  {
    "domain": "VIEW_COUNT",
    "code": "VIEW_COUNT_ONE",
    "sortPriority": 690,
    "labels": {
      "fr": "Une incidence",
      "en": "One view"
    },
    "aliases": [
      "1V"
    ]
  },
  {
    "domain": "VIEW_COUNT",
    "code": "VIEW_COUNT_THREE",
    "sortPriority": 710,
    "labels": {
      "fr": "Trois incidences",
      "en": "Three views"
    },
    "aliases": [
      "3V"
    ]
  },
  {
    "domain": "VIEW_COUNT",
    "code": "VIEW_COUNT_FOUR",
    "sortPriority": 720,
    "labels": {
      "fr": "Quatre incidences",
      "en": "Four views"
    },
    "aliases": [
      "4V"
    ]
  },
  {
    "domain": "VIEW_COUNT",
    "code": "VIEW_COUNT_COMPLETE",
    "sortPriority": 730,
    "labels": {
      "fr": "Série complète",
      "en": "Complete series"
    },
    "aliases": [
      "COMPLETE"
    ]
  },
  {
    "domain": "VIEW_COUNT",
    "code": "VIEW_COUNT_UNSPECIFIED",
    "sortPriority": 740,
    "labels": {
      "fr": "Nombre d'incidences non précisé",
      "en": "Unspecified view count"
    },
    "aliases": []
  },
  {
    "domain": "CONTRAST_TYPE",
    "code": "CONTRAST_TYPE_WITHOUT",
    "sortPriority": 800,
    "labels": {
      "fr": "Sans produit de contraste",
      "en": "Without contrast"
    },
    "aliases": []
  },
  {
    "domain": "CONTRAST_TYPE",
    "code": "CONTRAST_TYPE_ANGIOGRAPHIC",
    "sortPriority": 810,
    "labels": {
      "fr": "Angiographie / CTA",
      "en": "Angiographic / CTA"
    },
    "aliases": []
  },
  {
    "domain": "CONTRAST_TYPE",
    "code": "CONTRAST_TYPE_WITH",
    "sortPriority": 790,
    "labels": {
      "fr": "Avec contraste",
      "en": "With contrast"
    },
    "aliases": []
  },
  {
    "domain": "CONTRAST_TYPE",
    "code": "CONTRAST_TYPE_WITH_AND_WITHOUT",
    "sortPriority": 805,
    "labels": {
      "fr": "Avec et sans contraste",
      "en": "With and without contrast"
    },
    "aliases": []
  },
  {
    "domain": "CONTRAST_TYPE",
    "code": "CONTRAST_TYPE_NONE",
    "sortPriority": 820,
    "labels": {
      "fr": "Aucun",
      "en": "None (non-contrast modality)"
    },
    "aliases": []
  },
  {
    "domain": "LATERALITY",
    "code": "LATERALITY_LEFT",
    "sortPriority": 900,
    "labels": {
      "fr": "Gauche",
      "en": "Left"
    },
    "aliases": []
  },
  {
    "domain": "LATERALITY",
    "code": "LATERALITY_RIGHT",
    "sortPriority": 910,
    "labels": {
      "fr": "Droit",
      "en": "Right"
    },
    "aliases": []
  },
  {
    "domain": "LATERALITY",
    "code": "LATERALITY_BILATERAL",
    "sortPriority": 920,
    "labels": {
      "fr": "Bilatéral",
      "en": "Bilateral"
    },
    "aliases": []
  },
  {
    "domain": "LATERALITY",
    "code": "LATERALITY_UNSPECIFIED",
    "sortPriority": 930,
    "labels": {
      "fr": "Non précisé",
      "en": "Unspecified"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SPINE_CERVICAL",
    "sortPriority": 1000,
    "labels": {
      "fr": "Rachis cervical",
      "en": "Cervical spine"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SPINE_THORACIC",
    "sortPriority": 1010,
    "labels": {
      "fr": "Rachis thoracique",
      "en": "Thoracic spine"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SPINE_LUMBAR",
    "sortPriority": 1020,
    "labels": {
      "fr": "Rachis lombaire",
      "en": "Lumbar spine"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SPINE_SACRUM_COCCYX",
    "sortPriority": 1030,
    "labels": {
      "fr": "Sacrum / coccyx",
      "en": "Sacrum / coccyx"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SPINE_THORACOLUMBAR",
    "sortPriority": 1040,
    "labels": {
      "fr": "Rachis thoraco-lombaire",
      "en": "Thoracolumbar spine"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_ORBIT",
    "sortPriority": 1050,
    "labels": {
      "fr": "Orbite",
      "en": "Orbit"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SINUS",
    "sortPriority": 1060,
    "labels": {
      "fr": "Sinus",
      "en": "Sinus"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SKULL",
    "sortPriority": 1070,
    "labels": {
      "fr": "Crâne",
      "en": "Skull"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_FACIAL_BONES",
    "sortPriority": 1080,
    "labels": {
      "fr": "Os de la face",
      "en": "Facial bones"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_MANDIBLE",
    "sortPriority": 1090,
    "labels": {
      "fr": "Mandibule",
      "en": "Mandible"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_NASAL_BONES",
    "sortPriority": 1100,
    "labels": {
      "fr": "Os nasaux",
      "en": "Nasal bones"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_TMJ",
    "sortPriority": 1110,
    "labels": {
      "fr": "ATM",
      "en": "TMJ"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_NECK_SOFT_TISSUE",
    "sortPriority": 1120,
    "labels": {
      "fr": "Tissus mous du cou",
      "en": "Neck soft tissue"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_RIBS",
    "sortPriority": 1130,
    "labels": {
      "fr": "Côtes",
      "en": "Ribs"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_STERNUM",
    "sortPriority": 1140,
    "labels": {
      "fr": "Sternum",
      "en": "Sternum"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_CLAVICLE",
    "sortPriority": 1150,
    "labels": {
      "fr": "Clavicule",
      "en": "Clavicle"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SCAPULA",
    "sortPriority": 1160,
    "labels": {
      "fr": "Omoplate",
      "en": "Scapula"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_AC_JOINT",
    "sortPriority": 1170,
    "labels": {
      "fr": "Articulation acromio-claviculaire",
      "en": "AC joint"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_FINGER",
    "sortPriority": 1180,
    "labels": {
      "fr": "Doigt",
      "en": "Finger"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_TOE",
    "sortPriority": 1190,
    "labels": {
      "fr": "Orteil",
      "en": "Toe"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_CALCANEUS",
    "sortPriority": 1200,
    "labels": {
      "fr": "Calcanéum",
      "en": "Calcaneus"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_PANOREX",
    "sortPriority": 1210,
    "labels": {
      "fr": "Panorex",
      "en": "Panorex"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_AORTA",
    "sortPriority": 1220,
    "labels": {
      "fr": "Aorte",
      "en": "Aorta"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_CAROTID",
    "sortPriority": 1230,
    "labels": {
      "fr": "Carotide",
      "en": "Carotid"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_CIRCLE_OF_WILLIS",
    "sortPriority": 1240,
    "labels": {
      "fr": "Polygone de Willis",
      "en": "Circle of Willis"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_SELLA",
    "sortPriority": 1250,
    "labels": {
      "fr": "Selle turcique",
      "en": "Sella"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_BILIARY",
    "sortPriority": 1260,
    "labels": {
      "fr": "Voies biliaires",
      "en": "Biliary"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_UPPER_EXTREMITY_WHOLE",
    "sortPriority": 1270,
    "labels": {
      "fr": "Membre supérieur entier",
      "en": "Whole upper extremity"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_LOWER_EXTREMITY_WHOLE",
    "sortPriority": 1280,
    "labels": {
      "fr": "Membre inférieur entier",
      "en": "Whole lower extremity"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_INFANT_WHOLE_BODY",
    "sortPriority": 1290,
    "labels": {
      "fr": "Corps entier nourrisson",
      "en": "Infant whole body"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_INFANT_EXTREMITY",
    "sortPriority": 1300,
    "labels": {
      "fr": "Extrémité nourrisson",
      "en": "Infant extremity"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_BREAST",
    "sortPriority": 1310,
    "labels": {
      "fr": "Sein",
      "en": "Breast"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_THYROID",
    "sortPriority": 1320,
    "labels": {
      "fr": "Thyroïde",
      "en": "Thyroid"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_BLADDER",
    "sortPriority": 1330,
    "labels": {
      "fr": "Vessie",
      "en": "Bladder"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_GROIN",
    "sortPriority": 1340,
    "labels": {
      "fr": "Aine",
      "en": "Groin"
    },
    "aliases": []
  },
  {
    "domain": "ANATOMIC_SUBREGION",
    "code": "ANATOMIC_SUBREGION_AXILLA",
    "sortPriority": 1350,
    "labels": {
      "fr": "Aisselle",
      "en": "Axilla"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_XR_CHEST_POST_INTUBATION",
    "sortPriority": 2000,
    "labels": {
      "fr": "Rx thorax post-intubation",
      "en": "X-ray chest post-intubation"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_XR_CHEST_DECUBITUS",
    "sortPriority": 2010,
    "labels": {
      "fr": "Rx thorax décubitus",
      "en": "X-ray chest decubitus"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_XR_KNEE_SUNRISE",
    "sortPriority": 2020,
    "labels": {
      "fr": "Rx genou sunrise",
      "en": "X-ray knee sunrise"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_XR_CSPINE_UPRIGHT",
    "sortPriority": 2030,
    "labels": {
      "fr": "Rx rachis cervical debout",
      "en": "X-ray cervical spine upright"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_XR_ABDOMEN_ACUTE_SERIES",
    "sortPriority": 2040,
    "labels": {
      "fr": "Rx abdomen série aiguë",
      "en": "X-ray abdomen acute series"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CT_CAP_TRAUMA",
    "sortPriority": 2050,
    "labels": {
      "fr": "TDM thorax/abdomen/pelvis traumatique",
      "en": "CT chest abdomen pelvis trauma"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CT_CHEST_HR",
    "sortPriority": 2060,
    "labels": {
      "fr": "TDM thorax haute résolution",
      "en": "CT chest high resolution"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CT_BRAIN_PERFUSION",
    "sortPriority": 2070,
    "labels": {
      "fr": "TDM perfusion cérébrale",
      "en": "CT brain perfusion"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CTA_CHEST_STANDARD",
    "sortPriority": 2080,
    "labels": {
      "fr": "Angioscanner thorax standard",
      "en": "CTA chest standard"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT",
    "sortPriority": 2090,
    "labels": {
      "fr": "Angioscanner thorax triple exclusion",
      "en": "CTA chest triple rule out"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CTA_CHEST_RECONSTRUCTION",
    "sortPriority": 2100,
    "labels": {
      "fr": "Angioscanner thorax reconstruction",
      "en": "CTA chest reconstruction"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CTA_ABDOMINAL_AORTA",
    "sortPriority": 2110,
    "labels": {
      "fr": "Angioscanner aorte abdominale",
      "en": "CTA abdominal aorta"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CTA_ABDOMINAL_AORTA_RUNOFF",
    "sortPriority": 2120,
    "labels": {
      "fr": "Angioscanner aorte abdominale runoff",
      "en": "CTA abdominal aorta runoff"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CTA_HEAD",
    "sortPriority": 2130,
    "labels": {
      "fr": "Angioscanner tête",
      "en": "CTA head"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CTA_COW",
    "sortPriority": 2140,
    "labels": {
      "fr": "Angioscanner polygone de Willis",
      "en": "CTA circle of Willis"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_CTA_CAROTID",
    "sortPriority": 2150,
    "labels": {
      "fr": "Angioscanner carotides",
      "en": "CTA carotid"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_FAST",
    "sortPriority": 2160,
    "labels": {
      "fr": "Échographie FAST",
      "en": "Ultrasound FAST"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_OB_FIRST_TRIMESTER",
    "sortPriority": 2170,
    "labels": {
      "fr": "Échographie obstétricale 1er trimestre",
      "en": "Ultrasound OB first trimester"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_OB_FIRST_TRIMESTER_LIMITED",
    "sortPriority": 2180,
    "labels": {
      "fr": "Échographie obstétricale 1er trimestre limitée",
      "en": "Ultrasound OB first trimester limited"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_OB_FIRST_TRIMESTER_TV",
    "sortPriority": 2190,
    "labels": {
      "fr": "Échographie obstétricale 1er trimestre transvaginale",
      "en": "Ultrasound OB first trimester transvaginal"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_OB_LATE_TRIMESTER",
    "sortPriority": 2200,
    "labels": {
      "fr": "Échographie obstétricale trimestre tardif",
      "en": "Ultrasound OB late trimester"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_OB_LATE_TRIMESTER_LIMITED",
    "sortPriority": 2210,
    "labels": {
      "fr": "Échographie obstétricale trimestre tardif limitée",
      "en": "Ultrasound OB late trimester limited"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_OB_LATE_TRIMESTER_PORTABLE",
    "sortPriority": 2220,
    "labels": {
      "fr": "Échographie obstétricale trimestre tardif portable",
      "en": "Ultrasound OB late trimester portable"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_OB_BPP",
    "sortPriority": 2230,
    "labels": {
      "fr": "Échographie obstétricale profil biophysique",
      "en": "Ultrasound OB biophysical profile"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_DOPPLER_VENOUS",
    "sortPriority": 2240,
    "labels": {
      "fr": "Écho Doppler veineux",
      "en": "Ultrasound venous Doppler"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_DOPPLER_ARTERIAL",
    "sortPriority": 2250,
    "labels": {
      "fr": "Écho Doppler artériel",
      "en": "Ultrasound arterial Doppler"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_PELVIS_TRANSVAGINAL",
    "sortPriority": 2260,
    "labels": {
      "fr": "Échographie pelvienne transvaginale",
      "en": "Ultrasound pelvis transvaginal"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_PELVIS_DOPPLER",
    "sortPriority": 2270,
    "labels": {
      "fr": "Échographie pelvienne Doppler",
      "en": "Ultrasound pelvis Doppler"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_ABDOMEN_LIMITED",
    "sortPriority": 2280,
    "labels": {
      "fr": "Échographie abdomen limitée",
      "en": "Ultrasound abdomen limited"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_US_NECK_THYROID",
    "sortPriority": 2290,
    "labels": {
      "fr": "Échographie cou thyroïde",
      "en": "Ultrasound neck thyroid"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_MRI_CHOLANGIOGRAM",
    "sortPriority": 2300,
    "labels": {
      "fr": "IRM cholangiogramme",
      "en": "MRI cholangiogram"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_NM_HIDA",
    "sortPriority": 2310,
    "labels": {
      "fr": "Médecine nucléaire HIDA",
      "en": "Nuclear medicine HIDA"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_NM_VQ_PERFUSION",
    "sortPriority": 2320,
    "labels": {
      "fr": "Médecine nucléaire VQ perfusion",
      "en": "Nuclear medicine VQ perfusion"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_NM_VQ_VENTILATION",
    "sortPriority": 2330,
    "labels": {
      "fr": "Médecine nucléaire VQ ventilation",
      "en": "Nuclear medicine VQ ventilation"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_NM_VQ_COMBINED",
    "sortPriority": 2340,
    "labels": {
      "fr": "Médecine nucléaire VQ combiné",
      "en": "Nuclear medicine VQ combined"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_NM_GALLBLADDER_EMPTYING",
    "sortPriority": 2350,
    "labels": {
      "fr": "Médecine nucléaire vidange vésiculaire",
      "en": "Nuclear medicine gallbladder emptying"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_FL_ESOPHAGRAM",
    "sortPriority": 2360,
    "labels": {
      "fr": "Fluoroscopie œsophagogramme",
      "en": "Fluoroscopy esophagram"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_FL_TUBE_PLACEMENT",
    "sortPriority": 2370,
    "labels": {
      "fr": "Fluoroscopie placement de sonde",
      "en": "Fluoroscopy tube placement"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_FL_LINE_PLACEMENT",
    "sortPriority": 2380,
    "labels": {
      "fr": "Fluoroscopie placement de ligne",
      "en": "Fluoroscopy line placement"
    },
    "aliases": []
  },
  {
    "domain": "PROTOCOL",
    "code": "PROTOCOL_FL_LUMBAR_PUNCTURE",
    "sortPriority": 2390,
    "labels": {
      "fr": "Fluoroscopie ponction lombaire",
      "en": "Fluoroscopy lumbar puncture"
    },
    "aliases": []
  }
];

export const MRV_CLASSIFIER_DOMAIN_COUNTS = {
  BODY_REGION: 42,
  MODALITY: 8,
  LAB_CATEGORY: 16,
  VIEW_COUNT: 6,
  CONTRAST_TYPE: 5,
  LATERALITY: 4,
  ANATOMIC_SUBREGION: 36,
  PROTOCOL: 40,
} as const;
