/**
 * Référentiel de maladies à déclaration MSPP / surveillance nationale (V1 — code source).
 *
 * Source métier : listes de **notification immédiate** et **notification hebdomadaire** du cadre MSPP
 * (document de référence : `docs/mspp/MANUEL-COMPLET-PORTAIL-MSPP-MEDORA.md` et bulletins nationaux).
 * Complété par un petit ensemble d’entrées épiréférentes (COVID-19, mpox, suspicion poliovirus, etc.).
 *
 * Stockage V1 : module TypeScript partagé (pas de table Prisma) — lecture seule via GET `/public-health/disease-catalog`.
 */
export type DiseaseNotifiableSurveillanceGroup = "IMMEDIATE" | "WEEKLY" | "OTHER";

export type MsppReportingCategory = "IMMEDIATE" | "WEEKLY" | "ROUTINE";

export type MsppSurveillancePriority = "HIGH" | "MEDIUM" | "LOW";

export type HaitiDiseaseNotifiableEntry = {
  code: string;
  labelFr: string;
  aliasesFr: string[];
  surveillanceGroup: DiseaseNotifiableSurveillanceGroup;
  /** Gouvernance : catégorie de déclaration (alignée sur les moteurs nationaux). */
  reportingCategory: MsppReportingCategory;
  /** Gouvernance : priorité de surveillance. */
  surveillancePriority: MsppSurveillancePriority;
  /** Optionnel : id du profil seuils signaux sanitaires (`sanitary-signal-thresholds`). */
  sanitarySignalProfile?: string;
  /** Optionnel : id du profil aide à la revue (`review-disease-guidance`). */
  reviewGuidanceProfile?: string;
  isActive: boolean;
};

/** Alias sémantique — même forme que les lignes du catalogue (`code` = code maladie). */
export type HaitiNotifiableDisease = HaitiDiseaseNotifiableEntry;

export const HAITI_DISEASE_NOTIFIABLE_CATALOG: HaitiDiseaseNotifiableEntry[] = [
  // —— Notification immédiate (liste type MSPP) ——
  {
    code: "A00",
    labelFr: "Choléra",
    aliasesFr: ["cholera", "diarrhee aqueuse", "diarrhée aqueuse"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    sanitarySignalProfile: "CHOLERA_LIKE",
    reviewGuidanceProfile: "CHOLERA_LIKE",
    isActive: true,
  },
  {
    code: "A95",
    labelFr: "Fièvre jaune",
    aliasesFr: ["fievre jaune", "yellow fever"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },
  {
    code: "B05",
    labelFr: "Rougeole",
    aliasesFr: ["rougeole", "measles", "rubeole infantile"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    sanitarySignalProfile: "MEASLES_LIKE",
    reviewGuidanceProfile: "MEASLES_LIKE",
    isActive: true,
  },
  {
    code: "B04",
    labelFr: "Variole simienne (mpox)",
    aliasesFr: ["mpox", "monkeypox", "variole du singe"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },
  {
    code: "U07.1",
    labelFr: "COVID-19",
    aliasesFr: ["covid", "coronavirus", "sars-cov-2"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },
  {
    code: "A82",
    labelFr: "Rage humaine",
    aliasesFr: ["rage"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },
  {
    code: "A36",
    labelFr: "Diphtérie",
    aliasesFr: ["diphterie"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },
  {
    code: "A33",
    labelFr: "Tétanos néonatal",
    aliasesFr: ["tetanos neonatal", "tétanos du nouveau-né"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },
  {
    code: "POLIO_AFP",
    labelFr: "Paralysie flasque aiguë (suspicion poliovirus)",
    aliasesFr: ["pfa", "polio", "poliomyelite", "poliomyélite", "palm"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },
  {
    code: "A99",
    labelFr: "Fièvre hémorragique virale (suspicion)",
    aliasesFr: ["fhv", "fievre hemorragique", "vhf"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },
  {
    code: "A39.0",
    labelFr: "Méningite à méningocoques",
    aliasesFr: ["meningite invasive", "méningite bactérienne"],
    surveillanceGroup: "IMMEDIATE",
    reportingCategory: "IMMEDIATE",
    surveillancePriority: "HIGH",
    isActive: true,
  },

  // —— Notification hebdomadaire (liste type MSPP) ——
  {
    code: "A90",
    labelFr: "Dengue",
    aliasesFr: ["dengue", "breakbone"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "HIGH",
    sanitarySignalProfile: "DENGUE_LIKE",
    reviewGuidanceProfile: "DENGUE_LIKE",
    isActive: true,
  },
  {
    code: "B50.9",
    labelFr: "Paludisme à Plasmodium falciparum (non précisé)",
    aliasesFr: ["paludisme", "malaria", "acces palustre", "accès palustre"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "HIGH",
    sanitarySignalProfile: "MALARIA_LIKE",
    reviewGuidanceProfile: "MALARIA_LIKE",
    isActive: true,
  },
  {
    code: "A15.0",
    labelFr: "Tuberculose pulmonaire",
    aliasesFr: ["tuberculose", "tb", "tbc"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    sanitarySignalProfile: "TUBERCULOSIS_LIKE",
    reviewGuidanceProfile: "TUBERCULOSIS_LIKE",
    isActive: true,
  },
  {
    code: "A01.0",
    labelFr: "Fièvre typhoïde",
    aliasesFr: ["typhoide", "typhoïde", "salmonella typhi"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },
  {
    code: "A27",
    labelFr: "Leptospirose",
    aliasesFr: ["leptospirose"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },
  {
    code: "B06",
    labelFr: "Rubéole",
    aliasesFr: ["rubeole", "rubella"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },
  {
    code: "B15",
    labelFr: "Hépatite virale aiguë A",
    aliasesFr: ["hepatite a", "hépatite a", "hav"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },
  {
    code: "B16",
    labelFr: "Hépatite virale aiguë B",
    aliasesFr: ["hepatite b", "hépatite b", "hbv", "hepatite virale"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },
  {
    code: "A06.9",
    labelFr: "Amibiase intestinale",
    aliasesFr: ["amibiase", "dysenterie amibienne"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },
  {
    code: "B65.9",
    labelFr: "Schistosomiase (non précisée)",
    aliasesFr: ["schistosomiase", "bilharziose"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },
  {
    code: "B55.9",
    labelFr: "Leishmaniose (non précisée)",
    aliasesFr: ["leishmaniose", "kala azar"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },
  {
    code: "A71.9",
    labelFr: "Trachome",
    aliasesFr: ["trachome"],
    surveillanceGroup: "WEEKLY",
    reportingCategory: "WEEKLY",
    surveillancePriority: "MEDIUM",
    isActive: true,
  },

  // —— Complément prudent (autres événements signalables) ——
  {
    code: "J10.1",
    labelFr: "Grippe due à un virus de la grippe identifié",
    aliasesFr: ["grippe", "influenza", "grippe saisonniere"],
    surveillanceGroup: "OTHER",
    reportingCategory: "ROUTINE",
    surveillancePriority: "LOW",
    isActive: true,
  },
  {
    code: "A09",
    labelFr: "Diarrhée et gastro-entérite d’origine infectieuse (autre)",
    aliasesFr: ["gastro", "gastro-enterite", "diarrhee"],
    surveillanceGroup: "OTHER",
    reportingCategory: "ROUTINE",
    surveillancePriority: "LOW",
    isActive: true,
  },
];

export function activeDiseaseNotifiableCatalog(): HaitiDiseaseNotifiableEntry[] {
  return HAITI_DISEASE_NOTIFIABLE_CATALOG.filter((e) => e.isActive);
}
