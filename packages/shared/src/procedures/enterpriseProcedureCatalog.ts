import type { DocumentedProcedureType } from "../schemas/encounterProcedureTypes.js";
import type { EnterpriseProcedureChargeMapping } from "./enterpriseProcedureBillingReadinessTypes.js";

export const ENTERPRISE_PROCEDURE_CARE_SETTINGS = [
  "ED",
  "URGENT_CARE",
  "CLINIC",
  "OBSERVATION",
  "HOSPITAL",
] as const;

export type EnterpriseProcedureCareSetting = (typeof ENTERPRISE_PROCEDURE_CARE_SETTINGS)[number];

export const ENTERPRISE_PROCEDURE_CATEGORIES = [
  "AIRWAY",
  "CARDIAC_RESPIRATORY",
  "VASCULAR_ACCESS",
  "WOUND_CARE",
  "ORTHOPEDIC",
  "GU",
  "GI",
  "NEURO",
  "SEDATION",
  "NURSING_TASK",
  "MONITORING",
  "SPECIMEN_COLLECTION",
  "OTHER",
] as const;

export type EnterpriseProcedureCategory = (typeof ENTERPRISE_PROCEDURE_CATEGORIES)[number];

export const ENTERPRISE_PROCEDURE_BILLING_MAPPING_STATUSES = [
  "NOT_MAPPED",
  "REVIEW_REQUIRED",
  "FUTURE_CHARGE_MASTER",
] as const;

export type EnterpriseProcedureBillingMappingStatus =
  (typeof ENTERPRISE_PROCEDURE_BILLING_MAPPING_STATUSES)[number];

export const ENTERPRISE_PROCEDURE_ROLE_HINTS = ["PROVIDER", "RN", "TECH", "RT", "ANY"] as const;

export type EnterpriseProcedureRoleHint = (typeof ENTERPRISE_PROCEDURE_ROLE_HINTS)[number];

export const ENTERPRISE_PROCEDURE_EXECUTION_ROLE_CATEGORIES = [
  "PROVIDER",
  "NURSING",
  "RESPIRATORY",
  "LAB",
  "RADIOLOGY",
  "MULTI_ROLE",
] as const;

export type EnterpriseProcedureExecutionRoleCategory =
  (typeof ENTERPRISE_PROCEDURE_EXECUTION_ROLE_CATEGORIES)[number];

export const ENTERPRISE_PROCEDURE_EXECUTION_ROLES = [
  "PROVIDER",
  "RN",
  "RT",
  "LAB_TECH",
  "RADIOLOGY_TECH",
] as const;

export type EnterpriseProcedureExecutionRole = (typeof ENTERPRISE_PROCEDURE_EXECUTION_ROLES)[number];

export type EnterpriseProcedureDocumentationTemplateId = DocumentedProcedureType | "LACERATION";

export type EnterpriseProcedureDefinition = {
  id: string;
  displayNameEn: string;
  displayNameFr: string;
  aliases: string[];
  category: EnterpriseProcedureCategory;
  careSettingApplicability: EnterpriseProcedureCareSetting[];
  orderable: boolean;
  documentationTemplateId?: EnterpriseProcedureDocumentationTemplateId;
  requiresProcedureNote: boolean;
  performerRoleHints: EnterpriseProcedureRoleHint[];
  assistingRoleHints: EnterpriseProcedureRoleHint[];
  completionRoleHints: EnterpriseProcedureRoleHint[];
  billingMappingStatus: EnterpriseProcedureBillingMappingStatus;
  /** MEDPROC.5 — enterprise charge-master mapping metadata (preview-only; not billing events). */
  chargeMapping?: EnterpriseProcedureChargeMapping;
  /** MEDPROC.4 — primary execution queue category (metadata only). */
  executionRoleCategory: EnterpriseProcedureExecutionRoleCategory;
  /** MEDPROC.4 — roles allowed to acknowledge/start. */
  acknowledgeRoles: EnterpriseProcedureExecutionRole[];
  /** MEDPROC.4 — roles allowed to complete. */
  completeRoles: EnterpriseProcedureExecutionRole[];
};

const ALL_SETTINGS: EnterpriseProcedureCareSetting[] = [...ENTERPRISE_PROCEDURE_CARE_SETTINGS];

const CODER_REVIEW_CPT: EnterpriseProcedureChargeMapping = {
  status: "CODER_REVIEW_REQUIRED",
  suggestedCodeSystems: ["CPT"],
  mappingSource: "ENTERPRISE_DEFAULT",
};

const INSTITUTION_POLICY_CPT: EnterpriseProcedureChargeMapping = {
  status: "INSTITUTION_POLICY_REQUIRED",
  suggestedCodeSystems: ["CPT"],
  mappingSource: "ENTERPRISE_DEFAULT",
};

const NURSING_PROCEDURE_REVIEW: EnterpriseProcedureChargeMapping = {
  status: "READY_FOR_REVIEW",
  suggestedCodeSystems: ["CPT"],
  mappingSource: "ENTERPRISE_DEFAULT",
};

const INTUBATION_CHARGE_MAPPING: EnterpriseProcedureChargeMapping = {
  status: "READY_FOR_REVIEW",
  suggestedCodeSystems: ["CPT"],
  mappingSource: "ENTERPRISE_DEFAULT",
  defaultCodeCandidates: [
    {
      codeSystem: "CPT",
      code: "31500",
      label: "Endotracheal intubation",
      reviewRequired: true,
    },
  ],
};

function roleHintToExecutionRole(hint: EnterpriseProcedureRoleHint): EnterpriseProcedureExecutionRole | null {
  if (hint === "PROVIDER") return "PROVIDER";
  if (hint === "RN" || hint === "ANY") return "RN";
  if (hint === "RT") return "RT";
  if (hint === "TECH") return "LAB_TECH";
  return null;
}

function uniqueExecutionRoles(roles: EnterpriseProcedureExecutionRole[]): EnterpriseProcedureExecutionRole[] {
  return [...new Set(roles)];
}

function deriveExecutionProfile(
  entry: EnterpriseProcedureCatalogEntryInput
): Pick<EnterpriseProcedureDefinition, "executionRoleCategory" | "acknowledgeRoles" | "completeRoles"> {
  if (
    entry.executionRoleCategory &&
    entry.acknowledgeRoles?.length &&
    entry.completeRoles?.length
  ) {
    return {
      executionRoleCategory: entry.executionRoleCategory,
      acknowledgeRoles: entry.acknowledgeRoles,
      completeRoles: entry.completeRoles,
    };
  }

  const performers = entry.performerRoleHints ?? ["RN"];
  const completion = entry.completionRoleHints?.length ? entry.completionRoleHints : performers;
  const completionExec = uniqueExecutionRoles(
    completion.map(roleHintToExecutionRole).filter((r): r is EnterpriseProcedureExecutionRole => Boolean(r))
  );

  if (entry.category === "SPECIMEN_COLLECTION") {
    return {
      executionRoleCategory: "LAB",
      acknowledgeRoles: ["LAB_TECH", "RN"],
      completeRoles: ["LAB_TECH", "RN"],
    };
  }

  const hasProvider = performers.includes("PROVIDER");
  const hasRt = performers.includes("RT");
  const hasRn = performers.includes("RN") || performers.includes("ANY");

  if (hasRt && !hasProvider) {
    return {
      executionRoleCategory: "RESPIRATORY",
      acknowledgeRoles: ["RT"],
      completeRoles: ["RT"],
    };
  }

  if (hasProvider && !hasRn) {
    return {
      executionRoleCategory: "PROVIDER",
      acknowledgeRoles: ["PROVIDER", "RN"],
      completeRoles: ["PROVIDER"],
    };
  }

  if (hasProvider && hasRn) {
    return {
      executionRoleCategory: "MULTI_ROLE",
      acknowledgeRoles: ["PROVIDER", "RN"],
      completeRoles: completionExec.length ? completionExec : ["RN", "PROVIDER"],
    };
  }

  return {
    executionRoleCategory: "NURSING",
    acknowledgeRoles: ["RN"],
    completeRoles: completionExec.length ? completionExec : ["RN"],
  };
}

export type EnterpriseProcedureCatalogEntryInput = Pick<
  EnterpriseProcedureDefinition,
  "id" | "displayNameEn" | "displayNameFr" | "category"
> &
  Partial<Omit<EnterpriseProcedureDefinition, "id" | "displayNameEn" | "displayNameFr" | "category">>;

/** Builds a full catalog row; omitted role hint arrays default to []. */
export function buildEnterpriseProcedureDefinition(
  entry: EnterpriseProcedureCatalogEntryInput
): EnterpriseProcedureDefinition {
  const hasDocTemplate = Boolean(entry.documentationTemplateId);
  const execution = deriveExecutionProfile(entry);
  return {
    aliases: [],
    careSettingApplicability: ALL_SETTINGS,
    orderable: true,
    assistingRoleHints: [],
    completionRoleHints: [],
    performerRoleHints: ["RN"],
    requiresProcedureNote: hasDocTemplate,
    billingMappingStatus: hasDocTemplate ? "REVIEW_REQUIRED" : "NOT_MAPPED",
    ...execution,
    ...entry,
  };
}

function procedure(entry: EnterpriseProcedureCatalogEntryInput): EnterpriseProcedureDefinition {
  return buildEnterpriseProcedureDefinition(entry);
}

export const ENTERPRISE_PROCEDURE_CATALOG: EnterpriseProcedureDefinition[] = [
  // Airway / respiratory
  procedure({
    id: "endotracheal_intubation",
    displayNameEn: "Endotracheal intubation",
    displayNameFr: "Intubation endotrachéale",
    aliases: ["intub", "intubation", "ett", "airway intubation"],
    category: "AIRWAY",
    documentationTemplateId: "INTUBATION",
    chargeMapping: INTUBATION_CHARGE_MAPPING,
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN", "RT"],
    completionRoleHints: ["PROVIDER", "RN"],
    executionRoleCategory: "PROVIDER",
    acknowledgeRoles: ["PROVIDER", "RN"],
    completeRoles: ["PROVIDER"],
  }),
  procedure({
    id: "oxygen_therapy",
    displayNameEn: "Oxygen therapy",
    displayNameFr: "Oxygénothérapie",
    aliases: ["o2", "oxygen", "oxy", "nasal cannula"],
    category: "AIRWAY",
    performerRoleHints: ["RN", "RT"],
  }),
  procedure({
    id: "nebulizer_treatment",
    displayNameEn: "Nebulizer treatment",
    displayNameFr: "Nébulisation",
    aliases: ["neb", "nebulizer", "nebulisation", "inhalation treatment"],
    category: "AIRWAY",
    performerRoleHints: ["RN", "RT"],
    executionRoleCategory: "RESPIRATORY",
    acknowledgeRoles: ["RT"],
    completeRoles: ["RT"],
  }),
  procedure({
    id: "suctioning",
    displayNameEn: "Suctioning",
    displayNameFr: "Aspiration",
    aliases: ["suction", "oral suction", "tracheal suction"],
    category: "AIRWAY",
    performerRoleHints: ["RN", "RT"],
  }),
  procedure({
    id: "bag_valve_mask_ventilation",
    displayNameEn: "Bag-valve-mask ventilation",
    displayNameFr: "Ventilation au masque ballon-valve",
    aliases: ["bvm", "bag mask", "ambu", "manual ventilation"],
    category: "AIRWAY",
    performerRoleHints: ["RN", "RT", "PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "airway_assist",
    displayNameEn: "Airway assist",
    displayNameFr: "Assistance des voies aériennes",
    aliases: ["airway support", "airway management assist"],
    category: "AIRWAY",
    performerRoleHints: ["RN", "RT"],
    assistingRoleHints: ["PROVIDER"],
  }),

  // Cardiac / respiratory monitoring (MEDPROC.7A nomenclature)
  procedure({
    id: "ekg_ecg",
    displayNameEn: "EKG / ECG 12-Lead",
    displayNameFr: "ECG 12 dérivations",
    aliases: [
      "ekg",
      "ecg",
      "12 lead",
      "12-lead",
      "electrocardiogram",
      "electrocardiography",
      "cardiac tracing",
    ],
    category: "CARDIAC_RESPIRATORY",
    documentationTemplateId: "EKG",
    chargeMapping: INSTITUTION_POLICY_CPT,
    performerRoleHints: ["RN", "TECH"],
    completionRoleHints: ["RN", "TECH"],
    executionRoleCategory: "MULTI_ROLE",
    acknowledgeRoles: ["RN", "LAB_TECH", "RADIOLOGY_TECH"],
    completeRoles: ["RN", "LAB_TECH", "RADIOLOGY_TECH"],
  }),
  procedure({
    id: "ekg_rhythm_strip",
    displayNameEn: "EKG Rhythm Strip",
    displayNameFr: "Bande de rythme ECG",
    aliases: ["rhythm strip", "ekg strip", "ecg strip", "cardiac strip", "rhythm tracing"],
    category: "CARDIAC_RESPIRATORY",
    chargeMapping: CODER_REVIEW_CPT,
    billingMappingStatus: "REVIEW_REQUIRED",
    performerRoleHints: ["RN", "TECH"],
    completionRoleHints: ["RN", "TECH"],
    executionRoleCategory: "MULTI_ROLE",
    acknowledgeRoles: ["RN", "LAB_TECH", "RADIOLOGY_TECH"],
    completeRoles: ["RN", "LAB_TECH", "RADIOLOGY_TECH"],
  }),
  procedure({
    id: "continuous_cardiac_monitoring",
    displayNameEn: "Continuous Cardiac Monitoring",
    displayNameFr: "Surveillance cardiaque continue",
    aliases: [
      "cardiac monitoring",
      "continuous monitoring",
      "monitor",
      "telemetry monitoring",
      "heart monitor",
      "cardiac monitor",
    ],
    category: "CARDIAC_RESPIRATORY",
    chargeMapping: INSTITUTION_POLICY_CPT,
    billingMappingStatus: "FUTURE_CHARGE_MASTER",
    performerRoleHints: ["RN"],
    executionRoleCategory: "NURSING",
    acknowledgeRoles: ["RN"],
    completeRoles: ["RN"],
  }),
  procedure({
    id: "telemetry_initiation",
    displayNameEn: "Telemetry Initiation",
    displayNameFr: "Début de télémétrie",
    aliases: ["start telemetry", "initiate telemetry", "telemetry start", "tele"],
    category: "MONITORING",
    chargeMapping: INSTITUTION_POLICY_CPT,
    billingMappingStatus: "FUTURE_CHARGE_MASTER",
    performerRoleHints: ["RN"],
    executionRoleCategory: "NURSING",
    acknowledgeRoles: ["RN"],
    completeRoles: ["RN"],
  }),
  procedure({
    id: "telemetry_discontinuation",
    displayNameEn: "Telemetry Discontinuation",
    displayNameFr: "Arrêt de télémétrie",
    aliases: ["stop telemetry", "discontinue telemetry", "telemetry off", "dc telemetry", "d/c telemetry"],
    category: "MONITORING",
    chargeMapping: INSTITUTION_POLICY_CPT,
    billingMappingStatus: "FUTURE_CHARGE_MASTER",
    performerRoleHints: ["RN"],
    executionRoleCategory: "NURSING",
    acknowledgeRoles: ["RN"],
    completeRoles: ["RN"],
  }),
  /** Legacy catalog id — preserved for persisted enterpriseProcedureId references. */
  procedure({
    id: "cardiac_monitoring",
    displayNameEn: "Cardiac monitoring",
    displayNameFr: "Surveillance cardiaque",
    aliases: ["telemetry", "cardiac monitor", "continuous monitoring cardiac"],
    category: "CARDIAC_RESPIRATORY",
    chargeMapping: INSTITUTION_POLICY_CPT,
    billingMappingStatus: "FUTURE_CHARGE_MASTER",
    performerRoleHints: ["RN"],
    executionRoleCategory: "NURSING",
    acknowledgeRoles: ["RN"],
    completeRoles: ["RN"],
  }),
  procedure({
    id: "defibrillation_assist",
    displayNameEn: "Defibrillation assist",
    displayNameFr: "Assistance à la défibrillation",
    aliases: ["defib", "defibrillation", "aed assist"],
    category: "CARDIAC_RESPIRATORY",
    performerRoleHints: ["RN", "PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "cardioversion_assist",
    displayNameEn: "Cardioversion assist",
    displayNameFr: "Assistance à la cardioversion",
    aliases: ["cardioversion", "synchronized cardioversion"],
    category: "CARDIAC_RESPIRATORY",
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),

  // Vascular / access
  procedure({
    id: "peripheral_iv_placement",
    displayNameEn: "Peripheral IV placement",
    displayNameFr: "Pose de voie IV périphérique",
    aliases: ["iv", "piv", "peripheral iv", "iv start"],
    category: "VASCULAR_ACCESS",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "central_line_placement",
    displayNameEn: "Central line placement",
    displayNameFr: "Pose de cathéter central",
    aliases: ["central", "central line", "cvc", "central venous catheter"],
    category: "VASCULAR_ACCESS",
    documentationTemplateId: "CENTRAL_LINE",
    chargeMapping: CODER_REVIEW_CPT,
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
    completionRoleHints: ["PROVIDER", "RN"],
  }),
  procedure({
    id: "arterial_line_placement",
    displayNameEn: "Arterial line placement",
    displayNameFr: "Pose de cathéter artériel",
    aliases: ["a-line", "arterial line", "art line"],
    category: "VASCULAR_ACCESS",
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "io_access",
    displayNameEn: "IO access",
    displayNameFr: "Accès intra-osseux",
    aliases: ["intraosseous", "io line", "bone needle"],
    category: "VASCULAR_ACCESS",
    performerRoleHints: ["PROVIDER", "RN"],
  }),
  procedure({
    id: "blood_draw_specimen_collection",
    displayNameEn: "Blood draw / specimen collection",
    displayNameFr: "Prélèvement sanguin / collecte d'échantillon",
    aliases: ["blood draw", "phlebotomy", "specimen", "venipuncture"],
    category: "SPECIMEN_COLLECTION",
    performerRoleHints: ["RN", "TECH"],
    executionRoleCategory: "LAB",
    acknowledgeRoles: ["LAB_TECH", "RN"],
    completeRoles: ["LAB_TECH", "RN"],
  }),

  // Wound / trauma
  procedure({
    id: "laceration_repair",
    displayNameEn: "Laceration repair",
    displayNameFr: "Suture de lacération",
    aliases: ["lac", "laceration", "suture", "wound repair"],
    category: "WOUND_CARE",
    documentationTemplateId: "LACERATION",
    chargeMapping: CODER_REVIEW_CPT,
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
    completionRoleHints: ["PROVIDER", "RN"],
  }),
  procedure({
    id: "wound_care",
    displayNameEn: "Wound care",
    displayNameFr: "Soins de plaie",
    aliases: ["wound dressing", "wound management"],
    category: "WOUND_CARE",
    documentationTemplateId: "WOUND_CARE",
    performerRoleHints: ["RN", "PROVIDER"],
  }),
  procedure({
    id: "dressing_change",
    displayNameEn: "Dressing change",
    displayNameFr: "Changement de pansement",
    aliases: ["dressing", "bandage change"],
    category: "WOUND_CARE",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "incision_and_drainage",
    displayNameEn: "Incision and drainage",
    displayNameFr: "Incision et drainage",
    aliases: ["i&d", "i and d", "abscess drainage"],
    category: "WOUND_CARE",
    documentationTemplateId: "INCISION_AND_DRAINAGE",
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "splint_application",
    displayNameEn: "Splint application",
    displayNameFr: "Pose d'attelle",
    aliases: ["splint", "immobilization"],
    category: "ORTHOPEDIC",
    documentationTemplateId: "SPLINT_APPLICATION",
    performerRoleHints: ["RN", "PROVIDER"],
  }),
  procedure({
    id: "reduction",
    displayNameEn: "Reduction",
    displayNameFr: "Réduction",
    aliases: ["fracture reduction", "joint reduction"],
    category: "ORTHOPEDIC",
    documentationTemplateId: "REDUCTION",
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "foreign_body_removal",
    displayNameEn: "Foreign body removal",
    displayNameFr: "Retrait de corps étranger",
    aliases: ["fb removal", "foreign body"],
    category: "WOUND_CARE",
    performerRoleHints: ["PROVIDER", "RN"],
  }),
  procedure({
    id: "burn_care",
    displayNameEn: "Burn care",
    displayNameFr: "Soins des brûlures",
    aliases: ["burn dressing", "burn treatment"],
    category: "WOUND_CARE",
    performerRoleHints: ["RN", "PROVIDER"],
  }),

  // GU
  procedure({
    id: "foley_catheter",
    displayNameEn: "Foley catheter",
    displayNameFr: "Sonde urinaire (Foley)",
    aliases: ["foley", "cath", "urinary catheter", "foley insertion"],
    category: "GU",
    documentationTemplateId: "FOLEY_CATHETER",
    chargeMapping: NURSING_PROCEDURE_REVIEW,
    performerRoleHints: ["RN", "PROVIDER"],
    executionRoleCategory: "NURSING",
    acknowledgeRoles: ["RN"],
    completeRoles: ["RN"],
  }),
  procedure({
    id: "urinary_catheter_insertion",
    displayNameEn: "Urinary catheter insertion",
    displayNameFr: "Pose de sonde urinaire",
    aliases: ["cath", "catheter insertion", "bladder catheter"],
    category: "GU",
    documentationTemplateId: "FOLEY_CATHETER",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "bladder_scan",
    displayNameEn: "Bladder scan",
    displayNameFr: "Échographie vésicale",
    aliases: ["bladder volume", "portable bladder scan"],
    category: "GU",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "urine_collection",
    displayNameEn: "Urine collection",
    displayNameFr: "Collecte d'urine",
    aliases: ["urine", "clean catch", "urine sample"],
    category: "SPECIMEN_COLLECTION",
    documentationTemplateId: "URINE_COLLECTION",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "pregnancy_test",
    displayNameEn: "Pregnancy test",
    displayNameFr: "Test de grossesse",
    aliases: ["upt", "hcg test", "urine pregnancy"],
    category: "SPECIMEN_COLLECTION",
    documentationTemplateId: "PREGNANCY_TEST",
    performerRoleHints: ["RN"],
  }),

  // GI / bedside
  procedure({
    id: "ng_tube_placement",
    displayNameEn: "NG tube placement",
    displayNameFr: "Pose de sonde nasogastrique",
    aliases: ["ng tube", "nasogastric tube", "og tube assist"],
    category: "GI",
    performerRoleHints: ["PROVIDER", "RN"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "rectal_exam_assist",
    displayNameEn: "Rectal exam assist",
    displayNameFr: "Assistance examen rectal",
    aliases: ["rectal exam", "rectal assessment assist"],
    category: "GI",
    performerRoleHints: ["RN"],
    assistingRoleHints: ["PROVIDER"],
  }),

  // Neuro / sedation
  procedure({
    id: "lumbar_puncture",
    displayNameEn: "Lumbar puncture",
    displayNameFr: "Ponction lombaire",
    aliases: ["lp", "spinal tap"],
    category: "NEURO",
    documentationTemplateId: "LUMBAR_PUNCTURE",
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "procedural_sedation",
    displayNameEn: "Procedural sedation",
    displayNameFr: "Sédation procédurale",
    aliases: ["sed", "sedation", "conscious sedation"],
    category: "SEDATION",
    documentationTemplateId: "PROCEDURAL_SEDATION",
    chargeMapping: CODER_REVIEW_CPT,
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "sedation_monitoring",
    displayNameEn: "Sedation monitoring",
    displayNameFr: "Surveillance de sédation",
    aliases: ["sed monitoring", "sedation monitor"],
    category: "SEDATION",
    performerRoleHints: ["RN"],
    assistingRoleHints: ["PROVIDER"],
  }),

  // Thoracic / abdominal
  procedure({
    id: "chest_tube",
    displayNameEn: "Chest tube",
    displayNameFr: "Drain thoracique",
    aliases: ["chest tube", "tube thoracostomy", "thoracostomy"],
    category: "OTHER",
    documentationTemplateId: "CHEST_TUBE",
    chargeMapping: CODER_REVIEW_CPT,
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "thoracentesis",
    displayNameEn: "Thoracentesis",
    displayNameFr: "Thoracentèse",
    aliases: ["pleural tap", "thoracentesis procedure"],
    category: "OTHER",
    documentationTemplateId: "THORACENTESIS_PARACENTESIS",
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),
  procedure({
    id: "paracentesis",
    displayNameEn: "Paracentesis",
    displayNameFr: "Paracentèse",
    aliases: ["abdominal tap", "ascites tap"],
    category: "OTHER",
    documentationTemplateId: "THORACENTESIS_PARACENTESIS",
    performerRoleHints: ["PROVIDER"],
    assistingRoleHints: ["RN"],
  }),

  // Nursing workflow / monitoring
  procedure({
    id: "patient_monitoring",
    displayNameEn: "Patient monitoring",
    displayNameFr: "Surveillance / monitoring",
    aliases: ["monitoring", "continuous monitoring", "observation monitoring"],
    category: "MONITORING",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "glucose_check",
    displayNameEn: "Glucose check",
    displayNameFr: "Glycémie capillaire",
    aliases: ["glucose", "fingerstick", "capillary glucose", "blood sugar"],
    category: "MONITORING",
    documentationTemplateId: "GLUCOSE_CHECK",
    performerRoleHints: ["RN"],
    executionRoleCategory: "NURSING",
    acknowledgeRoles: ["RN"],
    completeRoles: ["RN"],
  }),
  procedure({
    id: "patient_transport",
    displayNameEn: "Patient transport",
    displayNameFr: "Transport du patient",
    aliases: ["transport", "transfer preparation", "intrahospital transport"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
    executionRoleCategory: "NURSING",
    acknowledgeRoles: ["RN"],
    completeRoles: ["RN"],
  }),
  procedure({
    id: "procedure_assist",
    displayNameEn: "Procedure assist",
    displayNameFr: "Assistance procédurale",
    aliases: ["assist", "procedure support", "bedside assist"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
    assistingRoleHints: ["PROVIDER"],
  }),
  procedure({
    id: "chaperone_specimen_support",
    displayNameEn: "Chaperone / specimen support",
    displayNameFr: "Chaperon / support prélèvement",
    aliases: ["chaperone", "specimen support", "collection assist"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "iv_fluids_setup",
    displayNameEn: "IV fluids setup",
    displayNameFr: "Mise en place perfusion IV",
    aliases: ["iv fluids", "fluid setup", "iv setup"],
    category: "VASCULAR_ACCESS",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "blood_culture_collection",
    displayNameEn: "Blood culture collection",
    displayNameFr: "Prélèvement hémoculture",
    aliases: ["blood culture", "culture collection"],
    category: "SPECIMEN_COLLECTION",
    performerRoleHints: ["RN", "TECH"],
  }),
  procedure({
    id: "respiratory_treatment",
    displayNameEn: "Respiratory treatment",
    displayNameFr: "Traitement respiratoire",
    aliases: ["respiratory care", "breathing treatment"],
    category: "AIRWAY",
    performerRoleHints: ["RN", "RT"],
  }),
  procedure({
    id: "fall_precautions",
    displayNameEn: "Fall precautions",
    displayNameFr: "Précautions contre les chutes",
    aliases: ["fall risk", "fall prevention"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "isolation_precautions",
    displayNameEn: "Isolation precautions",
    displayNameFr: "Précautions d'isolement",
    aliases: ["isolation", "contact precautions"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "npo_status",
    displayNameEn: "NPO status",
    displayNameFr: "Statut NPO",
    aliases: ["npo", "nothing by mouth"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "oral_challenge",
    displayNameEn: "Oral challenge",
    displayNameFr: "Épreuve orale",
    aliases: ["po challenge", "oral intake trial"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "ambulation_trial",
    displayNameEn: "Ambulation trial",
    displayNameFr: "Essai d'ambulation",
    aliases: ["ambulation", "walk trial"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "discharge_teaching",
    displayNameEn: "Discharge teaching",
    displayNameFr: "Enseignement de sortie",
    aliases: ["discharge instructions", "patient teaching"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
  }),
  procedure({
    id: "transfer_preparation",
    displayNameEn: "Transfer preparation",
    displayNameFr: "Préparation au transfert",
    aliases: ["transfer prep", "admission transfer prep"],
    category: "NURSING_TASK",
    performerRoleHints: ["RN"],
  }),
];

export function enterpriseProcedureById(id: string): EnterpriseProcedureDefinition | undefined {
  return ENTERPRISE_PROCEDURE_CATALOG.find((entry) => entry.id === id);
}

export function resolveEnterpriseProcedureDisplayName(
  procedureDef: EnterpriseProcedureDefinition,
  locale: "en" | "fr"
): string {
  return locale === "fr" ? procedureDef.displayNameFr : procedureDef.displayNameEn;
}

export function enterpriseProcedureCategoryLabel(
  category: EnterpriseProcedureCategory,
  locale: "en" | "fr"
): string {
  const labelsEn: Record<EnterpriseProcedureCategory, string> = {
    AIRWAY: "Airway",
    CARDIAC_RESPIRATORY: "Cardiac / respiratory",
    VASCULAR_ACCESS: "Vascular access",
    WOUND_CARE: "Wound care",
    ORTHOPEDIC: "Orthopedic",
    GU: "GU",
    GI: "GI",
    NEURO: "Neuro",
    SEDATION: "Sedation",
    NURSING_TASK: "Nursing task",
    MONITORING: "Monitoring",
    SPECIMEN_COLLECTION: "Specimen collection",
    OTHER: "Other",
  };
  const labelsFr: Record<EnterpriseProcedureCategory, string> = {
    AIRWAY: "Voies aériennes",
    CARDIAC_RESPIRATORY: "Cardiaque / respiratoire",
    VASCULAR_ACCESS: "Accès vasculaire",
    WOUND_CARE: "Soins de plaie",
    ORTHOPEDIC: "Orthopédie",
    GU: "GU",
    GI: "GI",
    NEURO: "Neuro",
    SEDATION: "Sédation",
    NURSING_TASK: "Tâche infirmière",
    MONITORING: "Surveillance",
    SPECIMEN_COLLECTION: "Collecte d'échantillon",
    OTHER: "Autre",
  };
  return locale === "fr" ? labelsFr[category] : labelsEn[category];
}
