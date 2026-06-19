"use client";

import React, { useMemo } from "react";
import {
  buildClinicalDataSummaryProjection,
  type ClinicalDataSummarySectionId,
} from "@medora/shared";
import type { ClinicalDocumentationEntryRow } from "@/lib/clinicalDocumentationApi";
import { useI18n } from "@/lib/i18n";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";

const sectionShell: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#fff",
  padding: "10px 12px",
  minWidth: 0,
};

const metricRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(72px, 0.35fr) minmax(48px, 0.2fr) minmax(0, 1fr)",
  gap: 8,
  alignItems: "baseline",
  fontSize: 12,
  lineHeight: 1.35,
  padding: "4px 0",
  borderBottom: "1px solid #f1f5f9",
};

function sectionTitleKey(sectionId: ClinicalDataSummarySectionId): string {
  switch (sectionId) {
    case "NEUROLOGY":
      return "emergencyClinicalData.summary.sections.neurology";
    case "WITHDRAWAL_PSYCH":
      return "emergencyClinicalData.summary.sections.withdrawalPsych";
    case "RESPIRATORY":
      return "emergencyClinicalData.summary.sections.respiratory";
    case "CARDIAC":
      return "emergencyClinicalData.summary.sections.cardiac";
    case "BEHAVIORAL_HEALTH":
      return "emergencyClinicalData.summary.sections.behavioralHealth";
    default:
      return "emergencyClinicalData.summary.sections.neurology";
  }
}

export function EmergencyClinicalDataSummary({
  entries,
  facilityTimeZone,
}: {
  entries: ClinicalDocumentationEntryRow[];
  facilityTimeZone?: string | null;
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en" : "fr";

  const projection = useMemo(
    () => buildClinicalDataSummaryProjection({ entries, locale }),
    [entries, locale]
  );

  const formatTime = (iso: string) => {
    const formatted = formatClinicalInstantForFacility(iso, facilityTimeZone, language);
    const parts = formatted.split(", ");
    return parts.length > 1 ? parts[parts.length - 1]! : formatted;
  };

  const hasSummaryContent =
    projection.sections.length > 0 || !projection.intakeOutput.insufficientData;

  if (!hasSummaryContent) {
    return (
      <section data-testid="emergency-clinical-data-summary" style={sectionShell}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
          {t("emergencyClinicalData.summary.clinicalSummary")}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {t("emergencyClinicalData.summary.insufficientData")}
        </p>
      </section>
    );
  }

  return (
    <section data-testid="emergency-clinical-data-summary">
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
        {t("emergencyClinicalData.summary.clinicalSummary")}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {projection.sections.map((section) => (
          <article
            key={section.sectionId}
            data-testid={`clinical-data-summary-section-${section.sectionId.toLowerCase()}`}
            style={sectionShell}
          >
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
              {t(sectionTitleKey(section.sectionId))}
            </p>
            {section.metrics.map((metric) => (
              <div key={`${metric.entryId}-${metric.metricId}`} style={metricRow}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{metric.label}</span>
                <span style={{ fontWeight: 600, color: "#0369a1" }}>{metric.value}</span>
                <span style={{ color: "#64748b", textAlign: "right" }}>
                  {metric.authorRoleTitle} {metric.authorDisplayName}
                  {" · "}
                  {formatTime(metric.documentedAt)}
                </span>
              </div>
            ))}
          </article>
        ))}

        {!projection.intakeOutput.insufficientData ? (
          <article
            data-testid="clinical-data-summary-section-intake_output"
            style={sectionShell}
          >
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
              {t("emergencyClinicalData.summary.sections.intakeOutput")}
            </p>
            {projection.intakeOutput.totalIntakeMl != null ? (
              <div style={metricRow}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {t("emergencyClinicalData.summary.intake24h")}
                </span>
                <span style={{ fontWeight: 600, color: "#0369a1" }}>
                  {projection.intakeOutput.totalIntakeMl} mL
                </span>
                <span />
              </div>
            ) : null}
            {projection.intakeOutput.totalOutputMl != null ? (
              <div style={metricRow}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {t("emergencyClinicalData.summary.output24h")}
                </span>
                <span style={{ fontWeight: 600, color: "#0369a1" }}>
                  {projection.intakeOutput.totalOutputMl} mL
                </span>
                <span />
              </div>
            ) : null}
            {projection.intakeOutput.netBalanceMl != null ? (
              <div style={{ ...metricRow, borderBottom: "none" }}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {t("emergencyClinicalData.summary.netBalance")}
                </span>
                <span style={{ fontWeight: 600, color: "#0369a1" }}>
                  {projection.intakeOutput.netBalanceMl >= 0 ? "+" : ""}
                  {projection.intakeOutput.netBalanceMl} mL
                </span>
                <span />
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
