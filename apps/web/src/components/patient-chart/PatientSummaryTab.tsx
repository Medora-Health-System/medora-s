"use client";

import React from "react";
import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/components/chart/ChartSection";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import type { ChartSummary, ChartSummaryEncounter, ChartSummaryOrderItem } from "@/lib/chartApi";
import type { FollowUpRow } from "@/lib/followUpsApi";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { PatientVitalsHistory } from "./PatientVitalsHistory";
import { PatientClinicalHistoryProfileBlock } from "./PatientClinicalHistoryProfileBlock";
import type { PatientClinicalHistoryProfile } from "@/features/emergency/patientClinicalHistoryProfile";
import { liveIcd10DiagnosisPrimary } from "@/components/diagnosis/icd10LivePresentation";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterChromeDate,
  formatEncounterChromeDateTime,
  formatEncounterChromeDateTimeFromDate,
  tEncounterStatus,
  tEncounterType,
} from "@/lib/encounterChromeI18n";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { canonicalEncounterWorkspaceHref } from "@/features/encounters/canonicalEncounterWorkspaceHref";
import { chartSummaryOrderItemLineLabel } from "@/lib/chartSummaryOrderLabel";

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#64748b",
};

const lineStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#334155",
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};

const emptyStyle: React.CSSProperties = {
  ...lineStyle,
  color: "#64748b",
  fontStyle: "italic",
  padding: "4px 0",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "7px 8px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tdStyle: React.CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
  color: "#334155",
  verticalAlign: "top",
};

function SummaryCard({ accent, title, subline, children }: { accent: string; title: string; subline?: string; children: React.ReactNode }) {
  return (
    <MedoraCard leftAccentColor={accent} variant="default">
      <MedoraCardInner>
        <div style={{ width: "100%", minWidth: 0 }}>
          <p style={sectionTitle}>{title}</p>
          {subline ? <p style={{ ...lineStyle, margin: "4px 0 10px", fontSize: 12, color: "#64748b" }}>{subline}</p> : null}
          {children}
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}

function flattenEncounterItems(enc: ChartSummaryEncounter): ChartSummaryOrderItem[] {
  return (enc.orders ?? []).flatMap((order) => order.items ?? []);
}

function resultRows(encounters: ChartSummaryEncounter[], kind: "LAB_TEST" | "IMAGING_STUDY") {
  return encounters.flatMap((enc) =>
    flattenEncounterItems(enc)
      .filter((item) => item.catalogItemType === kind)
      .filter((item) => Boolean(item.result?.resultText?.trim() || item.result?.resultData || item.status === "RESULTED" || item.status === "VERIFIED"))
      .map((item) => ({ enc, item }))
  );
}

function ResultCard({ enc, item }: { enc: ChartSummaryEncounter; item: ChartSummaryOrderItem }) {
  const { t, language } = useI18n();
  const title = chartSummaryOrderItemLineLabel(item, language, t);
  const when = item.result?.verifiedAt ?? item.completedAt ?? enc.createdAt;
  const critical = Boolean(item.result?.criticalValue);
  return (
    <div style={{ border: `1px solid ${critical ? "#fecaca" : "#e2e8f0"}`, background: critical ? "#fff7f7" : "#fff", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 13, color: "#0f172a" }}>{title}</strong>
        {critical ? <MedoraCardBadge soft={{ bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" }}>Critical</MedoraCardBadge> : null}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748b" }}>{formatEncounterChromeDateTime(when, language)}</span>
      </div>
      {item.result?.resultText?.trim() ? (
        <div style={{ ...lineStyle, marginTop: 8, whiteSpace: "pre-wrap" }}>{item.result.resultText.trim()}</div>
      ) : (
        <p style={{ ...lineStyle, marginTop: 8, color: "#64748b" }}>Result available in the encounter record.</p>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
        {tEncounterType(t, enc.type)} · {formatEncounterChromeDateTime(enc.createdAt, language)}
      </div>
    </div>
  );
}

function EncounterSummaryCard({ enc }: { enc: ChartSummaryEncounter }) {
  const { t, language } = useI18n();
  const attending = enc.physicianAssigned ? `${enc.physicianAssigned.firstName} ${enc.physicianAssigned.lastName}`.trim() : null;
  const diagnoses = enc.encounterDiagnoses ?? [];
  const reason = enc.visitReason || enc.chiefComplaint || enc.clinicianImpressionPreview;
  const href = canonicalEncounterWorkspaceHref({
    encounterId: enc.id,
    encounterType: enc.type,
    encounterStatus: enc.status,
    admissionSummaryJson: enc.admissionSummaryJson,
    source: "PATIENT_CHART",
  });
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <Link href={href} style={{ color: "#0f172a", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            {tEncounterType(t, enc.type)}
          </Link>
          <p style={{ ...lineStyle, marginTop: 3, fontSize: 12, color: "#64748b" }}>
            {formatEncounterChromeDateTime(enc.createdAt, language)} · {tEncounterStatus(t, enc.status)}{attending ? ` · ${attending}` : ""}
          </p>
          {reason ? <p style={{ ...lineStyle, marginTop: 7 }}><strong>Reason / impression:</strong> {reason}</p> : null}
        </div>
        <Link href={href} style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a", fontSize: 12, fontWeight: 600, textDecoration: "none", background: "#f8fafc" }}>Open record</Link>
      </div>
      {diagnoses.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <p style={sectionTitle}>Diagnoses</p>
          <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {diagnoses.slice(0, 6).map((d) => <span key={d.id} style={{ fontSize: 12, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 999, padding: "4px 8px", color: "#334155" }}>{d.code} · {d.displayLabel || d.description || "Diagnosis"}</span>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PatientSummaryTab({ chartSummary, chartLoading, chartLastFetchedAt, vitalsFullHistory, vitalsHistoryLoading, onRefresh, followUps: _followUps, onPrintMedicalRecord }: {
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

  if (chartLoading && !chartSummary) return <div style={{ padding: "32px 16px", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>{t("patientChartUi.summaryLoadingChart")}</div>;
  if (!chartSummary) return <div style={{ padding: 24 }}><p style={{ marginBottom: 12 }}>{t("patientChartUi.summaryLoadError")}</p><button type="button" style={btnPrimary} onClick={onRefresh}>{t("patientChartUi.summaryRetry")}</button></div>;

  const { activeDiagnoses, recentEncounters, recentMedicationDispenses, recentVaccinations } = chartSummary;
  const labs = resultRows(recentEncounters, "LAB_TEST");
  const imaging = resultRows(recentEncounters, "IMAGING_STUDY");
  const latestVitals = vitalsFullHistory[0]?.vitalsJson as Record<string, unknown> | undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="patient-medical-record-summary">
      <MedoraCard leftAccentColor="#0f172a" variant="default">
        <MedoraCardInner>
          <MedoraCardIdentity initials="S">
            <MedoraCardTitle title="Medical record summary" subline={<p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Read-only patient record assembled from the authoritative ED, hospital, laboratory, radiology, medication, and profile records.</p>} />
          </MedoraCardIdentity>
          <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
            <button type="button" style={btnSecondary} onClick={onRefresh} disabled={chartLoading}>{chartLoading ? t("patientChartUi.summaryRefreshing") : t("patientChartUi.summaryRefresh")}</button>
            {onPrintMedicalRecord ? <button type="button" onClick={onPrintMedicalRecord} style={{ padding: "7px 12px", border: "1px solid #0f172a", borderRadius: 8, background: "#fff", color: "#0f172a", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>{t("patientChartUi.summaryPrintPatientChartPreview")}</button> : null}
          </MedoraCardActions>
        </MedoraCardInner>
      </MedoraCard>

      <SummaryCard accent="#0f172a" title="Current clinical overview" subline={chartLastFetchedAt ? `Updated ${formatDateTime(chartLastFetchedAt)}` : undefined}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px 18px" }}>
          <div><p style={sectionTitle}>Active diagnoses</p><p style={{ ...lineStyle, marginTop: 3 }}>{activeDiagnoses.length}</p></div>
          <div><p style={sectionTitle}>Encounters in record</p><p style={{ ...lineStyle, marginTop: 3 }}>{recentEncounters.length}</p></div>
          <div><p style={sectionTitle}>Laboratory results</p><p style={{ ...lineStyle, marginTop: 3 }}>{labs.length}</p></div>
          <div><p style={sectionTitle}>Imaging results</p><p style={{ ...lineStyle, marginTop: 3 }}>{imaging.length}</p></div>
          <div><p style={sectionTitle}>Latest vitals</p><p style={{ ...lineStyle, marginTop: 3 }}>{latestVitals ? "Available" : "No recent vitals"}</p></div>
        </div>
      </SummaryCard>

      {chartSummary.clinicalHistoryProfile ? (
        <SummaryCard accent="#7c3aed" title={t("patientChartUi.clinicalHistoryTitle")}>
          <PatientClinicalHistoryProfileBlock profile={chartSummary.clinicalHistoryProfile as PatientClinicalHistoryProfile} />
        </SummaryCard>
      ) : null}

      <SummaryCard accent="#0ea5e9" title="Vital signs" subline="Newest first. Values are presented directly from the recorded triage/vital-sign snapshots.">
        <PatientVitalsHistory items={vitalsFullHistory} loading={vitalsHistoryLoading} />
      </SummaryCard>

      <SummaryCard accent="#2563eb" title="Encounter record" subline="Each encounter remains authoritative in its ED or hospital medical record. Open an encounter for complete source documentation.">
        {recentEncounters.length === 0 ? <p style={emptyStyle}>No encounters in this record.</p> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{recentEncounters.map((enc) => <EncounterSummaryCard key={enc.id} enc={enc} />)}</div>}
      </SummaryCard>

      <SummaryCard accent="#dc2626" title="Active diagnoses">
        {activeDiagnoses.length === 0 ? <p style={emptyStyle}>{t("patientChartUi.summaryDxEmptyReadonly")}</p> : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thStyle}>{t("patientChartUi.summaryThCode")}</th><th style={thStyle}>{t("patientChartUi.summaryThLabel")}</th><th style={thStyle}>{t("patientChartUi.summaryThOnset")}</th></tr></thead><tbody>{activeDiagnoses.map((d) => <tr key={d.id}><td style={tdStyle}>{d.code}</td><td style={tdStyle}>{liveIcd10DiagnosisPrimary(d)}</td><td style={tdStyle}>{formatDate(d.onsetDate)}</td></tr>)}</tbody></table></div>
        )}
      </SummaryCard>

      <SummaryCard accent="#16a34a" title="Laboratory results" subline="Consolidated from all encounters; no longer interleaved with encounter narrative.">
        {labs.length === 0 ? <p style={emptyStyle}>No laboratory results available.</p> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{labs.map(({ enc, item }) => <ResultCard key={`${enc.id}-${item.id}`} enc={enc} item={item} />)}</div>}
      </SummaryCard>

      <SummaryCard accent="#7c3aed" title="Radiology & imaging results" subline="Consolidated imaging interpretations from all encounters.">
        {imaging.length === 0 ? <p style={emptyStyle}>No radiology or imaging results available.</p> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{imaging.map(({ enc, item }) => <ResultCard key={`${enc.id}-${item.id}`} enc={enc} item={item} />)}</div>}
      </SummaryCard>

      <SummaryCard accent="#ea580c" title="Medication dispensing">
        {recentMedicationDispenses.length === 0 ? <p style={emptyStyle}>{t("patientChartUi.summaryDispenseEmpty")}</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thStyle}>{t("patientChartUi.summaryThMedication")}</th><th style={thStyle}>{t("patientChartUi.summaryThQty")}</th><th style={thStyle}>{t("patientChartUi.summaryThInstr")}</th></tr></thead><tbody>{recentMedicationDispenses.map((m) => <tr key={m.id}><td style={tdStyle}>{catalogMedicationNameForLocale(m.catalogMedication, language) || m.catalogMedication?.code || t("common.dash")}</td><td style={tdStyle}>{m.quantityDispensed}</td><td style={tdStyle}>{m.dosageInstructions || t("common.dash")}</td></tr>)}</tbody></table></div>}
      </SummaryCard>

      <SummaryCard accent="#0891b2" title="Immunizations">
        {recentVaccinations.length === 0 ? <p style={emptyStyle}>{t("patientChartUi.summaryVaxEmpty")}</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={thStyle}>{t("patientChartUi.summaryThVax")}</th><th style={thStyle}>{t("patientChartUi.summaryThDose")}</th><th style={thStyle}>{t("patientChartUi.summaryThAdmin")}</th><th style={thStyle}>{t("patientChartUi.summaryThNext")}</th></tr></thead><tbody>{recentVaccinations.map((v) => <tr key={v.id}><td style={tdStyle}>{v.vaccineCatalog?.name ?? v.vaccineCatalog?.code ?? t("common.dash")}</td><td style={tdStyle}>{v.doseNumber ?? t("common.dash")}</td><td style={tdStyle}>{formatDate(v.administeredAt)}</td><td style={tdStyle}>{formatDate(v.nextDueAt)}</td></tr>)}</tbody></table></div>}
      </SummaryCard>
    </div>
  );
}
