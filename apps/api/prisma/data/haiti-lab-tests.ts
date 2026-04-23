/**
 * Haiti lab catalog — stable codes, French labels, offline-friendly search (seed-ready).
 */
export type LabCatalogSeed = {
  code: string;
  displayNameFr: string;
  /** Optional English INN / curated label — set only from reviewed sources (not copied from FR). */
  displayNameEn?: string;
  category: string;
  aliases: string[];
  searchText: string;
  isActive: boolean;
};

export const HAITI_LAB_CATALOG: LabCatalogSeed[] = [
  // HEMATOLOGY
  {
    code: "CBC",
    displayNameFr: "Numération formule sanguine (NFS)",
    displayNameEn: "CBC",
    category: "HEMATOLOGIE",
    aliases: ["CBC", "NFS", "hémogramme"],
    searchText: "cbc nfs hemogramme globules hemoglobine",
    isActive: true,
  },
  {
    code: "HB",
    displayNameFr: "Hémoglobine",
    displayNameEn: "Hemoglobin",
    category: "HEMATOLOGIE",
    aliases: ["hb"],
    searchText: "hemoglobine hb anemie hemoglobin",
    isActive: true,
  },

  // METABOLIC
  {
    code: "GLU",
    displayNameFr: "Glycémie",
    displayNameEn: "Glucose",
    category: "BIOCHIMIE",
    aliases: ["glucose"],
    searchText: "glycemie glucose diabete sucre blood sugar",
    isActive: true,
  },
  {
    code: "HBA1C",
    displayNameFr: "Hémoglobine glyquée (HbA1c)",
    displayNameEn: "HbA1c",
    category: "BIOCHIMIE",
    aliases: ["a1c"],
    searchText: "hba1c diabete controle a1c",
    isActive: true,
  },
  {
    code: "CREAT",
    displayNameFr: "Créatinine",
    displayNameEn: "Creatinine",
    category: "BIOCHIMIE",
    aliases: ["creatinine"],
    searchText: "creatinine rein insuffisance renale kidney",
    isActive: true,
  },
  {
    code: "UREA",
    displayNameFr: "Urée",
    displayNameEn: "Urea",
    category: "BIOCHIMIE",
    aliases: ["uree"],
    searchText: "uree rein azote bun urea",
    isActive: true,
  },

  // ELECTROLYTES
  {
    code: "NA",
    displayNameFr: "Sodium",
    displayNameEn: "Sodium",
    category: "ELECTROLYTES",
    aliases: ["na"],
    searchText: "sodium electrolyte hyponatremie",
    isActive: true,
  },
  {
    code: "K",
    displayNameFr: "Potassium",
    displayNameEn: "Potassium",
    category: "ELECTROLYTES",
    aliases: ["k"],
    searchText: "potassium hyperkaliemie hypokaliemie k",
    isActive: true,
  },

  // LIVER
  {
    code: "AST",
    displayNameFr: "ASAT (AST)",
    displayNameEn: "AST",
    category: "FOIE",
    aliases: ["ast"],
    searchText: "ast foie hepatique transaminase",
    isActive: true,
  },
  {
    code: "ALT",
    displayNameFr: "ALAT (ALT)",
    displayNameEn: "ALT",
    category: "FOIE",
    aliases: ["alt"],
    searchText: "alt foie hepatique transaminase",
    isActive: true,
  },
  {
    code: "BILI",
    displayNameFr: "Bilirubine totale",
    displayNameEn: "Total bilirubin",
    category: "FOIE",
    aliases: ["bilirubine"],
    searchText: "bilirubine ictere bilirubin jaundice",
    isActive: true,
  },

  // LIPIDS
  {
    code: "LIPID",
    displayNameFr: "Bilan lipidique",
    displayNameEn: "Lipid panel",
    category: "CARDIO",
    aliases: ["cholesterol"],
    searchText: "lipide cholesterol triglyceride lipids",
    isActive: true,
  },

  // INFLAMMATION
  {
    code: "CRP",
    displayNameFr: "CRP",
    displayNameEn: "CRP",
    category: "INFLAMMATION",
    aliases: ["crp"],
    searchText: "crp infection inflammation c-reactive",
    isActive: true,
  },
  {
    code: "ESR",
    displayNameFr: "Vitesse de sédimentation (VS)",
    displayNameEn: "ESR",
    category: "INFLAMMATION",
    aliases: ["vs"],
    searchText: "vs inflammation esr sedimentation rate",
    isActive: true,
  },

  // ENDOCRINE
  {
    code: "TSH",
    displayNameFr: "TSH",
    displayNameEn: "TSH",
    category: "ENDOCRINO",
    aliases: ["tsh"],
    searchText: "thyroide tsh thyroid",
    isActive: true,
  },

  // INFECTIOUS (CRITICAL FOR HAITI)
  {
    code: "HIV",
    displayNameFr: "Test VIH",
    displayNameEn: "HIV test",
    category: "INFECTIEUX",
    aliases: ["vih", "hiv"],
    searchText: "vih hiv sida aids",
    isActive: true,
  },
  {
    code: "VDRL",
    displayNameFr: "VDRL (Syphilis)",
    displayNameEn: "VDRL (syphilis)",
    category: "INFECTIEUX",
    aliases: ["syphilis"],
    searchText: "syphilis vdrl",
    isActive: true,
  },
  {
    code: "MALARIA",
    displayNameFr: "Test paludisme",
    displayNameEn: "Malaria test",
    category: "INFECTIEUX",
    aliases: ["malaria"],
    searchText: "paludisme malaria parasite",
    isActive: true,
  },

  // URINE / STOOL
  {
    code: "UA",
    displayNameFr: "Analyse d'urines",
    displayNameEn: "Urinalysis",
    category: "URINAIRE",
    aliases: ["urine"],
    searchText: "urine infection",
    isActive: true,
  },
  {
    code: "CULT_URINE",
    displayNameFr: "ECBU (culture urinaire)",
    displayNameEn: "Urine culture",
    category: "URINAIRE",
    aliases: ["culture urine"],
    searchText: "ecbu infection urinaire urine culture uti",
    isActive: true,
  },
  {
    code: "STOOL",
    displayNameFr: "Coprologie",
    displayNameEn: "Stool studies",
    category: "DIGESTIF",
    aliases: ["stool"],
    searchText: "selles parasite stool ova",
    isActive: true,
  },

  // COAGULATION
  {
    code: "INR",
    displayNameFr: "INR",
    displayNameEn: "INR",
    category: "COAGULATION",
    aliases: ["tp"],
    searchText: "inr coagulation warfarin pt",
    isActive: true,
  },

  // EMERGENCY
  {
    code: "TROP",
    displayNameFr: "Troponine",
    displayNameEn: "Troponin",
    category: "URGENCE",
    aliases: ["troponine"],
    searchText: "troponine infarctus",
    isActive: true,
  },
  {
    code: "DDIMER",
    displayNameFr: "D-dimères",
    displayNameEn: "D-dimer",
    category: "URGENCE",
    aliases: ["ddimer"],
    searchText: "d-dimere embolie d-dimer vte pe",
    isActive: true,
  },

  // --- Expansion Haïti (cliniques / urgences / infectieux courants) ---
  {
    code: "NFS_DIFF",
    displayNameFr: "NFS avec formule leucocytaire",
    displayNameEn: "CBC with differential",
    category: "HEMATOLOGIE",
    aliases: ["formule", "leucocytes"],
    searchText: "nfs formule leucocytes neutrophiles cbc diff wbc",
    isActive: true,
  },
  {
    code: "BMP",
    displayNameFr: "Bilan métabolique (ionogramme + créatinine + glycémie)",
    displayNameEn: "BMP",
    category: "BIOCHIMIE",
    aliases: ["bilan bio", "ionogramme"],
    searchText: "bilan metabolique ionogramme uree glucose creatinine",
    isActive: true,
  },
  {
    code: "HCG_BETA",
    displayNameFr: "β-hCG (grossesse) — sérique",
    displayNameEn: "Beta-hCG (serum)",
    category: "BIOCHIMIE",
    aliases: ["beta hcg", "test grossesse sang"],
    searchText: "beta hcg grossesse serique pregnancy quantitative",
    isActive: true,
  },
  {
    code: "HCG_URINE",
    displayNameFr: "Test de grossesse urinaire",
    displayNameEn: "Urine pregnancy test",
    category: "BIOCHIMIE",
    aliases: ["test urine grossesse"],
    searchText: "grossesse urine hcg pregnancy urine",
    isActive: true,
  },
  {
    code: "GROUPAGE_ABO",
    displayNameFr: "Groupage ABO / Rhésus",
    displayNameEn: "ABO/Rh typing",
    category: "BANQUE_SANG",
    aliases: ["groupage", "abo rh"],
    searchText: "groupe sanguin rhesus transfusion blood type",
    isActive: true,
  },
  {
    code: "TP_INR",
    displayNameFr: "TP / INR",
    displayNameEn: "PT/INR",
    category: "COAGULATION",
    aliases: ["tp inr", "quick"],
    searchText: "tp inr coagulation anticoagulant prothrombin",
    isActive: true,
  },
  {
    code: "TCA",
    displayNameFr: "TCA (aPTT)",
    displayNameEn: "aPTT",
    category: "COAGULATION",
    aliases: ["aptt", "tca"],
    searchText: "tca aptt coagulation ptt heparin",
    isActive: true,
  },
  {
    code: "DENGUE_NS1",
    displayNameFr: "Dengue — antigène NS1",
    displayNameEn: "Dengue NS1 antigen",
    category: "INFECTIEUX",
    aliases: ["ns1 dengue"],
    searchText: "dengue ns1 fièvre hémorragique dengue fever",
    isActive: true,
  },
  {
    code: "TYPHOID_IgM",
    displayNameFr: "Fièvre typhoïde — anticorps (Widal / sérologie)",
    displayNameEn: "Typhoid serology",
    category: "INFECTIEUX",
    aliases: ["widal", "typhoide"],
    searchText: "typhoide widal salmonella typhoid fever",
    isActive: true,
  },
  {
    code: "MALARIA_RDT",
    displayNameFr: "Paludisme — TDR rapide",
    displayNameEn: "Malaria rapid diagnostic test",
    category: "INFECTIEUX",
    aliases: ["tdr paludisme"],
    searchText: "paludisme tdr malaria rapide rdt",
    isActive: true,
  },
  {
    code: "CHIKUNGUNYA",
    displayNameFr: "Chikungunya — sérologie",
    displayNameEn: "Chikungunya serology",
    category: "INFECTIEUX",
    aliases: ["chik"],
    searchText: "chikungunya arbovirose",
    isActive: true,
  },
  {
    code: "HEP_B_RAPID",
    displayNameFr: "Hépatite B — test rapide / Ag HBs",
    displayNameEn: "Hepatitis B rapid antigen (HBsAg)",
    category: "INFECTIEUX",
    aliases: ["hbsag"],
    searchText: "hepatite b hbsag hepatitis b surface antigen",
    isActive: true,
  },
  {
    code: "HEP_C_AB",
    displayNameFr: "Hépatite C — anticorps",
    displayNameEn: "Hepatitis C antibody",
    category: "INFECTIEUX",
    aliases: ["anti hcv"],
    searchText: "hepatite c vhc hcv anti-hcv",
    isActive: true,
  },
  {
    code: "LACTATE",
    displayNameFr: "Lactates (lactacidemie)",
    displayNameEn: "Lactate",
    category: "URGENCE",
    aliases: ["lactate"],
    searchText: "lactate choc sepsis lactic acid",
    isActive: true,
  },
  {
    code: "PROCALCITONIN",
    displayNameFr: "Procalcitonine (PCT)",
    displayNameEn: "Procalcitonin",
    category: "URGENCE",
    aliases: ["pct"],
    searchText: "procalcitonine infection bacterienne pct sepsis",
    isActive: true,
  },
];

/** @deprecated Utiliser `HAITI_LAB_CATALOG` */
export const HAITI_LAB_TESTS = HAITI_LAB_CATALOG;

/** @deprecated Utiliser `LabCatalogSeed` */
export type HaitiLabTestSeed = LabCatalogSeed;
