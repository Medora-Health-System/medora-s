import { calculateIntakeOutputTotals, EDOC5_INTAKE_OUTPUT_CARD_IDS, IO_INTAKE_OUTPUT_SUMMARY_CARD_ID } from "./intakeOutputDocumentationPayloads.js";
import {
  RESP_ASSESSMENT_CARD_ID,
  OXYGEN_THERAPY_INITIATION_CARD_ID,
  OXYGEN_TITRATION_CARD_ID,
  CPAP_BIPAP_MONITORING_CARD_ID,
  VENTILATOR_OBSERVATION_CARD_ID,
} from "./respiratoryDocumentationPayloads.js";
import {
  CONTINUOUS_CARDIAC_MONITORING_CARD_ID,
  TELEMETRY_REASSESSMENT_CARD_ID,
  RHYTHM_STRIP_DOCUMENTATION_CARD_ID,
  ECG_12_LEAD_DOCUMENTATION_CARD_ID,
  QTC_MONITORING_CARD_ID,
  CHEST_PAIN_REASSESSMENT_CARD_ID,
} from "./cardiacMonitoringDocumentationPayloads.js";
import {
  STROKE_NIHSS_CARD_ID,
} from "./strokeDocumentationPayloads.js";
import {
  NIHSS_REASSESSMENT_CARD_ID,
  NEURO_CHECKS_CARD_ID,
  GLASGOW_COMA_SCALE_CARD_ID,
  PUPILLARY_ASSESSMENT_CARD_ID,
  MOTOR_STRENGTH_ASSESSMENT_CARD_ID,
} from "./strokeNeuroReassessmentDocumentationPayloads.js";
import {
  GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
  NIHSS_ASSESSMENT_CARD_ID,
} from "./neurologicalDocumentationPayloads.js";
import {
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
  SCORE_PHQ9_CARD_ID,
  SCORE_GAD7_CARD_ID,
  SCORE_CSSRS_CARD_ID,
  SCORE_HEART_CARD_ID,
  SCORE_RTS_CARD_ID,
  SCORE_WELLS_PE_CARD_ID,
  SCORE_PERC_CARD_ID,
  SCORE_GENEVA_CARD_ID,
} from "./foundationCatalogCompletionPayloads.js";
import {
  ELOPEMENT_RISK_ASSESSMENT_CARD_ID,
  SUICIDE_RISK_MONITORING_CARD_ID,
  ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID,
  AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID,
  BEHAVIORAL_ESCALATION_EVENT_CARD_ID,
  BEHAVIORAL_OBSERVATION_CARD_ID,
} from "./behavioralHealthSafetyDocumentationPayloads.js";
import {
  selectClinicalDocumentationPayloadSummary,
  summarizeClinicalDocumentationPayload,
} from "./clinicalDocumentationEntry.js";
import { clinicalDocSummaryKey, selectClinicalDocumentationCardTitle } from "./clinicalDocumentationSummaryLocale.js";
import type { ClinicalDocumentationSummaryLocale } from "./clinicalDocumentationSummaryLocale.js";
import { buildClinicalDocumentationDetailRows } from "./clinicalDocumentationDetailRows.js";

const MS_PER_HOUR = 60 * 60 * 1000;
const IO_24H_WINDOW_MS = 24 * MS_PER_HOUR;

export type ClinicalDataProjectionEntry = {
  id: string;
  cardId: string;
  category: string;
  cardTitleEn: string;
  cardTitleFr: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  voidedAt: string | null;
  witnessStatus?: "NOT_REQUIRED" | "PENDING_WITNESS" | "WITNESSED" | string;
  payloadJson: Record<string, unknown>;
  payloadSummaryEn?: Array<{ key: string; value: string }>;
  payloadSummaryFr?: Array<{ key: string; value: string }>;
  payloadSummary?: Array<{ key: string; value: string }>;
};

export type ClinicalDataSummarySectionId =
  | "NEUROLOGY"
  | "WITHDRAWAL_PSYCH"
  | "RESPIRATORY"
  | "CARDIAC"
  | "INTAKE_OUTPUT"
  | "BEHAVIORAL_HEALTH"
  | "OTHER_CLINICAL_DOCUMENTATION";

export type ClinicalDataSummaryMetric = {
  metricId: string;
  label: string;
  value: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  documentedAt: string;
  entryId: string;
  cardId: string;
  formTitleEn: string;
  formTitleFr: string;
  detailRows: Array<{ label: string; value: string }>;
};

export type ClinicalDataSummarySection = {
  sectionId: ClinicalDataSummarySectionId;
  metrics: ClinicalDataSummaryMetric[];
};

export type ClinicalDataIntakeOutputProjection = {
  totalIntakeMl: number | null;
  totalOutputMl: number | null;
  netBalanceMl: number | null;
  insufficientData: boolean;
  windowHours: number;
};

export type ClinicalDataRecentFeedItem = {
  id: string;
  formTitleEn: string;
  formTitleFr: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  documentedAt: string;
  category: string;
  status: "DOCUMENTED" | "PENDING_WITNESS" | "VOIDED";
  cardId: string;
  detailRows: Array<{ label: string; value: string }>;
};

export type ClinicalDataSummaryProjection = {
  sections: ClinicalDataSummarySection[];
  intakeOutput: ClinicalDataIntakeOutputProjection;
  recentHighlights: ClinicalDataRecentFeedItem[];
};

export type BuildClinicalDataSummaryProjectionInput = {
  entries: readonly ClinicalDataProjectionEntry[];
  locale: ClinicalDocumentationSummaryLocale;
  asOfIso?: string;
};

function activeEntries(entries: readonly ClinicalDataProjectionEntry[]): ClinicalDataProjectionEntry[] {
  return entries.filter((e) => !e.voidedAt);
}

function sortNewestFirst(entries: ClinicalDataProjectionEntry[]): ClinicalDataProjectionEntry[] {
  return [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function latestEntryByCardIds(
  entries: readonly ClinicalDataProjectionEntry[],
  cardIds: readonly string[]
): ClinicalDataProjectionEntry | null {
  const matches = sortNewestFirst(activeEntries(entries).filter((e) => cardIds.includes(e.cardId)));
  return matches[0] ?? null;
}

function payloadTotalScore(payload: Record<string, unknown>): string | null {
  const score = payload.totalScore;
  if (typeof score === "number" && Number.isFinite(score)) return String(score);
  return null;
}

function summaryLines(
  entry: ClinicalDataProjectionEntry,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  return selectClinicalDocumentationPayloadSummary(entry, locale);
}

function findSummaryValue(
  lines: Array<{ key: string; value: string }>,
  keyPattern: RegExp
): string | null {
  const line = lines.find((l) => keyPattern.test(l.key));
  return line?.value?.trim() ? line.value.trim() : null;
}

function metricFromEntry(
  entry: ClinicalDataProjectionEntry,
  metricId: string,
  label: string,
  value: string,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric {
  return {
    metricId,
    label,
    value,
    authorDisplayName: entry.authorDisplayName,
    authorRoleTitle: entry.authorRoleTitle,
    documentedAt: entry.createdAt,
    entryId: entry.id,
    cardId: entry.cardId,
    formTitleEn: entry.cardTitleEn,
    formTitleFr: entry.cardTitleFr,
    detailRows: buildClinicalDocumentationDetailRows(entry, locale),
  };
}

function scoreMetricFromEntry(
  entry: ClinicalDataProjectionEntry,
  metricId: string,
  label: string,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric | null {
  const detailRows = buildClinicalDocumentationDetailRows(entry, locale);
  const value =
    payloadTotalScore(entry.payloadJson) ??
    findSummaryValue(summaryLines(entry, locale), /score|total|nihss|risk|level|niveau/i) ??
    detailRows[0]?.value ??
    summaryLines(entry, locale)[0]?.value;
  if (!value) return null;
  return metricFromEntry(entry, metricId, label, value, locale);
}

function buildCardiacRiskScoreMetrics(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric[] {
  const specs: Array<{ cardIds: readonly string[]; metricId: string; labelEn: string; labelFr: string }> =
    [
      { cardIds: [SCORE_HEART_CARD_ID], metricId: "heart", labelEn: "HEART Score", labelFr: "Score HEART" },
      {
        cardIds: [SCORE_RTS_CARD_ID],
        metricId: "rts",
        labelEn: "Revised Trauma Score",
        labelFr: "Score traumatologique révisé",
      },
      {
        cardIds: [SCORE_WELLS_PE_CARD_ID],
        metricId: "wells_pe",
        labelEn: "Wells PE Score",
        labelFr: "Score de Wells (EP)",
      },
      { cardIds: [SCORE_PERC_CARD_ID], metricId: "perc", labelEn: "PERC Rule", labelFr: "Règle PERC" },
      {
        cardIds: [SCORE_GENEVA_CARD_ID],
        metricId: "geneva",
        labelEn: "Geneva Score",
        labelFr: "Score de Genève",
      },
    ];

  const metrics: ClinicalDataSummaryMetric[] = [];
  for (const spec of specs) {
    const entry = latestEntryByCardIds(entries, spec.cardIds);
    if (!entry) continue;
    const label = clinicalDocSummaryKey(locale, spec.labelEn, spec.labelFr);
    const metric = scoreMetricFromEntry(entry, spec.metricId, label, locale);
    if (metric) metrics.push(metric);
  }
  return metrics;
}

function buildUnmappedEntryMetrics(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale,
  projectedEntryIds: ReadonlySet<string>
): ClinicalDataSummaryMetric[] {
  const metrics: ClinicalDataSummaryMetric[] = [];
  const seenCardIds = new Set<string>();

  for (const entry of sortNewestFirst(activeEntries(entries))) {
    if (projectedEntryIds.has(entry.id)) continue;
    if (seenCardIds.has(entry.cardId)) continue;
    seenCardIds.add(entry.cardId);

    const detailRows = buildClinicalDocumentationDetailRows(entry, locale);
    const label = selectClinicalDocumentationCardTitle(entry, locale);
    const value =
      payloadTotalScore(entry.payloadJson) ??
      findSummaryValue(summaryLines(entry, locale), /score|severity|risk|level|total|niveau/i) ??
      detailRows[0]?.value ??
      summaryLines(entry, locale)[0]?.value ??
      label;
    metrics.push(metricFromEntry(entry, `other_${entry.cardId}`, label, value, locale));
  }

  return metrics;
}

function collectProjectedEntryIds(sections: ClinicalDataSummarySection[]): Set<string> {
  return new Set(sections.flatMap((section) => section.metrics.map((metric) => metric.entryId)));
}

function buildNeurologyMetrics(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric[] {
  const metrics: ClinicalDataSummaryMetric[] = [];
  const nihssEntry = latestEntryByCardIds(entries, [
    STROKE_NIHSS_CARD_ID,
    NIHSS_REASSESSMENT_CARD_ID,
    NIHSS_ASSESSMENT_CARD_ID,
  ]);
  if (nihssEntry) {
    const m = scoreMetricFromEntry(
      nihssEntry,
      "nihss",
      clinicalDocSummaryKey(locale, "NIHSS", "NIHSS"),
      locale
    );
    if (m) metrics.push(m);
  }

  const gcsEntry = latestEntryByCardIds(entries, [
    GLASGOW_COMA_SCALE_CARD_ID,
    GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
  ]);
  if (gcsEntry) {
    const m = scoreMetricFromEntry(gcsEntry, "gcs", clinicalDocSummaryKey(locale, "GCS", "GCS"), locale);
    if (m) metrics.push(m);
  }

  const neuroChecks = latestEntryByCardIds(entries, [NEURO_CHECKS_CARD_ID]);
  if (neuroChecks) {
    const loc = findSummaryValue(summaryLines(neuroChecks, locale), /loc|conscience/i);
    if (loc) {
      metrics.push(
        metricFromEntry(
          neuroChecks,
          "neuro_checks",
          clinicalDocSummaryKey(locale, "Neuro Checks", "Contrôles neuro"),
          loc,
          locale
        )
      );
    }
  }

  const motor = latestEntryByCardIds(entries, [MOTOR_STRENGTH_ASSESSMENT_CARD_ID]);
  if (motor) {
    const value =
      findSummaryValue(summaryLines(motor, locale), /strength|force/i) ??
      summarizeClinicalDocumentationPayload(motor.cardId, motor.payloadJson, locale)[0]?.value;
    if (value) {
      metrics.push(
        metricFromEntry(
          motor,
          "motor_strength",
          clinicalDocSummaryKey(locale, "Motor Strength", "Force motrice"),
          value,
          locale
        )
      );
    }
  }

  const pupils = latestEntryByCardIds(entries, [PUPILLARY_ASSESSMENT_CARD_ID]);
  if (pupils) {
    const value = summaryLines(pupils, locale)
      .slice(0, 2)
      .map((l) => l.value)
      .join(" · ");
    if (value) {
      metrics.push(
        metricFromEntry(
          pupils,
          "pupillary",
          clinicalDocSummaryKey(locale, "Pupillary Assessment", "Évaluation pupillaire"),
          value,
          locale
        )
      );
    }
  }

  return metrics;
}

function buildWithdrawalPsychMetrics(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric[] {
  const specs: Array<{ cardIds: readonly string[]; metricId: string; labelEn: string; labelFr: string }> =
    [
      { cardIds: [SCORE_CIWA_AR_CARD_ID], metricId: "ciwa", labelEn: "CIWA-Ar", labelFr: "CIWA-Ar" },
      { cardIds: [SCORE_COWS_CARD_ID], metricId: "cows", labelEn: "COWS", labelFr: "COWS" },
      { cardIds: [SCORE_PHQ9_CARD_ID], metricId: "phq9", labelEn: "PHQ-9", labelFr: "PHQ-9" },
      { cardIds: [SCORE_GAD7_CARD_ID], metricId: "gad7", labelEn: "GAD-7", labelFr: "GAD-7" },
      {
        cardIds: [SCORE_CSSRS_CARD_ID],
        metricId: "cssrs",
        labelEn: "Suicide Screen",
        labelFr: "Dépistage suicide",
      },
      {
        cardIds: [BEHAVIORAL_OBSERVATION_CARD_ID],
        metricId: "behavioral_observation",
        labelEn: "Behavioral Observation",
        labelFr: "Observation comportementale",
      },
    ];

  const metrics: ClinicalDataSummaryMetric[] = [];
  for (const spec of specs) {
    const entry = latestEntryByCardIds(entries, spec.cardIds);
    if (!entry) continue;
    const label = clinicalDocSummaryKey(locale, spec.labelEn, spec.labelFr);
    const value =
      payloadTotalScore(entry.payloadJson) ??
      findSummaryValue(summaryLines(entry, locale), /score|severity|niveau|behavior|comportement/i) ??
      summaryLines(entry, locale)[0]?.value;
    if (!value) continue;
    metrics.push(metricFromEntry(entry, spec.metricId, label, value, locale));
  }
  return metrics;
}

function respiratoryMetricsFromEntry(
  entry: ClinicalDataProjectionEntry,
  prefix: string,
  label: string,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric[] {
  const lines = summaryLines(entry, locale);
  const metrics: ClinicalDataSummaryMetric[] = [];
  const rr = findSummaryValue(lines, /respiratory rate|fréquence respiratoire/i);
  const spo2 = findSummaryValue(lines, /SpO₂/i);
  const device = findSummaryValue(lines, /oxygen|oxygène|device|dispositif/i);
  const flow = findSummaryValue(lines, /flow|débit|FiO₂|fio2/i);

  if (rr) metrics.push(metricFromEntry(entry, `${prefix}_rr`, clinicalDocSummaryKey(locale, "RR", "FR"), rr, locale));
  if (spo2) metrics.push(metricFromEntry(entry, `${prefix}_spo2`, "SpO₂", spo2, locale));
  if (device) metrics.push(metricFromEntry(entry, `${prefix}_device`, clinicalDocSummaryKey(locale, "Device", "Dispositif"), device, locale));
  if (flow) metrics.push(metricFromEntry(entry, `${prefix}_flow`, clinicalDocSummaryKey(locale, "Flow", "Débit"), flow, locale));

  if (metrics.length === 0) {
    const fallback = lines[0]?.value;
    if (fallback) metrics.push(metricFromEntry(entry, prefix, label, fallback, locale));
  }
  return metrics;
}

function buildRespiratoryMetrics(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric[] {
  const specs: Array<{ cardIds: readonly string[]; prefix: string; labelEn: string; labelFr: string }> = [
    {
      cardIds: [RESP_ASSESSMENT_CARD_ID],
      prefix: "resp_assessment",
      labelEn: "Respiratory Assessment",
      labelFr: "Évaluation respiratoire",
    },
    {
      cardIds: [OXYGEN_THERAPY_INITIATION_CARD_ID],
      prefix: "oxygen_init",
      labelEn: "Oxygen Therapy",
      labelFr: "Oxygénothérapie",
    },
    {
      cardIds: [OXYGEN_TITRATION_CARD_ID],
      prefix: "oxygen_titration",
      labelEn: "Oxygen Titration",
      labelFr: "Titulation oxygène",
    },
    {
      cardIds: [CPAP_BIPAP_MONITORING_CARD_ID],
      prefix: "cpap_bipap",
      labelEn: "CPAP / BiPAP",
      labelFr: "CPAP / BiPAP",
    },
    {
      cardIds: [VENTILATOR_OBSERVATION_CARD_ID],
      prefix: "ventilator",
      labelEn: "Ventilator",
      labelFr: "Ventilateur",
    },
  ];

  const metrics: ClinicalDataSummaryMetric[] = [];
  for (const spec of specs) {
    const entry = latestEntryByCardIds(entries, spec.cardIds);
    if (!entry) continue;
    const label = clinicalDocSummaryKey(locale, spec.labelEn, spec.labelFr);
    metrics.push(...respiratoryMetricsFromEntry(entry, spec.prefix, label, locale));
  }
  return metrics;
}

function cardiacMetricsFromEntry(
  entry: ClinicalDataProjectionEntry,
  prefix: string,
  label: string,
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric[] {
  const lines = summaryLines(entry, locale);
  const metrics: ClinicalDataSummaryMetric[] = [];
  const rhythm = findSummaryValue(lines, /rhythm|rythme/i);
  const rate = findSummaryValue(lines, /\bHR\b|\bFC\b|rate|fréquence/i);
  const qtc = findSummaryValue(lines, /QTc|qtc/i);
  const status =
    findSummaryValue(lines, /chest pain|douleur|interpretation|interprétation|symptomatic|symptomatique/i) ??
    lines[0]?.value;

  if (rhythm) metrics.push(metricFromEntry(entry, `${prefix}_rhythm`, clinicalDocSummaryKey(locale, "Rhythm", "Rythme"), rhythm, locale));
  if (rate) metrics.push(metricFromEntry(entry, `${prefix}_rate`, clinicalDocSummaryKey(locale, "Rate", "Fréquence"), rate, locale));
  if (qtc) metrics.push(metricFromEntry(entry, `${prefix}_qtc`, "QTc", qtc, locale));
  if (metrics.length === 0 && status) {
    metrics.push(metricFromEntry(entry, prefix, label, status, locale));
  }
  return metrics;
}

function buildCardiacMetrics(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric[] {
  const specs: Array<{ cardIds: readonly string[]; prefix: string; labelEn: string; labelFr: string }> = [
    {
      cardIds: [TELEMETRY_REASSESSMENT_CARD_ID, CONTINUOUS_CARDIAC_MONITORING_CARD_ID],
      prefix: "telemetry",
      labelEn: "Telemetry",
      labelFr: "Télémétrie",
    },
    {
      cardIds: [RHYTHM_STRIP_DOCUMENTATION_CARD_ID],
      prefix: "rhythm_strip",
      labelEn: "Rhythm Strip",
      labelFr: "Bande rythme",
    },
    {
      cardIds: [ECG_12_LEAD_DOCUMENTATION_CARD_ID],
      prefix: "ecg",
      labelEn: "ECG",
      labelFr: "ECG",
    },
    {
      cardIds: [QTC_MONITORING_CARD_ID],
      prefix: "qtc",
      labelEn: "QTc Monitoring",
      labelFr: "Surveillance QTc",
    },
    {
      cardIds: [CHEST_PAIN_REASSESSMENT_CARD_ID],
      prefix: "chest_pain",
      labelEn: "Chest Pain",
      labelFr: "Douleur thoracique",
    },
  ];

  const metrics: ClinicalDataSummaryMetric[] = [];
  metrics.push(...buildCardiacRiskScoreMetrics(entries, locale));
  for (const spec of specs) {
    const entry = latestEntryByCardIds(entries, spec.cardIds);
    if (!entry) continue;
    const label = clinicalDocSummaryKey(locale, spec.labelEn, spec.labelFr);
    metrics.push(...cardiacMetricsFromEntry(entry, spec.prefix, label, locale));
  }
  return metrics;
}

function buildBehavioralHealthMetrics(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummaryMetric[] {
  const specs: Array<{ cardIds: readonly string[]; metricId: string; labelEn: string; labelFr: string }> = [
    {
      cardIds: [ELOPEMENT_RISK_ASSESSMENT_CARD_ID],
      metricId: "elopement",
      labelEn: "Elopement Assessment",
      labelFr: "Évaluation fugue",
    },
    {
      cardIds: [SUICIDE_RISK_MONITORING_CARD_ID],
      metricId: "suicide_monitoring",
      labelEn: "Suicide Monitoring",
      labelFr: "Surveillance suicide",
    },
    {
      cardIds: [ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID],
      metricId: "one_to_one",
      labelEn: "1:1 Observation",
      labelFr: "Observation 1:1",
    },
    {
      cardIds: [AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID],
      metricId: "agitation",
      labelEn: "Agitation Assessment",
      labelFr: "Évaluation agitation",
    },
    {
      cardIds: [BEHAVIORAL_ESCALATION_EVENT_CARD_ID],
      metricId: "behavioral_escalation",
      labelEn: "Behavioral Escalation",
      labelFr: "Escalade comportementale",
    },
  ];

  const metrics: ClinicalDataSummaryMetric[] = [];
  for (const spec of specs) {
    const entry = latestEntryByCardIds(entries, spec.cardIds);
    if (!entry) continue;
    const label = clinicalDocSummaryKey(locale, spec.labelEn, spec.labelFr);
    const value =
      findSummaryValue(summaryLines(entry, locale), /risk|niveau|level|behavior|comportement|reason|raison/i) ??
      summaryLines(entry, locale)[0]?.value;
    if (!value) continue;
    metrics.push(metricFromEntry(entry, spec.metricId, label, value, locale));
  }
  return metrics;
}

function entryRecordedAtMs(entry: ClinicalDataProjectionEntry): number {
  const recordedAt = entry.payloadJson.recordedAt;
  if (typeof recordedAt === "string" && !Number.isNaN(Date.parse(recordedAt))) {
    return Date.parse(recordedAt);
  }
  return Date.parse(entry.createdAt);
}

function buildIntakeOutputProjection(
  entries: readonly ClinicalDataProjectionEntry[],
  asOfMs: number
): ClinicalDataIntakeOutputProjection {
  const windowStartMs = asOfMs - IO_24H_WINDOW_MS;
  const ioSummaryEntry = latestEntryByCardIds(entries, [IO_INTAKE_OUTPUT_SUMMARY_CARD_ID]);
  if (ioSummaryEntry) {
    const payload = ioSummaryEntry.payloadJson;
    const intake = payload.totalIntakeMl;
    const output = payload.totalOutputMl;
    const net = payload.netBalanceMl;
    if (
      typeof intake === "number" &&
      typeof output === "number" &&
      typeof net === "number"
    ) {
      return {
        totalIntakeMl: intake,
        totalOutputMl: output,
        netBalanceMl: net,
        insufficientData: false,
        windowHours: 24,
      };
    }
  }

  const windowEntries = activeEntries(entries).filter((e) => {
    if (!(EDOC5_INTAKE_OUTPUT_CARD_IDS as readonly string[]).includes(e.cardId)) return false;
    if (e.cardId === IO_INTAKE_OUTPUT_SUMMARY_CARD_ID) return false;
    const ms = entryRecordedAtMs(e);
    return ms >= windowStartMs && ms <= asOfMs;
  });

  if (windowEntries.length === 0) {
    return {
      totalIntakeMl: null,
      totalOutputMl: null,
      netBalanceMl: null,
      insufficientData: true,
      windowHours: 24,
    };
  }

  const totals = calculateIntakeOutputTotals(
    windowEntries.map((e) => ({ cardId: e.cardId, payload: e.payloadJson }))
  );
  const hasData = totals.totalIntakeMl > 0 || totals.totalOutputMl > 0;
  return {
    totalIntakeMl: hasData ? totals.totalIntakeMl : null,
    totalOutputMl: hasData ? totals.totalOutputMl : null,
    netBalanceMl: hasData ? totals.netBalanceMl : null,
    insufficientData: !hasData,
    windowHours: 24,
  };
}

function feedStatus(entry: ClinicalDataProjectionEntry): ClinicalDataRecentFeedItem["status"] {
  if (entry.voidedAt) return "VOIDED";
  if (entry.witnessStatus === "PENDING_WITNESS") return "PENDING_WITNESS";
  return "DOCUMENTED";
}

export function buildClinicalDataRecentHighlights(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale = "en"
): ClinicalDataRecentFeedItem[] {
  return sortNewestFirst(activeEntries(entries)).map((entry) => ({
    id: entry.id,
    formTitleEn: entry.cardTitleEn,
    formTitleFr: entry.cardTitleFr,
    authorDisplayName: entry.authorDisplayName,
    authorRoleTitle: entry.authorRoleTitle,
    documentedAt: entry.createdAt,
    category: entry.category,
    status: feedStatus(entry),
    cardId: entry.cardId,
    detailRows: buildClinicalDocumentationDetailRows(entry, locale),
  }));
}

export function buildClinicalDataSummarySections(
  entries: readonly ClinicalDataProjectionEntry[],
  locale: ClinicalDocumentationSummaryLocale
): ClinicalDataSummarySection[] {
  const sectionBuilders: Array<{
    sectionId: ClinicalDataSummarySectionId;
    build: () => ClinicalDataSummaryMetric[];
  }> = [
    { sectionId: "NEUROLOGY", build: () => buildNeurologyMetrics(entries, locale) },
    { sectionId: "WITHDRAWAL_PSYCH", build: () => buildWithdrawalPsychMetrics(entries, locale) },
    { sectionId: "RESPIRATORY", build: () => buildRespiratoryMetrics(entries, locale) },
    { sectionId: "CARDIAC", build: () => buildCardiacMetrics(entries, locale) },
    { sectionId: "BEHAVIORAL_HEALTH", build: () => buildBehavioralHealthMetrics(entries, locale) },
  ];

  const sections = sectionBuilders
    .map(({ sectionId, build }) => ({ sectionId, metrics: build() }))
    .filter((section) => section.metrics.length > 0);

  const projectedEntryIds = collectProjectedEntryIds(sections);
  const otherMetrics = buildUnmappedEntryMetrics(entries, locale, projectedEntryIds);
  if (otherMetrics.length > 0) {
    sections.push({ sectionId: "OTHER_CLINICAL_DOCUMENTATION", metrics: otherMetrics });
  }

  return sections;
}

export function buildClinicalDataSummaryProjection(
  input: BuildClinicalDataSummaryProjectionInput
): ClinicalDataSummaryProjection {
  const asOfMs = Date.parse(input.asOfIso ?? new Date().toISOString());
  const sections = buildClinicalDataSummarySections(input.entries, input.locale);
  const intakeOutput = buildIntakeOutputProjection(input.entries, asOfMs);
  const recentHighlights = buildClinicalDataRecentHighlights(input.entries);

  return {
    sections,
    intakeOutput,
    recentHighlights,
  };
}
