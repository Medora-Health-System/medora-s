/**
 * D4A.2 — Build editable admission proposals from documented chart facts only.
 * Never fabricate severity or undocumented clinical claims.
 */

import type { HospitalAdmittingService, HospitalRequestedLevelOfCare } from "./hospitalAdmissionIntakeVocabV1.js";
import type {
  AdmissionPacketV1,
  AdmissionProposalSourceRef,
  AdmissionProvenancedFieldV1,
} from "./smartAdmissionPacketD4a2.js";
import { emptyAdmissionPacketV1 } from "./smartAdmissionPacketD4a2.js";

export type SmartAdmissionChartContextV1 = {
  chiefComplaint?: string | null;
  visitReason?: string | null;
  providerAssessment?: string | null;
  providerPlan?: string | null;
  primaryDiagnosisDisplay?: string | null;
  secondaryDiagnosisDisplays?: string[];
  abnormalResultLines?: string[];
  failedEdTherapyLines?: string[];
  continuedTreatmentNeeds?: string[];
  monitoringNeeds?: string[];
  consultantRecommendationLines?: string[];
  activeMedicationOrderLines?: string[];
  ivFluidOrderLines?: string[];
  dietOrderLines?: string[];
  oxygenOrderLines?: string[];
  monitoringOrderLines?: string[];
  consultOrderLines?: string[];
  labOrderLines?: string[];
  imagingOrderLines?: string[];
  procedureOrderLines?: string[];
  precautionLines?: string[];
};

function trim(s: unknown, max = 800): string {
  return String(s ?? "")
    .trim()
    .slice(0, max);
}

function pushSource(
  sources: AdmissionProposalSourceRef[],
  kind: string,
  label: string,
  excerpt?: string | null
) {
  const ex = trim(excerpt, 240);
  if (!ex && !label.trim()) return;
  sources.push({ kind, label, excerpt: ex || null });
}

function joinUnique(parts: string[], sep = "; "): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = trim(p, 400);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.join(sep);
}

function proposedField(
  value: string,
  sources: AdmissionProposalSourceRef[]
): AdmissionProvenancedFieldV1 | undefined {
  const v = trim(value, 4000);
  if (!v || sources.length === 0) return undefined;
  return {
    value: v,
    origin: "SYSTEM_PROPOSAL",
    sources,
    proposedValue: v,
    physicianConfirmed: false,
  };
}

/** Recommend service only from weak, documented cues — otherwise null. */
export function recommendAdmittingServiceFromContext(
  ctx: SmartAdmissionChartContextV1
): { code: HospitalAdmittingService | null; sources: AdmissionProposalSourceRef[] } {
  const blob = joinUnique(
    [
      ctx.primaryDiagnosisDisplay ?? "",
      ...(ctx.secondaryDiagnosisDisplays ?? []),
      ctx.chiefComplaint ?? "",
      ctx.providerAssessment ?? "",
    ],
    " "
  ).toLowerCase();
  const sources: AdmissionProposalSourceRef[] = [];
  if (ctx.primaryDiagnosisDisplay) {
    pushSource(sources, "DIAGNOSIS", "Primary admission diagnosis", ctx.primaryDiagnosisDisplay);
  }
  if (!blob) return { code: null, sources: [] };

  if (/\b(mi|acs|stemi|nstemi|chf|afib|chest pain|angina|cardio)/.test(blob)) {
    return { code: "CARDIOLOGY", sources };
  }
  if (/\b(copd|pneumonia|asthma|dyspnea|respiratory|pulm)/.test(blob)) {
    return { code: "PULMONOLOGY", sources };
  }
  if (/\b(stroke|cva|seizure|neuro|weakness|hemipares)/.test(blob)) {
    return { code: "NEUROLOGY", sources };
  }
  if (/\b(ckd|dialysis|aki|renal|nephro)/.test(blob)) {
    return { code: "NEPHROLOGY", sources };
  }
  if (/\b(gi bleed|pancreatitis|cirrhosis|gastro)/.test(blob)) {
    return { code: "GASTROENTEROLOGY", sources };
  }
  if (/\b(fracture|ortho|dislocation)/.test(blob)) {
    return { code: "ORTHOPEDIC_SURGERY", sources };
  }
  if (/\b(appendicitis|cholecystitis|bowel obstruction|surgery)/.test(blob)) {
    return { code: "GENERAL_SURGERY", sources };
  }
  if (/\b(pregnan|obstetric|labor|postpartum)/.test(blob)) {
    return { code: "OBSTETRICS", sources };
  }
  if (/\b(pediatric|child|infant|neonat)/.test(blob)) {
    return { code: "PEDIATRICS", sources };
  }
  if (/\b(septic shock|intubat|vasopressor|icu|critical)/.test(blob)) {
    return { code: "CRITICAL_CARE", sources };
  }
  // Default medical admission when diagnosis/CC present — hospital medicine.
  if (sources.length > 0) {
    return { code: "HOSPITAL_MEDICINE", sources };
  }
  return { code: null, sources: [] };
}

export function recommendLevelOfCareFromContext(
  ctx: SmartAdmissionChartContextV1
): { code: HospitalRequestedLevelOfCare | null; sources: AdmissionProposalSourceRef[] } {
  const blob = joinUnique(
    [
      ctx.providerPlan ?? "",
      ctx.providerAssessment ?? "",
      ...(ctx.monitoringNeeds ?? []),
      ...(ctx.oxygenOrderLines ?? []),
    ],
    " "
  ).toLowerCase();
  const sources: AdmissionProposalSourceRef[] = [];
  if (ctx.providerPlan) pushSource(sources, "PROVIDER_PLAN", "Provider plan", ctx.providerPlan);
  if (ctx.monitoringNeeds?.length) {
    pushSource(sources, "MONITORING_NEED", "Monitoring needs", ctx.monitoringNeeds.join("; "));
  }
  if (!blob && sources.length === 0) return { code: null, sources: [] };

  if (/\b(icu|intensive|vasopressor|intubat|critical care)/.test(blob)) {
    return { code: "INTENSIVE_CARE", sources };
  }
  if (/\b(step[- ]?down|intermediate care|imcu)/.test(blob)) {
    return { code: "STEPDOWN", sources };
  }
  if (/\b(telemetry|cardiac monitor|continuous monitor)/.test(blob)) {
    return { code: "TELEMETRY", sources };
  }
  if (/\b(observ|short stay|serial troponin|rule[- ]out)/.test(blob)) {
    return { code: "OBSERVATION", sources };
  }
  if (/\b(labor|delivery|obstetric)/.test(blob)) {
    return { code: "LABOR_AND_DELIVERY", sources };
  }
  if (/\b(pediatric|child)/.test(blob)) {
    return { code: "PEDIATRIC_ACUTE_CARE", sources };
  }
  if (/\b(psych|behavioral|suicidal|psychiatr)/.test(blob)) {
    return { code: "BEHAVIORAL_HEALTH", sources };
  }
  if (sources.length > 0 || ctx.primaryDiagnosisDisplay) {
    if (ctx.primaryDiagnosisDisplay) {
      pushSource(sources, "DIAGNOSIS", "Primary diagnosis", ctx.primaryDiagnosisDisplay);
    }
    return { code: "MEDICAL_SURGICAL", sources };
  }
  return { code: null, sources: [] };
}

export function buildSmartAdmissionProposals(
  ctx: SmartAdmissionChartContextV1
): AdmissionPacketV1 {
  const packet = emptyAdmissionPacketV1();

  // Reason for admission — only from documented elements.
  const reasonSources: AdmissionProposalSourceRef[] = [];
  const reasonParts: string[] = [];
  if (trim(ctx.chiefComplaint) || trim(ctx.visitReason)) {
    const cc = trim(ctx.chiefComplaint) || trim(ctx.visitReason);
    reasonParts.push(`Motif de consultation: ${cc}`);
    pushSource(reasonSources, "CHIEF_COMPLAINT", "Chief complaint / visit reason", cc);
  }
  if (trim(ctx.primaryDiagnosisDisplay)) {
    reasonParts.push(`Diagnostic d'admission: ${trim(ctx.primaryDiagnosisDisplay)}`);
    pushSource(reasonSources, "DIAGNOSIS", "Selected admission diagnosis", ctx.primaryDiagnosisDisplay);
  }
  for (const line of ctx.abnormalResultLines ?? []) {
    if (!trim(line)) continue;
    reasonParts.push(`Résultat anormal documenté: ${trim(line)}`);
    pushSource(reasonSources, "ABNORMAL_RESULT", "Abnormal diagnostic result", line);
  }
  for (const line of ctx.failedEdTherapyLines ?? []) {
    if (!trim(line)) continue;
    reasonParts.push(`Thérapie urgences insuffisante: ${trim(line)}`);
    pushSource(reasonSources, "FAILED_ED_THERAPY", "Failed ED therapy", line);
  }
  for (const line of ctx.continuedTreatmentNeeds ?? []) {
    if (!trim(line)) continue;
    reasonParts.push(`Besoin de poursuite du traitement: ${trim(line)}`);
    pushSource(reasonSources, "CONTINUED_TREATMENT", "Continued treatment need", line);
  }
  for (const line of ctx.monitoringNeeds ?? []) {
    if (!trim(line)) continue;
    reasonParts.push(`Surveillance requise: ${trim(line)}`);
    pushSource(reasonSources, "MONITORING_NEED", "Monitoring need", line);
  }
  for (const line of ctx.consultantRecommendationLines ?? []) {
    if (!trim(line)) continue;
    reasonParts.push(`Recommandation de consultation: ${trim(line)}`);
    pushSource(reasonSources, "CONSULT_REC", "Consultant recommendation", line);
  }
  if (trim(ctx.providerAssessment)) {
    reasonParts.push(`Évaluation médecin: ${trim(ctx.providerAssessment, 500)}`);
    pushSource(reasonSources, "PROVIDER_ASSESSMENT", "Provider assessment", ctx.providerAssessment);
  }
  const reasonField = proposedField(joinUnique(reasonParts), reasonSources);
  if (reasonField) packet.fields.admissionReason = reasonField;

  const serviceRec = recommendAdmittingServiceFromContext(ctx);
  if (serviceRec.code) {
    packet.admittingServiceCode = serviceRec.code;
    packet.fields.serviceUnit = proposedField(serviceRec.code, serviceRec.sources);
  }

  const locRec = recommendLevelOfCareFromContext(ctx);
  if (locRec.code) {
    packet.levelOfCareCode = locRec.code;
    packet.fields.careLevel = proposedField(locRec.code, locRec.sources);
  }

  // Condition — never auto-assign status from diagnosis alone; leave status null.
  // Optional narrative from documented assessment only.
  if (trim(ctx.providerAssessment)) {
    const condSources: AdmissionProposalSourceRef[] = [];
    pushSource(condSources, "PROVIDER_ASSESSMENT", "Provider assessment", ctx.providerAssessment);
    const condField = proposedField(trim(ctx.providerAssessment, 2000), condSources);
    if (condField) packet.fields.conditionAtAdmission = condField;
  }

  // Initial plan — active orders vs narrative recommendations clearly labeled.
  const planSources: AdmissionProposalSourceRef[] = [];
  const planParts: string[] = [];
  const addOrderBlock = (title: string, kind: string, lines?: string[]) => {
    const cleaned = (lines ?? []).map((l) => trim(l)).filter(Boolean);
    if (cleaned.length === 0) return;
    planParts.push(`${title} (ordonnances actives): ${cleaned.join("; ")}`);
    pushSource(planSources, kind, title, cleaned.join("; "));
  };
  addOrderBlock("Médicaments", "ACTIVE_MED_ORDER", ctx.activeMedicationOrderLines);
  addOrderBlock("Solutés IV", "IV_FLUID_ORDER", ctx.ivFluidOrderLines);
  addOrderBlock("Diète / NPO", "DIET_ORDER", ctx.dietOrderLines);
  addOrderBlock("Oxygène", "OXYGEN_ORDER", ctx.oxygenOrderLines);
  addOrderBlock("Surveillance", "MONITORING_ORDER", ctx.monitoringOrderLines);
  addOrderBlock("Consultations", "CONSULT_ORDER", ctx.consultOrderLines);
  addOrderBlock("Laboratoire", "LAB_ORDER", ctx.labOrderLines);
  addOrderBlock("Imagerie", "IMAGING_ORDER", ctx.imagingOrderLines);
  addOrderBlock("Procédures", "PROCEDURE_ORDER", ctx.procedureOrderLines);
  addOrderBlock("Précautions", "PRECAUTION", ctx.precautionLines);
  if (trim(ctx.providerPlan)) {
    planParts.push(`Plan médecin (narratif): ${trim(ctx.providerPlan, 1500)}`);
    pushSource(planSources, "PROVIDER_PLAN", "ED provider plan (narrative)", ctx.providerPlan);
  }
  const planField = proposedField(joinUnique(planParts, "\n"), planSources);
  if (planField) packet.fields.initialPlan = planField;

  return packet;
}

/** Apply proposals into flat summary fields only when the flat field is empty. */
export function applyProposalsToFlatFieldsIfEmpty(
  flat: {
    admissionReason: string;
    serviceUnit: string;
    careLevel: string;
    conditionAtAdmission: string;
    initialPlan: string;
  },
  packet: AdmissionPacketV1
): typeof flat {
  return {
    admissionReason:
      flat.admissionReason.trim() || packet.fields.admissionReason?.value || "",
    serviceUnit:
      flat.serviceUnit.trim() ||
      packet.admittingServiceCode ||
      packet.fields.serviceUnit?.value ||
      "",
    careLevel:
      flat.careLevel.trim() || packet.levelOfCareCode || packet.fields.careLevel?.value || "",
    conditionAtAdmission:
      flat.conditionAtAdmission.trim() || packet.fields.conditionAtAdmission?.value || "",
    initialPlan: flat.initialPlan.trim() || packet.fields.initialPlan?.value || "",
  };
}
