import type { MedicationSafetyClassifierDomain } from "./medicationSafetyClassifiers.js";
import {
  CONTROLLED_SUBSTANCE_CLASSES,
  HIGH_ALERT_CLASSES,
  LASA_RISK_LEVELS,
  MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS,
  MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT,
  SAFETY_REQUIREMENT_CODES,
} from "./medicationSafetyClassifiers.js";
import {
  assertMedicationSafetyClassifierManifest,
  type MedicationSafetyClassifierSeedEntry,
} from "./medicationSafetyClassifierValidation.js";

export type { MedicationSafetyClassifierSeedEntry };

export { MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS, MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT };

type LabelPair = { fr: string; en: string };

const CONTROLLED_LABELS: Record<(typeof CONTROLLED_SUBSTANCE_CLASSES)[number], LabelPair> = {
  CONTROLLED_NONE: { fr: "Non contrôlé", en: "Not controlled" },
  CONTROLLED_SCHEDULE_II: { fr: "Annexe II", en: "Schedule II" },
  CONTROLLED_SCHEDULE_III: { fr: "Annexe III", en: "Schedule III" },
  CONTROLLED_SCHEDULE_IV: { fr: "Annexe IV", en: "Schedule IV" },
  CONTROLLED_SCHEDULE_V: { fr: "Annexe V", en: "Schedule V" },
  CONTROLLED_OTHER: { fr: "Contrôlé (autre)", en: "Controlled (other)" },
};

const HIGH_ALERT_LABELS: Record<(typeof HIGH_ALERT_CLASSES)[number], LabelPair> = {
  HIGH_ALERT_NONE: { fr: "Sans alerte majeure", en: "Not high-alert" },
  HIGH_ALERT_INSULIN: { fr: "Insuline (alerte majeure)", en: "Insulin (high-alert)" },
  HIGH_ALERT_ANTICOAGULANT: { fr: "Anticoagulant (alerte majeure)", en: "Anticoagulant (high-alert)" },
  HIGH_ALERT_ELECTROLYTE: { fr: "Électrolyte (alerte majeure)", en: "Electrolyte (high-alert)" },
  HIGH_ALERT_OPIOID: { fr: "Opioïde (alerte majeure)", en: "Opioid (high-alert)" },
  HIGH_ALERT_BENZODIAZEPINE: { fr: "Benzodiazépine (alerte majeure)", en: "Benzodiazepine (high-alert)" },
  HIGH_ALERT_SEDATIVE: { fr: "Sédatif (alerte majeure)", en: "Sedative (high-alert)" },
  HIGH_ALERT_PARALYTIC: { fr: "Paralysant (alerte majeure)", en: "Paralytic (high-alert)" },
  HIGH_ALERT_VASOPRESSOR: { fr: "Vasopresseur (alerte majeure)", en: "Vasopressor (high-alert)" },
  HIGH_ALERT_ANTIARRHYTHMIC: { fr: "Antiarythmique (alerte majeure)", en: "Antiarrhythmic (high-alert)" },
  HIGH_ALERT_THROMBOLYTIC: { fr: "Thrombolytique (alerte majeure)", en: "Thrombolytic (high-alert)" },
  HIGH_ALERT_CHEMOTHERAPY: { fr: "Chimiothérapie (alerte majeure)", en: "Chemotherapy (high-alert)" },
  HIGH_ALERT_OTHER: { fr: "Alerte majeure (autre)", en: "High-alert (other)" },
};

const SAFETY_REQUIREMENT_LABELS: Record<(typeof SAFETY_REQUIREMENT_CODES)[number], LabelPair> = {
  REQUIRES_DUAL_VERIFICATION: { fr: "Double vérification requise", en: "Requires dual verification" },
  REQUIRES_INDEPENDENT_DOUBLE_CHECK: {
    fr: "Double contrôle indépendant requis",
    en: "Requires independent double-check",
  },
  REQUIRES_WITNESS: { fr: "Témoin requis", en: "Requires witness" },
  REQUIRES_WASTE_DOCUMENTATION: { fr: "Documentation des pertes requise", en: "Requires waste documentation" },
  REQUIRES_SHIFT_COUNT: { fr: "Comptage de relève requis", en: "Requires shift count" },
  REQUIRES_PHARMACY_VERIFICATION: { fr: "Vérification pharmacie requise", en: "Requires pharmacy verification" },
  REQUIRES_MAR_VERIFICATION: { fr: "Vérification MAR requise", en: "Requires MAR verification" },
  REQUIRES_OVERRIDE_REASON: { fr: "Motif de dérogation requis", en: "Requires override reason" },
  REQUIRES_COSIGN: { fr: "Contresignature requise", en: "Requires cosign" },
  REQUIRES_INVENTORY_TRACKING: { fr: "Suivi d'inventaire requis", en: "Requires inventory tracking" },
  REQUIRES_RECONCILIATION_REVIEW: {
    fr: "Revue de réconciliation requise",
    en: "Requires reconciliation review",
  },
};

const LASA_LABELS: Record<(typeof LASA_RISK_LEVELS)[number], LabelPair> = {
  LASA_NONE: { fr: "Sans LASA", en: "No LASA" },
  LASA_LOW: { fr: "LASA — risque faible", en: "LASA — low risk" },
  LASA_MEDIUM: { fr: "LASA — risque moyen", en: "LASA — medium risk" },
  LASA_HIGH: { fr: "LASA — risque élevé", en: "LASA — high risk" },
};

function entriesForDomain<D extends MedicationSafetyClassifierDomain>(
  domain: D,
  codes: readonly string[],
  labels: Record<string, LabelPair>,
  startPriority: number
): MedicationSafetyClassifierSeedEntry[] {
  return codes.map((code, index) => ({
    domain,
    code,
    sortPriority: startPriority + index * 10,
    labels: labels[code]!,
    aliases: [],
  }));
}

function buildManifest(): MedicationSafetyClassifierSeedEntry[] {
  return [
    ...entriesForDomain("CONTROLLED_SUBSTANCE", CONTROLLED_SUBSTANCE_CLASSES, CONTROLLED_LABELS, 0),
    ...entriesForDomain("HIGH_ALERT", HIGH_ALERT_CLASSES, HIGH_ALERT_LABELS, 0),
    ...entriesForDomain("SAFETY_REQUIREMENT", SAFETY_REQUIREMENT_CODES, SAFETY_REQUIREMENT_LABELS, 0),
    ...entriesForDomain("LASA", LASA_RISK_LEVELS, LASA_LABELS, 0),
  ];
}

/** Authoritative M1.3B classifier foundation manifest (TermClassifier seed source). */
export const MEDICATION_SAFETY_CLASSIFIER_MANIFEST: MedicationSafetyClassifierSeedEntry[] = buildManifest();

assertMedicationSafetyClassifierManifest(MEDICATION_SAFETY_CLASSIFIER_MANIFEST);
