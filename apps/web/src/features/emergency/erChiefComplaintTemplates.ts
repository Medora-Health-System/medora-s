/**
 * Deterministic ER chief-complaint templates for triage (French labels, expandable catalog).
 * No diagnoses, exam findings, or orders — plainte + récit starter only.
 */

export type ErChiefComplaintTemplate = {
  id: string;
  label: string;
  searchTerms: string[];
  category?: string;
  chiefComplaint: string;
  /** Prefills `medoraErTriageV1.triageNarrative` when that field is empty. */
  triageNarrativeStarter?: string;
};

export const ER_CHIEF_COMPLAINT_TEMPLATES: readonly ErChiefComplaintTemplate[] = [
  {
    id: "chest_pain",
    label: "Douleur thoracique",
    searchTerms: ["thorax", "thoracique", "precordial", "coeur", "cœur"],
    chiefComplaint: "Douleur thoracique",
    triageNarrativeStarter:
      "Plainte de douleur thoracique ; caractères, irradiation et facteurs associés à préciser.",
  },
  {
    id: "dyspnea",
    label: "Dyspnée",
    searchTerms: ["dyspnee", "dyspnée", "essoufflement", "souffle", "respiration"],
    chiefComplaint: "Dyspnée",
    triageNarrativeStarter: "Gêne respiratoire ; début et évolution à préciser.",
  },
  {
    id: "abdominal_pain",
    label: "Douleur abdominale",
    searchTerms: ["abdomen", "ventre", "digestif", "nausée"],
    chiefComplaint: "Douleur abdominale",
    triageNarrativeStarter: "Douleur abdominale ; localisation et évolution à préciser.",
  },
  {
    id: "headache",
    label: "Céphalée",
    searchTerms: ["cephalée", "céphalée", "mal de tête", "migraine"],
    chiefComplaint: "Céphalée",
    triageNarrativeStarter: "Céphalée ; intensité et modalités à préciser.",
  },
  {
    id: "fever",
    label: "Fièvre",
    searchTerms: ["fièvre", "fievre", "température", "froid", "frissons"],
    chiefComplaint: "Fièvre",
    triageNarrativeStarter: "Fièvre rapportée ; durée et signes associés à préciser.",
  },
  {
    id: "weakness",
    label: "Faiblesse / malaise",
    searchTerms: ["faiblesse", "malaise", "asthénie", "fatigue"],
    chiefComplaint: "Faiblesse / malaise",
    triageNarrativeStarter: "Faiblesse ou malaise ; contexte et chronologie à préciser.",
  },
  {
    id: "dizziness",
    label: "Étourdissement / syncope",
    searchTerms: ["étourdissement", "etourdissement", "syncope", "lipothymie", "vertige"],
    chiefComplaint: "Étourdissement / syncope",
    triageNarrativeStarter: "Symptômes neurovégétatifs ; circonstances et récupération à préciser.",
  },
  {
    id: "neuro_stroke",
    label: "Déficit neurologique / suspicion AVC",
    searchTerms: ["avc", "neuro", "déficit", "paralysie", "parole", "visage"],
    chiefComplaint: "Déficit neurologique / suspicion AVC",
    triageNarrativeStarter:
      "Symptômes neurologiques en cours ; heure de début et évolution à préciser (filière selon protocole local).",
  },
  {
    id: "trauma",
    label: "Traumatisme",
    searchTerms: ["trauma", "accident", "choc", "blessure"],
    chiefComplaint: "Traumatisme",
    triageNarrativeStarter: "Traumatisme ; mécanisme et lésions perçues à préciser.",
  },
  {
    id: "fall",
    label: "Chute",
    searchTerms: ["chute", "tomber", "glissade"],
    chiefComplaint: "Chute",
    triageNarrativeStarter: "Chute ; circonstances et traumatisme associé à préciser.",
  },
  {
    id: "laceration",
    label: "Plaie / lacération",
    searchTerms: ["plaie", "coupure", "laceration", "suture", "sang"],
    chiefComplaint: "Plaie / lacération",
    triageNarrativeStarter: "Plaie ; siège, ampleur et antécédent tétanique à préciser si indiqué.",
  },
  {
    id: "gastro",
    label: "Vomissements / diarrhée",
    searchTerms: ["vomissement", "diarrhée", "diarrhee", "nausée", "gastro"],
    chiefComplaint: "Vomissements / diarrhée",
    triageNarrativeStarter: "Troubles digestifs ; hydratation et contexte à préciser.",
  },
  {
    id: "back_pain",
    label: "Douleur lombaire",
    searchTerms: ["lombaire", "dos", "rachis", "sciatique"],
    chiefComplaint: "Douleur lombaire",
    triageNarrativeStarter: "Douleur du rachis ; irradiation et facteurs déclenchants à préciser.",
  },
  {
    id: "limb_pain",
    label: "Douleur du membre",
    searchTerms: ["membre", "bras", "jambe", "cheville", "poignet"],
    chiefComplaint: "Douleur du membre",
    triageNarrativeStarter: "Douleur localisée au membre ; mécanisme et fonction à préciser.",
  },
  {
    id: "allergy",
    label: "Réaction allergique",
    searchTerms: ["allergie", "allergique", "urticaire", "anaphylaxie", "choc allergique"],
    chiefComplaint: "Réaction allergique",
    triageNarrativeStarter: "Réaction allergique suspectée ; exposition et signes à préciser.",
  },
  {
    id: "palpitations",
    label: "Palpitations",
    searchTerms: ["palpitation", "battements", "arythmie"],
    chiefComplaint: "Palpitations",
    triageNarrativeStarter: "Palpitations ; durée et signes associés à préciser.",
  },
  {
    id: "respiratory_urd",
    label: "Toux / symptômes respiratoires",
    searchTerms: ["toux", "rhume", "écoulement", "respiratoire", "gorge"],
    chiefComplaint: "Toux / symptômes respiratoires",
    triageNarrativeStarter: "Symptômes respiratoires hauts ; évolution et contexte à préciser.",
  },
  {
    id: "urinary",
    label: "Dysurie / symptômes urinaires",
    searchTerms: ["urine", "brûlure", "miction", "infection urinaire", "IU"],
    chiefComplaint: "Symptômes urinaires",
    triageNarrativeStarter: "Symptômes urinaires ; début et signes associés à préciser.",
  },
  {
    id: "gyn_bleeding",
    label: "Saignement vaginal",
    searchTerms: ["gynéco", "grossesse", "règles", "métrorragie", "saignement"],
    chiefComplaint: "Saignement vaginal",
    triageNarrativeStarter: "Saignement génital ; contexte gynécologique et gravité à préciser.",
  },
  {
    id: "seizure",
    label: "Convulsions",
    searchTerms: ["convulsion", "crise", "épilepsie", "épileptique"],
    chiefComplaint: "Convulsions",
    triageNarrativeStarter: "Crise convulsive rapportée ; durée et récupération à préciser.",
  },
  {
    id: "ams",
    label: "Altération de l’état mental",
    searchTerms: ["confusion", "agitation", "somnolence", "glasgow", "mental"],
    chiefComplaint: "Altération de l’état mental",
    triageNarrativeStarter: "Altération de l’état de conscience ou du comportement ; chronologie à préciser.",
  },
];

export function filterErChiefComplaintTemplates(
  query: string,
  catalog: readonly ErChiefComplaintTemplate[] = ER_CHIEF_COMPLAINT_TEMPLATES
): ErChiefComplaintTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...catalog];
  return catalog.filter((t) => {
    if (t.label.toLowerCase().includes(q)) return true;
    if (t.id.toLowerCase().includes(q)) return true;
    return t.searchTerms.some((s) => s.toLowerCase().includes(q));
  });
}
