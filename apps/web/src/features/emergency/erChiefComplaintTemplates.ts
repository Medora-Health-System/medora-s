/**
 * Deterministic ER chief-complaint templates for triage (bilingual FR/EN catalog).
 * No diagnoses, exam findings, or orders — chief complaint + optional narrative starter only.
 */

import type { SupportedLanguage } from "@/i18n/config";

export type ErChiefComplaintBilingual = { fr: string; en: string };

export type ErChiefComplaintTemplate = {
  id: string;
  label: ErChiefComplaintBilingual;
  searchTermsFr: string[];
  searchTermsEn: string[];
  category?: string;
  chiefComplaint: ErChiefComplaintBilingual;
  /** Prefills `medoraErTriageV1.triageNarrative` when that field is empty. */
  triageNarrativeStarter?: ErChiefComplaintBilingual;
};

export function pickChiefComplaintLocale(b: ErChiefComplaintBilingual, locale: SupportedLanguage): string {
  return locale === "en" ? b.en : b.fr;
}

export const ER_CHIEF_COMPLAINT_TEMPLATES: readonly ErChiefComplaintTemplate[] = [
  {
    id: "chest_pain",
    label: { fr: "Douleur thoracique", en: "Chest pain" },
    searchTermsFr: ["thorax", "thoracique", "precordial", "coeur", "cœur"],
    searchTermsEn: ["chest", "thoracic", "precordial", "heart"],
    chiefComplaint: { fr: "Douleur thoracique", en: "Chest pain" },
    triageNarrativeStarter: {
      fr: "Plainte de douleur thoracique ; caractères, irradiation et facteurs associés à préciser.",
      en: "Chest pain complaint; characterize radiation and associated factors.",
    },
  },
  {
    id: "dyspnea",
    label: { fr: "Dyspnée", en: "Dyspnea" },
    searchTermsFr: ["dyspnee", "dyspnée", "essoufflement", "souffle", "respiration"],
    searchTermsEn: ["dyspnea", "shortness", "breath", "sob", "respiratory"],
    chiefComplaint: { fr: "Dyspnée", en: "Dyspnea" },
    triageNarrativeStarter: {
      fr: "Gêne respiratoire ; début et évolution à préciser.",
      en: "Respiratory discomfort; document onset and course.",
    },
  },
  {
    id: "abdominal_pain",
    label: { fr: "Douleur abdominale", en: "Abdominal pain" },
    searchTermsFr: ["abdomen", "ventre", "digestif", "nausée"],
    searchTermsEn: ["abdomen", "belly", "stomach", "gi", "nausea"],
    chiefComplaint: { fr: "Douleur abdominale", en: "Abdominal pain" },
    triageNarrativeStarter: {
      fr: "Douleur abdominale ; localisation et évolution à préciser.",
      en: "Abdominal pain; document location and course.",
    },
  },
  {
    id: "headache",
    label: { fr: "Céphalée", en: "Headache" },
    searchTermsFr: ["cephalée", "céphalée", "mal de tête", "migraine"],
    searchTermsEn: ["headache", "cephalalgia", "migraine"],
    chiefComplaint: { fr: "Céphalée", en: "Headache" },
    triageNarrativeStarter: {
      fr: "Céphalée ; intensité et modalités à préciser.",
      en: "Headache; document intensity and pattern.",
    },
  },
  {
    id: "fever",
    label: { fr: "Fièvre", en: "Fever" },
    searchTermsFr: ["fièvre", "fievre", "température", "froid", "frissons"],
    searchTermsEn: ["fever", "temperature", "chills"],
    chiefComplaint: { fr: "Fièvre", en: "Fever" },
    triageNarrativeStarter: {
      fr: "Fièvre rapportée ; durée et signes associés à préciser.",
      en: "Reported fever; document duration and associated symptoms.",
    },
  },
  {
    id: "weakness",
    label: { fr: "Faiblesse / malaise", en: "Weakness / malaise" },
    searchTermsFr: ["faiblesse", "malaise", "asthénie", "fatigue"],
    searchTermsEn: ["weakness", "malaise", "fatigue", "asthenia"],
    chiefComplaint: { fr: "Faiblesse / malaise", en: "Weakness / malaise" },
    triageNarrativeStarter: {
      fr: "Faiblesse ou malaise ; contexte et chronologie à préciser.",
      en: "Weakness or malaise; document context and timeline.",
    },
  },
  {
    id: "dizziness",
    label: { fr: "Étourdissement / syncope", en: "Dizziness / syncope" },
    searchTermsFr: ["étourdissement", "etourdissement", "syncope", "lipothymie", "vertige"],
    searchTermsEn: ["dizziness", "syncope", "lightheaded", "vertigo"],
    chiefComplaint: { fr: "Étourdissement / syncope", en: "Dizziness / syncope" },
    triageNarrativeStarter: {
      fr: "Symptômes neurovégétatifs ; circonstances et récupération à préciser.",
      en: "Presyncope/syncope symptoms; document circumstances and recovery.",
    },
  },
  {
    id: "neuro_stroke",
    label: { fr: "Déficit neurologique / suspicion AVC", en: "Neurologic deficit / stroke concern" },
    searchTermsFr: ["avc", "neuro", "déficit", "paralysie", "parole", "visage"],
    searchTermsEn: ["stroke", "neuro", "deficit", "weakness", "speech", "face"],
    chiefComplaint: {
      fr: "Déficit neurologique / suspicion AVC",
      en: "Neurologic deficit / stroke concern",
    },
    triageNarrativeStarter: {
      fr: "Symptômes neurologiques en cours ; heure de début et évolution à préciser (filière selon protocole local).",
      en: "Acute neurologic symptoms; document onset time and course (local pathway).",
    },
  },
  {
    id: "trauma",
    label: { fr: "Traumatisme", en: "Trauma" },
    searchTermsFr: ["trauma", "accident", "choc", "blessure"],
    searchTermsEn: ["trauma", "accident", "injury", "mva"],
    chiefComplaint: { fr: "Traumatisme", en: "Trauma" },
    triageNarrativeStarter: {
      fr: "Traumatisme ; mécanisme et lésions perçues à préciser.",
      en: "Trauma; document mechanism and perceived injuries.",
    },
  },
  {
    id: "fall",
    label: { fr: "Chute", en: "Fall" },
    searchTermsFr: ["chute", "tomber", "glissade"],
    searchTermsEn: ["fall", "fell", "slip"],
    chiefComplaint: { fr: "Chute", en: "Fall" },
    triageNarrativeStarter: {
      fr: "Chute ; circonstances et traumatisme associé à préciser.",
      en: "Fall; document circumstances and associated injury.",
    },
  },
  {
    id: "laceration",
    label: { fr: "Plaie / lacération", en: "Wound / laceration" },
    searchTermsFr: ["plaie", "coupure", "laceration", "suture", "sang"],
    searchTermsEn: ["wound", "laceration", "cut", "bleeding", "suture"],
    chiefComplaint: { fr: "Plaie / lacération", en: "Wound / laceration" },
    triageNarrativeStarter: {
      fr: "Plaie ; siège, ampleur et antécédent tétanique à préciser si indiqué.",
      en: "Wound; document site, extent, and tetanus status if relevant.",
    },
  },
  {
    id: "gastro",
    label: { fr: "Vomissements / diarrhée", en: "Vomiting / diarrhea" },
    searchTermsFr: ["vomissement", "diarrhée", "diarrhee", "nausée", "gastro"],
    searchTermsEn: ["vomit", "vomiting", "diarrhea", "nausea", "gastro"],
    chiefComplaint: { fr: "Vomissements / diarrhée", en: "Vomiting / diarrhea" },
    triageNarrativeStarter: {
      fr: "Troubles digestifs ; hydratation et contexte à préciser.",
      en: "GI symptoms; document hydration status and context.",
    },
  },
  {
    id: "back_pain",
    label: { fr: "Douleur lombaire", en: "Low back pain" },
    searchTermsFr: ["lombaire", "dos", "rachis", "sciatique"],
    searchTermsEn: ["back", "lumbar", "sciatica", "spine"],
    chiefComplaint: { fr: "Douleur lombaire", en: "Low back pain" },
    triageNarrativeStarter: {
      fr: "Douleur du rachis ; irradiation et facteurs déclenchants à préciser.",
      en: "Spinal pain; document radiation and triggers.",
    },
  },
  {
    id: "limb_pain",
    label: { fr: "Douleur du membre", en: "Limb pain" },
    searchTermsFr: ["membre", "bras", "jambe", "cheville", "poignet"],
    searchTermsEn: ["limb", "arm", "leg", "ankle", "wrist"],
    chiefComplaint: { fr: "Douleur du membre", en: "Limb pain" },
    triageNarrativeStarter: {
      fr: "Douleur localisée au membre ; mécanisme et fonction à préciser.",
      en: "Localized limb pain; document mechanism and function.",
    },
  },
  {
    id: "allergy",
    label: { fr: "Réaction allergique", en: "Allergic reaction" },
    searchTermsFr: ["allergie", "allergique", "urticaire", "anaphylaxie", "choc allergique"],
    searchTermsEn: ["allergy", "allergic", "urticaria", "anaphylaxis"],
    chiefComplaint: { fr: "Réaction allergique", en: "Allergic reaction" },
    triageNarrativeStarter: {
      fr: "Réaction allergique suspectée ; exposition et signes à préciser.",
      en: "Suspected allergic reaction; document exposure and symptoms.",
    },
  },
  {
    id: "palpitations",
    label: { fr: "Palpitations", en: "Palpitations" },
    searchTermsFr: ["palpitation", "battements", "arythmie"],
    searchTermsEn: ["palpitation", "palpitations", "arrhythmia"],
    chiefComplaint: { fr: "Palpitations", en: "Palpitations" },
    triageNarrativeStarter: {
      fr: "Palpitations ; durée et signes associés à préciser.",
      en: "Palpitations; document duration and associated symptoms.",
    },
  },
  {
    id: "respiratory_urd",
    label: { fr: "Toux / symptômes respiratoires", en: "Cough / respiratory symptoms" },
    searchTermsFr: ["toux", "rhume", "écoulement", "respiratoire", "gorge"],
    searchTermsEn: ["cough", "cold", "runny", "respiratory", "throat"],
    chiefComplaint: {
      fr: "Toux / symptômes respiratoires",
      en: "Cough / respiratory symptoms",
    },
    triageNarrativeStarter: {
      fr: "Symptômes respiratoires hauts ; évolution et contexte à préciser.",
      en: "Upper respiratory symptoms; document course and context.",
    },
  },
  {
    id: "urinary",
    label: { fr: "Dysurie / symptômes urinaires", en: "Urinary symptoms" },
    searchTermsFr: ["urine", "brûlure", "miction", "infection urinaire", "IU"],
    searchTermsEn: ["urinary", "uti", "dysuria", "burning", "voiding"],
    chiefComplaint: { fr: "Symptômes urinaires", en: "Urinary symptoms" },
    triageNarrativeStarter: {
      fr: "Symptômes urinaires ; début et signes associés à préciser.",
      en: "Urinary symptoms; document onset and associated signs.",
    },
  },
  {
    id: "gyn_bleeding",
    label: { fr: "Saignement vaginal", en: "Vaginal bleeding" },
    searchTermsFr: ["gynéco", "grossesse", "règles", "métrorragie", "saignement"],
    searchTermsEn: ["gyn", "pregnancy", "periods", "bleeding", "vaginal"],
    chiefComplaint: { fr: "Saignement vaginal", en: "Vaginal bleeding" },
    triageNarrativeStarter: {
      fr: "Saignement génital ; contexte gynécologique et gravité à préciser.",
      en: "Genital bleeding; document gynecologic context and severity.",
    },
  },
  {
    id: "seizure",
    label: { fr: "Convulsions", en: "Seizure" },
    searchTermsFr: ["convulsion", "crise", "épilepsie", "épileptique"],
    searchTermsEn: ["seizure", "convulsion", "epilepsy"],
    chiefComplaint: { fr: "Convulsions", en: "Seizure" },
    triageNarrativeStarter: {
      fr: "Crise convulsive rapportée ; durée et récupération à préciser.",
      en: "Reported seizure; document duration and recovery.",
    },
  },
  {
    id: "ams",
    label: { fr: "Altération de l'état mental", en: "Altered mental status" },
    searchTermsFr: ["confusion", "agitation", "somnolence", "glasgow", "mental"],
    searchTermsEn: ["confusion", "ams", "agitation", "somnolence", "gcs"],
    chiefComplaint: { fr: "Altération de l'état mental", en: "Altered mental status" },
    triageNarrativeStarter: {
      fr: "Altération de l'état de conscience ou du comportement ; chronologie à préciser.",
      en: "Altered consciousness or behavior; document timeline.",
    },
  },
];

export function filterErChiefComplaintTemplates(
  query: string,
  locale: SupportedLanguage,
  catalog: readonly ErChiefComplaintTemplate[] = ER_CHIEF_COMPLAINT_TEMPLATES
): ErChiefComplaintTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...catalog];
  return catalog.filter((tpl) => {
    const label = pickChiefComplaintLocale(tpl.label, locale);
    const terms = locale === "en" ? tpl.searchTermsEn : tpl.searchTermsFr;
    if (label.toLowerCase().includes(q)) return true;
    if (tpl.id.toLowerCase().includes(q)) return true;
    return terms.some((s) => s.toLowerCase().includes(q));
  });
}
