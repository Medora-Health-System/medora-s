/**
 * Haiti / low-resource imaging catalog — stable codes, French labels, modality + region (seed-ready).
 */
export type ImagingCatalogSeed = {
  code: string;
  displayNameFr: string;
  modality: string;
  bodyRegion: string;
  aliases: string[];
  searchText: string;
  isActive: boolean;
};

export const HAITI_IMAGING_CATALOG: ImagingCatalogSeed[] = [
  // X-RAY
  {
    code: "XR_CHEST",
    displayNameFr: "Radiographie thorax",
    modality: "XR",
    bodyRegion: "THORAX",
    aliases: ["radio thorax"],
    searchText: "thorax poumon radio",
    isActive: true,
  },
  {
    code: "XR_KNEE",
    displayNameFr: "Radiographie genou",
    modality: "XR",
    bodyRegion: "GENOU",
    aliases: ["radio genou"],
    searchText: "genou douleur radio",
    isActive: true,
  },
  {
    code: "XR_FOOT",
    displayNameFr: "Radiographie pied",
    modality: "XR",
    bodyRegion: "PIED",
    aliases: ["radio pied"],
    searchText: "pied fracture",
    isActive: true,
  },

  // ULTRASOUND
  {
    code: "US_ABD",
    displayNameFr: "Échographie abdominale",
    modality: "US",
    bodyRegion: "ABDOMEN",
    aliases: ["echo abdomen"],
    searchText: "echo abdomen foie rein",
    isActive: true,
  },
  {
    code: "US_OB",
    displayNameFr: "Échographie obstétricale",
    modality: "US",
    bodyRegion: "OBSTETRICAL",
    aliases: ["grossesse echo"],
    searchText: "grossesse foetus",
    isActive: true,
  },
  {
    code: "US_RENAL",
    displayNameFr: "Échographie rénale",
    modality: "US",
    bodyRegion: "REIN",
    aliases: ["echo rein"],
    searchText: "rein colique nephretique",
    isActive: true,
  },

  // CT SCAN
  {
    code: "CT_HEAD",
    displayNameFr: "Scanner cérébral",
    modality: "CT",
    bodyRegion: "CERVEAU",
    aliases: ["ct head"],
    searchText: "cerveau trauma avc",
    isActive: true,
  },
  {
    code: "CT_ABD",
    displayNameFr: "Scanner abdomen/pelvis",
    modality: "CT",
    bodyRegion: "ABDOMEN",
    aliases: ["ct abdomen"],
    searchText: "abdomen appendicite",
    isActive: true,
  },

  // DOPPLER
  {
    code: "DOPPLER_VEIN",
    displayNameFr: "Doppler veineux membres inférieurs",
    modality: "US",
    bodyRegion: "VASCULAIRE",
    aliases: ["doppler"],
    searchText: "tvp thrombose",
    isActive: true,
  },

  // --- Expansion Haïti (radiologie de proximité) ---
  {
    code: "XR_CHEST_2V",
    displayNameFr: "Radiographie thorax (2 incidences)",
    modality: "XR",
    bodyRegion: "THORAX",
    aliases: ["radio thorax pa", "thorax 2"],
    searchText: "thorax poumon radio face profil",
    isActive: true,
  },
  {
    code: "XR_ABD_AP",
    displayNameFr: "Radiographie abdomen (ASP)",
    modality: "XR",
    bodyRegion: "ABDOMEN",
    aliases: ["asp", "abdomen sans prep"],
    searchText: "abdomen occlusion ileus",
    isActive: true,
  },
  {
    code: "XR_WRIST",
    displayNameFr: "Radiographie poignet",
    modality: "XR",
    bodyRegion: "POIGNET",
    aliases: ["radio poignet"],
    searchText: "poignet fracture",
    isActive: true,
  },
  {
    code: "XR_ANKLE",
    displayNameFr: "Radiographie cheville",
    modality: "XR",
    bodyRegion: "CHEVILLE",
    aliases: ["radio cheville"],
    searchText: "cheville entorse",
    isActive: true,
  },
  {
    code: "XR_SHOULDER",
    displayNameFr: "Radiographie épaule",
    modality: "XR",
    bodyRegion: "EPAULE",
    aliases: ["radio epaule"],
    searchText: "epaule luxation",
    isActive: true,
  },
  {
    code: "XR_PELVIS",
    displayNameFr: "Radiographie bassin",
    modality: "XR",
    bodyRegion: "BASSIN",
    aliases: ["radio bassin"],
    searchText: "bassin fracture hanche",
    isActive: true,
  },
  {
    code: "US_OB_FIRST",
    displayNameFr: "Échographie obstétricale — premier trimestre",
    modality: "US",
    bodyRegion: "OBSTETRICAL",
    aliases: ["echo t1", "vitalite foetale"],
    searchText: "grossesse debut datation",
    isActive: true,
  },
  {
    code: "US_OB_GROWTH",
    displayNameFr: "Échographie obstétricale — croissance / Doppler",
    modality: "US",
    bodyRegion: "OBSTETRICAL",
    aliases: ["croissance foetale", "doppler obstetrical"],
    searchText: "rciu croissance placenta",
    isActive: true,
  },
  {
    code: "US_SOFT",
    displayNameFr: "Échographie des parties molles",
    modality: "US",
    bodyRegion: "MUCS",
    aliases: ["echo collection"],
    searchText: "abcès collection cellulite",
    isActive: true,
  },
  {
    code: "CT_CHEST",
    displayNameFr: "Scanner thoracique",
    modality: "CT",
    bodyRegion: "THORAX",
    aliases: ["ct thorax"],
    searchText: "scanner thorax embolie poumon",
    isActive: true,
  },
  {
    code: "CT_SPINE_LUMBAR",
    displayNameFr: "Scanner rachis lombaire",
    modality: "CT",
    bodyRegion: "RACHIS",
    aliases: ["ct lombaire"],
    searchText: "lombaire sciatique stenose",
    isActive: true,
  },
];

/** @deprecated Utiliser `HAITI_IMAGING_CATALOG` */
export const HAITI_IMAGING_STUDIES = HAITI_IMAGING_CATALOG;

/** @deprecated Utiliser `ImagingCatalogSeed` */
export type HaitiImagingStudySeed = ImagingCatalogSeed;
