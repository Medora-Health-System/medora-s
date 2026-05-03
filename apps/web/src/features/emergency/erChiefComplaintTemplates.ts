/**
 * Deterministic ER chief-complaint templates for triage (bilingual FR/EN catalog).
 * Chief complaint + optional editable prompt prefills (no asserted negatives, no orders).
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
  /** Optional prefills for `ErTriageV1Form` — applied only when the target field is empty (editable prompts). */
  ppePrecautions?: ErChiefComplaintBilingual;
  sourceRouting?: ErChiefComplaintBilingual;
  exceptionsToExpectedProfile?: ErChiefComplaintBilingual;
  careMonitoringSummary?: ErChiefComplaintBilingual;
  medicationSummary?: ErChiefComplaintBilingual;
  additionalAllergyInfo?: ErChiefComplaintBilingual;
  historySocialComments?: ErChiefComplaintBilingual;
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
      en: "Chest pain evaluation: onset, duration, location, radiation, severity, associated symptoms, cardiac history/risk factors, medications taken before arrival, and response to interventions.",
      fr: "Évaluation douleur thoracique : début, durée, siège, irradiation, intensité, signes associés, antécédents cardiovasculaires et facteurs de risque, traitements pris avant l’arrivée, réponse aux interventions.",
    },
    medicationSummary: {
      en: "Document home medications and any taken before arrival (dose and time if known).",
      fr: "Préciser les traitements habituels et ceux pris avant l’arrivée (dose et heure si connues).",
    },
    additionalAllergyInfo: {
      en: "Document medication and other allergies relevant to this presentation (if not recorded elsewhere).",
      fr: "Préciser allergies médicamenteuses et autres si pertinentes pour cette présentation (si non déjà consignées ailleurs).",
    },
  },
  {
    id: "dyspnea",
    label: { fr: "Dyspnée", en: "Dyspnea" },
    searchTermsFr: ["dyspnee", "dyspnée", "essoufflement", "souffle", "respiration"],
    searchTermsEn: ["dyspnea", "shortness", "breath", "sob", "respiratory"],
    chiefComplaint: { fr: "Dyspnée", en: "Dyspnea" },
    triageNarrativeStarter: {
      en: "Dyspnea evaluation: onset, exertional vs at rest, orthopnea, cough, fever, sick contacts or travel, baseline lung disease, home oxygen or interventions before arrival.",
      fr: "Évaluation dyspnée : début, à l’effort ou au repos, orthopnée, toux, fièvre, contacts ou voyages, pathologie respiratoire de base, oxygène domicile ou interventions avant l’arrivée.",
    },
    ppePrecautions: {
      en: "If indicated: document isolation and PPE per local protocol (e.g. respiratory precautions).",
      fr: "Si indiqué : préciser isolement et EPI selon protocole local (précautions respiratoires, etc.).",
    },
  },
  {
    id: "abdominal_pain",
    label: { fr: "Douleur abdominale", en: "Abdominal pain" },
    searchTermsFr: ["abdomen", "ventre", "digestif", "nausée"],
    searchTermsEn: ["abdomen", "belly", "stomach", "gi", "nausea"],
    chiefComplaint: { fr: "Douleur abdominale", en: "Abdominal pain" },
    triageNarrativeStarter: {
      en: "Abdominal pain evaluation: onset, location, migration, severity, associated nausea or vomiting, bowel habit, last oral intake, similar episodes, and prior abdominal surgery.",
      fr: "Évaluation douleur abdominale : début, siège, migration, intensité, nausées ou vomissements, transit, dernier repas, épisodes similaires, chirurgies abdominales antérieures.",
    },
    exceptionsToExpectedProfile: {
      en: "Document atypical features for this complaint (e.g. pain pattern, associated symptoms) to guide further assessment.",
      fr: "Préciser les éléments atypiques pour cette plainte (mode douloureux, signes associés) pour orienter l’évaluation.",
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
      en: "Fever evaluation: measured vs reported, duration, pattern, focal symptoms, rash, sick contacts, travel, hydration, and medications or cooling measures before arrival.",
      fr: "Évaluation fièvre : mesurée ou rapportée, durée, allure, signes fonctionnels associés, éruption, contacts ou voyages, hydratation, traitements ou mesures antipyrétiques avant l’arrivée.",
    },
    careMonitoringSummary: {
      en: "Document intake/output and comfort measures already provided while awaiting further assessment.",
      fr: "Préciser hydratisation, diurèse si pertinent, et mesures de confort déjà mises en attendant la poursuite de l’évaluation.",
    },
  },
  {
    id: "weakness",
    label: { fr: "Faiblesse / malaise", en: "Weakness / malaise" },
    searchTermsFr: ["faiblesse", "malaise", "asthénie", "fatigue"],
    searchTermsEn: ["weakness", "malaise", "fatigue", "asthenia"],
    chiefComplaint: { fr: "Faiblesse / malaise", en: "Weakness / malaise" },
    triageNarrativeStarter: {
      en: "Weakness or malaise evaluation: onset and progression, focal vs generalized, gait or balance changes, fever, recent illness, hydration, and ability to perform usual tasks.",
      fr: "Évaluation faiblesse ou malaise : début et évolution, focalisée ou diffuse, marche ou équilibre, fièvre, épisode récent, hydratation, capacités fonctionnelles usuelles.",
    },
    historySocialComments: {
      en: "Document recent infections, travel, new medications, or substance use relevant to this presentation.",
      fr: "Préciser infections récentes, voyages, nouveaux traitements ou consommations pertinentes pour cette présentation.",
    },
  },
  {
    id: "dizziness",
    label: { fr: "Étourdissement / syncope", en: "Dizziness / syncope" },
    searchTermsFr: ["étourdissement", "etourdissement", "syncope", "lipothymie", "vertige"],
    searchTermsEn: ["dizziness", "syncope", "lightheaded", "vertigo"],
    chiefComplaint: { fr: "Étourdissement / syncope", en: "Dizziness / syncope" },
    triageNarrativeStarter: {
      en: "Dizziness or syncope evaluation: onset, triggers, prodrome, loss of consciousness, injury from fall, chest pain, palpitations, hydration, and events before arrival.",
      fr: "Évaluation étourdissements ou syncope : début, déclencheurs, prodromes, perte de conscience, traumatisme de chute, douleur thoracique, palpitations, hydratation, circonstances avant l’arrivée.",
    },
    medicationSummary: {
      en: "Document antihypertensives, diuretics, or other medications that may relate to symptoms (if known).",
      fr: "Préciser antihypertenseurs, diurétiques ou autres traitements pouvant être liés aux symptômes (si connus).",
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
      en: "Acute neurologic symptoms evaluation: time last known well, onset pattern, focal deficits (face, arm, leg, speech, vision), headache, trauma, anticoagulants, prior strokes or baseline deficits.",
      fr: "Évaluation symptômes neurologiques aigus : heure de référence / dernière fois vu normal, mode d’installation, déficits focalisés (visage, membre, parole, vision), céphalée, traumatisme, anticoagulation, antécédents vasculaires ou déficit de base.",
    },
    sourceRouting: {
      en: "Document arrival mode and routing per local acute neuro or stroke pathway.",
      fr: "Préciser mode d’arrivée et orientation selon filière locale neuro aigu / suspicion AVC.",
    },
    medicationSummary: {
      en: "Document antiplatelets, anticoagulants, and recent antithrombotic changes if known.",
      fr: "Préciser antiplaquettaires, anticoagulants et changements récents si connus.",
    },
  },
  {
    id: "trauma",
    label: { fr: "Traumatisme", en: "Trauma" },
    searchTermsFr: ["trauma", "accident", "choc", "blessure"],
    searchTermsEn: ["trauma", "accident", "injury", "mva"],
    chiefComplaint: { fr: "Traumatisme", en: "Trauma" },
    triageNarrativeStarter: {
      en: "Trauma evaluation: mechanism, protective equipment, loss of consciousness, neck pain, external bleeding, pain locations, interventions before arrival, and prehospital care received.",
      fr: "Évaluation traumatisme : mécanisme, protection, perte de conscience, cervicalgie, hémorragie externe, sièges douloureux, interventions avant l’arrivée, soins préhospitaliers.",
    },
    exceptionsToExpectedProfile: {
      en: "Document extrication time, immobilization, and penetrating vs blunt mechanism if applicable.",
      fr: "Préciser délais d’extraction, immobilisation et mécanisme pénétrant ou contondant si pertinent.",
    },
  },
  {
    id: "fall",
    label: { fr: "Chute", en: "Fall" },
    searchTermsFr: ["chute", "tomber", "glissade"],
    searchTermsEn: ["fall", "fell", "slip"],
    chiefComplaint: { fr: "Chute", en: "Fall" },
    triageNarrativeStarter: {
      en: "Fall evaluation: circumstances, surface, witnessed vs unwitnessed, head strike, anticoagulation, prior falls, mobility aids, injury locations, and ability to bear weight afterward.",
      fr: "Évaluation chute : circonstances, terrain, témoin ou non, choc crânien, anticoagulation, antécédents de chute, aide à la marche, sièges lésionnels, reprise de la station debout.",
    },
    careMonitoringSummary: {
      en: "Document who witnessed the fall and baseline mobility compared to now.",
      fr: "Préciser témoins de la chute et autonomie habituelle comparée à l’état actuel.",
    },
  },
  {
    id: "laceration",
    label: { fr: "Plaie / lacération", en: "Wound / laceration" },
    searchTermsFr: ["plaie", "coupure", "laceration", "suture", "sang"],
    searchTermsEn: ["wound", "laceration", "cut", "bleeding", "suture"],
    chiefComplaint: { fr: "Plaie / lacération", en: "Wound / laceration" },
    triageNarrativeStarter: {
      en: "Wound evaluation: mechanism, time of injury, depth and contamination, bleeding control measures, tetanus immunization status if relevant, sensation and function distal to injury.",
      fr: "Évaluation plaie : mécanisme, heure de la lésion, profondeur et souillure, mesures d’hémostase, statut antitétanique si pertinent, sensibilité et fonction en aval de la lésion.",
    },
    additionalAllergyInfo: {
      en: "Document latex or local anesthetic allergies if wound care or repair is anticipated.",
      fr: "Préciser allergies au latex ou aux anesthésiques locaux si soins ou suture envisagés.",
    },
  },
  {
    id: "gastro",
    label: { fr: "Vomissements / diarrhée", en: "Vomiting / diarrhea" },
    searchTermsFr: ["vomissement", "diarrhée", "diarrhee", "nausée", "gastro"],
    searchTermsEn: ["vomit", "vomiting", "diarrhea", "nausea", "gastro"],
    chiefComplaint: { fr: "Vomissements / diarrhée", en: "Vomiting / diarrhea" },
    triageNarrativeStarter: {
      en: "GI symptoms evaluation: vomiting vs diarrhea predominance, onset, frequency, blood or bile, abdominal pain, last oral intake, hydration signs, and recent food or travel.",
      fr: "Évaluation troubles digestifs : vomissements ou diarrhée, début, fréquence, sang ou bile, douleur abdominale, dernier repas, signes d’hydratation, repas récents ou voyages.",
    },
    ppePrecautions: {
      en: "If indicated: document contact or droplet precautions per local protocol.",
      fr: "Si indiqué : préciser précautions contact ou gouttelettes selon protocole local.",
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
      en: "Suspected allergic reaction evaluation: suspected trigger or exposure, onset, skin or airway symptoms, prior similar reactions, medications given before arrival, and observed course.",
      fr: "Évaluation suspicion réaction allergique : exposition ou déclencheur suspect, début, signes cutanés ou respiratoires, épisodes similaires, traitements pris avant l’arrivée, évolution observée.",
    },
    additionalAllergyInfo: {
      en: "Document known allergens and prior severe reactions (including contrast or latex if relevant).",
      fr: "Préciser allergènes connus et antécédents de réactions graves (dont produit de contraste ou latex si pertinent).",
    },
    medicationSummary: {
      en: "Document epinephrine or antihistamines taken before arrival (dose/time if known).",
      fr: "Préciser adrénaline ou antihistaminiques pris avant l’arrivée (dose et heure si connues).",
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
