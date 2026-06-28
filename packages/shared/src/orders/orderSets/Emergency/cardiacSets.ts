/**
 * Phase 4 ED — cardiac order sets.
 */
import { care, imaging, lab, providerRoles, type EnterpriseOrderSetDefinition } from "../types.js";

const cardiacMonitoring = [
  care("ekg12Lead", "EKG 12-Lead", "ECG 12 dérivations", "ekg_ecg"),
  care(
    "continuousCardiacMonitoring",
    "Continuous cardiac monitoring",
    "Surveillance cardiaque continue",
    "continuous_cardiac_monitoring"
  ),
  care("pulseOximetry", "Pulse oximetry", "Oxymétrie de pouls", "pulse_oximetry"),
];

export const CARDIAC_ED_ORDER_SETS: readonly EnterpriseOrderSetDefinition[] = [
  {
    code: "ed_chf_v1",
    displayNameEn: "CHF / Acute Heart Failure",
    displayNameFr: "Insuffisance cardiaque aiguë",
    category: "CARDIAC",
    department: "ED",
    clinicalDomain: "cardiac_chf",
    descriptionEn: "Acute decompensated heart failure evaluation bundle.",
    descriptionFr: "Ensemble d'évaluation pour insuffisance cardiaque aiguë décompensée.",
    indicationKeywords: ["chf", "heart failure", "dyspnea", "edema"],
    requiredItems: [...cardiacMonitoring, lab("bnp", "BNP", "BNP", "BNP", ["ER_BNP"])],
    optionalItems: [
      imaging("chestXray", "Chest X-ray", "Radiographie thoracique", "XR_CHEST"),
      care("oxygenTherapy", "Oxygen therapy", "Oxygénothérapie", "oxygen_therapy", {
        requiresStructuredParameters: true,
        deferIfMissing: true,
      }),
      care("cardiologyConsult", "Cardiology consult", "Consultation cardiologie", "cardiology_consult", {
        deferIfMissing: true,
      }),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_syncope_v1",
    displayNameEn: "Syncope",
    displayNameFr: "Syncope",
    category: "CARDIAC",
    department: "ED",
    clinicalDomain: "cardiac_syncope",
    descriptionEn: "Syncope evaluation and monitoring bundle.",
    descriptionFr: "Ensemble d'évaluation et surveillance pour syncope.",
    indicationKeywords: ["syncope", "faint", "passed out"],
    requiredItems: [
      ...cardiacMonitoring,
      care("orthostaticVitals", "Orthostatic vital signs", "Signes vitaux orthostatiques", "orthostatic_vital_signs"),
      care("vitalsQ15", "Vital signs q15", "Signes vitaux q15", "vitals_q15_document"),
    ],
    optionalItems: [
      lab("troponin", "Troponin", "Troponine", "TROPONIN", ["TROP", "ER_TROP"]),
      imaging("chestXray", "Chest X-ray", "Radiographie thoracique", "XR_CHEST"),
      care("telemetry", "Telemetry initiation", "Initiation télémétrie", "telemetry_initiation", {
        deferIfMissing: true,
      }),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_near_syncope_v1",
    displayNameEn: "Near Syncope / Presyncope",
    displayNameFr: "Présyncope",
    category: "CARDIAC",
    department: "ED",
    clinicalDomain: "cardiac_presyncope",
    descriptionEn: "Presyncope evaluation bundle.",
    descriptionFr: "Ensemble d'évaluation pour présyncope.",
    indicationKeywords: ["presyncope", "near syncope", "lightheaded"],
    requiredItems: [
      care("ekg12Lead", "EKG 12-Lead", "ECG 12 dérivations", "ekg_ecg"),
      care("pulseOximetry", "Pulse oximetry", "Oxymétrie de pouls", "pulse_oximetry"),
      care("orthostaticVitals", "Orthostatic vital signs", "Signes vitaux orthostatiques", "orthostatic_vital_signs"),
    ],
    optionalItems: [
      care(
        "continuousCardiacMonitoring",
        "Continuous cardiac monitoring",
        "Surveillance cardiaque continue",
        "continuous_cardiac_monitoring",
        { deferIfMissing: true }
      ),
      lab("glucose", "Glucose", "Glycémie", "GLU", ["ER_GLU"]),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_hypertensive_emergency_v1",
    displayNameEn: "Hypertensive Emergency",
    displayNameFr: "Urgence hypertensive",
    category: "CARDIAC",
    department: "ED",
    clinicalDomain: "cardiac_hypertension",
    descriptionEn: "Hypertensive emergency monitoring bundle.",
    descriptionFr: "Ensemble de surveillance pour urgence hypertensive.",
    indicationKeywords: ["hypertensive emergency", "severe hypertension", "end organ"],
    requiredItems: [
      care(
        "continuousCardiacMonitoring",
        "Continuous cardiac monitoring",
        "Surveillance cardiaque continue",
        "continuous_cardiac_monitoring"
      ),
      care("vitalsQ15", "Vital signs q15", "Signes vitaux q15", "vitals_q15_document"),
      lab("cmp", "CMP", "Bilan métabolique complet", "CMP", ["ER_CMP"]),
    ],
    optionalItems: [
      care("ekg12Lead", "EKG 12-Lead", "ECG 12 dérivations", "ekg_ecg"),
      imaging("ctHead", "CT head", "TDM tête", "CT_HEAD_WO_CONTRAST", ["CT_HEAD"]),
      care("cardiologyConsult", "Cardiology consult", "Consultation cardiologie", "cardiology_consult", {
        deferIfMissing: true,
      }),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_dvt_evaluation_v1",
    displayNameEn: "DVT Evaluation",
    displayNameFr: "Évaluation TVP",
    category: "CARDIAC",
    department: "ED",
    clinicalDomain: "vascular_dvt",
    descriptionEn: "Lower extremity DVT evaluation bundle.",
    descriptionFr: "Ensemble d'évaluation pour suspicion de TVP.",
    indicationKeywords: ["dvt", "leg swelling", "calf pain"],
    requiredItems: [
      lab("dDimer", "D-dimer", "D-dimères", "D_DIMER", ["DDIMER", "ER_DDM"]),
      imaging("venousDuplex", "Venous duplex ultrasound", "Écho-Doppler veineux", "US_VENOUS_DOPPLER_LE", [
        "DOPPLER_VEIN",
      ]),
    ],
    optionalItems: [
      lab("inr", "INR", "INR", "INR", ["PT_INR"]),
      care("peripheralIv", "Peripheral IV placement", "Pose de VVP", "peripheral_iv_placement", {
        deferIfMissing: true,
      }),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_pe_evaluation_v1",
    displayNameEn: "Pulmonary Embolism Evaluation",
    displayNameFr: "Évaluation embolie pulmonaire",
    category: "CARDIAC",
    department: "ED",
    clinicalDomain: "pulmonary_embolism",
    descriptionEn: "Pulmonary embolism evaluation bundle.",
    descriptionFr: "Ensemble d'évaluation pour suspicion d'embolie pulmonaire.",
    indicationKeywords: ["pe", "pulmonary embolism", "pleuritic chest pain"],
    requiredItems: [
      care("pulseOximetry", "Pulse oximetry", "Oxymétrie de pouls", "pulse_oximetry"),
      lab("dDimer", "D-dimer", "D-dimères", "D_DIMER", ["DDIMER", "ER_DDM"]),
      imaging("chestXray", "Chest X-ray", "Radiographie thoracique", "XR_CHEST"),
    ],
    optionalItems: [
      imaging("ctaChest", "CTA chest", "Angio-TDM thorax", "CTA_CHEST", ["CT_CHEST_CTA"]),
      care("oxygenTherapy", "Oxygen therapy", "Oxygénothérapie", "oxygen_therapy", {
        requiresStructuredParameters: true,
        deferIfMissing: true,
      }),
      care(
        "continuousCardiacMonitoring",
        "Continuous cardiac monitoring",
        "Surveillance cardiaque continue",
        "continuous_cardiac_monitoring",
        { deferIfMissing: true }
      ),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "ADULT",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
];
