/**
 * Phase 1 clinical templates and dropdown options (static, French).
 * Lightweight config for faster documentation; no admin template builder.
 *
 * Deferred for later: backend-seeded reference data, admin UI to edit templates,
 * full template engine (variables, conditional sections), facility-specific lists.
 */

/** Common visit reasons for dropdown / quick select (motif de visite). */
export const COMMON_VISIT_REASONS = [
  "Fièvre",
  "Toux / infection respiratoire",
  "Douleur abdominale",
  "Diarrhée / gastro-entérite",
  "Plaie / traumatisme",
  "Maux de tête",
  "Douleur thoracique",
  "Contrôle / suivi",
  "Vaccination",
  "Renouvellement ordonnance",
  "Pansement / soins plaie",
  "Examen de santé",
  "Autre",
] as const;

/** Common diagnoses for dropdown (code + French label). CIM-10–style codes. */
export const COMMON_DIAGNOSES: Array<{ code: string; label: string }> = [
  { code: "J06.9", label: "Infection aiguë des voies respiratoires, sans précision" },
  { code: "J00", label: "Rhinopharyngite aiguë [rhume banal]" },
  { code: "J02.9", label: "Pharyngite aiguë, sans précision" },
  { code: "J03.9", label: "Amygdalite aiguë, sans précision" },
  { code: "K59.1", label: "Diarrhée fonctionnelle" },
  { code: "A09", label: "Diarrhée et gastro-entérite d'origine présumée infectieuse" },
  { code: "R50.9", label: "Fièvre, sans précision" },
  { code: "R10.4", label: "Douleurs abdominales, autres et sans précision" },
  { code: "R51", label: "Céphalée" },
  { code: "I10", label: "Hypertension essentielle (primitive)" },
  { code: "E11.9", label: "Diabète sucré de type 2, sans complication" },
  { code: "B34.9", label: "Infection virale, sans précision" },
  { code: "L08.9", label: "Infection locale de la peau et du tissu sous-cutané, sans précision" },
  { code: "S01.9", label: "Plaie ouverte de la tête, partie non précisée" },
  { code: "Z23", label: "Besoin de vaccination contre une maladie bactérienne" },
  { code: "Z00.0", label: "Examen médical général de suivi" },
];

/** Quick-insert snippets for nursing / general consultation notes (Notes de consultation). */
export const COMMON_NOTE_SNIPPETS = [
  "Patient vu en consultation. Pas d'alerte.",
  "Constantes dans les normes. Pas de fièvre.",
  "Pansement effectué. Plaie propre.",
  "Conseils hygiéno-diététiques donnés.",
  "Patient orienté vers médecin / spécialiste.",
  "Ordonnance expliquée au patient.",
  "Rendez-vous de suivi fixé.",
  "Refus de soins noté.",
  "Traduction / accompagnant assuré.",
  "Patient non présent au rendez-vous.",
];

/** Quick-insert snippets for clinician impression (Impression clinique). */
export const PROVIDER_IMPRESSION_SNIPPETS = [
  "Examen clinique rassurant.",
  "Pas de signe de gravité.",
  "Diagnostic de présomption : infection virale banale.",
  "Symptomatologie en faveur d'une origine infectieuse.",
  "Bilan à compléter selon évolution.",
  "Patient stable. Pas d'orientation hospitalière.",
  "Contexte fébrile / douleur maîtrisé.",
  "Examen cardiopulmonaire sans particularité.",
  "Abdomen souple, non douloureux.",
];

/** Quick-insert snippets for treatment plan (Plan de traitement). */
export const PROVIDER_PLAN_SNIPPETS = [
  "Traitement symptomatique. Repos. Hydratation.",
  "Antibiothérapie si pas d'amélioration sous 48–72 h.",
  "Contrôle des constantes à domicile.",
  "Reconsulter si aggravation (fièvre persistante, difficultés respiratoires).",
  "Suivi en soins primaires.",
  "Examens complémentaires demandés (NFS, CRP si besoin).",
  "Éducation du patient sur signes d'alerte.",
  "Arrêt de travail / arrêt scolaire si indiqué.",
];
