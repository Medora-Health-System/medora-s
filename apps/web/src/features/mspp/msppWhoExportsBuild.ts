/**
 * Paquets JSON d’interopérabilité (clés en anglais, schéma versionné).
 * Données alignées sur les réponses API déjà utilisées par les exports CSV — aucun nouvel endpoint.
 */

import type {
  MsppAlertEscalationsResponse,
  MsppCommuneSanitarySignalsResponse,
  MsppSanitarySignalsResponse,
  MsppValidationAnalyticsResponse,
} from "@/lib/msppApi";

export const WHO_SCHEMA_VERSION = "mspp-who-v1" as const;
export const WHO_COUNTRY = "HT" as const;
export const WHO_SOURCE = "Medora MSPP" as const;

/** Fenêtre 7+7 jours (signaux / escalades). */
export type WhoSurveillanceWindow = MsppSanitarySignalsResponse["window"];

/** Instantané analytique validation — pas de fenêtre glissante 7+7 ; lookback métier explicite. */
export type WhoValidationWindow = {
  kind: "validation_analytics_snapshot";
  snapshotAt: string;
  analyticsLookbackDays: number;
};

export type WhoEnvelopeBase = {
  schemaVersion: typeof WHO_SCHEMA_VERSION;
  country: typeof WHO_COUNTRY;
  generatedAt: string;
  window: WhoSurveillanceWindow | WhoValidationWindow;
  source: typeof WHO_SOURCE;
};

/** Département — signaux sanitaires agrégés (fenêtre courante / précédente). */
export type WhoWeeklyDepartmentRecord = {
  recordType: "department_signal";
  diseaseCode: string;
  diseaseName: string;
  geography: {
    level: "department";
    departmentId: string;
    departmentCode: string | null;
    departmentName: string | null;
    geoCommuneId: null;
    communeName: null;
  };
  counts: {
    currentPeriod: number;
    previousPeriod: number;
    delta: number;
  };
  percentChange: number | null;
  signalLevel: string;
  thresholdProfileUsed: string;
  thresholdReason: string;
};

/** Commune — signaux sanitaires (granularité fine). */
export type WhoWeeklyCommuneRecord = {
  recordType: "commune_signal";
  diseaseCode: string;
  diseaseName: string;
  geography: {
    level: "commune";
    departmentId: string;
    departmentCode: string | null;
    departmentName: string | null;
    geoCommuneId: string;
    communeName: string;
  };
  counts: {
    currentPeriod: number;
    previousPeriod: number;
    delta: number;
  };
  percentChange: number | null;
  signalLevel: string;
  thresholdProfileUsed: string;
  thresholdReason: string;
};

export type WhoWeeklySurveillancePayload = WhoEnvelopeBase & {
  profile: "WEEKLY_SURVEILLANCE";
  meta: {
    apiGeneratedAtSignals: string;
    apiGeneratedAtCommune: string;
    signalsTruncated: boolean;
    communeTruncated: boolean;
    communeExcludedUnlinkedOrMismatchCount: number;
  };
  data: Array<WhoWeeklyDepartmentRecord | WhoWeeklyCommuneRecord>;
};

export type WhoPriorityAlertRecord = {
  alertKey: string;
  scope: string;
  diseaseCode: string;
  diseaseName: string;
  geography: {
    departmentId: string;
    departmentCode: string | null;
    departmentName: string | null;
    geoCommuneId: string | null;
    communeName: string | null;
  };
  counts: {
    currentPeriod: number;
    previousPeriod: number;
    delta: number;
  };
  signalLevel: string;
  escalationLevel: string;
  reportingCategory: string | null;
  surveillancePriority: string | null;
  escalationReasonCode: string;
  catalogMatched: boolean;
  thresholdProfileUsed: string;
  thresholdReason: string;
};

export type WhoPriorityAlertsPayload = WhoEnvelopeBase & {
  profile: "PRIORITY_ALERTS";
  meta: {
    scopeNote: string;
    disclaimer: string;
    truncated: boolean;
    totalMatchedBeforeCap: number;
  };
  data: WhoPriorityAlertRecord[];
};

export type WhoValidationAnalyticsPayload = WhoEnvelopeBase & {
  profile: "VALIDATION_ANALYTICS";
  meta: {
    scopeNote: string;
    timingLookbackDays: number;
  };
  data: [
    {
      summary: MsppValidationAnalyticsResponse["summary"];
      flow: MsppValidationAnalyticsResponse["flow"];
      statusCounts: MsppValidationAnalyticsResponse["statusCounts"];
      reviewerLevelCounts: MsppValidationAnalyticsResponse["reviewerLevelCounts"];
      timing: MsppValidationAnalyticsResponse["timing"];
      departments: MsppValidationAnalyticsResponse["departments"];
    },
  ];
};

function pickWeeklyWindow(
  signals: MsppSanitarySignalsResponse,
  commune: MsppCommuneSanitarySignalsResponse
): WhoSurveillanceWindow {
  void commune;
  return signals.window;
}

/**
 * Surveillance hebdomadaire : combine signaux par département et par commune (même logique que les CSV).
 */
export function buildWhoWeeklySurveillance(
  signals: MsppSanitarySignalsResponse,
  commune: MsppCommuneSanitarySignalsResponse
): WhoWeeklySurveillancePayload {
  const window = pickWeeklyWindow(signals, commune);
  const deptRows: WhoWeeklyDepartmentRecord[] = signals.signals.map((row) => ({
    recordType: "department_signal",
    diseaseCode: row.diseaseCode.trim(),
    diseaseName: row.diseaseName.trim(),
    geography: {
      level: "department",
      departmentId: row.departmentId,
      departmentCode: row.departmentCode,
      departmentName: row.departmentName,
      geoCommuneId: null,
      communeName: null,
    },
    counts: {
      currentPeriod: row.currentCount,
      previousPeriod: row.previousCount,
      delta: row.delta,
    },
    percentChange: row.percentChange,
    signalLevel: row.signalLevel,
    thresholdProfileUsed: row.thresholdProfileUsed,
    thresholdReason: row.thresholdReason,
  }));

  const comRows: WhoWeeklyCommuneRecord[] = commune.signals.map((row) => ({
    recordType: "commune_signal",
    diseaseCode: row.diseaseCode.trim(),
    diseaseName: row.diseaseName.trim(),
    geography: {
      level: "commune",
      departmentId: row.departmentId,
      departmentCode: row.departmentCode,
      departmentName: row.departmentName,
      geoCommuneId: row.geoCommuneId,
      communeName: row.communeName,
    },
    counts: {
      currentPeriod: row.currentCount,
      previousPeriod: row.previousCount,
      delta: row.delta,
    },
    percentChange: row.percentChange,
    signalLevel: row.signalLevel,
    thresholdProfileUsed: row.thresholdProfileUsed,
    thresholdReason: row.thresholdReason,
  }));

  return {
    schemaVersion: WHO_SCHEMA_VERSION,
    country: WHO_COUNTRY,
    generatedAt: signals.generatedAt,
    window,
    source: WHO_SOURCE,
    profile: "WEEKLY_SURVEILLANCE",
    meta: {
      apiGeneratedAtSignals: signals.generatedAt,
      apiGeneratedAtCommune: commune.generatedAt,
      signalsTruncated: false,
      communeTruncated: commune.truncated,
      communeExcludedUnlinkedOrMismatchCount: commune.excludedUnlinkedOrMismatchCount,
    },
    data: [...deptRows, ...comRows],
  };
}

/** Alertes prioritaires (lignes d’escalade nationales). */
export function buildWhoPriorityAlerts(data: MsppAlertEscalationsResponse): WhoPriorityAlertsPayload {
  const rows: WhoPriorityAlertRecord[] = data.escalations.map((row) => ({
    alertKey: row.alertKey,
    scope: row.scope,
    diseaseCode: row.diseaseCode.trim(),
    diseaseName: row.diseaseName.trim(),
    geography: {
      departmentId: row.departmentId,
      departmentCode: row.departmentCode,
      departmentName: row.departmentName,
      geoCommuneId: row.geoCommuneId,
      communeName: row.communeName,
    },
    counts: {
      currentPeriod: row.currentCount,
      previousPeriod: row.previousCount,
      delta: row.delta,
    },
    signalLevel: row.signalLevel,
    escalationLevel: row.escalationLevel,
    reportingCategory: row.reportingCategory,
    surveillancePriority: row.surveillancePriority,
    escalationReasonCode: row.escalationReasonCode,
    catalogMatched: row.catalogMatched,
    thresholdProfileUsed: row.thresholdProfileUsed,
    thresholdReason: row.thresholdReason,
  }));

  return {
    schemaVersion: WHO_SCHEMA_VERSION,
    country: WHO_COUNTRY,
    generatedAt: data.generatedAt,
    window: data.window,
    source: WHO_SOURCE,
    profile: "PRIORITY_ALERTS",
    meta: {
      scopeNote: data.scopeNote,
      disclaimer: data.disclaimer,
      truncated: data.truncated,
      totalMatchedBeforeCap: data.totalMatchedBeforeCap,
    },
    data: rows,
  };
}

/** Analytique du pipeline de validation (instantané, fenêtre = période de lookback métier). */
export function buildWhoValidationAnalytics(data: MsppValidationAnalyticsResponse): WhoValidationAnalyticsPayload {
  const window: WhoValidationWindow = {
    kind: "validation_analytics_snapshot",
    snapshotAt: data.generatedAt,
    analyticsLookbackDays: data.timingLookbackDays,
  };

  return {
    schemaVersion: WHO_SCHEMA_VERSION,
    country: WHO_COUNTRY,
    generatedAt: data.generatedAt,
    window,
    source: WHO_SOURCE,
    profile: "VALIDATION_ANALYTICS",
    meta: {
      scopeNote: data.scopeNote,
      timingLookbackDays: data.timingLookbackDays,
    },
    data: [
      {
        summary: data.summary,
        flow: data.flow,
        statusCounts: data.statusCounts,
        reviewerLevelCounts: data.reviewerLevelCounts,
        timing: data.timing,
        departments: data.departments,
      },
    ],
  };
}
