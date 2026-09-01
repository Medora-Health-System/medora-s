/**
 * D4A.2 / D4A.2.1 — Build editable admission proposals from documented chart facts only.
 * Never fabricate severity or undocumented clinical claims. proposalMethod is always RULE_BASED.
 */

import type { HospitalAdmittingService, HospitalRequestedLevelOfCare } from "./hospitalAdmissionIntakeVocabV1.js";
import type {
  AdmissionPacketV1,
  AdmissionProposalSourceRef,
  AdmissionProvenancedFieldV1,
  InitialPlanItemCategory,
  StructuredInitialPlanItemV1,
} from "./smartAdmissionPacketD4a2.js";
import { emptyAdmissionPacketV1 } from "./smartAdmissionPacketD4a2.js";
import { buildNarrativeFromStructuredPlanItems } from "./smartAdmissionClinicalHardeningD4a21.js";
import {
  SMART_ADMISSION_PROPOSAL_PREFIXES,
  type SmartAdmissionProposalLocale,
} from "./edHosp1fStructuredDeparture.js";

export type SmartAdmissionChartContextV1 = {
  chiefComplaint?: string | null;
  visitReason?: string | null;
  providerAssessment?: string | null;
  providerPlan?: string | null;
  primaryDiagnosisDisplay?: string | null;
  primaryDiagnosisId?: string | null;
  secondaryDiagnosisDisplays?: string[];
  abnormalResultLines?: Array<string | { id?: string; label?: string; text: string; recordedAt?: string }>;
  failedEdTherapyLines?: string[];
  continuedTreatmentNeeds?: string[];
  monitoringNeeds?: string[];
  consultantRecommendationLines?: Array<
    string | { id?: string; label?: string; text: string; recordedAt?: string }
  >;
  activeMedicationOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  ivFluidOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  dietOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  oxygenOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  monitoringOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  consultOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  labOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  imagingOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  procedureOrderLines?: Array<string | { id?: string; text: string; status?: string }>;
  precautionLines?: string[];
  discontinuedOrderLines?: Array<string | { id?: string; text: string }>;
};

function trim(s: unknown, max = 800): string {
  return String(s ?? "")
    .trim()
    .slice(0, max);
}

function lineText(line: string | { text: string }): string {
  return typeof line === "string" ? trim(line) : trim(line.text);
}

function lineId(line: string | { id?: string; text: string }): string | null {
  return typeof line === "string" ? null : typeof line.id === "string" ? line.id : null;
}

function pushSource(
  sources: AdmissionProposalSourceRef[],
  sourceType: string,
  label: string,
  displayText?: string | null,
  sourceId?: string | null,
  recordedAt?: string | null
) {
  const ex = trim(displayText, 240);
  if (!ex && !label.trim()) return;
  sources.push({
    kind: sourceType,
    sourceType,
    sourceId: sourceId ?? null,
    label,
    displayText: ex || null,
    excerpt: ex || null,
    recordedAt: recordedAt ?? null,
  });
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
  const generatedAt = new Date().toISOString();
  return {
    value: v,
    origin: "SYSTEM_PROPOSAL",
    provenance: "SYSTEM_PROPOSAL",
    proposalMethod: "RULE_BASED",
    sources,
    proposedValue: v,
    physicianConfirmed: false,
    generatedAt,
  };
}

function planItemId(category: string, sourceId: string | null, display: string, index: number): string {
  const base = sourceId || `${category}:${display.slice(0, 40)}:${index}`;
  return `plan-${base}`.replace(/\s+/g, "_").slice(0, 120);
}

function addOrderItems(
  items: StructuredInitialPlanItemV1[],
  seen: Set<string>,
  category: InitialPlanItemCategory,
  lines: Array<string | { id?: string; text: string; status?: string }> | undefined,
  defaultStatus: "ACTIVE_ORDER" | "DISCONTINUED" = "ACTIVE_ORDER"
) {
  let i = 0;
  for (const line of lines ?? []) {
    const display = lineText(line);
    if (!display) continue;
    const sourceId = lineId(line);
    const statusRaw =
      typeof line === "object" && typeof line.status === "string"
        ? line.status.toUpperCase()
        : defaultStatus;
    const status =
      statusRaw === "DISCONTINUED" || statusRaw === "COMPLETED" || statusRaw === "PLANNED"
        ? statusRaw
        : defaultStatus;
    const id = planItemId(category, sourceId, display, i++);
    if (seen.has(id) || seen.has(display.toLowerCase())) continue;
    seen.add(id);
    seen.add(display.toLowerCase());
    items.push({
      id,
      category,
      sourceType: status === "ACTIVE_ORDER" ? "ACTIVE_ORDER" : "SYSTEM_PROPOSAL",
      sourceId,
      display,
      status,
      selectedForNarrative: status === "ACTIVE_ORDER" || status === "PLANNED",
    });
  }
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
    pushSource(
      sources,
      "DIAGNOSIS",
      "Primary admission diagnosis",
      ctx.primaryDiagnosisDisplay,
      ctx.primaryDiagnosisId ?? null
    );
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
      ...(ctx.oxygenOrderLines ?? []).map(lineText),
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
      pushSource(
        sources,
        "DIAGNOSIS",
        "Primary diagnosis",
        ctx.primaryDiagnosisDisplay,
        ctx.primaryDiagnosisId ?? null
      );
    }
    return { code: "MEDICAL_SURGICAL", sources };
  }
  return { code: null, sources: [] };
}

export function buildSmartAdmissionProposals(
  ctx: SmartAdmissionChartContextV1,
  locale: SmartAdmissionProposalLocale = "fr"
): AdmissionPacketV1 {
  const packet = emptyAdmissionPacketV1();
  const prefix = SMART_ADMISSION_PROPOSAL_PREFIXES[locale] ?? SMART_ADMISSION_PROPOSAL_PREFIXES.fr;

  const reasonSources: AdmissionProposalSourceRef[] = [];
  const reasonParts: string[] = [];
  if (trim(ctx.chiefComplaint) || trim(ctx.visitReason)) {
    const cc = trim(ctx.chiefComplaint) || trim(ctx.visitReason);
    reasonParts.push(`${prefix.chiefComplaint}: ${cc}`);
    pushSource(reasonSources, "CHIEF_COMPLAINT", "Chief complaint / visit reason", cc);
  }
  if (trim(ctx.primaryDiagnosisDisplay)) {
    reasonParts.push(`${prefix.admissionDiagnosis}: ${trim(ctx.primaryDiagnosisDisplay)}`);
    pushSource(
      reasonSources,
      "DIAGNOSIS",
      "Selected admission diagnosis",
      ctx.primaryDiagnosisDisplay,
      ctx.primaryDiagnosisId ?? null
    );
  }
  for (const line of ctx.abnormalResultLines ?? []) {
    const text = lineText(line);
    if (!text) continue;
    reasonParts.push(`${prefix.abnormalResult}: ${text}`);
    const label =
      typeof line === "object" && line.label ? line.label : "Abnormal diagnostic result";
    pushSource(
      reasonSources,
      "ABNORMAL_RESULT",
      label,
      text,
      lineId(line),
      typeof line === "object" ? line.recordedAt ?? null : null
    );
  }
  for (const line of ctx.failedEdTherapyLines ?? []) {
    if (!trim(line)) continue;
    reasonParts.push(`${prefix.failedEdTherapy}: ${trim(line)}`);
    pushSource(reasonSources, "FAILED_ED_THERAPY", "Failed ED therapy", line);
  }
  for (const line of ctx.continuedTreatmentNeeds ?? []) {
    if (!trim(line)) continue;
    reasonParts.push(`${prefix.continuedTreatment}: ${trim(line)}`);
    pushSource(reasonSources, "CONTINUED_TREATMENT", "Continued treatment need", line);
  }
  for (const line of ctx.monitoringNeeds ?? []) {
    if (!trim(line)) continue;
    reasonParts.push(`${prefix.monitoring}: ${trim(line)}`);
    pushSource(reasonSources, "MONITORING_NEED", "Monitoring need", line);
  }
  for (const line of ctx.consultantRecommendationLines ?? []) {
    const text = lineText(line);
    if (!text) continue;
    reasonParts.push(`${prefix.consultRec}: ${text}`);
    const label =
      typeof line === "object" && line.label ? line.label : "Consultant recommendation";
    pushSource(reasonSources, "CONSULT_REC", label, text, lineId(line));
  }
  if (trim(ctx.providerAssessment)) {
    reasonParts.push(`${prefix.providerAssessment}: ${trim(ctx.providerAssessment, 500)}`);
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

  // Condition — never auto-assign status from diagnosis alone.
  if (trim(ctx.providerAssessment)) {
    const condSources: AdmissionProposalSourceRef[] = [];
    pushSource(condSources, "PROVIDER_ASSESSMENT", "Provider assessment", ctx.providerAssessment);
    const condField = proposedField(trim(ctx.providerAssessment, 2000), condSources);
    if (condField) packet.fields.conditionAtAdmission = condField;
  }

  const items: StructuredInitialPlanItemV1[] = [];
  const seen = new Set<string>();
  addOrderItems(items, seen, "MEDICATION", ctx.activeMedicationOrderLines);
  addOrderItems(items, seen, "IV_FLUID", ctx.ivFluidOrderLines);
  addOrderItems(items, seen, "DIET", ctx.dietOrderLines);
  addOrderItems(items, seen, "OTHER", ctx.oxygenOrderLines);
  addOrderItems(items, seen, "MONITORING", ctx.monitoringOrderLines);
  addOrderItems(items, seen, "CONSULT", ctx.consultOrderLines);
  addOrderItems(items, seen, "LAB", ctx.labOrderLines);
  addOrderItems(items, seen, "IMAGING", ctx.imagingOrderLines);
  addOrderItems(items, seen, "PROCEDURE", ctx.procedureOrderLines);
  addOrderItems(items, seen, "PRECAUTION", ctx.precautionLines?.map((t) => ({ text: t })));
  addOrderItems(items, seen, "OTHER", ctx.discontinuedOrderLines, "DISCONTINUED");
  if (trim(ctx.providerPlan)) {
    const id = planItemId("OTHER", null, "provider-plan", items.length);
    if (!seen.has(id)) {
      items.push({
        id,
        category: "OTHER",
        sourceType: "PROVIDER_PLAN",
        sourceId: null,
        display: trim(ctx.providerPlan, 1500),
        status: "PLANNED",
        selectedForNarrative: true,
      });
    }
  }
  packet.structuredInitialPlan = { items };

  const planSources: AdmissionProposalSourceRef[] = [];
  for (const item of items) {
    if (!item.selectedForNarrative) continue;
    pushSource(
      planSources,
      item.sourceType,
      item.status === "ACTIVE_ORDER" ? `Active order — ${item.category}` : `Plan — ${item.category}`,
      item.display,
      item.sourceId
    );
  }
  const narrativeFromItems = buildNarrativeFromStructuredPlanItems(items);
  const planField = proposedField(narrativeFromItems, planSources);
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
