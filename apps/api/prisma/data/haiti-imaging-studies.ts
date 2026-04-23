/**
 * Haiti / low-resource imaging catalog — stable codes, French labels, modality + region (seed-ready).
 */
export type ImagingCatalogSeed = {
  code: string;
  displayNameFr: string;
  /** Optional English curated label (reviewed only; not copied from FR). */
  displayNameEn?: string;
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
    displayNameEn: "Chest X-ray",
    modality: "XR",
    bodyRegion: "THORAX",
    aliases: ["radio thorax"],
    searchText: "thorax poumon radio chest lung",
    isActive: true,
  },
  {
    code: "XR_KNEE",
    displayNameFr: "Radiographie genou",
    displayNameEn: "Knee X-ray",
    modality: "XR",
    bodyRegion: "GENOU",
    aliases: ["radio genou"],
    searchText: "genou douleur radio knee xray",
    isActive: true,
  },
  {
    code: "XR_FOOT",
    displayNameFr: "Radiographie pied",
    displayNameEn: "Foot X-ray",
    modality: "XR",
    bodyRegion: "PIED",
    aliases: ["radio pied"],
    searchText: "pied fracture foot xray",
    isActive: true,
  },

  // ULTRASOUND
  {
    code: "US_ABD",
    displayNameFr: "Échographie abdominale",
    displayNameEn: "Abdominal ultrasound",
    modality: "US",
    bodyRegion: "ABDOMEN",
    aliases: ["echo abdomen"],
    searchText: "echo abdomen foie rein ultrasound abdomen",
    isActive: true,
  },
  {
    code: "US_OB",
    displayNameFr: "Échographie obstétricale",
    displayNameEn: "Obstetric ultrasound",
    modality: "US",
    bodyRegion: "OBSTETRICAL",
    aliases: ["grossesse echo"],
    searchText: "grossesse foetus pregnancy ultrasound",
    isActive: true,
  },
  {
    code: "US_RENAL",
    displayNameFr: "Échographie rénale",
    displayNameEn: "Renal ultrasound",
    modality: "US",
    bodyRegion: "REIN",
    aliases: ["echo rein"],
    searchText: "rein colique nephretique kidney ultrasound",
    isActive: true,
  },

  // CT SCAN
  {
    code: "CT_HEAD",
    displayNameFr: "Scanner cérébral",
    displayNameEn: "CT head",
    modality: "CT",
    bodyRegion: "CERVEAU",
    aliases: ["ct head"],
    searchText: "cerveau trauma avc",
    isActive: true,
  },
  {
    code: "CT_ABD",
    displayNameFr: "Scanner abdomen/pelvis",
    displayNameEn: "CT abdomen/pelvis",
    modality: "CT",
    bodyRegion: "ABDOMEN",
    aliases: ["ct abdomen"],
    searchText: "abdomen appendicite ct cap",
    isActive: true,
  },

  // DOPPLER
  {
    code: "DOPPLER_VEIN",
    displayNameFr: "Doppler veineux membres inférieurs",
    displayNameEn: "Lower extremity venous ultrasound (DVT)",
    modality: "US",
    bodyRegion: "VASCULAIRE",
    aliases: ["doppler"],
    searchText: "tvp thrombose dvt venous duplex leg",
    isActive: true,
  },

  // --- Expansion Haïti (radiologie de proximité) ---
  {
    code: "XR_CHEST_2V",
    displayNameFr: "Radiographie thorax (2 incidences)",
    displayNameEn: "Chest X-ray (2 views)",
    modality: "XR",
    bodyRegion: "THORAX",
    aliases: ["radio thorax pa", "thorax 2"],
    searchText: "thorax poumon radio face profil chest pa lateral",
    isActive: true,
  },
  {
    code: "XR_ABD_AP",
    displayNameFr: "Radiographie abdomen (ASP)",
    displayNameEn: "Abdominal X-ray (KUB)",
    modality: "XR",
    bodyRegion: "ABDOMEN",
    aliases: ["asp", "abdomen sans prep"],
    searchText: "abdomen occlusion ileus kub plain film",
    isActive: true,
  },
  {
    code: "XR_WRIST",
    displayNameFr: "Radiographie poignet",
    displayNameEn: "Wrist X-ray",
    modality: "XR",
    bodyRegion: "POIGNET",
    aliases: ["radio poignet"],
    searchText: "poignet fracture wrist",
    isActive: true,
  },
  {
    code: "XR_ANKLE",
    displayNameFr: "Radiographie cheville",
    displayNameEn: "Ankle X-ray",
    modality: "XR",
    bodyRegion: "CHEVILLE",
    aliases: ["radio cheville"],
    searchText: "cheville entorse ankle",
    isActive: true,
  },
  {
    code: "XR_SHOULDER",
    displayNameFr: "Radiographie épaule",
    displayNameEn: "Shoulder X-ray",
    modality: "XR",
    bodyRegion: "EPAULE",
    aliases: ["radio epaule"],
    searchText: "epaule luxation shoulder",
    isActive: true,
  },
  {
    code: "XR_PELVIS",
    displayNameFr: "Radiographie bassin",
    displayNameEn: "Pelvis X-ray",
    modality: "XR",
    bodyRegion: "BASSIN",
    aliases: ["radio bassin"],
    searchText: "bassin fracture hanche pelvis hip",
    isActive: true,
  },
  {
    code: "US_OB_FIRST",
    displayNameFr: "Échographie obstétricale — premier trimestre",
    displayNameEn: "Obstetric ultrasound — first trimester",
    modality: "US",
    bodyRegion: "OBSTETRICAL",
    aliases: ["echo t1", "vitalite foetale"],
    searchText: "grossesse debut datation first trimester dating",
    isActive: true,
  },
  {
    code: "US_OB_GROWTH",
    displayNameFr: "Échographie obstétricale — croissance / Doppler",
    displayNameEn: "Obstetric ultrasound — growth / Doppler",
    modality: "US",
    bodyRegion: "OBSTETRICAL",
    aliases: ["croissance foetale", "doppler obstetrical"],
    searchText: "rciu croissance placenta growth scan",
    isActive: true,
  },
  {
    code: "US_SOFT",
    displayNameFr: "Échographie des parties molles",
    displayNameEn: "Soft tissue ultrasound",
    modality: "US",
    bodyRegion: "MUCS",
    aliases: ["echo collection"],
    searchText: "abcès collection cellulite abscess foreign body",
    isActive: true,
  },
  {
    code: "CT_CHEST",
    displayNameFr: "Scanner thoracique",
    displayNameEn: "CT chest",
    modality: "CT",
    bodyRegion: "THORAX",
    aliases: ["ct thorax"],
    searchText: "scanner thorax embolie poumon pulmonary pe cta",
    isActive: true,
  },
  {
    code: "CT_SPINE_LUMBAR",
    displayNameFr: "Scanner rachis lombaire",
    displayNameEn: "CT lumbar spine",
    modality: "CT",
    bodyRegion: "RACHIS",
    aliases: ["ct lombaire"],
    searchText: "lombaire sciatique stenose low back",
    isActive: true,
  },
  {
    code: "US_FAST",
    displayNameFr: "Échographie FAST (trauma)",
    displayNameEn: "FAST exam",
    modality: "US",
    bodyRegion: "ABDOMEN",
    aliases: ["fast", "echo trauma"],
    searchText: "fast trauma efast free fluid pericardial",
    isActive: true,
  },
];

/** @deprecated Utiliser `HAITI_IMAGING_CATALOG` */
export const HAITI_IMAGING_STUDIES = HAITI_IMAGING_CATALOG;

/** @deprecated Utiliser `ImagingCatalogSeed` */
export type HaitiImagingStudySeed = ImagingCatalogSeed;
