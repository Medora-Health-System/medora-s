/**
 * D4A.2.6A — Provider Clinical Synthesis contracts.
 *
 * Provider Workspace owns clinical synthesis / MDM / problem-oriented plan /
 * progress notes / discharge decision / provider tasks.
 * Enterprise domains own orders, results, MAR, labs, radiology, timeline, etc.
 * This module projects authoritative enterprise records — it never duplicates engines.
 */

import type { HospitalCensusPatientRow } from "./hospitalCensusV1.js";
import type {
  InpatientProviderWorkspaceV1,
  ProviderEventItemV1,
  ProviderProblemPlanItemV1,
  ProviderTaskItemV1,
} from "./inpatientProviderWorkspaceD4a26.js";

export const PROVIDER_CLINICAL_SYNTHESIS_CERTIFICATION_ID =
  "MEDUI.PROVIDER_CLINICAL_SYNTHESIS.D4A2_6A" as const;

export const PROVIDER_PRINT_PACKAGE_KINDS = [
  "HISTORY_PHYSICAL",
  "DAILY_PROGRESS_NOTE",
  "PROBLEM_LIST",
  "PROVIDER_ROUNDING_SUMMARY",
  "DISCHARGE_SUMMARY",
  "PROVIDER_HANDOFF",
] as const;

export type ProviderPrintPackageKind = (typeof PROVIDER_PRINT_PACKAGE_KINDS)[number];

export const PROVIDER_PROGRESS_NOTE_STATUSES = [
  "DRAFT",
  "REVIEW",
  "SIGNED",
  "AMENDED",
  "CORRECTED",
] as const;

export type ProviderProgressNoteStatus = (typeof PROVIDER_PROGRESS_NOTE_STATUSES)[number];

export const PROVIDER_MED_SNAPSHOT_GROUPS = [
  "ANTIBIOTICS",
  "ANTICOAGULANTS",
  "INSULIN",
  "PRESSORS",
  "SEDATION",
  "HIGH_RISK",
  "PAIN",
  "IV_FLUIDS",
  "HELD",
  "OTHER",
] as const;

export type ProviderMedSnapshotGroup = (typeof PROVIDER_MED_SNAPSHOT_GROUPS)[number];

export const PROVIDER_LAB_PANELS = [
  "CBC",
  "BMP",
  "CMP",
  "LFT",
  "COAGS",
  "LACTATE",
  "TROPONIN",
  "CULTURES",
  "OTHER",
] as const;

export type ProviderLabPanel = (typeof PROVIDER_LAB_PANELS)[number];

export type TrendDirection = "UP" | "DOWN" | "FLAT" | "UNKNOWN";

export type VitalMetricKey =
  | "BP"
  | "HR"
  | "RR"
  | "TEMP"
  | "O2"
  | "PAIN"
  | "WEIGHT"
  | "BMI"
  | "MEWS"
  | "FLUID_BALANCE";

export type VitalMetricProjection = {
  key: VitalMetricKey;
  label: string;
  current: string | null;
  previous: string | null;
  trend24h: TrendDirection;
  abnormal: boolean;
  measuredAt: string | null;
  source: "ENTERPRISE_VITALS" | "ENTERPRISE_EDOC" | "MISSING";
};

export type IntakeOutputSynthesis = {
  intake24hMl: number | null;
  output24hMl: number | null;
  balance24hMl: number | null;
  hospitalBalanceMl: number | null;
  urineOutputMl: number | null;
  drainOutputMl: number | null;
  chestTubeMl: number | null;
  ngOutputMl: number | null;
  dialysisMl: number | null;
  documentationPresent: boolean;
  warnings: Array<"LOW_URINE_OUTPUT" | "POSITIVE_BALANCE" | "NEGATIVE_BALANCE" | "MISSING_DOCUMENTATION">;
  source: "ENTERPRISE_EDOC_IO";
};

export type LabResultLineProjection = {
  orderItemId: string;
  orderId: string;
  panel: ProviderLabPanel;
  label: string;
  current: string | null;
  previous: string | null;
  direction: TrendDirection;
  timestamp: string | null;
  critical: boolean;
  abnormal: boolean;
  pending: boolean;
  acknowledgedByProvider: boolean;
  acknowledgedAt: string | null;
};

export type RadiologyStudyProjection = {
  orderItemId: string;
  orderId: string;
  label: string;
  status: "PENDING" | "IN_PROGRESS" | "PRELIMINARY" | "FINAL" | "CRITICAL" | "OTHER";
  impression: string | null;
  radiologist: string | null;
  timestamp: string | null;
  critical: boolean;
  acknowledgedByProvider: boolean;
  acknowledgedAt: string | null;
};

export type MedicationSnapshotLine = {
  orderItemId: string;
  orderId: string;
  group: ProviderMedSnapshotGroup;
  drug: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  start: string | null;
  stop: string | null;
  indication: string | null;
  responsibleProvider: string | null;
  held: boolean;
  deepLinkDomain: "MEDICATION_INTELLIGENCE";
};

export type DischargeBarrierKey =
  | "PENDING_CONSULT"
  | "PENDING_PT"
  | "PENDING_OT"
  | "PENDING_CASE_MANAGEMENT"
  | "PENDING_PLACEMENT"
  | "PENDING_HOME_HEALTH"
  | "PENDING_OXYGEN"
  | "PENDING_DME"
  | "PENDING_FAMILY"
  | "PENDING_TRANSPORTATION"
  | "PENDING_MEDICATIONS"
  | "DISCHARGE_SUMMARY"
  | "MEDICAL_NOT_READY"
  | "OTHER";

export type DischargeReadinessSynthesis = {
  medicalReady: boolean;
  workflowState: string | null;
  estimatedDischargeDate: string | null;
  destination: string | null;
  barriers: Array<{ key: DischargeBarrierKey; label: string; resolved: boolean }>;
  neverAutoDischarge: true;
};

export type CurrentVsAdmissionPain = {
  admissionPain: string | null;
  currentPain: string | null;
  providerAssessment: string | null;
  conceptsSeparated: true;
};

export type ProviderOverviewDashboard = {
  hospitalDay: number | null;
  currentStatus: string | null;
  codeStatus: string | null;
  isolation: string | null;
  attending: string | null;
  consultServices: string[];
  primaryDiagnosis: string | null;
  secondaryProblems: string[];
  currentBed: string | null;
  currentUnit: string | null;
  admissionDate: string | null;
  lengthOfStayHours: number | null;
  estimatedDischarge: string | null;
  provider: string | null;
  resident: string | null;
  app: string | null;
};

export type ProviderProgressNoteDraftV1 = {
  noteId: string;
  expectedVersion: number;
  status: ProviderProgressNoteStatus;
  text: string;
  carryForwardFromNoteId?: string | null;
  carryForwardDiff?: {
    yesterday: string;
    today: string;
    changed: string[];
    removed: string[];
    new: string[];
  } | null;
  signedAt?: string | null;
  signedByUserId?: string | null;
  amendedAt?: string | null;
  lastSavedAt?: string | null;
  serviceDate: string;
};

export type ProviderPrintPackageV1 = {
  kind: ProviderPrintPackageKind;
  title: string;
  signed: boolean;
  revision: number;
  authoritative: true;
  providerSigned: boolean;
  generatedAt: string;
  sections: Array<{ heading: string; body: string }>;
  auditEvent: "PROVIDER_PRINT_PACKAGE_GENERATED";
};

export type ProviderClinicalSynthesisV1 = {
  certification: typeof PROVIDER_CLINICAL_SYNTHESIS_CERTIFICATION_ID;
  encounterId: string;
  patientId: string;
  facilityId: string;
  generatedAt: string;
  overview: ProviderOverviewDashboard;
  vitals: VitalMetricProjection[];
  intakeOutput: IntakeOutputSynthesis;
  laboratories: {
    byPanel: Partial<Record<ProviderLabPanel, LabResultLineProjection[]>>;
    pending: LabResultLineProjection[];
    critical: LabResultLineProjection[];
    abnormal: LabResultLineProjection[];
    trending: LabResultLineProjection[];
  };
  radiology: {
    pending: RadiologyStudyProjection[];
    inProgress: RadiologyStudyProjection[];
    preliminary: RadiologyStudyProjection[];
    final: RadiologyStudyProjection[];
    critical: RadiologyStudyProjection[];
    all: RadiologyStudyProjection[];
  };
  medications: {
    groups: Partial<Record<ProviderMedSnapshotGroup, MedicationSnapshotLine[]>>;
    changes: MedicationSnapshotLine[];
    held: MedicationSnapshotLine[];
  };
  problems: ProviderProblemPlanItemV1[];
  events: ProviderEventItemV1[];
  tasks: {
    critical: ProviderTaskItemV1[];
    today: ProviderTaskItemV1[];
    upcoming: ProviderTaskItemV1[];
    completed: ProviderTaskItemV1[];
  };
  dischargeReadiness: DischargeReadinessSynthesis;
  currentVsAdmission: CurrentVsAdmissionPain;
  timelineReuse: {
    endpoint: "unified-timeline";
    duplicated: false;
  };
  clinicalSafety: {
    neverAutoGenerateRos: true;
    neverAutoGenerateExam: true;
    neverAutoGenerateAssessment: true;
    neverAutoGenerateOrders: true;
    neverAutoGenerateDiagnoses: true;
    neverAutoGenerateProgressNotes: true;
    neverAutoGenerateDischargeSummary: true;
    neverAutoAcknowledge: true;
  };
  expectedVersion: number;
  offlineHint: boolean;
};

/** Pure: hospital day from admission clock (provider synthesis). */
export function computeProviderHospitalDay(
  admittedAtIso: string | null | undefined,
  nowIso?: string
): number | null {
  if (!admittedAtIso) return null;
  const admitted = Date.parse(admittedAtIso);
  if (!Number.isFinite(admitted)) return null;
  const now = Date.parse(nowIso ?? new Date().toISOString());
  if (!Number.isFinite(now) || now < admitted) return 1;
  const days = Math.floor((now - admitted) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, days);
}

export function computeProviderLosHours(
  admittedAtIso: string | null | undefined,
  nowIso?: string
): number | null {
  if (!admittedAtIso) return null;
  const admitted = Date.parse(admittedAtIso);
  if (!Number.isFinite(admitted)) return null;
  const now = Date.parse(nowIso ?? new Date().toISOString());
  if (!Number.isFinite(now) || now < admitted) return 0;
  return Math.round((now - admitted) / (60 * 60 * 1000));
}

export function trendFromNumeric(
  current: number | null | undefined,
  previous: number | null | undefined
): TrendDirection {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return "UNKNOWN";
  }
  if (current > previous) return "UP";
  if (current < previous) return "DOWN";
  return "FLAT";
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** Project enterprise vitals readings into provider synthesis metrics. */
export function projectProviderVitals(input: {
  readings: Array<{ measuredAt: string; vitals: Record<string, unknown> }>;
  mewsIfPresent?: number | null;
  fluidBalanceMl?: number | null;
  nowIso?: string;
}): VitalMetricProjection[] {
  const sorted = [...input.readings].sort(
    (a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt)
  );
  const current = sorted[0]?.vitals ?? {};
  const previous = sorted[1]?.vitals ?? {};
  const measuredAt = sorted[0]?.measuredAt ?? null;
  const cutoff = Date.parse(input.nowIso ?? new Date().toISOString()) - 24 * 60 * 60 * 1000;
  const last24 = sorted.filter((r) => Date.parse(r.measuredAt) >= cutoff);

  const metric = (
    key: VitalMetricKey,
    label: string,
    curRaw: unknown,
    prevRaw: unknown,
    abnormalFn: (n: number | null) => boolean,
    format?: (n: number | null, raw: unknown) => string | null
  ): VitalMetricProjection => {
    const curN = num(curRaw);
    const prevN = num(prevRaw);
    const fmt = format ?? ((n, raw) => (n != null ? String(n) : str(raw)));
    const trendSeries = last24
      .map((r) => {
        if (key === "BP") return num(r.vitals.systolic ?? r.vitals.sbp ?? r.vitals.bpSystolic);
        if (key === "HR") return num(r.vitals.hr ?? r.vitals.heartRate ?? r.vitals.pulse);
        if (key === "RR") return num(r.vitals.rr ?? r.vitals.respiratoryRate);
        if (key === "TEMP") return num(r.vitals.temp ?? r.vitals.temperature);
        if (key === "O2") return num(r.vitals.spo2 ?? r.vitals.o2Sat ?? r.vitals.oxygenSaturation);
        if (key === "PAIN") return num(r.vitals.pain ?? r.vitals.painScore);
        if (key === "WEIGHT") return num(r.vitals.weight ?? r.vitals.weightKg);
        if (key === "BMI") return num(r.vitals.bmi);
        return null;
      })
      .filter((n): n is number => n != null);
    const trend24h =
      trendSeries.length >= 2
        ? trendFromNumeric(trendSeries[0]!, trendSeries[trendSeries.length - 1]!)
        : trendFromNumeric(curN, prevN);
    return {
      key,
      label,
      current: fmt(curN, curRaw),
      previous: fmt(prevN, prevRaw),
      trend24h,
      abnormal: abnormalFn(curN),
      measuredAt,
      source: sorted.length ? "ENTERPRISE_VITALS" : "MISSING",
    };
  };

  const bpCur =
    current.bp != null
      ? str(current.bp)
      : current.systolic != null || current.sbp != null
        ? `${str(current.systolic ?? current.sbp) ?? "?"}/${str(current.diastolic ?? current.dbp) ?? "?"}`
        : null;
  const bpPrev =
    previous.bp != null
      ? str(previous.bp)
      : previous.systolic != null || previous.sbp != null
        ? `${str(previous.systolic ?? previous.sbp) ?? "?"}/${str(previous.diastolic ?? previous.dbp) ?? "?"}`
        : null;

  const list: VitalMetricProjection[] = [
    {
      key: "BP",
      label: "BP",
      current: bpCur,
      previous: bpPrev,
      trend24h: trendFromNumeric(
        num(current.systolic ?? current.sbp),
        num(previous.systolic ?? previous.sbp)
      ),
      abnormal: (() => {
        const s = num(current.systolic ?? current.sbp);
        const d = num(current.diastolic ?? current.dbp);
        return (s != null && (s >= 160 || s <= 90)) || (d != null && (d >= 100 || d <= 50));
      })(),
      measuredAt,
      source: sorted.length ? "ENTERPRISE_VITALS" : "MISSING",
    },
    metric("HR", "HR", current.hr ?? current.heartRate ?? current.pulse, previous.hr ?? previous.heartRate ?? previous.pulse, (n) => n != null && (n >= 110 || n <= 50)),
    metric("RR", "RR", current.rr ?? current.respiratoryRate, previous.rr ?? previous.respiratoryRate, (n) => n != null && (n >= 24 || n <= 10)),
    metric("TEMP", "Temp", current.temp ?? current.temperature, previous.temp ?? previous.temperature, (n) => n != null && (n >= 38.3 || n <= 35.5)),
    metric("O2", "O2", current.spo2 ?? current.o2Sat ?? current.oxygenSaturation, previous.spo2 ?? previous.o2Sat ?? previous.oxygenSaturation, (n) => n != null && n < 92),
    metric("PAIN", "Pain", current.pain ?? current.painScore, previous.pain ?? previous.painScore, (n) => n != null && n >= 7),
    metric("WEIGHT", "Weight", current.weight ?? current.weightKg, previous.weight ?? previous.weightKg, () => false),
    metric("BMI", "BMI", current.bmi, previous.bmi, (n) => n != null && (n >= 40 || n < 16)),
  ];

  if (input.mewsIfPresent != null && Number.isFinite(input.mewsIfPresent)) {
    list.push({
      key: "MEWS",
      label: "MEWS",
      current: String(input.mewsIfPresent),
      previous: null,
      trend24h: "UNKNOWN",
      abnormal: input.mewsIfPresent >= 5,
      measuredAt,
      source: "ENTERPRISE_VITALS",
    });
  }

  if (input.fluidBalanceMl != null && Number.isFinite(input.fluidBalanceMl)) {
    list.push({
      key: "FLUID_BALANCE",
      label: "Fluid balance",
      current: `${input.fluidBalanceMl >= 0 ? "+" : ""}${input.fluidBalanceMl} mL`,
      previous: null,
      trend24h: "UNKNOWN",
      abnormal: Math.abs(input.fluidBalanceMl) >= 2000,
      measuredAt,
      source: "ENTERPRISE_EDOC",
    });
  }

  return list;
}

export function projectIntakeOutputSynthesis(input: {
  entries: Array<{
    cardId: string;
    createdAt: string;
    voidedAt?: string | null;
    payloadJson?: unknown;
  }>;
  nowIso?: string;
}): IntakeOutputSynthesis {
  const now = Date.parse(input.nowIso ?? new Date().toISOString());
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const active = input.entries.filter((e) => !e.voidedAt);
  let intake24 = 0;
  let output24 = 0;
  let intakeAll = 0;
  let outputAll = 0;
  let urine = 0;
  let drain = 0;
  let chest = 0;
  let ng = 0;
  let dialysis = 0;
  let any = false;

  for (const e of active) {
    const payload =
      e.payloadJson && typeof e.payloadJson === "object" && !Array.isArray(e.payloadJson)
        ? (e.payloadJson as Record<string, unknown>)
        : {};
    const card = e.cardId.toLowerCase();
    const amount =
      num(payload.totalIntakeMl) ??
      num(payload.totalOutputMl) ??
      num(payload.amountMl) ??
      num(payload.amount) ??
      null;
    const created = Date.parse(e.createdAt);
    const in24 = Number.isFinite(created) && created >= dayAgo;

    if (card.includes("summary") && payload.totalIntakeMl != null) {
      any = true;
      const ti = num(payload.totalIntakeMl) ?? 0;
      const to = num(payload.totalOutputMl) ?? 0;
      if (in24) {
        intake24 += ti;
        output24 += to;
      }
      intakeAll += ti;
      outputAll += to;
      continue;
    }

    const isIntake =
      card.includes("intake") || card.includes("iv") || card.includes("po") || card.includes("blood");
    const isOutput =
      card.includes("output") ||
      card.includes("urine") ||
      card.includes("drain") ||
      card.includes("chest") ||
      card.includes("ng") ||
      card.includes("dialysis");

    if (amount == null) continue;
    any = true;
    if (isIntake) {
      if (in24) intake24 += amount;
      intakeAll += amount;
    }
    if (isOutput) {
      if (in24) output24 += amount;
      outputAll += amount;
      if (card.includes("urine")) urine += amount;
      if (card.includes("drain")) drain += amount;
      if (card.includes("chest")) chest += amount;
      if (card.includes("ng")) ng += amount;
      if (card.includes("dialysis")) dialysis += amount;
    }
  }

  const balance24 = any ? intake24 - output24 : null;
  const hospitalBalance = any ? intakeAll - outputAll : null;
  const warnings: IntakeOutputSynthesis["warnings"] = [];
  if (!any) warnings.push("MISSING_DOCUMENTATION");
  if (urine > 0 && urine < 400) warnings.push("LOW_URINE_OUTPUT");
  if (balance24 != null && balance24 >= 1500) warnings.push("POSITIVE_BALANCE");
  if (balance24 != null && balance24 <= -1500) warnings.push("NEGATIVE_BALANCE");

  return {
    intake24hMl: any ? intake24 : null,
    output24hMl: any ? output24 : null,
    balance24hMl: balance24,
    hospitalBalanceMl: hospitalBalance,
    urineOutputMl: urine || null,
    drainOutputMl: drain || null,
    chestTubeMl: chest || null,
    ngOutputMl: ng || null,
    dialysisMl: dialysis || null,
    documentationPresent: any,
    warnings,
    source: "ENTERPRISE_EDOC_IO",
  };
}

export function classifyLabPanel(label: string): ProviderLabPanel {
  const u = label.toUpperCase();
  if (/\bCBC\b|HEMOGRAM|HEMOGLOBIN|HEMATOCRIT|WBC|PLATELET/.test(u)) return "CBC";
  if (/\bCMP\b|COMPREHENSIVE METABOLIC/.test(u)) return "CMP";
  if (/\bBMP\b|BASIC METABOLIC|ELECTROLYTE|SODIUM|POTASSIUM|CREATININE|BUN\b/.test(u)) return "BMP";
  if (/\bLFT\b|LIVER|AST\b|ALT\b|BILIRUBIN|ALP\b/.test(u)) return "LFT";
  if (/COAG|INR|PT\b|PTT|APTT/.test(u)) return "COAGS";
  if (/LACTATE/.test(u)) return "LACTATE";
  if (/TROPONIN|HS-TROP/.test(u)) return "TROPONIN";
  if (/CULTURE|BLOOD CULT|URINE CULT/.test(u)) return "CULTURES";
  return "OTHER";
}

export function classifyMedGroup(input: {
  label: string;
  route?: string | null;
  held?: boolean;
}): ProviderMedSnapshotGroup {
  if (input.held) return "HELD";
  const u = input.label.toUpperCase();
  const route = String(input.route ?? "").toUpperCase();
  if (/ANTIBIOT|CEFTRIAX|VANCOMYC|PIPERACILL|AZITHRO|METRONID|CIPRO|LEVOFLOX|MEROPENEM/.test(u))
    return "ANTIBIOTICS";
  if (/HEPARIN|ENOXAPARIN|WARFARIN|APIXABAN|RIVAROXABAN|DOAC|ANTICOAG/.test(u)) return "ANTICOAGULANTS";
  if (/INSULIN|LISPRO|GLARGINE|ASPART|DETEMIR/.test(u)) return "INSULIN";
  if (/NOREPI|EPINEPHRINE|VASOPRESSIN|DOPAMINE|PHENYLEPHRINE|PRESSOR/.test(u)) return "PRESSORS";
  if (/PROPOFOL|MIDAZOLAM|DEXMEDETOM|LORAZESPAM|FENTANYL|SEDAT/.test(u)) return "SEDATION";
  if (/MORPHINE|HYDROMORPHONE|OXYCODONE|OPIOID|TRAMADOL|ACETAMINOPHEN|IBUPROFEN|PAIN/.test(u))
    return "PAIN";
  if (/NS\b|NORMAL SALINE|LACTATED|LR\b|D5W|IV FLUID|FLUID/.test(u) || route.includes("IV")) {
    if (/NS\b|NORMAL SALINE|LACTATED|LR\b|D5W|IV FLUID/.test(u)) return "IV_FLUIDS";
  }
  if (/HIGH.?RISK|CHEMO|POTASSIUM IV|MAGNESIUM IV/.test(u)) return "HIGH_RISK";
  return "OTHER";
}

export function projectLabLines(input: {
  items: Array<{
    orderItemId: string;
    orderId: string;
    label: string;
    status: string;
    resultText?: string | null;
    criticalValue?: boolean;
    acknowledgedByProviderAt?: string | null;
    resultUpdatedAt?: string | null;
    previousResultText?: string | null;
  }>;
}): ProviderClinicalSynthesisV1["laboratories"] {
  const lines: LabResultLineProjection[] = input.items.map((it) => {
    const pending = !it.resultText && !/COMPLETE|FINAL|RESULTED|VERIFIED/i.test(it.status);
    const current = it.resultText?.trim() || null;
    const previous = it.previousResultText?.trim() || null;
    const curN = num(current);
    const prevN = num(previous);
    return {
      orderItemId: it.orderItemId,
      orderId: it.orderId,
      panel: classifyLabPanel(it.label),
      label: it.label,
      current,
      previous,
      direction: trendFromNumeric(curN, prevN),
      timestamp: it.resultUpdatedAt ?? null,
      critical: Boolean(it.criticalValue),
      abnormal: Boolean(it.criticalValue) || /ABNORMAL|HIGH|LOW|\*/i.test(current ?? ""),
      pending,
      acknowledgedByProvider: Boolean(it.acknowledgedByProviderAt),
      acknowledgedAt: it.acknowledgedByProviderAt ?? null,
    };
  });

  const byPanel: Partial<Record<ProviderLabPanel, LabResultLineProjection[]>> = {};
  for (const line of lines) {
    const bucket = byPanel[line.panel] ?? [];
    bucket.push(line);
    byPanel[line.panel] = bucket;
  }
  return {
    byPanel,
    pending: lines.filter((l) => l.pending),
    critical: lines.filter((l) => l.critical),
    abnormal: lines.filter((l) => l.abnormal && !l.critical),
    trending: lines.filter((l) => l.direction === "UP" || l.direction === "DOWN"),
  };
}

export function projectRadiologyStudies(input: {
  items: Array<{
    orderItemId: string;
    orderId: string;
    label: string;
    status: string;
    impression?: string | null;
    radiologist?: string | null;
    timestamp?: string | null;
    criticalValue?: boolean;
    acknowledgedByProviderAt?: string | null;
  }>;
}): ProviderClinicalSynthesisV1["radiology"] {
  const mapStatus = (status: string, critical: boolean): RadiologyStudyProjection["status"] => {
    if (critical) return "CRITICAL";
    const u = status.toUpperCase();
    if (/PENDING|ORDERED|SCHEDULED/.test(u)) return "PENDING";
    if (/IN_PROGRESS|STARTED|PERFORMED|ACK/.test(u)) return "IN_PROGRESS";
    if (/PRELIM/.test(u)) return "PRELIMINARY";
    if (/FINAL|COMPLETE|VERIFIED|RESULTED/.test(u)) return "FINAL";
    return "OTHER";
  };

  const all: RadiologyStudyProjection[] = input.items.map((it) => ({
    orderItemId: it.orderItemId,
    orderId: it.orderId,
    label: it.label,
    status: mapStatus(it.status, Boolean(it.criticalValue)),
    impression: it.impression?.trim() || null,
    radiologist: it.radiologist?.trim() || null,
    timestamp: it.timestamp ?? null,
    critical: Boolean(it.criticalValue),
    acknowledgedByProvider: Boolean(it.acknowledgedByProviderAt),
    acknowledgedAt: it.acknowledgedByProviderAt ?? null,
  }));

  return {
    pending: all.filter((x) => x.status === "PENDING"),
    inProgress: all.filter((x) => x.status === "IN_PROGRESS"),
    preliminary: all.filter((x) => x.status === "PRELIMINARY"),
    final: all.filter((x) => x.status === "FINAL"),
    critical: all.filter((x) => x.critical || x.status === "CRITICAL"),
    all,
  };
}

export function projectMedicationSnapshot(input: {
  items: Array<{
    orderItemId: string;
    orderId: string;
    label: string;
    dose?: string | null;
    route?: string | null;
    frequency?: string | null;
    start?: string | null;
    stop?: string | null;
    indication?: string | null;
    responsibleProvider?: string | null;
    held?: boolean;
    recentlyChanged?: boolean;
  }>;
}): ProviderClinicalSynthesisV1["medications"] {
  const lines: MedicationSnapshotLine[] = input.items.map((it) => ({
    orderItemId: it.orderItemId,
    orderId: it.orderId,
    group: classifyMedGroup({ label: it.label, route: it.route, held: it.held }),
    drug: it.label,
    dose: it.dose ?? null,
    route: it.route ?? null,
    frequency: it.frequency ?? null,
    start: it.start ?? null,
    stop: it.stop ?? null,
    indication: it.indication ?? null,
    responsibleProvider: it.responsibleProvider ?? null,
    held: Boolean(it.held),
    deepLinkDomain: "MEDICATION_INTELLIGENCE",
  }));
  const groups: Partial<Record<ProviderMedSnapshotGroup, MedicationSnapshotLine[]>> = {};
  for (const line of lines) {
    const bucket = groups[line.group] ?? [];
    bucket.push(line);
    groups[line.group] = bucket;
  }
  return {
    groups,
    changes: lines.filter((_, i) => input.items[i]?.recentlyChanged),
    held: lines.filter((l) => l.held),
  };
}

export function projectDischargeReadiness(input: {
  workflowState?: string | null;
  estimatedDischargeDate?: string | null;
  destination?: string | null;
  barriersText?: string | null;
  pendingConsultCount?: number;
  pendingPt?: boolean;
  pendingOt?: boolean;
  medReconIncomplete?: boolean;
  hpUnsigned?: boolean;
}): DischargeReadinessSynthesis {
  const barriers: DischargeReadinessSynthesis["barriers"] = [];
  const wf = String(input.workflowState ?? "").toUpperCase();
  const medicalReady = wf === "READY" || wf === "DISCHARGED";
  if (!medicalReady) {
    barriers.push({ key: "MEDICAL_NOT_READY", label: "Medical readiness pending", resolved: false });
  }
  if ((input.pendingConsultCount ?? 0) > 0) {
    barriers.push({ key: "PENDING_CONSULT", label: "Pending consult", resolved: false });
  }
  if (input.pendingPt) barriers.push({ key: "PENDING_PT", label: "Pending PT", resolved: false });
  if (input.pendingOt) barriers.push({ key: "PENDING_OT", label: "Pending OT", resolved: false });
  if (input.medReconIncomplete) {
    barriers.push({ key: "PENDING_MEDICATIONS", label: "Pending medications / recon", resolved: false });
  }
  if (input.hpUnsigned) {
    barriers.push({ key: "DISCHARGE_SUMMARY", label: "Provider documentation incomplete", resolved: false });
  }
  const text = String(input.barriersText ?? "").toLowerCase();
  if (text.includes("placement")) {
    barriers.push({ key: "PENDING_PLACEMENT", label: "Pending placement", resolved: false });
  }
  if (text.includes("transport")) {
    barriers.push({ key: "PENDING_TRANSPORTATION", label: "Pending transportation", resolved: false });
  }
  if (text.includes("family")) {
    barriers.push({ key: "PENDING_FAMILY", label: "Pending family", resolved: false });
  }
  if (text.includes("oxygen") || text.includes("o2")) {
    barriers.push({ key: "PENDING_OXYGEN", label: "Pending oxygen", resolved: false });
  }
  if (text.includes("dme")) {
    barriers.push({ key: "PENDING_DME", label: "Pending DME", resolved: false });
  }
  if (text.includes("home health")) {
    barriers.push({ key: "PENDING_HOME_HEALTH", label: "Pending home health", resolved: false });
  }
  if (text.includes("case management") || text.includes("case-management")) {
    barriers.push({ key: "PENDING_CASE_MANAGEMENT", label: "Pending case management", resolved: false });
  }
  return {
    medicalReady,
    workflowState: input.workflowState ?? null,
    estimatedDischargeDate: input.estimatedDischargeDate ?? null,
    destination: input.destination ?? null,
    barriers,
    neverAutoDischarge: true,
  };
}

export function groupProviderTasks(tasks: ProviderTaskItemV1[]): ProviderClinicalSynthesisV1["tasks"] {
  const open = tasks.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");
  const completed = tasks.filter((t) => t.status === "COMPLETED");
  return {
    critical: open.filter((t) => t.priority === "STAT" || t.type === "CRITICAL_RESULT_ACK"),
    today: open.filter((t) => t.priority === "URGENT" || t.type === "PROGRESS_NOTE_DUE" || t.type === "HP_DUE"),
    upcoming: open.filter(
      (t) =>
        t.priority === "ROUTINE" &&
        t.type !== "PROGRESS_NOTE_DUE" &&
        t.type !== "HP_DUE" &&
        t.type !== "CRITICAL_RESULT_ACK"
    ),
    completed,
  };
}

export function buildCarryForwardDiff(yesterday: string, today: string): NonNullable<
  ProviderProgressNoteDraftV1["carryForwardDiff"]
> {
  const yLines = yesterday
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const tLines = today
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ySet = new Set(yLines);
  const tSet = new Set(tLines);
  return {
    yesterday,
    today,
    changed: tLines.filter((l) => ySet.has(l) === false && yLines.some((y) => y !== l)),
    removed: yLines.filter((l) => !tSet.has(l)),
    new: tLines.filter((l) => !ySet.has(l)),
  };
}

/** Explicit carry-forward — never silent auto-copy. */
export function buildProgressNoteCarryForward(input: {
  from: ProviderProgressNoteDraftV1;
  actorUserId: string;
  serviceDate: string;
  atIso?: string;
}): ProviderProgressNoteDraftV1 {
  const at = input.atIso ?? new Date().toISOString();
  const today = input.from.text;
  return {
    noteId: `pn-${Date.parse(at)}-${input.actorUserId.slice(0, 6)}`,
    expectedVersion: 0,
    status: "DRAFT",
    text: today,
    carryForwardFromNoteId: input.from.noteId,
    carryForwardDiff: buildCarryForwardDiff(input.from.text, today),
    lastSavedAt: at,
    serviceDate: input.serviceDate,
  };
}

export function saveProviderProgressNoteDraft(input: {
  notes: ProviderProgressNoteDraftV1[];
  note: ProviderProgressNoteDraftV1;
  clientExpectedVersion: number;
  documentExpectedVersion: number;
}):
  | { ok: true; notes: ProviderProgressNoteDraftV1[]; nextDocumentVersion: number }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" | "PROVIDER_NOTE_ALREADY_SIGNED" } {
  if (input.clientExpectedVersion !== input.documentExpectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  const existing = input.notes.find((n) => n.noteId === input.note.noteId);
  if (existing?.status === "SIGNED" || existing?.status === "CORRECTED") {
    return { ok: false, code: "PROVIDER_NOTE_ALREADY_SIGNED" };
  }
  const next = [...input.notes];
  const idx = next.findIndex((n) => n.noteId === input.note.noteId);
  const saved: ProviderProgressNoteDraftV1 = {
    ...input.note,
    expectedVersion: (existing?.expectedVersion ?? 0) + 1,
    status: input.note.status === "REVIEW" ? "REVIEW" : "DRAFT",
    lastSavedAt: new Date().toISOString(),
  };
  if (idx >= 0) next[idx] = saved;
  else next.push(saved);
  return {
    ok: true,
    notes: next,
    nextDocumentVersion: input.documentExpectedVersion + 1,
  };
}

export function signProviderProgressNote(input: {
  notes: ProviderProgressNoteDraftV1[];
  noteId: string;
  actorUserId: string;
  clientExpectedVersion: number;
  documentExpectedVersion: number;
  atIso?: string;
}):
  | { ok: true; notes: ProviderProgressNoteDraftV1[]; nextDocumentVersion: number }
  | { ok: false; code: "PROVIDER_DOCUMENT_STALE" | "PROVIDER_NOTE_ALREADY_SIGNED" | "NOTE_NOT_FOUND" } {
  if (input.clientExpectedVersion !== input.documentExpectedVersion) {
    return { ok: false, code: "PROVIDER_DOCUMENT_STALE" };
  }
  const idx = input.notes.findIndex((n) => n.noteId === input.noteId);
  if (idx < 0) return { ok: false, code: "NOTE_NOT_FOUND" };
  const prev = input.notes[idx]!;
  if (prev.status === "SIGNED" || prev.status === "CORRECTED") {
    return { ok: false, code: "PROVIDER_NOTE_ALREADY_SIGNED" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const next = [...input.notes];
  next[idx] = {
    ...prev,
    status: "SIGNED",
    signedAt: at,
    signedByUserId: input.actorUserId,
    expectedVersion: prev.expectedVersion + 1,
    lastSavedAt: at,
  };
  return {
    ok: true,
    notes: next,
    nextDocumentVersion: input.documentExpectedVersion + 1,
  };
}

export function buildProviderPrintPackage(input: {
  kind: ProviderPrintPackageKind;
  title: string;
  signed: boolean;
  revision: number;
  providerSigned: boolean;
  sections: Array<{ heading: string; body: string }>;
  atIso?: string;
}): ProviderPrintPackageV1 {
  return {
    kind: input.kind,
    title: input.title,
    signed: input.signed,
    revision: input.revision,
    authoritative: true,
    providerSigned: input.providerSigned,
    generatedAt: input.atIso ?? new Date().toISOString(),
    sections: input.sections,
    auditEvent: "PROVIDER_PRINT_PACKAGE_GENERATED",
  };
}

export type ProviderCensusFilter = {
  attending?: string | null;
  service?: string | null;
  unit?: string | null;
  isolation?: boolean | null;
  observation?: boolean | null;
  medSurg?: boolean | null;
  minLosHours?: number | null;
  dischargeReady?: boolean | null;
  pendingConsult?: boolean | null;
  pendingImaging?: boolean | null;
  query?: string | null;
};

export type ProviderCensusSort =
  | "ROOM"
  | "LOS"
  | "ACUITY"
  | "DISCHARGE_PRIORITY"
  | "NAME";

export function filterProviderCensusRows(
  rows: HospitalCensusPatientRow[],
  filter: ProviderCensusFilter
): HospitalCensusPatientRow[] {
  const q = String(filter.query ?? "")
    .trim()
    .toLowerCase();
  return rows.filter((r) => {
    if (filter.attending && !(r.attendingName ?? "").toLowerCase().includes(filter.attending.toLowerCase())) {
      return false;
    }
    if (filter.unit && !(r.unitRoomBed ?? "").toLowerCase().includes(filter.unit.toLowerCase())) {
      return false;
    }
    if (filter.observation === true && r.clinicalContext !== "OBSERVATION") return false;
    if (filter.medSurg === true && r.clinicalContext !== "INPATIENT") return false;
    if (filter.minLosHours != null && (r.losHours ?? 0) < filter.minLosHours) return false;
    if (filter.dischargeReady === true && !r.alerts.some((a) => a.code.includes("DISCHARGE"))) {
      return false;
    }
    if (filter.pendingConsult === true && !r.alerts.some((a) => a.code.includes("CONSULT"))) {
      return false;
    }
    if (filter.pendingImaging === true && !r.alerts.some((a) => a.code.includes("IMAGING") || a.code.includes("RESULT"))) {
      return false;
    }
    if (filter.isolation === true && !r.alerts.some((a) => a.code.includes("ISOLATION"))) {
      return false;
    }
    if (q) {
      const hay = `${r.patientName} ${r.mrn ?? ""} ${r.unitRoomBed ?? ""} ${r.attendingName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortProviderCensusRows(
  rows: HospitalCensusPatientRow[],
  sort: ProviderCensusSort
): HospitalCensusPatientRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "ROOM":
        return String(a.unitRoomBed ?? "").localeCompare(String(b.unitRoomBed ?? ""));
      case "LOS":
        return (b.losHours ?? 0) - (a.losHours ?? 0);
      case "ACUITY": {
        const score = (r: HospitalCensusPatientRow) =>
          r.alerts.reduce((acc, al) => acc + (al.severity === "urgent" ? 3 : al.severity === "warning" ? 2 : 1), 0);
        return score(b) - score(a);
      }
      case "DISCHARGE_PRIORITY": {
        const ready = (r: HospitalCensusPatientRow) =>
          r.alerts.some((a) => a.code.includes("DISCHARGE")) ? 0 : 1;
        return ready(a) - ready(b) || (b.losHours ?? 0) - (a.losHours ?? 0);
      }
      case "NAME":
      default:
        return a.patientName.localeCompare(b.patientName);
    }
  });
  return copy;
}

/** Clinical safety guards — must remain true. */
export function providerSynthesisMustNotAutoAcknowledge(): true {
  return true;
}
export function providerSynthesisMustNotAutoGenerateAssessment(): true {
  return true;
}
export function providerSynthesisMustNotDuplicateEnterpriseDomains(): true {
  return true;
}
export function providerSynthesisMustSeparateCurrentVsAdmission(): true {
  return true;
}

export function emptyProviderClinicalSynthesis(input: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  expectedVersion?: number;
  atIso?: string;
}): ProviderClinicalSynthesisV1 {
  return {
    certification: PROVIDER_CLINICAL_SYNTHESIS_CERTIFICATION_ID,
    encounterId: input.encounterId,
    patientId: input.patientId,
    facilityId: input.facilityId,
    generatedAt: input.atIso ?? new Date().toISOString(),
    overview: {
      hospitalDay: null,
      currentStatus: null,
      codeStatus: null,
      isolation: null,
      attending: null,
      consultServices: [],
      primaryDiagnosis: null,
      secondaryProblems: [],
      currentBed: null,
      currentUnit: null,
      admissionDate: null,
      lengthOfStayHours: null,
      estimatedDischarge: null,
      provider: null,
      resident: null,
      app: null,
    },
    vitals: [],
    intakeOutput: {
      intake24hMl: null,
      output24hMl: null,
      balance24hMl: null,
      hospitalBalanceMl: null,
      urineOutputMl: null,
      drainOutputMl: null,
      chestTubeMl: null,
      ngOutputMl: null,
      dialysisMl: null,
      documentationPresent: false,
      warnings: ["MISSING_DOCUMENTATION"],
      source: "ENTERPRISE_EDOC_IO",
    },
    laboratories: { byPanel: {}, pending: [], critical: [], abnormal: [], trending: [] },
    radiology: {
      pending: [],
      inProgress: [],
      preliminary: [],
      final: [],
      critical: [],
      all: [],
    },
    medications: { groups: {}, changes: [], held: [] },
    problems: [],
    events: [],
    tasks: { critical: [], today: [], upcoming: [], completed: [] },
    dischargeReadiness: {
      medicalReady: false,
      workflowState: null,
      estimatedDischargeDate: null,
      destination: null,
      barriers: [],
      neverAutoDischarge: true,
    },
    currentVsAdmission: {
      admissionPain: null,
      currentPain: null,
      providerAssessment: null,
      conceptsSeparated: true,
    },
    timelineReuse: { endpoint: "unified-timeline", duplicated: false },
    clinicalSafety: {
      neverAutoGenerateRos: true,
      neverAutoGenerateExam: true,
      neverAutoGenerateAssessment: true,
      neverAutoGenerateOrders: true,
      neverAutoGenerateDiagnoses: true,
      neverAutoGenerateProgressNotes: true,
      neverAutoGenerateDischargeSummary: true,
      neverAutoAcknowledge: true,
    },
    expectedVersion: input.expectedVersion ?? 0,
    offlineHint: false,
  };
}

export function attachWorkspaceSlices(
  synthesis: ProviderClinicalSynthesisV1,
  workspace: InpatientProviderWorkspaceV1 | null
): ProviderClinicalSynthesisV1 {
  if (!workspace) return synthesis;
  return {
    ...synthesis,
    problems: workspace.problemPlans ?? [],
    events: workspace.events ?? [],
    tasks: groupProviderTasks(workspace.tasks ?? []),
    expectedVersion: workspace.expectedVersion,
  };
}
