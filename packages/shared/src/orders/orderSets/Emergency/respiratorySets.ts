/**
 * Phase 4 ED — respiratory order sets.
 */
import { care, imaging, lab, providerRoles, type EnterpriseOrderSetDefinition } from "../types.js";

export const RESPIRATORY_ED_ORDER_SETS: readonly EnterpriseOrderSetDefinition[] = [
  {
    code: "ed_asthma_v1",
    displayNameEn: "Asthma Exacerbation",
    displayNameFr: "Exacerbation d'asthme",
    category: "RESPIRATORY",
    department: "ED",
    clinicalDomain: "respiratory_asthma",
    descriptionEn: "Asthma exacerbation monitoring and therapy bundle.",
    descriptionFr: "Ensemble de surveillance et thérapie pour exacerbation d'asthme.",
    indicationKeywords: ["asthma", "wheezing", "bronchospasm"],
    requiredItems: [
      care("pulseOximetry", "Pulse oximetry", "Oxymétrie de pouls", "pulse_oximetry"),
      care("nebulizerTreatment", "Nebulizer treatment", "Nébulisation", "nebulizer_treatment"),
      care("respiratoryTherapy", "Respiratory therapy request", "Demande de kinésithérapie respiratoire", "respiratory_treatment"),
    ],
    optionalItems: [
      care("oxygenTherapy", "Oxygen therapy", "Oxygénothérapie", "oxygen_therapy", {
        requiresStructuredParameters: true,
        deferIfMissing: true,
      }),
      imaging("chestXray", "Chest X-ray", "Radiographie thoracique", "XR_CHEST"),
      lab("abg", "ABG", "Gaz du sang artériel", "ABG", ["ER_ABG"]),
      care("peakFlow", "Peak flow RT request", "Demande débit expiratoire (RT)", "peak_flow_rt_request", {
        deferIfMissing: true,
      }),
    ],
    warnings: [
      {
        en: "Oxygen therapy requires structured parameters when selected.",
        fr: "L'oxygénothérapie nécessite des paramètres structurés si sélectionnée.",
      },
    ],
    rolesAllowed: providerRoles,
    ageGroup: "BOTH",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_copd_v1",
    displayNameEn: "COPD Exacerbation",
    displayNameFr: "Exacerbation de BPCO",
    category: "RESPIRATORY",
    department: "ED",
    clinicalDomain: "respiratory_copd",
    descriptionEn: "COPD exacerbation monitoring and therapy bundle.",
    descriptionFr: "Ensemble de surveillance et thérapie pour exacerbation de BPCO.",
    indicationKeywords: ["copd", "emphysema", "chronic bronchitis"],
    requiredItems: [
      care("pulseOximetry", "Pulse oximetry", "Oxymétrie de pouls", "pulse_oximetry"),
      care("nebulizerTreatment", "Nebulizer treatment", "Nébulisation", "nebulizer_treatment"),
      care("respiratoryTherapy", "Respiratory therapy request", "Demande de kinésithérapie respiratoire", "respiratory_treatment"),
    ],
    optionalItems: [
      care("oxygenTherapy", "Oxygen therapy", "Oxygénothérapie", "oxygen_therapy", {
        requiresStructuredParameters: true,
        deferIfMissing: true,
      }),
      care("bipap", "BiPAP RT request", "Demande BiPAP (RT)", "bipap_rt_request", { deferIfMissing: true }),
      imaging("chestXray", "Chest X-ray", "Radiographie thoracique", "XR_CHEST"),
      lab("abg", "ABG", "Gaz du sang artériel", "ABG", ["ER_ABG"]),
      lab("vbg", "VBG", "Gaz du sang veineux", "VBG", ["ER_VBG"]),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
];
