"use client";

/**
 * Enterprise ER clinical chart — read-only layout from EncounterClinicalRecord (Phase 4).
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { EncounterClinicalRecord } from "@medora/shared";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { getPriorityBadgeSoft } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterChromeDateTime,
  tPatientSex,
} from "@/lib/encounterChromeI18n";
import {
  CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE,
  clinicalMilestoneI18nKey,
  encounterClinicalRecordHasPrimaryContent,
  providerStatusI18nKey,
} from "./encounterClinicalRecordSummaryViewModel";
import {
  buildEnterpriseClinicalChartLayout,
  extractProviderAssessmentSectionsExcludingHpi,
  isCriticalAllergyText,
  isCriticalMedicationOrder,
  SEVERITY_HIGHLIGHT,
  type EnterpriseOrderGroupKey,
  type EnterpriseTriageFieldKey,
} from "./enterpriseClinicalChartLayout";
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

const tableWrapStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  borderCollapse: "collapse",
  fontSize: 13,
  color: "#334155",
  tableLayout: "fixed",
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

const overviewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "8px 16px",
  width: "100%",
  minWidth: 0,
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

const ORDER_GROUP_I18N: Record<EnterpriseOrderGroupKey, string> = {
  laboratory: "encounterClinicalRecordSummary.orderGroupLaboratory",
  imaging: "encounterClinicalRecordSummary.orderGroupImaging",
  medications: "encounterClinicalRecordSummary.orderGroupMedications",
  treatments: "encounterClinicalRecordSummary.orderGroupTreatments",
  procedures: "encounterClinicalRecordSummary.orderGroupProcedures",
};

const TRIAGE_FIELD_I18N: Record<EnterpriseTriageFieldKey, string> = {
  esi: "encounterClinicalRecordSummary.triageEsi",
  arrivalMode: "encounterClinicalRecordSummary.triageArrivalMode",
  vitalSigns: "encounterClinicalRecordSummary.triageVitalSigns",
  pain: "encounterClinicalRecordSummary.triagePain",
  allergies: "encounterClinicalRecordSummary.triageAllergies",
  isolation: "encounterClinicalRecordSummary.triageIsolation",
  fallRisk: "encounterClinicalRecordSummary.triageFallRisk",
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

function CollapsibleBlock({
  showLabel,
  hideLabel,
  count,
  children,
}: {
  showLabel: string;
  hideLabel: string;
  count: number;
  children: React.ReactNode;
}) {
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
        {open ? hideLabel : showLabel.replace("{count}", String(count))}
      </button>
      {open ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      ) : null}
    </div>
  );
}

function OverviewField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ ...sectionTitle, marginBottom: 2 }}>{label}</p>
      <p
        style={{
          ...lineStyle,
          fontWeight: highlight ? 600 : 400,
          color: highlight ? SEVERITY_HIGHLIGHT.critical.text : "#334155",
          background: highlight ? SEVERITY_HIGHLIGHT.critical.bg : undefined,
          borderRadius: highlight ? 6 : undefined,
          padding: highlight ? "4px 6px" : 0,
        }}
      >
        {value}
      </p>
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

  const layout = useMemo(
    () => (record ? buildEnterpriseClinicalChartLayout(record) : null),
    [record]
  );

  if (!record || !layout) {
    return (
      <MedoraCard leftAccentColor="#94a3b8" variant="default">
        <MedoraCardInner>
          <p style={lineStyle}>{t("encounterClinicalRecordSummary.loading")}</p>
        </MedoraCardInner>
      </MedoraCard>
    );
  }

  const hasContent = encounterClinicalRecordHasPrimaryContent(record);
  const providerSections = extractProviderAssessmentSectionsExcludingHpi(layout.providerAssessment);
  const timelineVisible = timelineExpanded
    ? layout.clinicalTimeline
    : layout.clinicalTimeline.slice(0, CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE);
  const hiddenTimelineCount = Math.max(
    0,
    layout.clinicalTimeline.length - CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE
  );

  const formatDt = (iso: string | null) =>
    iso ? formatEncounterChromeDateTime(iso, language) : t("common.dash");

  const sexLabel = layout.overview.patientSexLabel
    ? tPatientSex(layout.overview.patientSexLabel, null, t)
    : t("common.dash");

  const triageHasContent = Object.keys(layout.triageSummary).length > 0;
  const ordersCount = Object.values(layout.groupedOrders).reduce((n, g) => n + g.length, 0);
  const hasDiagnoses =
    layout.groupedDiagnoses.primary.length > 0 ||
    layout.groupedDiagnoses.secondary.length > 0 ||
    layout.groupedDiagnoses.chronic.length > 0;

  const overviewHasContent = Boolean(
    layout.overview.patientDisplayName ||
      layout.overview.patientMrn ||
      layout.overview.arrivedAt ||
      layout.overview.attendingProviderDisplayName
  );

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
        title={t("encounterClinicalRecordSummary.overviewTitle")}
        empty={!overviewHasContent ? t("encounterClinicalRecordSummary.overviewEmpty") : undefined}
      >
        <div style={overviewGridStyle}>
          {layout.overview.patientDisplayName ? (
            <OverviewField label={t("encounterClinicalRecordSummary.patientLabel")} value={layout.overview.patientDisplayName} />
          ) : null}
          {layout.overview.patientMrn ? (
            <OverviewField label={t("encounterClinicalRecordSummary.mrnLabel")} value={layout.overview.patientMrn} />
          ) : null}
          {layout.overview.patientAgeLabel ? (
            <OverviewField
              label={t("encounterClinicalRecordSummary.ageLabel")}
              value={`${layout.overview.patientAgeLabel} ${t("encounterChrome.ageYearsSuffix")}`}
            />
          ) : null}
          {layout.overview.patientSexLabel ? (
            <OverviewField label={t("encounterClinicalRecordSummary.sexLabel")} value={sexLabel} />
          ) : null}
          {layout.overview.arrivedAt ? (
            <OverviewField label={t("encounterClinicalRecordSummary.arrivalLabel")} value={formatDt(layout.overview.arrivedAt)} />
          ) : null}
          {layout.overview.lengthOfStayLabel ? (
            <OverviewField label={t("encounterClinicalRecordSummary.losLabel")} value={layout.overview.lengthOfStayLabel} />
          ) : null}
          {layout.overview.dispositionStatusLabel ? (
            <OverviewField
              label={t("encounterClinicalRecordSummary.dispositionStatusLabel")}
              value={layout.overview.dispositionStatusLabel}
            />
          ) : null}
          {layout.overview.attendingProviderDisplayName ? (
            <OverviewField
              label={t("encounterClinicalRecordSummary.attendingLabel")}
              value={layout.overview.attendingProviderDisplayName}
            />
          ) : null}
          {layout.overview.primaryNurseDisplayName ? (
            <OverviewField
              label={t("encounterClinicalRecordSummary.primaryNurseLabel")}
              value={layout.overview.primaryNurseDisplayName}
            />
          ) : null}
        </div>
      </SummarySectionCard>

      <SummarySectionCard
        accent="#2563eb"
        title={t("encounterClinicalRecordSummary.chiefComplaintTitle")}
        empty={layout.chiefComplaintLines.length === 0 ? t("encounterClinicalRecordSummary.emptyState") : undefined}
      >
        {layout.chiefComplaintLines.map((line, i) => (
          <p key={i} style={lineStyle}>
            {line}
          </p>
        ))}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#1d4ed8"
        title={t("encounterClinicalRecordSummary.hpiTitle")}
        empty={layout.hpiLines.length === 0 ? t("encounterClinicalRecordSummary.hpiEmpty") : undefined}
      >
        {layout.hpiLines.map((line, i) => (
          <p key={i} style={lineStyle}>
            {line}
          </p>
        ))}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#b91c1c"
        title={t("encounterClinicalRecordSummary.triageSummaryTitle")}
        empty={!triageHasContent ? t("encounterClinicalRecordSummary.triageSummaryEmpty") : undefined}
      >
        {triageHasContent ? (
          <div style={overviewGridStyle}>
            {(Object.keys(TRIAGE_FIELD_I18N) as EnterpriseTriageFieldKey[]).map((key) => {
              const value = layout.triageSummary[key];
              if (!value) return null;
              const critical = key === "allergies" && isCriticalAllergyText(value);
              return (
                <OverviewField
                  key={key}
                  label={t(TRIAGE_FIELD_I18N[key])}
                  value={value}
                  highlight={critical}
                />
              );
            })}
          </div>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#4f46e5"
        title={t("encounterClinicalRecordSummary.providerAssessmentTitle")}
        empty={!layout.providerAssessment ? t("encounterClinicalRecordSummary.providerEmpty") : undefined}
      >
        {layout.providerAssessment ? (
          <>
            <p style={{ ...lineStyle, fontWeight: 600, color: "#3730a3" }}>
              {t(providerStatusI18nKey(layout.providerAssessment.status))}
            </p>
            {layout.providerAssessment.signedAt ? (
              <p style={{ ...lineStyle, fontSize: 12, color: "#64748b" }}>
                {t("encounterClinicalRecordSummary.signedAt")}: {formatDt(layout.providerAssessment.signedAt)}
                {layout.providerAssessment.signedByDisplayName
                  ? ` — ${layout.providerAssessment.signedByDisplayName}`
                  : ""}
              </p>
            ) : null}
            {providerSections.map((sec) => (
              <div key={sec.label} style={{ marginTop: 8 }}>
                <p style={{ ...lineStyle, fontWeight: 600 }}>{sec.label}</p>
                <p style={lineStyle}>{sec.text}</p>
              </div>
            ))}
            <CollapsibleBlock
              showLabel={t("encounterClinicalRecordSummary.versionHistoryShow")}
              hideLabel={t("encounterClinicalRecordSummary.versionHistoryHide")}
              count={layout.providerAssessmentHistory.length}
            >
              {layout.providerAssessmentHistory.map((entry) => (
                <div
                  key={entry.id}
                  style={{ borderRadius: 10, border: "1px solid #e2e8f0", padding: "8px 10px", background: "#fff" }}
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
            </CollapsibleBlock>
          </>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#0ea5e9"
        title={t("encounterClinicalRecordSummary.nursingTitle")}
        empty={!layout.nursingAssessment ? t("encounterClinicalRecordSummary.nursingEmpty") : undefined}
      >
        {layout.nursingAssessment ? (
          <>
            <p style={{ ...lineStyle, fontSize: 12, color: "#64748b" }}>
              {formatDt(layout.nursingAssessment.documentedAt ?? layout.nursingAssessment.savedAt)}
              {layout.nursingAssessment.performerDisplayName
                ? ` — ${layout.nursingAssessment.performerDisplayName}`
                : ""}
            </p>
            {layout.nursingAssessment.structuredLines.map((line, i) => (
              <p key={i} style={lineStyle}>
                {line}
              </p>
            ))}
            <CollapsibleBlock
              showLabel={t("encounterClinicalRecordSummary.nursingReassessmentsShow")}
              hideLabel={t("encounterClinicalRecordSummary.nursingReassessmentsHide")}
              count={layout.nursingAssessmentHistory.length}
            >
              {layout.nursingAssessmentHistory.map((entry) => (
                <div
                  key={entry.id}
                  style={{ borderRadius: 10, border: "1px solid #e2e8f0", padding: "8px 10px", background: "#fff" }}
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
            </CollapsibleBlock>
          </>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#7c3aed"
        title={t("encounterClinicalRecordSummary.activeOrdersTitle")}
        empty={ordersCount === 0 ? t("encounterClinicalRecordSummary.ordersEmpty") : undefined}
      >
        {ordersCount > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(Object.keys(ORDER_GROUP_I18N) as EnterpriseOrderGroupKey[]).map((groupKey) => {
              const orders = layout.groupedOrders[groupKey];
              if (orders.length === 0) return null;
              return (
                <div key={groupKey}>
                  <p style={{ ...sectionTitle, marginBottom: 6 }}>{t(ORDER_GROUP_I18N[groupKey])}</p>
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>{t("encounterClinicalRecordSummary.colOrder")}</th>
                          <th style={thStyle}>{t("encounterClinicalRecordSummary.colStatus")}</th>
                          <th style={thStyle}>{t("encounterClinicalRecordSummary.colWhen")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const critical = isCriticalMedicationOrder(order);
                          const badgeSoft = getPriorityBadgeSoft(order.priority ?? "ROUTINE");
                          return (
                            <tr key={order.orderItemId}>
                              <td style={tdStyle}>
                                {order.label}
                                {critical ? (
                                  <span style={{ marginLeft: 6 }}>
                                    <MedoraCardBadge soft={SEVERITY_HIGHLIGHT.critical} compact>
                                      {t("encounterClinicalRecordSummary.criticalBadge")}
                                    </MedoraCardBadge>
                                  </span>
                                ) : null}
                              </td>
                              <td style={tdStyle}>
                                <MedoraCardBadge soft={badgeSoft} compact>
                                  {order.status}
                                </MedoraCardBadge>
                              </td>
                              <td style={tdStyle}>{formatDt(order.orderedAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#059669"
        title={t("encounterClinicalRecordSummary.resultsTitle")}
        subline={t("encounterClinicalRecordSummary.resultsSubline")}
        empty={
          layout.laboratoryResults.length === 0 && layout.imagingResults.length === 0
            ? t("encounterClinicalRecordSummary.resultsEmpty")
            : undefined
        }
      >
        {layout.laboratoryResults.length > 0 || layout.imagingResults.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {layout.laboratoryResults.length > 0 ? (
              <div>
                <p style={{ ...sectionTitle, marginBottom: 6 }}>
                  {t("encounterClinicalRecordSummary.resultsLaboratoryTitle")}
                </p>
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t("encounterClinicalRecordSummary.colStudy")}</th>
                        <th style={thStyle}>{t("encounterClinicalRecordSummary.colResult")}</th>
                        <th style={thStyle}>{t("encounterClinicalRecordSummary.colVerified")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {layout.laboratoryResults.map((lab) => (
                        <tr
                          key={lab.orderItemId}
                          style={{
                            background: lab.criticalValue ? SEVERITY_HIGHLIGHT.critical.bg : undefined,
                          }}
                        >
                          <td style={tdStyle}>
                            {lab.label}
                            {lab.criticalValue ? (
                              <span style={{ marginLeft: 6 }}>
                                <MedoraCardBadge soft={SEVERITY_HIGHLIGHT.critical} compact>
                                  {t("encounterClinicalRecordSummary.criticalBadge")}
                                </MedoraCardBadge>
                              </span>
                            ) : null}
                          </td>
                          <td style={tdStyle}>{lab.resultText}</td>
                          <td style={tdStyle}>{formatDt(lab.verifiedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {layout.imagingResults.length > 0 ? (
              <div>
                <p style={{ ...sectionTitle, marginBottom: 6 }}>
                  {t("encounterClinicalRecordSummary.resultsImagingTitle")}
                </p>
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t("encounterClinicalRecordSummary.colStudy")}</th>
                        <th style={thStyle}>{t("encounterClinicalRecordSummary.colResult")}</th>
                        <th style={thStyle}>{t("encounterClinicalRecordSummary.colVerified")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {layout.imagingResults.map((img) => (
                        <tr
                          key={img.orderItemId}
                          style={{
                            background: img.criticalValue ? SEVERITY_HIGHLIGHT.critical.bg : undefined,
                          }}
                        >
                          <td style={tdStyle}>
                            {img.label}
                            {img.criticalValue ? (
                              <span style={{ marginLeft: 6 }}>
                                <MedoraCardBadge soft={SEVERITY_HIGHLIGHT.critical} compact>
                                  {t("encounterClinicalRecordSummary.criticalBadge")}
                                </MedoraCardBadge>
                              </span>
                            ) : null}
                          </td>
                          <td style={tdStyle}>{img.resultText}</td>
                          <td style={tdStyle}>{formatDt(img.verifiedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#db2777"
        title={t("encounterClinicalRecordSummary.marTitle")}
        empty={
          layout.medicationAdministration.length === 0
            ? t("encounterClinicalRecordSummary.marEmpty")
            : undefined
        }
      >
        {layout.medicationAdministration.length > 0 ? (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("encounterClinicalRecordSummary.colMedication")}</th>
                  <th style={thStyle}>{t("encounterClinicalRecordSummary.colAction")}</th>
                  <th style={thStyle}>{t("encounterClinicalRecordSummary.colWhen")}</th>
                </tr>
              </thead>
              <tbody>
                {layout.medicationAdministration.map((mar) => (
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
          </div>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#0d9488"
        title={t("encounterClinicalRecordSummary.completedProceduresTitle")}
        empty={
          layout.completedProcedures.length === 0
            ? t("encounterClinicalRecordSummary.proceduresEmpty")
            : undefined
        }
      >
        {layout.completedProcedures.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {layout.completedProcedures.map((proc) => (
              <li key={proc.id} style={lineStyle}>
                {formatDt(proc.documentedAt)} — {proc.clinicalSummary}
              </li>
            ))}
          </ul>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#64748b"
        title={t("encounterClinicalRecordSummary.diagnosesTitle")}
        empty={!hasDiagnoses ? t("encounterClinicalRecordSummary.diagnosesEmpty") : undefined}
      >
        {hasDiagnoses ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {layout.groupedDiagnoses.primary.length > 0 ? (
              <div>
                <p style={{ ...sectionTitle, marginBottom: 4 }}>
                  {t("encounterClinicalRecordSummary.diagnosesPrimaryTitle")}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {layout.groupedDiagnoses.primary.map((dx) => (
                    <li key={dx.id} style={lineStyle}>
                      {dx.displayLabel}
                      {dx.code ? ` (${dx.code})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {layout.groupedDiagnoses.secondary.length > 0 ? (
              <div>
                <p style={{ ...sectionTitle, marginBottom: 4 }}>
                  {t("encounterClinicalRecordSummary.diagnosesSecondaryTitle")}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {layout.groupedDiagnoses.secondary.map((dx) => (
                    <li key={dx.id} style={lineStyle}>
                      {dx.displayLabel}
                      {dx.code ? ` (${dx.code})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {layout.groupedDiagnoses.chronic.length > 0 ? (
              <div>
                <p style={{ ...sectionTitle, marginBottom: 4 }}>
                  {t("encounterClinicalRecordSummary.diagnosesChronicTitle")}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {layout.groupedDiagnoses.chronic.map((dx) => (
                    <li key={dx.id} style={lineStyle}>
                      {dx.displayLabel}
                      {dx.code ? ` (${dx.code})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        accent="#6366f1"
        title={t("encounterClinicalRecordSummary.clinicalTimelineTitle")}
        subline={t("encounterClinicalRecordSummary.clinicalTimelineSubline")}
        empty={
          layout.clinicalTimeline.length === 0
            ? t("encounterClinicalRecordSummary.clinicalTimelineEmpty")
            : undefined
        }
      >
        {layout.clinicalTimeline.length > 0 ? (
          <>
            {timelineVisible.map((entry) => (
              <div key={entry.id} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
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
        accent="#334155"
        title={t("encounterClinicalRecordSummary.dispositionTitle")}
        empty={!layout.disposition?.summaryLines.length ? t("encounterClinicalRecordSummary.dispositionEmpty") : undefined}
      >
        {layout.disposition?.summaryLines.map((line, i) => (
          <p key={i} style={lineStyle}>
            {line}
          </p>
        ))}
      </SummarySectionCard>

      {layout.signatures.length > 0 ? (
        <SummarySectionCard accent="#94a3b8" title={t("encounterClinicalRecordSummary.electronicSignaturesTitle")}>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("encounterClinicalRecordSummary.colDomain")}</th>
                  <th style={thStyle}>{t("encounterClinicalRecordSummary.colSigner")}</th>
                  <th style={thStyle}>{t("encounterClinicalRecordSummary.colWhen")}</th>
                </tr>
              </thead>
              <tbody>
                {layout.signatures.map((sig, i) => (
                  <tr key={`${sig.domain}-${i}`}>
                    <td style={tdStyle}>{sig.domain}</td>
                    <td style={tdStyle}>{sig.signerDisplayName}</td>
                    <td style={tdStyle}>{formatDt(sig.signedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
