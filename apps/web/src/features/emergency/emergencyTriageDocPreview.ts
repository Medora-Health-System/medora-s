/**
 * Rule-based triage documentation for the ER panel (no AI).
 * Uses only structured fields already carried by GET/PUT triage.
 */

import { formatVitalsHeaderLine } from "@/lib/patientVitals";
import { erTriageV1FormFromVitalsJson, type ErTriageV1Form } from "./medoraErTriageV1";

export type TriageDocPreviewFormSlice = {
  chiefComplaint: string;
  onsetAt: string;
  esi: string;
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  allergyNote: string;
  triageCompleteAt: string;
};

export type TriagePreviewSection = {
  id: string;
  title: string;
  lines: string[];
};

/**
 * Maps GET `/encounters/:id/triage` JSON to the preview slice + ER V1 form (same field mapping as `EmergencyTriagePanel`).
 */
export function triagePreviewSliceFromTriageGet(triage: Record<string, unknown> | null): {
  slice: TriageDocPreviewFormSlice;
  er: ErTriageV1Form;
} | null {
  if (!triage) return null;
  const d = triage;
  const v = (d.vitalsJson || {}) as Record<string, number | string | null>;
  const slice: TriageDocPreviewFormSlice = {
    chiefComplaint: (d.chiefComplaint as string) || "",
    onsetAt: d.onsetAt ? new Date(d.onsetAt as string).toISOString().slice(0, 16) : "",
    esi: d.esi != null ? String(d.esi) : "",
    tempC: v.tempC?.toString() ?? "",
    hr: v.hr?.toString() ?? "",
    rr: v.rr?.toString() ?? "",
    bpSys: v.bpSys?.toString() ?? "",
    bpDia: v.bpDia?.toString() ?? "",
    spo2: v.spo2?.toString() ?? "",
    weightKg: v.weightKg?.toString() ?? "",
    heightCm: v.heightCm?.toString() ?? "",
    allergyNote: (v as { allergyNote?: string | null }).allergyNote ?? "",
    triageCompleteAt: d.triageCompleteAt
      ? new Date(d.triageCompleteAt as string).toISOString().slice(0, 16)
      : "",
  };
  const er = erTriageV1FormFromVitalsJson(d.vitalsJson);
  return { slice, er };
}

/** TA syst./diast. for compact strip (no wide label/value gap). */
export function formatTriageBpStrip(sys: string, dia: string): string {
  const s = String(sys ?? "").trim();
  const d = String(dia ?? "").trim();
  if (!s && !d) return "—";
  return `${s || "—"}/${d || "—"}`;
}

/** One row per vital for the ER workspace header strip (order: TA, FC, FR, Temp, SpO₂, Poids, Taille). */
export function buildErWorkspaceVitalPairs(slice: TriageDocPreviewFormSlice): { label: string; value: string }[] {
  const f = slice;
  return [
    { label: "TA", value: formatTriageBpStrip(f.bpSys, f.bpDia) },
    { label: "FC", value: f.hr.trim() ? `${f.hr.trim()} /min` : "—" },
    { label: "FR", value: f.rr.trim() ? `${f.rr.trim()} /min` : "—" },
    { label: "Temp", value: f.tempC.trim() ? `${f.tempC.trim()} °C` : "—" },
    { label: "SpO₂", value: f.spo2.trim() ? `${f.spo2.trim()} %` : "—" },
    { label: "Poids", value: f.weightKg.trim() ? `${f.weightKg.trim()} kg` : "—" },
    { label: "Taille", value: f.heightCm.trim() ? `${f.heightCm.trim()} cm` : "—" },
  ];
}

function vitalsRecordForHeader(f: TriageDocPreviewFormSlice): Record<string, number | string | null | undefined> {
  return {
    tempC: f.tempC ? parseFloat(f.tempC) : "",
    hr: f.hr ? parseInt(f.hr, 10) : "",
    rr: f.rr ? parseInt(f.rr, 10) : "",
    bpSys: f.bpSys ? parseInt(f.bpSys, 10) : "",
    bpDia: f.bpDia ? parseInt(f.bpDia, 10) : "",
    spo2: f.spo2 ? parseInt(f.spo2, 10) : "",
    weightKg: f.weightKg ? parseFloat(f.weightKg) : "",
    heightCm: f.heightCm ? parseFloat(f.heightCm) : "",
  };
}

function collectVitalAbnormalities(f: TriageDocPreviewFormSlice): string[] {
  const out: string[] = [];
  const t = f.tempC ? parseFloat(f.tempC) : NaN;
  if (!Number.isNaN(t)) {
    if (t > 38.0) out.push("fièvre possible (température élevée)");
    if (t < 36.0) out.push("hypothermie possible");
  }
  const hr = f.hr ? parseInt(f.hr, 10) : NaN;
  if (!Number.isNaN(hr)) {
    if (hr > 120) out.push("tachycardie");
    if (hr < 50) out.push("bradycardie");
  }
  const rr = f.rr ? parseInt(f.rr, 10) : NaN;
  if (!Number.isNaN(rr)) {
    if (rr > 24) out.push("polypnée");
    if (rr < 10) out.push("fréquence respiratoire basse");
  }
  const spo2 = f.spo2 ? parseInt(f.spo2, 10) : NaN;
  if (!Number.isNaN(spo2) && spo2 < 94) out.push("SpO₂ basse");
  const sys = f.bpSys ? parseInt(f.bpSys, 10) : NaN;
  const dia = f.bpDia ? parseInt(f.bpDia, 10) : NaN;
  if (!Number.isNaN(sys)) {
    if (sys < 90) out.push("TA systolique basse");
    if (sys > 180) out.push("TA systolique très élevée");
  }
  if (!Number.isNaN(dia) && dia > 110) out.push("TA diastolique élevée");
  return out;
}

function ynuFr(v: string): string {
  if (v === "yes") return "Oui";
  if (v === "no") return "Non";
  if (v === "unknown") return "Inconnu";
  return "";
}

function abcFr(v: string): string {
  if (v === "wnl") return "Dans les limites (WNL)";
  if (v === "yes") return "Oui";
  if (v === "no") return "Non";
  if (v === "unknown") return "Inconnu";
  return "";
}

function pushIf(lines: string[], prefix: string, text: string) {
  const t = text.trim();
  if (t) lines.push(`${prefix}${t}`);
}

/** Combined allergy text (no duplicate labels — legacy medicationAllergiesDetail still included if present). */
function allergyDetailLines(f: TriageDocPreviewFormSlice, er: ErTriageV1Form): string[] {
  const chunks: string[] = [];
  const note = f.allergyNote.trim();
  if (note) chunks.push(note);
  const med = er.medicationAllergiesDetail.trim();
  if (med) chunks.push(`Médicaments : ${med}`);
  const food = er.foodAllergiesDetail.trim();
  if (food) chunks.push(`Alimentaires / autres : ${food}`);
  const add = er.additionalAllergyInfo.trim();
  if (add) chunks.push(add);
  if (chunks.length === 0) return [];
  return [`Allergies : ${chunks.join(" — ")}`];
}

/** Latest vitals one-liner for clinical strip (same logic as chart header). */
export function buildVitalsStripLine(f: TriageDocPreviewFormSlice): string {
  return formatVitalsHeaderLine(vitalsRecordForHeader(f));
}

/**
 * Compact allergy summary for top strip — uses existing triage + V1 fields only (no new inputs).
 * Empty string when nothing documented.
 */
export function buildAllergyStripSummary(f: TriageDocPreviewFormSlice, er: ErTriageV1Form): string {
  const parts: string[] = [];
  if (f.allergyNote.trim()) parts.push(f.allergyNote.trim());
  if (er.medicationAllergiesDetail.trim()) parts.push(er.medicationAllergiesDetail.trim());
  if (er.foodAllergiesDetail.trim()) parts.push(er.foodAllergiesDetail.trim());
  if (er.additionalAllergyInfo.trim()) parts.push(er.additionalAllergyInfo.trim());
  if (parts.length === 0) return "";
  const joined = parts.join(" · ");
  const max = 240;
  return joined.length > max ? `${joined.slice(0, max)}…` : joined;
}

export type TriagePreviewModel = {
  sections: TriagePreviewSection[];
  /** Short rule-based sentence; empty if nothing to say. */
  narrative: string;
};

function buildNarrative(f: TriageDocPreviewFormSlice, er: ErTriageV1Form): string {
  const parts: string[] = [];
  const m = f.chiefComplaint.trim();
  if (m) parts.push(`motif « ${m.length > 100 ? `${m.slice(0, 100)}…` : m} »`);
  if (f.esi) parts.push(`ESI ${f.esi}/5`);
  const vitalsLine = formatVitalsHeaderLine(vitalsRecordForHeader(f));
  if (vitalsLine) parts.push(vitalsLine);
  if (er.painScale0to10.trim()) {
    const n = parseInt(er.painScale0to10, 10);
    if (!Number.isNaN(n)) parts.push(`douleur ${n}/10`);
  }
  if (parts.length === 0) return "";
  return `Résumé synthétique : ${parts.join(" · ")}.`;
}

/**
 * Grouped preview for MedoraCard layout — rule-based only, no new fields.
 */
export function buildTriageDocumentationPreviewModel(
  f: TriageDocPreviewFormSlice,
  opts: {
    strokeScreenPresent: boolean;
    sepsisScreenPresent: boolean;
    erV1: ErTriageV1Form;
  }
): TriagePreviewModel {
  const er = opts.erV1;
  const sections: TriagePreviewSection[] = [];

  const presentation: string[] = [];
  const complaint = f.chiefComplaint.trim();
  if (complaint) presentation.push(`Motif principal : ${complaint}`);
  if (f.onsetAt) {
    const d = new Date(f.onsetAt);
    if (!Number.isNaN(d.getTime())) presentation.push(`Début des symptômes : ${d.toLocaleString("fr-FR")}`);
  }
  if (f.esi) presentation.push(`ESI : ${f.esi}/5`);
  if (presentation.length) sections.push({ id: "presentation", title: "Présentation", lines: presentation });

  const etatInitial: string[] = [];
  pushIf(etatInitial, "Récit triage : ", er.triageNarrative);
  pushIf(etatInitial, "EPI / précautions : ", er.ppeNote);
  if (er.airway) etatInitial.push(`Voie aérienne : ${abcFr(er.airway)}`);
  if (er.breathing) etatInitial.push(`Ventilation : ${abcFr(er.breathing)}`);
  if (er.circulation) etatInitial.push(`Circulation : ${abcFr(er.circulation)}`);
  if (er.gcs15) etatInitial.push(`GCS 15 : ${ynuFr(er.gcs15)}`);
  pushIf(etatInitial, "Exceptions au profil attendu : ", er.triageExceptionsNote);
  if (er.painScale0to10.trim()) {
    const n = parseInt(er.painScale0to10, 10);
    if (!Number.isNaN(n)) etatInitial.push(`Douleur (0–10) : ${n}`);
  }
  pushIf(etatInitial, "Provenance / orientation : ", er.referralSource);
  if (er.triageStartedAt) {
    const d = new Date(er.triageStartedAt);
    if (!Number.isNaN(d.getTime())) etatInitial.push(`Heure de début triage : ${d.toLocaleString("fr-FR")}`);
  }
  if (etatInitial.length) sections.push({ id: "etat_initial", title: "État initial", lines: etatInitial });

  const signes: string[] = [];
  const vitalsLine = formatVitalsHeaderLine(vitalsRecordForHeader(f));
  if (vitalsLine) signes.push(`Relevé : ${vitalsLine}`);
  const abn = collectVitalAbnormalities(f);
  if (abn.length) signes.push(`À noter : ${abn.join(" ; ")}`);
  if (f.triageCompleteAt) {
    const d = new Date(f.triageCompleteAt);
    if (!Number.isNaN(d.getTime())) signes.push(`Triage complété à : ${d.toLocaleString("fr-FR")}`);
  }
  if (signes.length) sections.push({ id: "signes_vitaux", title: "Signes vitaux", lines: signes });

  const securite: string[] = [];
  pushIf(securite, "Soins infirmiers (résumé) : ", er.nursingCareNote);
  if (er.callLightInReach) securite.push(`Appel accessible : ${ynuFr(er.callLightInReach)}`);
  if (er.bedLockedLow) securite.push(`Lit verrouillé / bas : ${ynuFr(er.bedLockedLow)}`);
  if (er.familyAtBedside) securite.push(`Entourage au chevet : ${ynuFr(er.familyAtBedside)}`);
  if (er.inViewOfNursingStation) securite.push(`En vue du poste : ${ynuFr(er.inViewOfNursingStation)}`);
  if (er.patientUpdatedOnPlan) securite.push(`Plan de soins expliqué : ${ynuFr(er.patientUpdatedOnPlan)}`);
  if (er.comfortMeasuresProvided) securite.push(`Mesures de confort : ${ynuFr(er.comfortMeasuresProvided)}`);
  pushIf(securite, "EPI (parcours aux urgences) : ", er.edCoursePpeNote);
  pushIf(securite, "Notes infirmières / addendum : ", er.nursingNotesAddendum);
  if (er.feelsSafeAtHome) securite.push(`Sécurité au domicile : ${ynuFr(er.feelsSafeAtHome)}`);
  if (er.travelOutsideCountry14d) securite.push(`Voyage hors pays (<14 j) : ${ynuFr(er.travelOutsideCountry14d)}`);
  if (opts.strokeScreenPresent) securite.push("Dépistage AVC : données présentes.");
  if (opts.sepsisScreenPresent) securite.push("Dépistage sepsis : données présentes.");
  if (securite.length) sections.push({ id: "securite", title: "Sécurité et orientation", lines: securite });

  const meds: string[] = [];
  pushIf(meds, "Médicaments (résumé) : ", er.medicationsSummary);
  meds.push(...allergyDetailLines(f, er));
  pushIf(meds, "Pharmacie préférée : ", er.preferredPharmacy);
  pushIf(meds, "Vaccination / à jour : ", er.immunizationStatusNote);
  if (meds.length) sections.push({ id: "meds", title: "Médicaments / allergies / vaccination", lines: meds });

  const hist: string[] = [];
  pushIf(hist, "Antécédents médicaux : ", er.pastMedicalHistory);
  pushIf(hist, "Antécédents chirurgicaux : ", er.pastSurgicalHistory);
  pushIf(hist, "Antécédents familiaux : ", er.familyHistory);
  pushIf(hist, "Tabagisme : ", er.smokingStatus);
  pushIf(hist, "Alcool : ", er.alcoholUse);
  pushIf(hist, "Cannabis : ", er.marijuanaUse);
  pushIf(hist, "Stimulants (ex. amphétamine/cocaïne) : ", er.stimulantUse);
  pushIf(hist, "Opioïdes / héroïne : ", er.opioidHeroinUse);
  pushIf(hist, "Commentaires sociaux / contexte : ", er.historySocialComments);
  if (hist.length) sections.push({ id: "histoire", title: "Antécédents / social", lines: hist });

  const narrative = buildNarrative(f, er);

  if (sections.length === 0 && !narrative) {
    return {
      sections: [{ id: "empty", title: "Aperçu", lines: ["Aucune donnée structurée saisie pour l’aperçu."] }],
      narrative: "",
    };
  }

  return { sections, narrative };
}
