/**
 * Haiti lab catalog — stable codes, French labels, offline-friendly search (seed-ready).
 */
export type LabCatalogSeed = {
  code: string;
  displayNameFr: string;
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
    category: "HEMATOLOGIE",
    aliases: ["CBC", "NFS", "hémogramme"],
    searchText: "cbc nfs hemogramme globules hemoglobine",
    isActive: true,
  },
  {
    code: "HB",
    displayNameFr: "Hémoglobine",
    category: "HEMATOLOGIE",
    aliases: ["hb"],
    searchText: "hemoglobine hb anemie",
    isActive: true,
  },

  // METABOLIC
  {
    code: "GLU",
    displayNameFr: "Glycémie",
    category: "BIOCHIMIE",
    aliases: ["glucose"],
    searchText: "glycemie glucose diabete sucre",
    isActive: true,
  },
  {
    code: "HBA1C",
    displayNameFr: "Hémoglobine glyquée (HbA1c)",
    category: "BIOCHIMIE",
    aliases: ["a1c"],
    searchText: "hba1c diabete controle",
    isActive: true,
  },
  {
    code: "CREAT",
    displayNameFr: "Créatinine",
    category: "BIOCHIMIE",
    aliases: ["creatinine"],
    searchText: "creatinine rein insuffisance renale",
    isActive: true,
  },
  {
    code: "UREA",
    displayNameFr: "Urée",
    category: "BIOCHIMIE",
    aliases: ["uree"],
    searchText: "uree rein azote",
    isActive: true,
  },

  // ELECTROLYTES
  {
    code: "NA",
    displayNameFr: "Sodium",
    category: "ELECTROLYTES",
    aliases: ["na"],
    searchText: "sodium electrolyte hyponatremie",
    isActive: true,
  },
  {
    code: "K",
    displayNameFr: "Potassium",
    category: "ELECTROLYTES",
    aliases: ["k"],
    searchText: "potassium hyperkaliemie hypokaliemie",
    isActive: true,
  },

  // LIVER
  {
    code: "AST",
    displayNameFr: "ASAT (AST)",
    category: "FOIE",
    aliases: ["ast"],
    searchText: "ast foie hepatique",
    isActive: true,
  },
  {
    code: "ALT",
    displayNameFr: "ALAT (ALT)",
    category: "FOIE",
    aliases: ["alt"],
    searchText: "alt foie hepatique",
    isActive: true,
  },
  {
    code: "BILI",
    displayNameFr: "Bilirubine totale",
    category: "FOIE",
    aliases: ["bilirubine"],
    searchText: "bilirubine ictere",
    isActive: true,
  },

  // LIPIDS
  {
    code: "LIPID",
    displayNameFr: "Bilan lipidique",
    category: "CARDIO",
    aliases: ["cholesterol"],
    searchText: "lipide cholesterol triglyceride",
    isActive: true,
  },

  // INFLAMMATION
  {
    code: "CRP",
    displayNameFr: "CRP",
    category: "INFLAMMATION",
    aliases: ["crp"],
    searchText: "crp infection inflammation",
    isActive: true,
  },
  {
    code: "ESR",
    displayNameFr: "Vitesse de sédimentation (VS)",
    category: "INFLAMMATION",
    aliases: ["vs"],
    searchText: "vs inflammation",
    isActive: true,
  },

  // ENDOCRINE
  {
    code: "TSH",
    displayNameFr: "TSH",
    category: "ENDOCRINO",
    aliases: ["tsh"],
    searchText: "thyroide tsh",
    isActive: true,
  },

  // INFECTIOUS (CRITICAL FOR HAITI)
  {
    code: "HIV",
    displayNameFr: "Test VIH",
    category: "INFECTIEUX",
    aliases: ["vih", "hiv"],
    searchText: "vih hiv sida",
    isActive: true,
  },
  {
    code: "VDRL",
    displayNameFr: "VDRL (Syphilis)",
    category: "INFECTIEUX",
    aliases: ["syphilis"],
    searchText: "syphilis vdrl",
    isActive: true,
  },
  {
    code: "MALARIA",
    displayNameFr: "Test paludisme",
    category: "INFECTIEUX",
    aliases: ["malaria"],
    searchText: "paludisme malaria parasite",
    isActive: true,
  },

  // URINE / STOOL
  {
    code: "UA",
    displayNameFr: "Analyse d'urines",
    category: "URINAIRE",
    aliases: ["urine"],
    searchText: "urine infection",
    isActive: true,
  },
  {
    code: "CULT_URINE",
    displayNameFr: "ECBU (culture urinaire)",
    category: "URINAIRE",
    aliases: ["culture urine"],
    searchText: "ecbu infection urinaire",
    isActive: true,
  },
  {
    code: "STOOL",
    displayNameFr: "Coprologie",
    category: "DIGESTIF",
    aliases: ["stool"],
    searchText: "selles parasite",
    isActive: true,
  },

  // COAGULATION
  {
    code: "INR",
    displayNameFr: "INR",
    category: "COAGULATION",
    aliases: ["tp"],
    searchText: "inr coagulation",
    isActive: true,
  },

  // EMERGENCY
  {
    code: "TROP",
    displayNameFr: "Troponine",
    category: "URGENCE",
    aliases: ["troponine"],
    searchText: "troponine infarctus",
    isActive: true,
  },
  {
    code: "DDIMER",
    displayNameFr: "D-dimères",
    category: "URGENCE",
    aliases: ["ddimer"],
    searchText: "d-dimere embolie",
    isActive: true,
  },

  // --- Expansion Haïti (cliniques / urgences / infectieux courants) ---
  {
    code: "NFS_DIFF",
    displayNameFr: "NFS avec formule leucocytaire",
    category: "HEMATOLOGIE",
    aliases: ["formule", "leucocytes"],
    searchText: "nfs formule leucocytes neutrophiles",
    isActive: true,
  },
  {
    code: "BMP",
    displayNameFr: "Bilan métabolique (ionogramme + créatinine + glycémie)",
    category: "BIOCHIMIE",
    aliases: ["bilan bio", "ionogramme"],
    searchText: "bilan metabolique ionogramme uree glucose creatinine",
    isActive: true,
  },
  {
    code: "HCG_BETA",
    displayNameFr: "β-hCG (grossesse) — sérique",
    category: "BIOCHIMIE",
    aliases: ["beta hcg", "test grossesse sang"],
    searchText: "beta hcg grossesse serique",
    isActive: true,
  },
  {
    code: "HCG_URINE",
    displayNameFr: "Test de grossesse urinaire",
    category: "BIOCHIMIE",
    aliases: ["test urine grossesse"],
    searchText: "grossesse urine hcg",
    isActive: true,
  },
  {
    code: "GROUPAGE_ABO",
    displayNameFr: "Groupage ABO / Rhésus",
    category: "BANQUE_SANG",
    aliases: ["groupage", "abo rh"],
    searchText: "groupe sanguin rhesus transfusion",
    isActive: true,
  },
  {
    code: "TP_INR",
    displayNameFr: "TP / INR",
    category: "COAGULATION",
    aliases: ["tp inr", "quick"],
    searchText: "tp inr coagulation anticoagulant",
    isActive: true,
  },
  {
    code: "TCA",
    displayNameFr: "TCA (aPTT)",
    category: "COAGULATION",
    aliases: ["aptt", "tca"],
    searchText: "tca aptt coagulation",
    isActive: true,
  },
  {
    code: "DENGUE_NS1",
    displayNameFr: "Dengue — antigène NS1",
    category: "INFECTIEUX",
    aliases: ["ns1 dengue"],
    searchText: "dengue ns1 fièvre hémorragique",
    isActive: true,
  },
  {
    code: "TYPHOID_IgM",
    displayNameFr: "Fièvre typhoïde — anticorps (Widal / sérologie)",
    category: "INFECTIEUX",
    aliases: ["widal", "typhoide"],
    searchText: "typhoide widal salmonella",
    isActive: true,
  },
  {
    code: "MALARIA_RDT",
    displayNameFr: "Paludisme — TDR rapide",
    category: "INFECTIEUX",
    aliases: ["tdr paludisme"],
    searchText: "paludisme tdr malaria rapide",
    isActive: true,
  },
  {
    code: "CHIKUNGUNYA",
    displayNameFr: "Chikungunya — sérologie",
    category: "INFECTIEUX",
    aliases: ["chik"],
    searchText: "chikungunya arbovirose",
    isActive: true,
  },
  {
    code: "HEP_B_RAPID",
    displayNameFr: "Hépatite B — test rapide / Ag HBs",
    category: "INFECTIEUX",
    aliases: ["hbsag"],
    searchText: "hepatite b hbsag",
    isActive: true,
  },
  {
    code: "HEP_C_AB",
    displayNameFr: "Hépatite C — anticorps",
    category: "INFECTIEUX",
    aliases: ["anti hcv"],
    searchText: "hepatite c vhc",
    isActive: true,
  },
  {
    code: "LACTATE",
    displayNameFr: "Lactates (lactacidemie)",
    category: "URGENCE",
    aliases: ["lactate"],
    searchText: "lactate choc sepsis",
    isActive: true,
  },
  {
    code: "PROCALCITONIN",
    displayNameFr: "Procalcitonine (PCT)",
    category: "URGENCE",
    aliases: ["pct"],
    searchText: "procalcitonine infection bacterienne",
    isActive: true,
  },
];

/** @deprecated Utiliser `HAITI_LAB_CATALOG` */
export const HAITI_LAB_TESTS = HAITI_LAB_CATALOG;

/** @deprecated Utiliser `LabCatalogSeed` */
export type HaitiLabTestSeed = LabCatalogSeed;
