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
  notesInfirmieresLibres: "Notes infirmières libres",
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
  if (inner && typeof inner === "object") {
    const sl = (inner as Record<string, unknown>).summaryLinesFr;
    if (Array.isArray(sl)) {
      const lines = sl.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      if (lines.length) return lines;
    }
  }
  return parseNursingAssessmentSectionsForChart(raw).map((s) => `${s.labelFr} : ${s.text}`);
}

export type DischargeSummaryFieldsFr = {
  disposition?: string;
  exitCondition?: string;
  dischargeInstructions?: string;
  medicationsGiven?: string;
  followUp?: string;
  returnIfWorse?: string;
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
