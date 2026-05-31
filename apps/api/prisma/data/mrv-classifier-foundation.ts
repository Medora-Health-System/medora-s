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
  }
];

export const MRV_CLASSIFIER_DOMAIN_COUNTS = {
  BODY_REGION: 28,
  MODALITY: 4,
  LAB_CATEGORY: 16,
  VIEW_COUNT: 1,
  CONTRAST_TYPE: 2,
} as const;
