/**
 * Phase 4 ED — behavioral health and toxicology order sets.
 */
import { care, lab, providerRoles, type EnterpriseOrderSetDefinition } from "../types.js";

export const BEHAVIORAL_TOX_ED_ORDER_SETS: readonly EnterpriseOrderSetDefinition[] = [
  {
    code: "ed_psychiatric_clearance_v1",
    displayNameEn: "Psychiatric Clearance",
    displayNameFr: "Évaluation psychiatrique",
    category: "BEHAVIORAL",
    department: "ED",
    clinicalDomain: "behavioral_psych_clearance",
    descriptionEn: "Psychiatric clearance and safety bundle.",
    descriptionFr: "Ensemble d'évaluation psychiatrique et de sécurité.",
    indicationKeywords: ["psychiatric clearance", "psych eval", "behavioral eval"],
    requiredItems: [
      care("psychiatryConsult", "Psychiatry consult", "Consultation psychiatrie", "psychiatry_consult"),
      care("constantObservation", "Constant observation", "Surveillance constante", "constant_observation"),
      care("suicidePrecautions", "Suicide precautions", "Précautions suicide", "suicide_precautions"),
    ],
    optionalItems: [
      lab("urineDrugScreen", "Urine drug screen", "Dépistage urinaire de drogues", "URINE_DRUG_SCREEN"),
      lab("ethanol", "Ethanol level", "Alcoolémie", "ETHANOL"),
      care("socialWorkConsult", "Social work consult", "Consultation travailleur social", "social_work_consult", {
        deferIfMissing: true,
      }),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "BOTH",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_suicidal_ideation_v1",
    displayNameEn: "Suicidal Ideation",
    displayNameFr: "Idéation suicidaire",
    category: "BEHAVIORAL",
    department: "ED",
    clinicalDomain: "behavioral_suicidal_ideation",
    descriptionEn: "Suicidal ideation safety bundle.",
    descriptionFr: "Ensemble de sécurité pour idéation suicidaire.",
    indicationKeywords: ["suicidal ideation", "si", "self harm"],
    requiredItems: [
      care("psychiatryConsult", "Psychiatry consult", "Consultation psychiatrie", "psychiatry_consult"),
      care("constantObservation", "Constant observation", "Surveillance constante", "constant_observation"),
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
    rolesAllowed: providerRoles,
    ageGroup: "BOTH",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_overdose_v1",
    displayNameEn: "Overdose / Toxic Ingestion",
    displayNameFr: "Surdose / ingestion toxique",
    category: "TOXICOLOGY",
    department: "ED",
    clinicalDomain: "toxicology_overdose",
    descriptionEn: "Overdose evaluation and monitoring bundle.",
    descriptionFr: "Ensemble d'évaluation et surveillance pour surdose.",
    indicationKeywords: ["overdose", "ingestion", "poisoning"],
    requiredItems: [
      care("vitalsQ15", "Vital signs q15", "Signes vitaux q15", "vitals_q15_document"),
      care("pulseOximetry", "Pulse oximetry", "Oxymétrie de pouls", "pulse_oximetry"),
      care("constantObservation", "Constant observation", "Surveillance constante", "constant_observation"),
    ],
    optionalItems: [
      lab("urineDrugScreen", "Urine drug screen", "Dépistage urinaire de drogues", "URINE_DRUG_SCREEN"),
      lab("ethanol", "Ethanol level", "Alcoolémie", "ETHANOL"),
      lab("cmp", "CMP", "Bilan métabolique complet", "CMP", ["ER_CMP"]),
      care("poisonControlConsult", "Poison control consult", "Consultation centre antipoison", "consult_poison_control", {
        deferIfMissing: true,
      }),
    ],
    warnings: [],
    rolesAllowed: providerRoles,
    ageGroup: "BOTH",
    version: "1.0.0",
    isActive: true,
    governanceLevel: "PHASE_4_ED",
  },
  {
    code: "ed_alcohol_withdrawal_v1",
    displayNameEn: "Alcohol Withdrawal",
    displayNameFr: "Sevrage alcoolique",
    category: "TOXICOLOGY",
    department: "ED",
    clinicalDomain: "toxicology_alcohol_withdrawal",
    descriptionEn: "Alcohol withdrawal monitoring bundle.",
    descriptionFr: "Ensemble de surveillance pour sevrage alcoolique.",
    indicationKeywords: ["alcohol withdrawal", "dt", "delirium tremens"],
    requiredItems: [
      care("vitalsQ15", "Vital signs q15", "Signes vitaux q15", "vitals_q15_document"),
      care("constantObservation", "Constant observation", "Surveillance constante", "constant_observation"),
      lab("cmp", "CMP", "Bilan métabolique complet", "CMP", ["ER_CMP"]),
    ],
    optionalItems: [
      lab("ethanol", "Ethanol level", "Alcoolémie", "ETHANOL"),
      care("psychiatryConsult", "Psychiatry consult", "Consultation psychiatrie", "psychiatry_consult", {
        deferIfMissing: true,
      }),
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
];
