"use client";

import React from "react";
import { ChartSection, tableStyles, btnPrimary, btnSecondary } from "@/components/chart/ChartSection";
import type { ChartSummary } from "@/lib/chartApi";
import type { FollowUpRow } from "@/lib/followUpsApi";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { PatientVitalsHistory } from "./PatientVitalsHistory";
import { PatientClinicalHistoryProfileBlock } from "./PatientClinicalHistoryProfileBlock";
import type { PatientClinicalHistoryProfile } from "@/features/emergency/patientClinicalHistoryProfile";
import { liveIcd10DiagnosisPrimary } from "@/components/diagnosis/icd10LivePresentation";
import { EncounterClinicalTimeline } from "./EncounterClinicalTimeline";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDate, formatEncounterChromeDateTimeFromDate } from "@/lib/encounterChromeI18n";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";

const emptyStateStyle: React.CSSProperties = { padding: "16px 14px", fontSize: 14, color: "#555", backgroundColor: "#fafafa", border: "1px solid #eee", borderRadius: 6 };

export function PatientSummaryTab({ chartSummary, chartLoading, chartLastFetchedAt, vitalsFullHistory, vitalsHistoryLoading, onRefresh, followUps, onPrintMedicalRecord }: {
  chartSummary: ChartSummary | null;
  chartLoading: boolean;
  chartLastFetchedAt: Date | null;
  facilityId: string;
  canPrescribe: boolean;
  vitalsFullHistory: PatientTriageVitalsSnapshot[];
  vitalsHistoryLoading: boolean;
  onRefresh: () => void;
  onAddDiagnosis: () => void;
  onTabResults: () => void;
  followUps: FollowUpRow[];
  followUpsLoading: boolean;
  onRefreshFollowUps: () => void;
  onAddFollowUp: () => void;
  onPrintMedicalRecord?: () => void;
}) {
  const { t, language } = useI18n();
  const formatDate = (d: string | null | undefined) => d ? formatEncounterChromeDate(d, language) : t("common.dash");
  const formatDateTime = (d: Date) => formatEncounterChromeDateTimeFromDate(d, language);

  if (chartLoading && !chartSummary) return <div style={{ padding: "32px 16px", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>{t("patientChartUi.summaryLoadingChart")}</div>;
  if (!chartSummary) return <div style={{ padding: 24 }}><p style={{ marginBottom: 12 }}>{t("patientChartUi.summaryLoadError")}</p><button type="button" style={btnPrimary} onClick={onRefresh}>{t("patientChartUi.summaryRetry")}</button></div>;

  const { activeDiagnoses, recentEncounters, recentMedicationDispenses, recentVaccinations } = chartSummary;
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button type="button" style={btnSecondary} onClick={onRefresh} disabled={chartLoading}>{chartLoading ? t("patientChartUi.summaryRefreshing") : t("patientChartUi.summaryRefresh")}</button>
        {chartLastFetchedAt && <span style={{ fontSize: 12, color: "#9e9e9e" }}>{t("patientChartUi.summaryUpdatedPrefix")} {formatDateTime(chartLastFetchedAt)}</span>}
        {onPrintMedicalRecord && <button type="button" onClick={onPrintMedicalRecord} style={{ marginLeft: "auto", padding: "8px 14px", border: "1px solid #000", borderRadius: 4, background: "#fff", color: "#000", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>{t("patientChartUi.summaryPrintPatientChartPreview")}</button>}
      </div>

      <ChartSection title={t("patientChartUi.summaryTimelineTitle")}><EncounterClinicalTimeline encounters={recentEncounters} followUps={followUps} /></ChartSection>
      {chartSummary.clinicalHistoryProfile ? <ChartSection title={t("patientChartUi.clinicalHistoryTitle")}><PatientClinicalHistoryProfileBlock profile={chartSummary.clinicalHistoryProfile as PatientClinicalHistoryProfile} /></ChartSection> : null}
      <ChartSection title={t("patientChartUi.summaryVitalsTitle")}><PatientVitalsHistory items={vitalsFullHistory} loading={vitalsHistoryLoading} /></ChartSection>

      <ChartSection title={t("patientChartUi.summaryDxTitle")}>
        {activeDiagnoses.length === 0 ? <div style={emptyStateStyle}>{t("patientChartUi.summaryDxEmptyReadonly")}</div> : <table style={tableStyles.table}><thead><tr><th style={tableStyles.th}>{t("patientChartUi.summaryThCode")}</th><th style={tableStyles.th}>{t("patientChartUi.summaryThLabel")}</th><th style={tableStyles.th}>{t("patientChartUi.summaryThOnset")}</th></tr></thead><tbody>{activeDiagnoses.map((d) => <tr key={d.id}><td style={tableStyles.td}>{d.code}</td><td style={tableStyles.td}>{liveIcd10DiagnosisPrimary(d)}</td><td style={tableStyles.td}>{formatDate(d.onsetDate)}</td></tr>)}</tbody></table>}
      </ChartSection>

      <ChartSection title={t("patientChartUi.summaryDispenseTitle")}>
        {recentMedicationDispenses.length === 0 ? <div style={emptyStateStyle}>{t("patientChartUi.summaryDispenseEmpty")}</div> : <table style={tableStyles.table}><thead><tr><th style={tableStyles.th}>{t("patientChartUi.summaryThMedication")}</th><th style={tableStyles.th}>{t("patientChartUi.summaryThQty")}</th><th style={tableStyles.th}>{t("patientChartUi.summaryThInstr")}</th></tr></thead><tbody>{recentMedicationDispenses.map((m) => <tr key={m.id}><td style={tableStyles.td}>{catalogMedicationNameForLocale(m.catalogMedication, language) || m.catalogMedication?.code || t("common.dash")}</td><td style={tableStyles.td}>{m.quantityDispensed}</td><td style={tableStyles.td}>{m.dosageInstructions || t("common.dash")}</td></tr>)}</tbody></table>}
      </ChartSection>

      <ChartSection title={t("patientChartUi.summaryVaxTitle")}>
        {recentVaccinations.length === 0 ? <div style={emptyStateStyle}>{t("patientChartUi.summaryVaxEmpty")}</div> : <table style={tableStyles.table}><thead><tr><th style={tableStyles.th}>{t("patientChartUi.summaryThVax")}</th><th style={tableStyles.th}>{t("patientChartUi.summaryThDose")}</th><th style={tableStyles.th}>{t("patientChartUi.summaryThAdmin")}</th><th style={tableStyles.th}>{t("patientChartUi.summaryThNext")}</th></tr></thead><tbody>{recentVaccinations.map((v) => <tr key={v.id}><td style={tableStyles.td}>{v.vaccineCatalog?.name ?? v.vaccineCatalog?.code ?? t("common.dash")}</td><td style={tableStyles.td}>{v.doseNumber ?? t("common.dash")}</td><td style={tableStyles.td}>{formatDate(v.administeredAt)}</td><td style={tableStyles.td}>{formatDate(v.nextDueAt)}</td></tr>)}</tbody></table>}
      </ChartSection>
    </div>
  );
}
