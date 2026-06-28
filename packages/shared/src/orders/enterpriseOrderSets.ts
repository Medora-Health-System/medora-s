/**
 * MEDUI.ORDERSETS.ENTERPRISE_FOUNDATION_PHASE_1
 * Data-driven ED order-set registry — consumed by Create Order modal only.
 * Order creation still flows through standard POST /encounters/:id/orders and frozen lifecycle engine.
 */

export const ENTERPRISE_ORDER_SET_CATEGORIES = [
  "CARDIAC",
  "NEURO",
  "INFECTION",
  "TRAUMA",
  "RESPIRATORY",
  "SEDATION",
  "BEHAVIORAL",
] as const;

export type EnterpriseOrderSetCategory = (typeof ENTERPRISE_ORDER_SET_CATEGORIES)[number];

export const ENTERPRISE_ORDER_SET_AGE_GROUPS = ["ADULT", "PEDIATRIC", "BOTH"] as const;
export type EnterpriseOrderSetAgeGroup = (typeof ENTERPRISE_ORDER_SET_AGE_GROUPS)[number];

export const ENTERPRISE_ORDER_SET_ROLE_CODES = ["PROVIDER", "ADMIN", "RN"] as const;
export type EnterpriseOrderSetRoleCode = (typeof ENTERPRISE_ORDER_SET_ROLE_CODES)[number];

export const ENTERPRISE_ORDER_SET_ITEM_KINDS = [
  "LAB",
  "IMAGING",
  "MEDICATION",
  "CARE",
  "CUSTOM",
] as const;

export type EnterpriseOrderSetItemKind = (typeof ENTERPRISE_ORDER_SET_ITEM_KINDS)[number];

export type EnterpriseOrderSetItemRef = {
  /** Stable item key within the order set (unique per set). */
  key: string;
  kind: EnterpriseOrderSetItemKind;
  displayNameEn: string;
  displayNameFr: string;
  /** Primary catalog code (LAB_TEST / IMAGING_STUDY / MEDICATION). */
  catalogCode?: string;
  /** Acceptable facility catalog aliases (ER_* codes, successors). */
  catalogCodes?: readonly string[];
  fallbackSearchQuery?: string;
  /** Canonical care / procedure code (= enterpriseProcedureId). */
  enterpriseProcedureCode?: string;
  /** When true, item is not auto-resolved — clinician completes structured parameters (e.g. oxygen). */
  requiresStructuredParameters?: boolean;
  /** When true and catalog/procedure missing at facility, omit silently instead of blocking apply. */
  deferIfMissing?: boolean;
};

export type EnterpriseOrderSetWarning = {
  en: string;
  fr: string;
};

export type EnterpriseOrderSetDefinition = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  category: EnterpriseOrderSetCategory;
  department: "ED";
  clinicalDomain: string;
  descriptionEn: string;
  descriptionFr: string;
  indicationKeywords: readonly string[];
  requiredItems: readonly EnterpriseOrderSetItemRef[];
  optionalItems: readonly EnterpriseOrderSetItemRef[];
  mutuallyExclusiveGroups?: readonly (readonly string[])[];
  warnings: readonly EnterpriseOrderSetWarning[];
  rolesAllowed: readonly EnterpriseOrderSetRoleCode[];
  ageGroup: EnterpriseOrderSetAgeGroup;
  version: string;
  isActive: boolean;
  deprecatedBy?: string;
  governanceLevel: "PHASE_1_ED";
};

const lab = (
  key: string,
  displayNameEn: string,
  displayNameFr: string,
  catalogCode: string,
  catalogCodes: readonly string[] = []
): EnterpriseOrderSetItemRef => ({
  key,
  kind: "LAB",
  displayNameEn,
  displayNameFr,
  catalogCode,
  catalogCodes,
});

const imaging = (
  key: string,
  displayNameEn: string,
  displayNameFr: string,
  catalogCode: string,
  catalogCodes: readonly string[] = []
): EnterpriseOrderSetItemRef => ({
  key,
  kind: "IMAGING",
  displayNameEn,
  displayNameFr,
  catalogCode,
  catalogCodes,
});

const care = (
  key: string,
  displayNameEn: string,
  displayNameFr: string,
  enterpriseProcedureCode: string,
  options?: Pick<EnterpriseOrderSetItemRef, "requiresStructuredParameters" | "deferIfMissing">
): EnterpriseOrderSetItemRef => ({
  key,
  kind: "CARE",
  displayNameEn,
  displayNameFr,
  enterpriseProcedureCode,
  ...options,
});

export const ENTERPRISE_ORDER_SET_REGISTRY: readonly EnterpriseOrderSetDefinition[] = [
  {
    code: "ed_chest_pain_v1",
    displayNameEn: "Chest Pain",
    displayNameFr: "Douleur thoracique",
    category: "CARDIAC",
    department: "ED",
    clinicalDomain: "cardiac",
    descriptionEn: "Acute chest pain evaluation bundle.",
    descriptionFr: "Ensemble d'évaluation pour douleur thoracique aiguë.",
    indicationKeywords: ["chest pain", "acs", "angina"],
    requiredItems: [
      care("ekg12Lead", "EKG 12-Lead", "ECG 12 dérivations", "ekg_ecg"),
      care(
        "continuousCardiacMonitoring",
        "Continuous cardiac monitoring",
        "Surveillance cardiaque continue",
        "continuous_cardiac_monitoring"
      ),
      care("pulseOximetry", "Pulse oximetry", "Oxymétrie de pouls", "pulse_oximetry"),
      lab("troponin", "Troponin", "Troponine", "TROPONIN", ["TROP", "ER_TROP"]),
    ],
    optionalItems: [
      imaging("chestXray", "Chest X-ray", "Radiographie thoracique", "XR_CHEST"),
      care("oxygenTherapy", "Oxygen therapy", "Oxygénothérapie", "oxygen_therapy", {
        requiresStructuredParameters: true,
        deferIfMissing: true,
      }),
    ],
    warnings: [
      {
        en: "Complete structured oxygen parameters on the Care tab if oxygen is clinically indicated.",
        fr: "Complétez les paramètres d'oxygène structurés dans l'onglet Soins si l'oxygène est indiqué cliniquement.",
      },
    ],
    rolesAllowed: ["PROVIDER", "ADMIN"],
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_1_ED",
  },
  {
    code: "ed_stroke_alert_v1",
    displayNameEn: "Stroke Alert",
    displayNameFr: "Alerte AVC",
    category: "NEURO",
    department: "ED",
    clinicalDomain: "neuro_stroke",
    descriptionEn: "Stroke alert activation and neuro monitoring bundle.",
    descriptionFr: "Ensemble d'activation d'alerte AVC et de surveillance neurologique.",
    indicationKeywords: ["stroke", "tia", "neuro deficit"],
    requiredItems: [
      care("strokeAlert", "Stroke alert activation", "Activation alerte AVC", "stroke_alert_activation"),
      care("neuroChecks", "Neuro checks", "Surveillance neurologique", "neuro_check"),
      care(
        "swallowScreenBeforePo",
        "Swallow screen before first PO",
        "Dépistage de la déglutition avant la première prise PO",
        "swallowing_screen_required_before_first_po"
      ),
      care(
        "headOfBed30NeutralNeck",
        "Head of bed 30° and neck neutral",
        "Tête de lit à 30° et cou neutre",
        "head_of_bed_30_degrees_and_neck_neutral"
      ),
      care(
        "continuousCardiacMonitoring",
        "Continuous cardiac monitoring",
        "Surveillance cardiaque continue",
        "continuous_cardiac_monitoring"
      ),
      care(
        "vitalsQ15",
        "Vital signs q15",
        "Signes vitaux q15",
        "vitals_q15_document"
      ),
    ],
    optionalItems: [
      imaging("ctHead", "CT head", "TDM tête", "CT_HEAD_WO_CONTRAST", ["CT_HEAD"]),
      imaging("ctaHeadNeck", "CTA head/neck", "Angio-TDM tête/cou", "CTA_HEAD_NECK"),
      care("neurologyConsult", "Neurology consult", "Consultation neurologie", "neurology_consult", {
        deferIfMissing: true,
      }),
    ],
    warnings: [],
    rolesAllowed: ["PROVIDER", "ADMIN"],
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_1_ED",
  },
  {
    code: "ed_sepsis_v1",
    displayNameEn: "Sepsis",
    displayNameFr: "Sepsis",
    category: "INFECTION",
    department: "ED",
    clinicalDomain: "sepsis",
    descriptionEn: "Sepsis resuscitation and monitoring bundle.",
    descriptionFr: "Ensemble de réanimation et surveillance pour sepsis.",
    indicationKeywords: ["sepsis", "septic", "infection"],
    requiredItems: [
      care("septicTeam", "Septic team", "Équipe sepsis", "septic_team"),
      care(
        "bloodCultureBeforeAbx",
        "Blood culture before antibiotics",
        "Hémoculture avant antibiotiques",
        "blood_culture_collection"
      ),
      care("vitalsQ15", "Vital signs q15", "Signes vitaux q15", "vitals_q15_document"),
      care(
        "contactMdBolusComplete",
        "Contact MD when bolus complete",
        "Contacter le médecin à la fin du bolus",
        "contact_md_when_bolus_complete_for_sepsis_reassessment"
      ),
    ],
    optionalItems: [
      lab("lactate", "Lactate", "Lactate", "LACTATE", ["ER_LAC"]),
      lab("cbc", "CBC", "NFS", "CBC", ["ER_CBC"]),
      lab("cmp", "CMP", "Bilan métabolique complet", "CMP", ["ER_CMP"]),
      imaging("chestXray", "Chest X-ray", "Radiographie thoracique", "XR_CHEST"),
    ],
    warnings: [],
    rolesAllowed: ["PROVIDER", "ADMIN"],
    ageGroup: "BOTH",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_1_ED",
  },
  {
    code: "ed_trauma_activation_v1",
    displayNameEn: "Trauma Activation",
    displayNameFr: "Activation traumatologie",
    category: "TRAUMA",
    department: "ED",
    clinicalDomain: "trauma",
    descriptionEn: "Trauma team activation and initial stabilization bundle.",
    descriptionFr: "Ensemble d'activation d'équipe traumatologie et stabilisation initiale.",
    indicationKeywords: ["trauma", "mvc", "injury"],
    requiredItems: [
      care("traumaActivation", "Trauma activation", "Activation traumatologie", "trauma_team_activation"),
      care("cervicalCollar", "Cervical collar", "Collier cervical", "cervical_collar"),
      care("backBoard", "Back board", "Planche dorsale", "back_board"),
      care("logRoll", "Log roll", "Roulis en bloc", "log_roll"),
      care(
        "continuousCardiacMonitoring",
        "Continuous cardiac monitoring",
        "Surveillance cardiaque continue",
        "continuous_cardiac_monitoring"
      ),
    ],
    optionalItems: [
      care("massiveTransfusionProtocol", "Massive transfusion protocol", "Protocole transfusion massive", "massive_transfusion_protocol", {
        deferIfMissing: true,
      }),
      imaging("portableChestXray", "Portable chest X-ray", "Radiographie thoracique portable", "XR_CHEST"),
      lab("cbc", "CBC", "NFS", "CBC", ["ER_CBC"]),
      lab("typeScreen", "Type and screen", "Groupe sanguin et RAI", "TYPE_SCREEN", ["ER_BLOOD_TYPE"]),
      imaging("ctHead", "CT head", "TDM tête", "CT_HEAD_WO_CONTRAST", ["CT_HEAD"]),
      imaging("ctCervicalSpine", "CT cervical spine", "TDM rachis cervical", "CT_CERVICAL_SPINE"),
    ],
    warnings: [],
    rolesAllowed: ["PROVIDER", "ADMIN"],
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_1_ED",
  },
  {
    code: "ed_respiratory_distress_v1",
    displayNameEn: "Respiratory Distress",
    displayNameFr: "Détresse respiratoire",
    category: "RESPIRATORY",
    department: "ED",
    clinicalDomain: "respiratory",
    descriptionEn: "Respiratory distress monitoring and therapy bundle.",
    descriptionFr: "Ensemble de surveillance et thérapie pour détresse respiratoire.",
    indicationKeywords: ["dyspnea", "hypoxia", "respiratory distress"],
    requiredItems: [
      care("pulseOximetry", "Pulse oximetry", "Oxymétrie de pouls", "pulse_oximetry"),
      care("respiratoryTherapy", "Respiratory therapy request", "Demande de kinésithérapie respiratoire", "respiratory_treatment"),
    ],
    optionalItems: [
      care("oxygenTherapy", "Oxygen therapy", "Oxygénothérapie", "oxygen_therapy", {
        requiresStructuredParameters: true,
        deferIfMissing: true,
      }),
      care("bipap", "BiPAP RT request", "Demande BiPAP (RT)", "bipap_rt_request", { deferIfMissing: true }),
      care("cpap", "CPAP RT request", "Demande CPAP (RT)", "cpap_rt_request", { deferIfMissing: true }),
      imaging("chestXray", "Chest X-ray", "Radiographie thoracique", "XR_CHEST"),
      lab("abg", "ABG", "Gaz du sang artériel", "ABG", ["ER_ABG"]),
      lab("vbg", "VBG", "Gaz du sang veineux", "VBG", ["ER_VBG"]),
    ],
    warnings: [
      {
        en: "Oxygen therapy requires structured parameters — add from the Care tab after apply if selected.",
        fr: "L'oxygénothérapie nécessite des paramètres structurés — ajoutez depuis l'onglet Soins après application si sélectionnée.",
      },
    ],
    rolesAllowed: ["PROVIDER", "ADMIN"],
    ageGroup: "BOTH",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_1_ED",
  },
  {
    code: "ed_procedural_sedation_v1",
    displayNameEn: "Procedural Sedation",
    displayNameFr: "Sédation procédurale",
    category: "SEDATION",
    department: "ED",
    clinicalDomain: "sedation",
    descriptionEn: "Procedural sedation setup and monitoring bundle.",
    descriptionFr: "Ensemble de préparation et surveillance pour sédation procédurale.",
    indicationKeywords: ["sedation", "procedure"],
    requiredItems: [
      care("consentForSedation", "Obtain consent for sedation", "Obtenir le consentement pour sédation", "obtain_consent_for_sedation"),
      care("proceduralSedationSetup", "Set up procedural sedation", "Préparer la sédation procédurale", "procedural_sedation"),
      care("sedationMonitoring", "Sedation monitoring", "Surveillance de sédation", "sedation_monitoring"),
      care("etco2Monitoring", "EtCO2 monitoring", "Surveillance EtCO2", "etco2_monitoring"),
      care("respiratoryTherapy", "Respiratory therapy request", "Demande de kinésithérapie respiratoire", "respiratory_treatment"),
      care("suctionSetup", "Set up suction", "Préparer l'aspiration", "set_up_suction"),
      care(
        "continuousCardiacMonitoring",
        "Continuous cardiac monitoring",
        "Surveillance cardiaque continue",
        "continuous_cardiac_monitoring"
      ),
    ],
    optionalItems: [],
    warnings: [],
    rolesAllowed: ["PROVIDER", "ADMIN"],
    ageGroup: "BOTH",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_1_ED",
  },
  {
    code: "ed_behavioral_health_safety_v1",
    displayNameEn: "Behavioral Health / Safety",
    displayNameFr: "Santé comportementale / Sécurité",
    category: "BEHAVIORAL",
    department: "ED",
    clinicalDomain: "behavioral_health",
    descriptionEn: "Behavioral health consult and safety precautions bundle.",
    descriptionFr: "Ensemble de consultation santé comportementale et précautions de sécurité.",
    indicationKeywords: ["behavioral", "suicide", "psychiatric"],
    requiredItems: [
      care("behavioralHealthConsult", "Behavioral health consult", "Consultation santé comportementale", "psychiatry_consult"),
      care("sitterAtBedside", "Sitter at bedside", "Surveillance constante au chevet", "constant_observation"),
      care("suicidePrecautions", "Suicide precautions", "Précautions suicide", "suicide_precautions"),
      care("elopementPrecautions", "Elopement precautions", "Précautions fugue", "elopement_precautions"),
    ],
    optionalItems: [
      care("restraints", "Restraints (per protocol)", "Contention (selon protocole)", "restraints_application", {
        deferIfMissing: true,
      }),
    ],
    warnings: [
      {
        en: "Restraints require institutional protocol and governance review before placement.",
        fr: "La contention nécessite un protocole institutionnel et une revue de gouvernance avant placement.",
      },
    ],
    rolesAllowed: ["PROVIDER", "ADMIN"],
    ageGroup: "BOTH",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_1_ED",
  },
] as const;

export type EnterpriseOrderSetCode = (typeof ENTERPRISE_ORDER_SET_REGISTRY)[number]["code"];

export function activeEnterpriseOrderSets(): readonly EnterpriseOrderSetDefinition[] {
  return ENTERPRISE_ORDER_SET_REGISTRY.filter((set) => set.isActive && !set.deprecatedBy);
}

export function enterpriseOrderSetByCode(code: string): EnterpriseOrderSetDefinition | undefined {
  return ENTERPRISE_ORDER_SET_REGISTRY.find((set) => set.code === code);
}

export function allEnterpriseOrderSetItems(
  set: EnterpriseOrderSetDefinition
): readonly EnterpriseOrderSetItemRef[] {
  return [...set.requiredItems, ...set.optionalItems];
}

export function enterpriseOrderSetItemByKey(
  set: EnterpriseOrderSetDefinition,
  itemKey: string
): (EnterpriseOrderSetItemRef & { required: boolean }) | undefined {
  const required = set.requiredItems.find((item) => item.key === itemKey);
  if (required) return { ...required, required: true };
  const optional = set.optionalItems.find((item) => item.key === itemKey);
  if (optional) return { ...optional, required: false };
  return undefined;
}

export function defaultCheckedEnterpriseOrderSetItemKeys(set: EnterpriseOrderSetDefinition): string[] {
  return [...set.requiredItems.map((item) => item.key), ...set.optionalItems.map((item) => item.key)];
}

export function resolveEnterpriseOrderSetDisplayName(
  set: EnterpriseOrderSetDefinition,
  locale: "en" | "fr"
): string {
  return locale === "fr" ? set.displayNameFr : set.displayNameEn;
}

export function resolveEnterpriseOrderSetItemDisplayName(
  item: EnterpriseOrderSetItemRef,
  locale: "en" | "fr"
): string {
  return locale === "fr" ? item.displayNameFr : item.displayNameEn;
}

export function canRolePlaceEnterpriseOrderSet(input: {
  rolesAllowed: readonly EnterpriseOrderSetRoleCode[];
  canPrescribe: boolean;
  roleCodes: readonly string[];
}): boolean {
  if (input.canPrescribe) return true;
  const normalized = new Set(input.roleCodes.map((code) => code.toUpperCase()));
  if (normalized.has("ADMIN") || normalized.has("MEDORA_SUPER_ADMIN")) return true;
  return false;
}
