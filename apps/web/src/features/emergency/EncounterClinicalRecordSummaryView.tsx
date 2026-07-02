"use client";

/**
 * Enterprise ER Summary layout driven by EncounterClinicalRecord (Phase 3B).
 * Read-only clinical record view — operational events belong in audit section.
 */

import React, { useState } from "react";
import Link from "next/link";
import type { EncounterClinicalRecord } from "@medora/shared";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE,
  clinicalMilestoneI18nKey,
  encounterClinicalRecordHasPrimaryContent,
  providerStatusI18nKey,
} from "./encounterClinicalRecordSummaryViewModel";
import { SummaryAuditTimelineSlot } from "./SummaryAuditTimelineSlot";

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
  lineHeight: 1.45,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  color: "#334155",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const linkPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

function SummarySectionCard({
  accent,
  title,
  subline,
  children,
  empty,
}: {
  accent: string;
  title: string;
  subline?: string;
  children: React.ReactNode;
  empty?: string;
}) {
  const isEmpty = empty != null;
  return (
    <MedoraCard leftAccentColor={accent} variant="default">
      <MedoraCardInner>
        <div style={{ width: "100%", minWidth: 0 }}>
          <p style={sectionTitle}>{title}</p>
          {subline ? (
            <p style={{ ...lineStyle, margin: "4px 0 8px 0", fontSize: 12, color: "#64748b" }}>
              {subline}
            </p>
          ) : null}
          {isEmpty ? (
            <p style={{ ...lineStyle, marginTop: 8, color: "#64748b", fontStyle: "italic" }}>{empty}</p>
          ) : (
            children
          )}
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}

function VersionHistoryCollapsible({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #c7d2fe",
          background: "#eef2ff",
          color: "#4338ca",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {open
          ? t("encounterClinicalRecordSummary.versionHistoryHide")
          : t("encounterClinicalRecordSummary.versionHistoryShow").replace(
              "{count}",
              String(count)
            )}
      </button>
      {open ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      ) : null}
    </div>
  );
}

export type EncounterClinicalRecordSummaryViewProps = {
  record: EncounterClinicalRecord | null;
  resultsTabHref: string;
  diagnosticsTabHref: string;
  summaryReadOnly?: boolean;
  auditTimeline?: React.ReactNode;
  closureReadinessSlot?: React.ReactNode;
};

export function EncounterClinicalRecordSummaryView({
  record,
  resultsTabHref,
  diagnosticsTabHref,
  summaryReadOnly = false,
  auditTimeline,
  closureReadinessSlot,
}: EncounterClinicalRecordSummaryViewProps) {
  const { t, language } = useI18n();
  const [auditOpen, setAuditOpen] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  if (!record) {
    return (
      <MedoraCard leftAccentColor="#94a3b8" variant="default">
        <MedoraCardInner>
          <p style={lineStyle}>{t("encounterClinicalRecordSummary.loading")}</p>
        </MedoraCardInner>
      </MedoraCard>
    );
  }

  const hasContent = encounterClinicalRecordHasPrimaryContent(record);
  const timelineVisible = timelineExpanded
    ? record.clinicalTimeline
    : record.clinicalTimeline.slice(0, CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE);
  const hiddenTimelineCount = Math.max(
    0,
    record.clinicalTimeline.length - CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE
  );

  const formatDt = (iso: string | null) =>
    iso ? formatEncounterChromeDateTime(iso, language) : t("common.dash");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", minWidth: 0 }}>
      <MedoraCard leftAccentColor="#0f172a" variant="default">
        <MedoraCardInner>
          <MedoraCardIdentity initials="S">
            <MedoraCardTitle
              title={t("encounterClinicalRecordSummary.cardTitle")}
              subline={
                <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {summaryReadOnly
                    ? t("encounterClinicalRecordSummary.readOnlySubline")
                    : t("encounterClinicalRecordSummary.cardSubline")}
                </p>
              }
            />
          </MedoraCardIdentity>
          <MedoraCardActions railBorderTopColor="#e2e8f0" gap={6} minWidth={0}>
            <Link href={resultsTabHref} style={linkPill}>
              {t("encounterClinicalRecordSummary.linkResultsTab")}
            </Link>
            <Link href={diagnosticsTabHref} style={linkPill}>
              {t("encounterClinicalRecordSummary.linkDiagnosticsTab")}
            </Link>
          </MedoraCardActions>
        </MedoraCardInner>
      </MedoraCard>

      {!hasContent ? (
        <MedoraCard leftAccentColor="#94a3b8" variant="default">
          <MedoraCardInner>
            <p style={lineStyle}>{t("encounterClinicalRecordSummary.emptyState")}</p>
          </MedoraCardInner>
        </MedoraCard>
      ) : null}

      <SummarySectionCard
        accent="#1e293b"
        title={t("encounterClinicalRecordSummary.headerTitle")}
        empty={!record.header.patientDisplayName && !record.header.arrivedAt ? t("encounterClinicalRecordSummary.headerEmpty") : undefined}
      >
        <div style={{ display: "grid", gap: 4 }}>
          {record.header.patientDisplayName ? (
            <p style={lineStyle}>
              <strong>{t("encounterClinicalRecordSummary.patientLabel")}:</strong>{" "}
              {record.header.patientDisplayName}
              {record.header.patientMrn ? ` · ${record.header.patientMrn}` : ""}
            </p>
          ) : null}
          {record.header.arrivedAt ? (
            <p style={lineStyle}>
              <strong>{t("encounterClinicalRecordSummary.arrivalLabel")}:</strong>{" "}
              {formatDt(record.header.arrivedAt)}
            </p>
          ) : null}
          {record.header.attendingProviderDisplayName ? (
            <p style={lineStyle}>
              <strong>{t("encounterClinicalRecordSummary.attendingLabel")}:</strong>{" "}
              {record.header.attendingProviderDisplayName}
            </p>
          ) : null}
          {record.header.roomLabel ? (
            <p style={lineStyle}>
              <strong>{t("encounterClinicalRecordSummary.roomLabel")}:</strong> {record.header.roomLabel}
            </p>
          ) : null}
        </div>
      </SummarySectionCard>

      {record.chiefComplaint?.lines.length ? (
        <SummarySectionCard accent="#2563eb" title={t("encounterClinicalRecordSummary.chiefComplaintTitle")}>
          {record.chiefComplaint.lines.map((line, i) => (
            <p key={i} style={lineStyle}>
              {line}
            </p>
          ))}
        </SummarySectionCard>
      ) : null}

      {record.presentation?.lines.length ? (
        <SummarySectionCard accent="#b91c1c" title={t("encounterClinicalRecordSummary.presentationTitle")}>
          {record.presentation.lines.map((line, i) => (
            <p key={i} style={lineStyle}>
              {line}
            </p>
          ))}
        </SummarySectionCard>
      ) : null}

      <SummarySectionCard
        accent="#d97706"
        title={t("encounterClinicalRecordSummary.vitalsTitle")}
        empty={record.vitals.length === 0 ? t("encounterClinicalRecordSummary.vitalsEmpty") : undefined}
      >
        {record.vitals.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {record.vitals.map((v) => (
              <li key={v.id} style={lineStyle}>
                {formatDt(v.recordedAt)} — {v.summary}
              </li>
            ))}
          </ul>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#0ea5e9"
        title={t("encounterClinicalRecordSummary.nursingTitle")}
        subline={t("encounterClinicalRecordSummary.nursingSubline")}
        empty={!record.nursingAssessment ? t("encounterClinicalRecordSummary.nursingEmpty") : undefined}
      >
        {record.nursingAssessment ? (
          <>
            <p style={{ ...lineStyle, fontSize: 12, color: "#64748b" }}>
              {formatDt(record.nursingAssessment.documentedAt ?? record.nursingAssessment.savedAt)}
              {record.nursingAssessment.performerDisplayName
                ? ` — ${record.nursingAssessment.performerDisplayName}`
                : ""}
            </p>
            {record.nursingAssessment.structuredLines.map((line, i) => (
              <p key={i} style={lineStyle}>
                {line}
              </p>
            ))}
            {record.nursingAssessment.narrativeSummary ? (
              <p style={{ ...lineStyle, fontStyle: "italic", color: "#475569" }}>
                {record.nursingAssessment.narrativeSummary}
              </p>
            ) : null}
            <VersionHistoryCollapsible
              title={t("encounterClinicalRecordSummary.versionHistory")}
              count={record.nursingAssessmentHistory.length}
            >
              {record.nursingAssessmentHistory.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    padding: "8px 10px",
                    background: "#fff",
                  }}
                >
                  <p style={{ ...lineStyle, fontWeight: 600 }}>
                    {formatDt(entry.documentedAt ?? entry.savedAt)}
                  </p>
                  {entry.structuredLines.map((line, i) => (
                    <p key={i} style={lineStyle}>
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </VersionHistoryCollapsible>
          </>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#7c3aed"
        title={t("encounterClinicalRecordSummary.ordersTitle")}
        empty={record.orders.length === 0 ? t("encounterClinicalRecordSummary.ordersEmpty") : undefined}
      >
        {record.orders.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colOrder")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colType")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colStatus")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colWhen")}</th>
              </tr>
            </thead>
            <tbody>
              {record.orders.map((order) => (
                <tr key={order.orderItemId}>
                  <td style={tdStyle}>{order.label}</td>
                  <td style={tdStyle}>{order.orderType}</td>
                  <td style={tdStyle}>{order.status}</td>
                  <td style={tdStyle}>{formatDt(order.orderedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#059669"
        title={t("encounterClinicalRecordSummary.resultsTitle")}
        subline={t("encounterClinicalRecordSummary.resultsSubline")}
        empty={
          record.laboratoryResults.length === 0 && record.imagingResults.length === 0
            ? t("encounterClinicalRecordSummary.resultsEmpty")
            : undefined
        }
      >
        {record.laboratoryResults.length > 0 || record.imagingResults.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colStudy")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colResult")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colVerified")}</th>
              </tr>
            </thead>
            <tbody>
              {record.laboratoryResults.map((lab) => (
                <tr key={lab.orderItemId}>
                  <td style={tdStyle}>{lab.label}</td>
                  <td style={tdStyle}>{lab.resultText}</td>
                  <td style={tdStyle}>{formatDt(lab.verifiedAt)}</td>
                </tr>
              ))}
              {record.imagingResults.map((img) => (
                <tr key={img.orderItemId}>
                  <td style={tdStyle}>{img.label}</td>
                  <td style={tdStyle}>{img.resultText}</td>
                  <td style={tdStyle}>{formatDt(img.verifiedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#4f46e5"
        title={t("encounterClinicalRecordSummary.providerTitle")}
        empty={!record.providerAssessment ? t("encounterClinicalRecordSummary.providerEmpty") : undefined}
      >
        {record.providerAssessment ? (
          <>
            <p style={{ ...lineStyle, fontWeight: 600, color: "#3730a3" }}>
              {t(providerStatusI18nKey(record.providerAssessment.status))}
            </p>
            {record.providerAssessment.signedAt ? (
              <p style={{ ...lineStyle, fontSize: 12, color: "#64748b" }}>
                {t("encounterClinicalRecordSummary.signedAt")}: {formatDt(record.providerAssessment.signedAt)}
                {record.providerAssessment.signedByDisplayName
                  ? ` — ${record.providerAssessment.signedByDisplayName}`
                  : ""}
              </p>
            ) : null}
            {record.providerAssessment.sections.map((sec) => (
              <div key={sec.label} style={{ marginTop: 8 }}>
                <p style={{ ...lineStyle, fontWeight: 600 }}>{sec.label}</p>
                <p style={lineStyle}>{sec.text}</p>
              </div>
            ))}
            {record.providerAssessment.narrativeSummary ? (
              <p style={{ ...lineStyle, fontStyle: "italic" }}>{record.providerAssessment.narrativeSummary}</p>
            ) : null}
            <VersionHistoryCollapsible
              title={t("encounterClinicalRecordSummary.versionHistory")}
              count={record.providerAssessmentHistory.length}
            >
              {record.providerAssessmentHistory.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    padding: "8px 10px",
                    background: "#fff",
                  }}
                >
                  <p style={{ ...lineStyle, fontWeight: 600 }}>
                    {formatDt(entry.documentedAt ?? entry.savedAt)}
                  </p>
                  {entry.sections.map((sec) => (
                    <p key={`${entry.id}-${sec.label}`} style={lineStyle}>
                      <strong>{sec.label}:</strong> {sec.text}
                    </p>
                  ))}
                </div>
              ))}
            </VersionHistoryCollapsible>
          </>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#0d9488"
        title={t("encounterClinicalRecordSummary.proceduresTitle")}
        empty={record.procedures.length === 0 ? t("encounterClinicalRecordSummary.proceduresEmpty") : undefined}
      >
        {record.procedures.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {record.procedures.map((proc) => (
              <li key={proc.id} style={lineStyle}>
                {formatDt(proc.documentedAt)} — {proc.clinicalSummary}
              </li>
            ))}
          </ul>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#db2777"
        title={t("encounterClinicalRecordSummary.marTitle")}
        empty={
          record.medicationAdministration.length === 0
            ? t("encounterClinicalRecordSummary.marEmpty")
            : undefined
        }
      >
        {record.medicationAdministration.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colMedication")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colAction")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colWhen")}</th>
              </tr>
            </thead>
            <tbody>
              {record.medicationAdministration.map((mar) => (
                <tr key={mar.id}>
                  <td style={tdStyle}>
                    {mar.medicationName}
                    {mar.dose ? ` ${mar.dose}` : ""}
                    {mar.route ? ` (${mar.route})` : ""}
                  </td>
                  <td style={tdStyle}>{mar.action}</td>
                  <td style={tdStyle}>{formatDt(mar.administeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#6366f1"
        title={t("encounterClinicalRecordSummary.clinicalTimelineTitle")}
        subline={t("encounterClinicalRecordSummary.clinicalTimelineSubline")}
        empty={
          record.clinicalTimeline.length === 0
            ? t("encounterClinicalRecordSummary.clinicalTimelineEmpty")
            : undefined
        }
      >
        {record.clinicalTimeline.length > 0 ? (
          <>
            {timelineVisible.map((entry) => (
              <div
                key={entry.id}
                style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}
              >
                <p style={{ ...lineStyle, fontWeight: 600, fontSize: 12 }}>
                  {formatDt(entry.timestampIso)} — {t(clinicalMilestoneI18nKey(entry.milestone))}
                </p>
                <p style={{ ...lineStyle, fontSize: 12, color: "#475569" }}>{entry.summary}</p>
              </div>
            ))}
            {hiddenTimelineCount > 0 && !timelineExpanded ? (
              <button
                type="button"
                onClick={() => setTimelineExpanded(true)}
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #c7d2fe",
                  background: "#eef2ff",
                  color: "#4338ca",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("encounterClinicalRecordSummary.clinicalTimelineShowAll").replace(
                  "{count}",
                  String(hiddenTimelineCount)
                )}
              </button>
            ) : null}
            {timelineExpanded && hiddenTimelineCount > 0 ? (
              <button
                type="button"
                onClick={() => setTimelineExpanded(false)}
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("encounterClinicalRecordSummary.clinicalTimelineShowLess")}
              </button>
            ) : null}
          </>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#64748b"
        title={t("encounterClinicalRecordSummary.diagnosesTitle")}
        empty={record.diagnoses.length === 0 ? t("encounterClinicalRecordSummary.diagnosesEmpty") : undefined}
      >
        {record.diagnoses.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {record.diagnoses.map((dx) => (
              <li key={dx.id} style={lineStyle}>
                {dx.displayLabel}
                {dx.code ? ` (${dx.code})` : ""}
                {dx.isPrimary ? ` · ${t("encounterClinicalRecordSummary.diagnosisPrimary")}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#334155"
        title={t("encounterClinicalRecordSummary.dispositionTitle")}
        empty={!record.disposition?.summaryLines.length ? t("encounterClinicalRecordSummary.dispositionEmpty") : undefined}
      >
        {record.disposition?.summaryLines.map((line, i) => (
          <p key={i} style={lineStyle}>
            {line}
          </p>
        ))}
      </SummarySectionCard>

      {record.signatures.length > 0 ? (
        <SummarySectionCard accent="#94a3b8" title={t("encounterClinicalRecordSummary.signaturesTitle")}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colDomain")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colSigner")}</th>
                <th style={thStyle}>{t("encounterClinicalRecordSummary.colWhen")}</th>
              </tr>
            </thead>
            <tbody>
              {record.signatures.map((sig, i) => (
                <tr key={`${sig.domain}-${i}`}>
                  <td style={tdStyle}>{sig.domain}</td>
                  <td style={tdStyle}>{sig.signerDisplayName}</td>
                  <td style={tdStyle}>{formatDt(sig.signedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SummarySectionCard>
      ) : null}

      {closureReadinessSlot ? <div style={{ width: "100%" }}>{closureReadinessSlot}</div> : null}

      <MedoraCard leftAccentColor="#475569" variant="default">
        <MedoraCardInner>
          <div style={{ width: "100%", minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setAuditOpen((v) => !v)}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <p style={{ ...sectionTitle, fontSize: 11 }}>{t("encounterClinicalRecordSummary.auditTitle")}</p>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {auditOpen
                  ? t("encounterClinicalRecordSummary.auditHide")
                  : t("encounterClinicalRecordSummary.auditShow")}
              </span>
            </button>
            <p style={{ ...lineStyle, margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>
              {t("encounterClinicalRecordSummary.auditSubline")}
            </p>
            {auditOpen && auditTimeline ? (
              <div style={{ marginTop: 12, minWidth: 0 }}>
                <SummaryAuditTimelineSlot>{auditTimeline}</SummaryAuditTimelineSlot>
              </div>
            ) : null}
          </div>
        </MedoraCardInner>
      </MedoraCard>
    </div>
  );
}
