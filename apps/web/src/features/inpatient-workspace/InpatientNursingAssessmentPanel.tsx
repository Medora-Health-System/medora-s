"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { InpatientNursingAssessmentSave, InpatientNursingAssessmentV1 } from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { NursingDocumentationBoard, type NursingBoardColumn, type NursingBoardRow, type NursingBoardValue } from "@/features/clinical-documentation/NursingDocumentationBoard";
import { ClinicalDocumentationHub } from "@/features/clinical-documentation/ClinicalDocumentationHub";
import { useI18n } from "@/lib/i18n";

const choice = (...values: string[]) => values.map((value) => ({ value, label: value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase()) }));
const ROWS: readonly NursingBoardRow[] = [
  { id: "levelOfConsciousness", label: "Mental status", group: "Neurological", options: choice("ALERT", "DROWSY", "LETHARGIC", "UNRESPONSIVE", "UNABLE_TO_ASSESS") },
  { id: "orientationQuick", label: "Orientation", group: "Neurological", options: choice("AOX4", "PERSON_ONLY", "PERSON_PLACE", "PERSON_PLACE_TIME", "DISORIENTED", "UNABLE_TO_ASSESS") },
  { id: "speech", label: "Speech", group: "Neurological", options: choice("CLEAR", "SLURRED", "APHASIC", "NONVERBAL", "OTHER") },
  { id: "pupils", label: "Pupils", group: "Neurological", options: choice("EQUAL", "UNEQUAL", "PINPOINT", "DILATED", "UNABLE_TO_ASSESS") },
  { id: "pupilResponse", label: "Pupil response", group: "Neurological", options: choice("BRISK", "SLUGGISH", "NONREACTIVE", "UNABLE_TO_ASSESS") },
  { id: "motorStrength", label: "Motor response / strength", group: "Neurological" },
  { id: "sensation", label: "Sensation", group: "Neurological" },
  { id: "neurologicalConcerns", label: "Neurological concerns", group: "Neurological", kind: "textarea" },
  { id: "painPresent", label: "Pain present", group: "Pain", options: choice("YES", "NO", "UNABLE_TO_ASSESS") },
  { id: "painScore", label: "Pain score (0–10)", group: "Pain", kind: "number" },
  { id: "painLocation", label: "Pain location", group: "Pain" },
  { id: "painQuality", label: "Pain quality", group: "Pain" },
  { id: "painIntervention", label: "Pain intervention", group: "Pain" },
  { id: "painResponse", label: "Reassessment / response", group: "Pain" },
  { id: "airway", label: "Airway", group: "Respiratory", options: choice("WNL", "PATENT", "AIRWAY_CONCERN", "UNABLE_TO_ASSESS") },
  { id: "respiratoryEffort", label: "Respiratory effort", group: "Respiratory", options: choice("WNL", "UNLABORED", "MILDLY_LABORED", "MODERATELY_LABORED", "SEVERELY_LABORED") },
  { id: "respiratoryPattern", label: "Respiratory pattern", group: "Respiratory", options: choice("WNL", "REGULAR", "TACHYPNEIC", "BRADYPNEIC", "IRREGULAR", "APNEIC") },
  { id: "breathSounds", label: "Breath sounds", group: "Respiratory", options: choice("WNL", "CLEAR", "DIMINISHED", "CRACKLES", "WHEEZES", "RHONCHI", "ABSENT") },
  { id: "oxygen", label: "Oxygen / device", group: "Respiratory", options: choice("ROOM_AIR", "NASAL_CANNULA", "SIMPLE_MASK", "NON_REBREATHER", "HIGH_FLOW", "CPAP_BIPAP", "VENTILATOR", "OTHER") },
  { id: "oxygenFlowRate", label: "Oxygen flow / rate", group: "Respiratory" },
  { id: "cough", label: "Cough", group: "Respiratory" },
  { id: "secretions", label: "Secretions", group: "Respiratory" },
  { id: "respiratoryConcerns", label: "Respiratory concerns", group: "Respiratory", kind: "textarea" },
  { id: "rhythm", label: "Cardiac rhythm", group: "Cardiovascular", options: choice("WNL", "REGULAR", "IRREGULAR", "TELEMETRY", "UNABLE_TO_ASSESS") },
  { id: "heartSounds", label: "Heart sounds", group: "Cardiovascular" },
  { id: "peripheralPulses", label: "Peripheral perfusion", group: "Cardiovascular", options: choice("WNL", "NORMAL", "WEAK", "BOUNDING", "ABSENT", "UNABLE_TO_ASSESS") },
  { id: "edema", label: "Edema", group: "Cardiovascular", options: choice("NONE", "TRACE", "ONE_PLUS", "TWO_PLUS", "THREE_PLUS", "FOUR_PLUS") },
  { id: "capillaryRefill", label: "Capillary refill", group: "Cardiovascular" },
  { id: "cardiovascularConcerns", label: "Cardiovascular concerns", group: "Cardiovascular", kind: "textarea" },
  { id: "abdomen", label: "Abdomen", group: "Gastrointestinal", options: choice("WNL", "SOFT", "FIRM", "DISTENDED", "TENDER", "NONTENDER", "RIGID") },
  { id: "bowelSounds", label: "Bowel sounds", group: "Gastrointestinal", options: choice("WNL", "ACTIVE", "HYPOACTIVE", "HYPERACTIVE", "ABSENT", "UNABLE_TO_ASSESS") },
  { id: "nauseaVomiting", label: "Nausea / vomiting", group: "Gastrointestinal", options: choice("NONE", "NAUSEA", "VOMITING", "NAUSEA_AND_VOMITING") },
  { id: "dietTolerance", label: "Diet tolerance", group: "Gastrointestinal" },
  { id: "giSymptoms", label: "GI symptoms", group: "Gastrointestinal" },
  { id: "lastBowelMovement", label: "Last bowel movement", group: "Gastrointestinal" },
  { id: "voiding", label: "Voiding / urinary status", group: "Genitourinary", options: choice("WNL", "SPONTANEOUS", "CATHETER", "EXTERNAL_DEVICE", "RETENTION_CONCERN", "INCONTINENCE", "OTHER") },
  { id: "urineCharacteristics", label: "Urine characteristics", group: "Genitourinary" },
  { id: "catheterStatus", label: "Catheter status", group: "Genitourinary" },
  { id: "guConcerns", label: "GU concerns", group: "Genitourinary", kind: "textarea" },
  { id: "skin", label: "Skin condition", group: "Skin and wounds", options: choice("WNL", "INTACT", "NON_INTACT", "FRAGILE", "MOIST", "OTHER") },
  { id: "pressureInjuryConcern", label: "Wounds / pressure concern", group: "Skin and wounds", options: choice("NONE", "PRESENT", "RISK", "UNABLE_TO_ASSESS") },
  { id: "skinColor", label: "Skin color", group: "Skin and wounds" },
  { id: "skinTemperature", label: "Skin temperature", group: "Skin and wounds" },
  { id: "skinMoisture", label: "Skin moisture", group: "Skin and wounds" },
  { id: "dressing", label: "Dressing", group: "Skin and wounds" },
  { id: "woundConcern", label: "Wound concern", group: "Skin and wounds", kind: "textarea" },
  { id: "mobility", label: "Mobility", group: "Mobility and safety", options: choice("INDEPENDENT", "STANDBY_ASSIST", "ONE_PERSON_ASSIST", "TWO_PERSON_ASSIST", "MECHANICAL_LIFT", "BEDBOUND") },
  { id: "gait", label: "Gait", group: "Mobility and safety", options: choice("STEADY", "UNSTEADY", "WEAK", "NOT_OBSERVED") },
  { id: "fallRisk", label: "Fall risk", group: "Mobility and safety", options: choice("LOW", "MODERATE", "HIGH", "UNABLE_TO_DETERMINE") },
  { id: "fallPrecautions", label: "Fall precautions", group: "Mobility and safety", options: choice("NONE", "STANDARD", "ENHANCED", "ALARM", "ASSIST_AMBULATION") },
  { id: "activity", label: "Activity", group: "Mobility and safety" },
  { id: "transferAbility", label: "Transfer ability", group: "Mobility and safety" },
  { id: "assistiveDevice", label: "Assistive device", group: "Mobility and safety" },
  { id: "linesDrainsDevices", label: "Active lines / drains / devices (enterprise projection)", group: "Lines, drains and devices" },
  { id: "safetyPrecautions", label: "Safety precautions", group: "Safety", options: choice("NONE", "FALL", "ASPIRATION", "SEIZURE", "BLEEDING", "OTHER") },
  { id: "elopementConcerns", label: "Elopement concerns", group: "Safety" },
  { id: "restraints", label: "Restraints (enterprise projection)", group: "Safety" },
  { id: "isolation", label: "Isolation", group: "Safety" },
  { id: "safetyConcerns", label: "Safety concerns", group: "Safety", kind: "textarea" },
  { id: "diet", label: "Diet", group: "Nutrition and hydration" },
  { id: "appetiteIntake", label: "Appetite / intake", group: "Nutrition and hydration" },
  { id: "feedingAssistance", label: "Feeding assistance", group: "Nutrition and hydration" },
  { id: "swallowingConcerns", label: "Swallowing concerns", group: "Nutrition and hydration" },
  { id: "hydrationConcerns", label: "Hydration concerns", group: "Nutrition and hydration" },
  { id: "ioMonitoring", label: "Intake / output status (enterprise projection)", group: "Intake and output", options: choice("ROUTINE", "STRICT", "NOT_REQUIRED", "CONCERN") },
  { id: "educationProvided", label: "Education provided", group: "Education and communication" },
  { id: "learningNeeds", label: "Learning needs", group: "Education and communication" },
  { id: "understanding", label: "Understanding", group: "Education and communication" },
  { id: "communicationNeeds", label: "Interpreter / communication needs", group: "Education and communication" },
  { id: "moodBehavior", label: "Mood / behavior", group: "Psychosocial" },
  { id: "anxiety", label: "Anxiety", group: "Psychosocial" },
  { id: "copingSupport", label: "Coping / support", group: "Psychosocial" },
  { id: "psychosocialConcerns", label: "Psychosocial concerns", group: "Psychosocial", kind: "textarea" },
  { id: "narrative", label: "Focused nursing narrative", group: "Narrative and significant events", kind: "textarea" },
  { id: "significantChange", label: "Significant change", group: "Narrative and significant events", kind: "textarea" },
  { id: "responseToIntervention", label: "Response to intervention", group: "Narrative and significant events", kind: "textarea" },
  { id: "providerNotification", label: "Provider notification", group: "Narrative and significant events", kind: "textarea" },
] as const;

const emptyDraft = (): InpatientNursingAssessmentSave => ({ status: "DRAFT", assessmentType: "REASSESSMENT", orientation: [], ivAccess: [], linesDrainsDevices: [], structuredFindings: {}, sectionStatus: {}, significantConcerns: [] });

export function InpatientNursingAssessmentPanel({ encounterId, facilityId, patientId: _patientId, isLocked, onSaved }: { encounterId: string; facilityId: string; patientId: string; isLocked: boolean; onSaved: () => void | Promise<void> }) {
  const { language } = useI18n();
  const [history, setHistory] = useState<InpatientNursingAssessmentV1[]>([]);
  const [draft, setDraft] = useState<InpatientNursingAssessmentSave | null>(null);
  const [copied, setCopied] = useState<ReadonlySet<string>>(new Set());
  const [draftTime, setDraftTime] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await apiFetch(`/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessment-events`, { facilityId });
    setHistory((asApiObject<{ entries?: { assessment: InpatientNursingAssessmentV1 }[] }>(response)?.entries ?? []).map((entry) => entry.assessment));
  }, [encounterId, facilityId]);
  useEffect(() => { void load().catch(() => setMessage("Unable to load nursing assessment history.")); }, [load]);

  const columns: NursingBoardColumn[] = useMemo(() => history.map((assessment) => ({ id: assessment.sessionId, occurredAt: assessment.clinicalEffectiveAt ?? assessment.authoredAt, status: assessment.status, author: assessment.authorDisplayName, values: toBoardValues(assessment) })), [history]);
  function begin(copyPrevious: boolean) {
    const latest = history.at(-1);
    if (!copyPrevious || !latest) { setDraft(emptyDraft()); setCopied(new Set()); }
    else {
      const { version: _version, sessionId: _sessionId, authoredAt: _authoredAt, authorUserId: _authorUserId, authorDisplayName: _authorDisplayName, authorRole: _authorRole, ...clinical } = latest;
      setDraft({ ...clinical, status: "DRAFT", assessmentType: "REASSESSMENT", structuredFindings: { ...clinical.structuredFindings } });
      setCopied(new Set(Object.keys(toBoardValues(latest)).filter((key) => toBoardValues(latest)[key] !== undefined)));
    }
    setDraftTime(new Date().toISOString());
    setMessage(copyPrevious ? "Previous values copied into a new unsaved draft." : "New blank reassessment draft created.");
  }
  function patch(id: string, value: NursingBoardValue) {
    setDraft((current) => current ? patchAssessment(current, id, value) : current);
    setCopied((current) => { const next = new Set(current); next.delete(id); return next; });
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      await apiFetch(`/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessments`, { method: "POST", facilityId, body: JSON.stringify({ ...draft, clinicalEffectiveAt: draftTime, status: "SAVED" }) });
      setDraft(null); setCopied(new Set()); setMessage("Nursing assessment saved to immutable history.");
      await load(); await onSaved();
    } finally { setBusy(false); }
  }
  const latest = history.at(-1);
  const summaryValues = draft ? toBoardValues(draft) : latest ? toBoardValues(latest) : {};
  const french = language === "fr";
  return <div data-testid="inpatient-native-nursing-assessment">
    <NursingDocumentationBoard title={french ? "Évaluation infirmière" : "Nursing Assessment"} context={latest ? <>{french ? "Dernière documentation" : "Last documented"}: {new Date(latest.clinicalEffectiveAt ?? latest.authoredAt).toLocaleString()} · {latest.authorDisplayName}</> : null} rows={localizeRows(ROWS, french)} columns={columns} draft={draft ? toBoardValues(draft) : null} draftTime={draftTime} onDraftTimeChange={(value) => setDraftTime(new Date(value).toISOString())} copiedFieldIds={copied} readOnly={isLocked} busy={busy} onChange={patch} onNew={() => begin(false)} onCopyPrevious={() => begin(true)} onSave={() => void save()} labels={french ? { clinicalFinding: "Constat clinique", noSaved: "Aucune évaluation enregistrée", addColumn: "+ Ajouter une colonne", copyPrevious: "Copier la précédente", save: "Enregistrer l’évaluation", notCharted: "Non documenté", currentSaved: "ACTUELLE · ENREGISTRÉE", saved: "ENREGISTRÉE", draft: "BROUILLON", summary: "Résumé infirmier", clinicalTime: "Date et heure cliniques" } : undefined} summary={<Summary values={summaryValues} french={french} />} />
    <section style={{ marginTop: 18 }} data-testid="inpatient-clinical-documentation-catalog">
      <ClinicalDocumentationHub careSetting="INPATIENT" encounterId={encounterId} facilityId={facilityId} accessMode={isLocked ? "review" : "edit"} />
    </section>
    {message && <p role="status">{message}</p>}
    {isLocked && <p role="status">Read-only: nursing assessment authoring requires RN or Admin authority.</p>}
  </div>;
}

function toBoardValues(value: InpatientNursingAssessmentSave): Record<string, NursingBoardValue> {
  return { ...value.structuredFindings, narrative: value.narrative, painScore: value.pain?.score ?? value.structuredFindings?.painScore, airway: value.airway?.code ?? value.structuredFindings?.airway, fallRisk: value.fallRisk?.level ?? value.structuredFindings?.fallRisk, mobility: value.mobility?.code ?? value.structuredFindings?.mobility, levelOfConsciousness: value.mentalStatus?.code ?? value.structuredFindings?.levelOfConsciousness };
}
function patchAssessment(current: InpatientNursingAssessmentSave, id: string, value: NursingBoardValue): InpatientNursingAssessmentSave {
  if (id === "narrative") return { ...current, narrative: String(value ?? "") };
  const next: InpatientNursingAssessmentSave = { ...current, structuredFindings: { ...current.structuredFindings, [id]: value ?? "" } };
  if (id === "painScore" && typeof value === "number") next.pain = { ...current.pain, score: value };
  if (id === "airway") next.airway = { code: String(value ?? "") };
  if (id === "fallRisk" && ["LOW", "MODERATE", "HIGH"].includes(String(value))) next.fallRisk = { level: value as "LOW" | "MODERATE" | "HIGH" };
  if (id === "mobility") next.mobility = { code: String(value ?? "") };
  if (id === "levelOfConsciousness") next.mentalStatus = { code: String(value ?? "") };
  return next;
}
const FR_LABELS: Record<string, string> = { "Mental status": "État mental", Orientation: "Orientation", Speech: "Parole", "Pain score (0–10)": "Score de douleur (0 à 10)", "Pain location": "Localisation de la douleur", Airway: "Voies respiratoires", "Respiratory effort": "Effort respiratoire", "Respiratory pattern": "Rythme respiratoire", "Breath sounds": "Bruits respiratoires", "Oxygen / device": "Oxygène / dispositif", "Cardiac rhythm": "Rythme cardiaque", "Peripheral perfusion": "Perfusion périphérique", Edema: "Œdème", Abdomen: "Abdomen", "Bowel sounds": "Bruits intestinaux", "Nausea / vomiting": "Nausées / vomissements", "Voiding / urinary status": "Miction / état urinaire", "Skin condition": "État de la peau", "Wounds / pressure concern": "Plaies / risque de lésion de pression", Mobility: "Mobilité", Gait: "Démarche", "Fall risk": "Risque de chute", "Fall precautions": "Précautions contre les chutes", "Lines / drains / devices": "Voies / drains / dispositifs", "Safety precautions": "Précautions de sécurité", "Nutrition / hydration": "Nutrition / hydratation", "Intake / output status": "État des ingestions et excrétions", "Nursing narrative": "Note narrative infirmière", Neurological: "Neurologique", Pain: "Douleur", Respiratory: "Respiratoire", Cardiovascular: "Cardiovasculaire", Gastrointestinal: "Gastro-intestinal", Genitourinary: "Génito-urinaire", "Skin and wounds": "Peau et plaies", "Mobility and safety": "Mobilité et sécurité", "Devices and safety": "Dispositifs et sécurité", "Nutrition and output": "Nutrition et excrétions", Narrative: "Note narrative" };
function localizeRows(rows: readonly NursingBoardRow[], french: boolean): NursingBoardRow[] { return french ? rows.map((row) => ({ ...row, label: FR_LABELS[row.label] ?? row.label, group: FR_LABELS[row.group] ?? row.group })) : [...rows]; }
function Summary({ values, french }: { values: Record<string, NursingBoardValue>; french: boolean }) {
  const groups = localizeRows(ROWS, french).reduce<Map<string, NursingBoardRow[]>>((map, row) => map.set(row.group, [...(map.get(row.group) ?? []), row]), new Map());
  return <div data-testid="section-organized-nursing-summary">{[...groups].map(([group, rows]) => {
    const documented = rows.filter((row) => values[row.id] !== undefined && values[row.id] !== "" && (!Array.isArray(values[row.id]) || values[row.id].length > 0));
    if (!documented.length) return null;
    return <section key={group} style={{ marginBottom: 14 }}><h4 style={{ margin: "0 0 6px", textTransform: "uppercase", fontSize: 12 }}>{group}</h4>{documented.map((row) => <p key={row.id} style={{ margin: "4px 0", fontSize: 12 }}><strong>{row.label}:</strong> {String(values[row.id]).replaceAll("_", " ")}</p>)}</section>;
  })}</div>;
}
