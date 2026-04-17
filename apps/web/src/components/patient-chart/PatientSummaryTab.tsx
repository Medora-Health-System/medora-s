"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChartSection, tableStyles, btnPrimary, btnSecondary } from "@/components/chart/ChartSection";
import type { ChartSummary } from "@/lib/chartApi";
import { resolveDiagnosis } from "@/lib/chartApi";
import {
  completeFollowUp,
  cancelFollowUp,
  type FollowUpRow,
} from "@/lib/followUpsApi";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { PatientVitalsHistory } from "./PatientVitalsHistory";
import { diagnosisDisplayFr } from "./patientChartHelpers";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { EncounterClinicalTimeline } from "./EncounterClinicalTimeline";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterChromeDate,
  formatEncounterChromeDateTime,
  formatEncounterChromeDateTimeFromDate,
  tFollowUpStatus,
} from "@/lib/encounterChromeI18n";

const emptyStateStyle: React.CSSProperties = {
  padding: "16px 14px",
  fontSize: 14,
  color: "#555",
  backgroundColor: "#fafafa",
  border: "1px solid #eee",
  borderRadius: 6,
};

function FollowUpStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const style: React.CSSProperties =
    status === "OPEN"
      ? { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#e3f2fd", color: "#1565c0" }
      : status === "COMPLETED"
        ? { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#e8f5e9", color: "#2e7d32" }
        : { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#f5f5f5", color: "#616161" };
  return <span style={style}>{tFollowUpStatus(t, status)}</span>;
}

function FollowUpRowActions({
  facilityId,
  followUpId,
  onDone,
}: {
  facilityId: string;
  followUpId: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const handleComplete = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await completeFollowUp(facilityId, followUpId);
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await cancelFollowUp(facilityId, followUpId);
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" style={btnSecondary} onClick={handleComplete} disabled={loading}>
        {loading ? "…" : t("patientChartUi.followUpMarkDone")}
      </button>
      <button
        type="button"
        style={{ ...btnSecondary, color: "#c62828", borderColor: "#c62828" }}
        onClick={handleCancel}
        disabled={loading}
      >
        {t("patientChartUi.followUpCancel")}
      </button>
    </span>
  );
}

function ResolveDiagnosisButton({
  facilityId,
  diagnosisId,
  onResolved,
}: {
  facilityId: string;
  diagnosisId: string;
  onResolved: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleResolve = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await resolveDiagnosis(facilityId, diagnosisId);
      onResolved();
    } catch (e: unknown) {
      const msg =
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("patientChartUi.resolveDxFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <span>
      <button type="button" style={btnSecondary} onClick={handleResolve} disabled={loading}>
        {loading ? "…" : t("patientChartUi.resolveDx")}
      </button>
      {error && <span style={{ marginLeft: 8, fontSize: 12, color: "#c00" }}>{error}</span>}
    </span>
  );
}

export function PatientSummaryTab({
  chartSummary,
  chartLoading,
  chartLastFetchedAt,
  facilityId,
  canPrescribe,
  vitalsFullHistory,
  vitalsHistoryLoading,
  onRefresh,
  onAddDiagnosis,
  onTabResults,
  followUps,
  followUpsLoading,
  onRefreshFollowUps,
  onAddFollowUp,
  onPrintMedicalRecord,
}: {
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
  /** Impression dossier (données déjà chargées) — en-tête du fil chronologique */
  onPrintMedicalRecord?: () => void;
}) {
  const { t, language } = useI18n();
  const formatDate = (d: string | null | undefined) =>
    d ? formatEncounterChromeDate(d, language) : t("common.dash");
  const formatDateTime = (d: Date) => formatEncounterChromeDateTimeFromDate(d, language);
  const formatDateTimeIso = (iso: string) => formatEncounterChromeDateTime(iso, language);

  if (chartLoading && !chartSummary) {
    return (
      <div style={{ padding: "32px 16px", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#666", fontSize: 15 }}>{t("patientChartUi.summaryLoadingChart")}</div>
      </div>
    );
  }
  if (!chartSummary) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ marginBottom: 12 }}>{t("patientChartUi.summaryLoadError")}</p>
        <button type="button" style={btnPrimary} onClick={onRefresh}>
          {t("patientChartUi.summaryRetry")}
        </button>
      </div>
    );
  }

  const { activeDiagnoses, recentEncounters, recentMedicationDispenses, recentVaccinations } = chartSummary;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingFollowUps = followUps
    .filter((fu) => fu.status === "OPEN" && fu.dueDate && new Date(fu.dueDate) >= todayStart)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button type="button" style={btnSecondary} onClick={() => onRefresh()} disabled={chartLoading}>
          {chartLoading ? t("patientChartUi.summaryRefreshing") : t("patientChartUi.summaryRefresh")}
        </button>
        {chartLastFetchedAt && (
          <span style={{ fontSize: 12, color: "#9e9e9e" }}>
            {t("patientChartUi.summaryUpdatedPrefix")} {formatDateTime(chartLastFetchedAt)}
          </span>
        )}
      </div>

      <ChartSection
        title={t("patientChartUi.summaryTimelineTitle")}
        action={
          onPrintMedicalRecord ? (
            <button
              type="button"
              onClick={onPrintMedicalRecord}
              style={{
                padding: "8px 14px",
                border: "1px solid #000",
                borderRadius: 4,
                background: "#fff",
                color: "#000",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {t("patientChartUi.summaryPrintMedicalRecord")}
            </button>
          ) : undefined
        }
      >
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px 0" }}>{t("patientChartUi.summaryTimelineIntro")}</p>
        <EncounterClinicalTimeline encounters={recentEncounters} followUps={followUps} />
      </ChartSection>

      <ChartSection title={t("patientChartUi.summaryVitalsTitle")}>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px 0" }}>{t("patientChartUi.summaryVitalsIntro")}</p>
        <PatientVitalsHistory items={vitalsFullHistory} loading={vitalsHistoryLoading} />
      </ChartSection>

      <ChartSection
        title={t("patientChartUi.summaryDxTitle")}
        action={
          canPrescribe ? (
            <button type="button" style={btnPrimary} onClick={onAddDiagnosis}>
              {t("patientChartUi.summaryDxAdd")}
            </button>
          ) : undefined
        }
      >
        {activeDiagnoses.length === 0 ? (
          <div style={emptyStateStyle}>
            {canPrescribe ? t("patientChartUi.summaryDxEmpty") : t("patientChartUi.summaryDxEmptyReadonly")}
          </div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThCode")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThLabel")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThOnset")}</th>
                {canPrescribe ? <th style={tableStyles.th}></th> : null}
              </tr>
            </thead>
            <tbody>
              {activeDiagnoses.map((d) => (
                <tr key={d.id}>
                  <td style={tableStyles.td}>{d.code}</td>
                  <td style={tableStyles.td}>{diagnosisDisplayFr(d.description, d.code)}</td>
                  <td style={tableStyles.td}>{formatDate(d.onsetDate)}</td>
                  {canPrescribe ? (
                    <td style={tableStyles.td}>
                      <ResolveDiagnosisButton facilityId={facilityId} diagnosisId={d.id} onResolved={onRefresh} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>

      <ChartSection
        title={t("patientChartUi.summaryResultsTitle")}
        action={
          <button type="button" style={{ ...btnSecondary, border: "none", background: "none", color: "#1a1a1a", textDecoration: "underline" }} onClick={onTabResults}>
            {t("patientChartUi.summaryResultsLinkTab")}
          </button>
        }
      >
        <div style={emptyStateStyle}>
          {t("patientChartUi.summaryResultsBlurbPrefix")}
          <button
            type="button"
            onClick={onTabResults}
            style={{ border: "none", background: "none", color: "#1565c0", cursor: "pointer", textDecoration: "underline", padding: 0, font: "inherit" }}
          >
            {t("patientChartUi.summaryResultsTabName")}
          </button>
          {t("patientChartUi.summaryResultsBlurbSuffix")}
        </div>
      </ChartSection>

      <ChartSection title={t("patientChartUi.summaryDispenseTitle")}>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px 0" }}>{t("patientChartUi.summaryDispenseIntro")}</p>
        {recentMedicationDispenses.length === 0 ? (
          <div style={emptyStateStyle}>{t("patientChartUi.summaryDispenseEmpty")}</div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThMedication")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThQty")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThDateTime")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThBy")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThInstr")}</th>
              </tr>
            </thead>
            <tbody>
              {recentMedicationDispenses.map((m) => (
                <tr key={m.id}>
                  <td style={tableStyles.td}>
                    {m.catalogMedication?.displayNameFr?.trim() ||
                      m.catalogMedication?.name ||
                      m.catalogMedication?.code ||
                      t("common.dash")}
                  </td>
                  <td style={tableStyles.td}>{m.quantityDispensed}</td>
                  <td style={tableStyles.td}>{formatDateTimeIso(m.dispensedAt)}</td>
                  <td style={tableStyles.td}>
                    {m.dispensedBy
                      ? `${m.dispensedBy.firstName} ${m.dispensedBy.lastName}`.trim()
                      : t("common.dash")}
                  </td>
                  <td style={tableStyles.td}>{m.dosageInstructions || t("common.dash")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>

      <ChartSection
        title={t("patientChartUi.summaryFollowUpTitle")}
        action={
          <button type="button" style={btnPrimary} onClick={onAddFollowUp}>
            {t("patientChartUi.summaryFollowUpAdd")}
          </button>
        }
      >
        {followUpsLoading ? (
          <div style={emptyStateStyle}>{t("patientChartUi.summaryFollowUpLoading")}</div>
        ) : upcomingFollowUps.length === 0 ? (
          <div style={emptyStateStyle}>{t("patientChartUi.summaryFollowUpEmpty")}</div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>{t("patientChartUi.summaryFuThDue")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryFuThReason")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryFuThNotes")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryFuThStatus")}</th>
                <th style={tableStyles.th}></th>
              </tr>
            </thead>
            <tbody>
              {upcomingFollowUps.map((fu) => (
                <tr key={fu.id}>
                  <td style={tableStyles.td}>{formatDate(fu.dueDate)}</td>
                  <td style={tableStyles.td}>{fu.reason || t("common.dash")}</td>
                  <td style={tableStyles.td}>
                    {fu.notes ? (fu.notes.length > 50 ? fu.notes.slice(0, 50) + "…" : fu.notes) : t("common.dash")}
                  </td>
                  <td style={tableStyles.td}>
                    <FollowUpStatusBadge status={fu.status} />
                  </td>
                  <td style={tableStyles.td}>
                    {fu.status === "OPEN" && (
                      <FollowUpRowActions facilityId={facilityId} followUpId={fu.id} onDone={onRefreshFollowUps} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>

      <ChartSection
        title={t("patientChartUi.summaryVaxTitle")}
        action={
          <Link href="/app/public-health/vaccinations" style={{ fontSize: 13 }}>
            {t("patientChartUi.summaryVaxLink")}
          </Link>
        }
      >
        {recentVaccinations.length === 0 ? (
          <div style={emptyStateStyle}>
            {t("patientChartUi.summaryVaxEmpty")}{" "}
            <Link href="/app/public-health/vaccinations">{t("patientChartUi.summaryVaxModuleLink")}</Link>.
          </div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThVax")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThDose")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThAdmin")}</th>
                <th style={tableStyles.th}>{t("patientChartUi.summaryThNext")}</th>
              </tr>
            </thead>
            <tbody>
              {recentVaccinations.map((v) => (
                <tr key={v.id}>
                  <td style={tableStyles.td}>{v.vaccineCatalog?.name ?? v.vaccineCatalog?.code ?? t("common.dash")}</td>
                  <td style={tableStyles.td}>{v.doseNumber ?? t("common.dash")}</td>
                  <td style={tableStyles.td}>{formatDate(v.administeredAt)}</td>
                  <td style={tableStyles.td}>{formatDate(v.nextDueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>
    </div>
  );
}
