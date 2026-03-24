import { nursingProcedureSummaryLinesFr } from "@/lib/nursingProcedures";

/** Libellés des sections d’évaluation infirmière (`nursingEvalV1.sections`) — aligné sur `NursingAssessmentTab`. */
export const NURSING_ASSESSMENT_SECTION_LABELS_FR: Record<string, string> = {
  etatGeneral: "État général",
  neurologique: "Neurologique",
  respiratoire: "Respiratoire",
  cardiaque: "Cardiaque",
  cardiovasculaire: "Cardiaque",
  digestif: "Digestif",
  gastro: "Digestif",
  genito: "Génito-urinaire",
  musculo: "Musculo-squelettique",
  peau: "Peau / plaies",
  douleur: "Douleur",
  securite: "Risques / sécurité",
  observationsInfirmieres: "Observations infirmières",
  interventionsInfirmieres: "Interventions infirmières",
  notesInfirmieresLibres: "Note infirmière, autres",
  notesInfirmieres: "Observations infirmières",
};

/** Sections remplies pour affichage dossier / timeline (pas de bloc vide). */
export function parseNursingAssessmentSectionsForChart(
  raw: unknown
): { labelFr: string; text: string }[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return [];
  const sections = (inner as Record<string, unknown>).sections;
  if (!sections || typeof sections !== "object") return [];
  const out: { labelFr: string; text: string }[] = [];
  for (const [k, v] of Object.entries(sections)) {
    if (v && typeof v === "object" && "text" in v && typeof (v as { text: unknown }).text === "string") {
      const text = (v as { text: string }).text.trim();
      if (!text) continue;
      const labelFr = NURSING_ASSESSMENT_SECTION_LABELS_FR[k] ?? k;
      out.push({ labelFr, text });
    }
  }
  return out;
}

/** Ligne de signature infirmière si enregistrée (`nursingEvalV1.signature`). */
export function nursingAssessmentSignatureLineFr(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return null;
  const sig = (inner as Record<string, unknown>).signature;
  if (!sig || typeof sig !== "object") return null;
  const name = (sig as Record<string, unknown>).savedByDisplayName;
  const at = (sig as Record<string, unknown>).savedAt;
  if (typeof name !== "string" || !name.trim()) return null;
  const dt =
    typeof at === "string"
      ? new Date(at).toLocaleString("fr-FR")
      : "—";
  return `Saisi par ${name.trim()} le ${dt}`;
}

/** Résumé court infirmier (lignes pré-calculées ou dérivées des sections). */
export function nursingAssessmentDisplayLines(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  let base: string[] = [];
  if (inner && typeof inner === "object") {
    const sl = (inner as Record<string, unknown>).summaryLinesFr;
    if (Array.isArray(sl)) {
      const lines = sl.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      if (lines.length) base = [...lines];
    }
  }
  if (base.length === 0) {
    base = parseNursingAssessmentSectionsForChart(raw).map((s) => `${s.labelFr} : ${s.text}`);
  }
  const proc = nursingProcedureSummaryLinesFr(raw);
  if (proc.length === 0) return base;
  return [...base, ...proc];
}

/** Champs non vides de `nursingAssessment.physicianEvalV1` pour affichage résumé / timeline. */
export function parsePhysicianEvalV1ForChart(
  raw: unknown
): { labelFr: string; text: string }[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const o = raw as Record<string, unknown>;
  const pe = o.physicianEvalV1;
  if (!pe || typeof pe !== "object" || Array.isArray(pe)) return [];
  const p = pe as Record<string, unknown>;
  const pairs: [string, string][] = [
    ["hpi", "HPI"],
    ["ros", "ROS"],
    ["physicalExam", "Examen physique"],
    ["mdm", "MDM"],
  ];
  const out: { labelFr: string; text: string }[] = [];
  for (const [key, labelFr] of pairs) {
    const v = p[key];
    if (typeof v !== "string" || !v.trim()) continue;
    out.push({ labelFr, text: v.trim() });
  }
  return out;
}

export type DischargeSummaryFieldsFr = {
  disposition?: string;
  exitCondition?: string;
  dischargeInstructions?: string;
  medicationsGiven?: string;
  followUp?: string;
  returnIfWorse?: string;
  patientDestination?: string;
  dischargeMode?: string;
};

/** Résumé de sortie structuré ; `null` si aucun champ renseigné. */
export function parseDischargeSummaryForChart(raw: unknown): DischargeSummaryFieldsFr | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys = [
    "disposition",
    "exitCondition",
    "dischargeInstructions",
    "medicationsGiven",
    "followUp",
    "returnIfWorse",
    "patientDestination",
    "dischargeMode",
  ] as const;
  const out: DischargeSummaryFieldsFr = {};
  let any = false;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      (out as Record<string, string>)[k] = v.trim();
      any = true;
    }
  }
  return any ? out : null;
}

/** Champs alignés sur `admissionSummaryFieldsSchema` (@medora/shared). */
export type AdmissionSummaryFieldsFr = {
  admissionReason?: string;
  serviceUnit?: string;
  admissionDiagnosis?: string;
  careLevel?: string;
  conditionAtAdmission?: string;
  initialPlan?: string;
  responsiblePhysicianName?: string;
};

/** Dossier d'admission structuré ; `null` si aucun champ renseigné. */
export function parseAdmissionSummaryForChart(raw: unknown): AdmissionSummaryFieldsFr | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys = [
    "admissionReason",
    "serviceUnit",
    "admissionDiagnosis",
    "careLevel",
    "conditionAtAdmission",
    "initialPlan",
    "responsiblePhysicianName",
  ] as const;
  const out: AdmissionSummaryFieldsFr = {};
  let any = false;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      (out as Record<string, string>)[k] = v.trim();
      any = true;
    }
  }
  return any ? out : null;
}

/** Libellé diagnostic : privilégier la description ; éviter d’afficher seul un code brut non contextualisé. */
export function diagnosisDisplayFr(description: string | null | undefined, code: string): string {
  const d = description?.trim();
  if (d) return d;
  const c = code?.trim();
  if (!c) return "—";
  return `Code ${c}`;
}

export function nirMrnDisplay(patient: {
  nationalId?: string | null;
  mrn?: string | null;
  globalMrn?: string | null;
}): string {
  const parts = [patient.nationalId, patient.mrn, patient.globalMrn].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  if (parts.length === 0) return "—";
  return [...new Set(parts)].join(" · ");
}
