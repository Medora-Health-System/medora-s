import type {
  MsppAlertEscalationsResponse,
  MsppCommuneSanitarySignalsResponse,
  MsppSanitarySignalsResponse,
  MsppValidationAnalyticsResponse,
} from "@/lib/msppApi";
import { formatMsppEscalationGeo } from "./msppEscalationFormatters";

type TFn = (key: string) => string;

/** `percentChange` côté API est déjà en pourcentage (ex. 12.5 pour +12,5 %). */
function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "";
  return String(v) + "%";
}

function daysFromMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "";
  return String(Math.round((ms / 86400000) * 10) / 10);
}

function thresholdProfileLabel(t: TFn, code: string): string {
  const key = `msppSanitarySignals.profile.${code}`;
  const out = t(key);
  return out === key ? code : out;
}

function backlogRiskLabel(t: TFn, risk: "LOW" | "ELEVATED"): string {
  return risk === "ELEVATED"
    ? t("msppValidationAnalyticsPage.backlogElevated")
    : t("msppValidationAnalyticsPage.backlogLow");
}

export function buildEscalationsCsv(
  data: MsppAlertEscalationsResponse,
  t: TFn
): (string | number)[][] {
  const header = [
    t("msppExports.csv.escDiseaseCode"),
    t("msppExports.csv.escDiseaseName"),
    t("msppExports.csv.escScope"),
    t("msppExports.csv.escGeo"),
    t("msppExports.csv.escDeptCode"),
    t("msppExports.csv.escDeptName"),
    t("msppExports.csv.escCommuneId"),
    t("msppExports.csv.escCommuneName"),
    t("msppExports.csv.escCurrent"),
    t("msppExports.csv.escPrevious"),
    t("msppExports.csv.escDelta"),
    t("msppExports.csv.escSignalLevel"),
    t("msppExports.csv.escEscalationLevel"),
    t("msppExports.csv.escReportingCategory"),
    t("msppExports.csv.escSurveillancePriority"),
    t("msppExports.csv.escReasonCode"),
    t("msppExports.csv.escReasonLabel"),
    t("msppExports.csv.escThresholdProfile"),
    t("msppExports.csv.escThresholdReason"),
    t("msppExports.csv.apiGeneratedAt"),
  ];
  const rows: (string | number)[][] = [header];
  for (const row of data.escalations) {
    rows.push([
      row.diseaseCode,
      row.diseaseName ?? "",
      row.scope,
      formatMsppEscalationGeo(row),
      row.departmentCode ?? "",
      row.departmentName ?? "",
      row.geoCommuneId ?? "",
      row.communeName ?? "",
      row.currentCount,
      row.previousCount,
      row.delta,
      t(`msppSanitarySignals.level.${row.signalLevel}`),
      t(`msppEscalations.level.${row.escalationLevel}`),
      row.reportingCategory ?? "",
      row.surveillancePriority ?? "",
      row.escalationReasonCode,
      t(`msppEscalations.reason.${row.escalationReasonCode}`),
      thresholdProfileLabel(t, row.thresholdProfileUsed),
      row.thresholdReason,
      data.generatedAt,
    ]);
  }
  return rows;
}

export function buildSanitarySignalsCsv(
  data: MsppSanitarySignalsResponse,
  t: TFn
): (string | number)[][] {
  const header = [
    t("msppExports.csv.sigDiseaseCode"),
    t("msppExports.csv.sigDiseaseName"),
    t("msppExports.csv.sigDeptCode"),
    t("msppExports.csv.sigDeptName"),
    t("msppExports.csv.sigCurrent"),
    t("msppExports.csv.sigPrevious"),
    t("msppExports.csv.sigDelta"),
    t("msppExports.csv.sigPctChange"),
    t("msppExports.csv.sigLevel"),
    t("msppExports.csv.sigProfile"),
    t("msppExports.csv.sigReason"),
    t("msppExports.csv.apiGeneratedAt"),
  ];
  const rows: (string | number)[][] = [header];
  for (const row of data.signals) {
    rows.push([
      row.diseaseCode,
      row.diseaseName,
      row.departmentCode ?? "",
      row.departmentName ?? "",
      row.currentCount,
      row.previousCount,
      row.delta,
      pct(row.percentChange),
      t(`msppSanitarySignals.level.${row.signalLevel}`),
      thresholdProfileLabel(t, row.thresholdProfileUsed),
      row.thresholdReason,
      data.generatedAt,
    ]);
  }
  return rows;
}

export function buildCommuneSignalsCsv(
  data: MsppCommuneSanitarySignalsResponse,
  t: TFn
): (string | number)[][] {
  const header = [
    t("msppExports.csv.comDeptCode"),
    t("msppExports.csv.comDeptName"),
    t("msppExports.csv.comCommuneId"),
    t("msppExports.csv.comCommuneName"),
    t("msppExports.csv.comDiseaseCode"),
    t("msppExports.csv.comDiseaseName"),
    t("msppExports.csv.comCurrent"),
    t("msppExports.csv.comPrevious"),
    t("msppExports.csv.comDelta"),
    t("msppExports.csv.comPctChange"),
    t("msppExports.csv.comLevel"),
    t("msppExports.csv.comProfile"),
    t("msppExports.csv.comReason"),
    t("msppExports.csv.apiGeneratedAt"),
  ];
  const rows: (string | number)[][] = [header];
  for (const row of data.signals) {
    rows.push([
      row.departmentCode ?? "",
      row.departmentName ?? "",
      row.geoCommuneId,
      row.communeName,
      row.diseaseCode,
      row.diseaseName,
      row.currentCount,
      row.previousCount,
      row.delta,
      pct(row.percentChange),
      t(`msppSanitarySignals.level.${row.signalLevel}`),
      thresholdProfileLabel(t, row.thresholdProfileUsed),
      row.thresholdReason,
      data.generatedAt,
    ]);
  }
  return rows;
}

export function buildValidationSummaryCsv(
  data: MsppValidationAnalyticsResponse,
  t: TFn
): (string | number)[][] {
  const header = [t("msppExports.csv.valLabel"), t("msppExports.csv.valValue")];
  const rows: (string | number)[][] = [header];
  const s = data.summary;
  rows.push([t("msppExports.csv.valGenAt"), data.generatedAt]);
  rows.push([t("msppExports.csv.valScopeNote"), data.scopeNote]);
  rows.push([t("msppExports.csv.valTimingLookback"), String(data.timingLookbackDays)]);
  rows.push([t("msppExports.csv.valPendingDept"), s.pendingDepartment]);
  rows.push([t("msppExports.csv.valPendingCentral"), s.pendingCentral]);
  rows.push([t("msppExports.csv.valApprovedCentral"), s.approvedCentral]);
  rows.push([t("msppExports.csv.valRejectedTotal"), s.rejectedTotal]);
  rows.push([t("msppExports.csv.valRequeueTotal"), s.requeueEventsTotal]);
  rows.push([t("msppExports.csv.valFlowTerminal"), data.flow.terminalDecisionEventsTotal]);
  rows.push([
    t("msppExports.csv.valFlowRequeueShare"),
    data.flow.requeueShareOfVolume == null ? "" : String(data.flow.requeueShareOfVolume),
  ]);
  const tm = data.timing;
  rows.push([t("msppExports.csv.valTimeReportToDeptN"), tm.sampleSizeReportToFirstDept]);
  rows.push([t("msppExports.csv.valTimeReportToDeptAvg"), daysFromMs(tm.avgMsReportToFirstDeptDecision)]);
  rows.push([t("msppExports.csv.valTimeDeptToCentralN"), tm.sampleSizeDeptApproveToCentral]);
  rows.push([t("msppExports.csv.valTimeDeptToCentralAvg"), daysFromMs(tm.avgMsDepartmentApprovalToCentralDecision)]);
  rows.push([t("msppExports.csv.valTimeFullN"), tm.sampleSizeFullCycle]);
  rows.push([t("msppExports.csv.valTimeFullAvg"), daysFromMs(tm.avgMsReportToCentralFinal)]);
  return rows;
}

export function buildValidationDepartmentsCsv(
  data: MsppValidationAnalyticsResponse,
  t: TFn
): (string | number)[][] {
  const header = [
    t("msppExports.csv.valDeptName"),
    t("msppExports.csv.valDeptCode"),
    t("msppExports.csv.valDeptPendingD"),
    t("msppExports.csv.valDeptPendingC"),
    t("msppExports.csv.valDeptApproved"),
    t("msppExports.csv.valDeptRejD"),
    t("msppExports.csv.valDeptRejC"),
    t("msppExports.csv.valDeptRequeue"),
    t("msppExports.csv.valDeptBacklog"),
    t("msppExports.csv.valDeptAvgCycleDays"),
    t("msppExports.csv.valDeptCycleN"),
    t("msppExports.csv.apiGeneratedAt"),
  ];
  const rows: (string | number)[][] = [header];
  for (const d of data.departments) {
    rows.push([
      d.departmentName ?? "",
      d.departmentCode ?? "",
      d.pendingDepartment,
      d.pendingCentral,
      d.approvedCentral,
      d.rejectedDepartment,
      d.rejectedCentral,
      d.requeueEvents,
      backlogRiskLabel(t, d.backlogRisk),
      daysFromMs(d.avgMsFullCycle),
      d.fullCycleSampleSize,
      data.generatedAt,
    ]);
  }
  return rows;
}
