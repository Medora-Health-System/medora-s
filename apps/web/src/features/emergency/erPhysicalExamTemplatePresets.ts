/**
 * Deterministic ER physical exam template presets (French, clinician-style).
 * No exam findings invented; conservative phrasing; empty fields where risk of fabrication.
 */

import type { ErProviderMseForm } from "./emergencyProviderMseV1";

export type ErPhysicalExamTemplateId =
  | "normal"
  | "chest_pain"
  | "stroke"
  | "trauma"
  | "respiratory"
  | "abdominal";

export type ErPhysicalExamTemplateFields = Partial<
  Pick<
    ErProviderMseForm,
    | "examGeneralAppearance"
    | "examNeuroMental"
    | "examHeent"
    | "examCardiac"
    | "examRespiratory"
    | "examAbdomen"
    | "examMusculoskeletal"
    | "examSkin"
    | "examPsychBehavior"
    | "examReassessmentExtra"
  >
>;

export const ER_PHYSICAL_EXAM_TEMPLATE_ORDER: readonly ErPhysicalExamTemplateId[] = [
  "normal",
  "chest_pain",
  "stroke",
  "trauma",
  "respiratory",
  "abdominal",
] as const;

/** Keys merged when applying a preset (empty fields only). */
export const ER_PHYSICAL_EXAM_TEMPLATE_KEYS = [
  "examGeneralAppearance",
  "examNeuroMental",
  "examHeent",
  "examCardiac",
  "examRespiratory",
  "examAbdomen",
  "examMusculoskeletal",
  "examSkin",
  "examPsychBehavior",
  "examReassessmentExtra",
] as const satisfies readonly (keyof ErPhysicalExamTemplateFields)[];

/** Pure preset content — caller merges into empty exam fields only. */
export function getErPhysicalExamTemplatePreset(id: ErPhysicalExamTemplateId): ErPhysicalExamTemplateFields {
  switch (id) {
    case "normal":
      return {
        examGeneralAppearance: "Patient éveillé, à l’aise apparent, sans détresse visible à l’observation initiale.",
        examNeuroMental: "Contact et orientation à confirmer ; examen neurologique focalisé à compléter si indiqué.",
        examHeent: "À compléter selon le contexte.",
        examCardiac: "Auscultation cardiaque à compléter.",
        examRespiratory: "Auscultation pulmonaire à compléter.",
        examAbdomen: "Abdomen : examen à compléter.",
        examMusculoskeletal: "Appareil locomoteur : examen ciblé à compléter si indiqué.",
        examSkin: "Peau : lésions à noter si présentes.",
        examPsychBehavior: "Comportement : à corréler au contexte.",
        examReassessmentExtra: "",
      };
    case "chest_pain":
      return {
        examGeneralAppearance: "Patient en capacité de s’exprimer ; confort à préciser.",
        examNeuroMental: "Sans signe neurologique focal évident à l’interrogatoire initial.",
        examHeent: "",
        examCardiac: "Auscultation cardiaque à compléter (rythme, souffle, frottement péricardique si indiqué).",
        examRespiratory: "Auscultation pulmonaire à compléter (symétrie, crépitants). Saturation à corréler.",
        examAbdomen: "",
        examMusculoskeletal: "",
        examSkin: "",
        examPsychBehavior: "",
        examReassessmentExtra: "Douleur thoracique : corréler ECG, enzymes et imagerie selon protocole local.",
      };
    case "stroke":
      return {
        examGeneralAppearance: "",
        examNeuroMental:
          "Examen neurologique focalisé à compléter (force, sensibilité, vision, parole, marche). Ne pas inférer de déficit non observé.",
        examHeent: "",
        examCardiac: "Auscultation cardiaque à compléter si indiqué (arythmie, souffle).",
        examRespiratory: "",
        examAbdomen: "",
        examMusculoskeletal: "",
        examSkin: "",
        examPsychBehavior: "",
        examReassessmentExtra: "Tenir compte des horaires et du contexte clinique pour la suite diagnostique.",
      };
    case "trauma":
      return {
        examGeneralAppearance: "État hémodynamique et voies aériennes à réévaluer selon le mécanisme.",
        examNeuroMental: "Niveau de conscience et pupilles à documenter si pertinent.",
        examHeent: "Recherche de lésions cervico-faciales si mécanisme compatible.",
        examCardiac: "",
        examRespiratory: "Thorax : inspection, palpation, auscultation à compléter selon le mécanisme.",
        examAbdomen: "Abdomen : sensibilité, défense, bruits à compléter si pertinent.",
        examMusculoskeletal: "Palpation osseuse et articulaire ciblée selon les plaintes et le mécanisme.",
        examSkin: "Plaies, ecchymoses, brûlures à cartographier.",
        examPsychBehavior: "",
        examReassessmentExtra: "Immobilisation et imagerie selon protocole trauma local.",
      };
    case "respiratory":
      return {
        examGeneralAppearance: "Effort respiratoire et coloration cutanée à noter.",
        examNeuroMental: "",
        examHeent: "Voies aériennes supérieures si toux / stridor / suspicion obstruction.",
        examCardiac: "Auscultation cardiaque si dyspnée ou douleur associée.",
        examRespiratory:
          "Fréquence, symétrie, auscultation (ronchi, sibilants, crépitants) ; saturation à corréler.",
        examAbdomen: "",
        examMusculoskeletal: "",
        examSkin: "",
        examPsychBehavior: "",
        examReassessmentExtra: "",
      };
    case "abdominal":
      return {
        examGeneralAppearance: "Confort général et hydratation à noter.",
        examNeuroMental: "",
        examHeent: "",
        examCardiac: "",
        examRespiratory: "Bas de thorax / diaphragme si douleur référée ou dyspnée associée.",
        examAbdomen:
          "Inspection, auscultation des bruits, palpation superficielle puis profonde, signes d’irritation péritonéale si indiqués.",
        examMusculoskeletal: "",
        examSkin: "",
        examPsychBehavior: "",
        examReassessmentExtra: "",
      };
  }
}
