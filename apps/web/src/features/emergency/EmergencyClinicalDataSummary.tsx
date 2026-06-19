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
  padding: "8px 10px",
  minWidth: 0,
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

function secondaryDetailLines(
  metric: { value: string; detailRows: Array<{ label: string; value: string }> },
  max = 4
): string[] {
  return metric.detailRows
    .filter((row) => row.value !== metric.value && !row.value.includes(metric.value))
    .slice(0, max)
    .map((row) => `${row.label}: ${row.value}`);
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
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
          {t("emergencyClinicalData.summary.insufficientData")}
        </p>
      </section>
    );
  }

  return (
    <section data-testid="emergency-clinical-data-summary" style={{ minWidth: 0 }}>
      <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
        {t("emergencyClinicalData.summary.clinicalSummary")}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 8,
        }}
      >
        {projection.sections.map((section) => (
          <article
            key={section.sectionId}
            data-testid={`clinical-data-summary-section-${section.sectionId.toLowerCase()}`}
            style={sectionShell}
          >
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t(sectionTitleKey(section.sectionId))}
            </p>
            {section.metrics.map((metric) => {
              const formTitle = locale === "fr" ? metric.formTitleFr : metric.formTitleEn;
              const details = secondaryDetailLines(metric);
              return (
                <div
                  key={`${metric.entryId}-${metric.metricId}`}
                  data-testid="clinical-data-summary-metric"
                  style={{
                    padding: "4px 0",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: 11,
                    lineHeight: 1.35,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{formTitle}</div>
                  <div style={{ color: "#0369a1", fontWeight: 600 }}>
                    {metric.label} {metric.value}
                  </div>
                  {details.map((line) => (
                    <div key={line} style={{ color: "#475569" }}>
                      {line}
                    </div>
                  ))}
                  <div style={{ color: "#64748b" }}>
                    {metric.authorRoleTitle} {metric.authorDisplayName} · {formatTime(metric.documentedAt)}
                  </div>
                </div>
              );
            })}
          </article>
        ))}

        {!projection.intakeOutput.insufficientData ? (
          <article
            data-testid="clinical-data-summary-section-intake_output"
            style={sectionShell}
          >
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
              {t("emergencyClinicalData.summary.sections.intakeOutput")}
            </p>
            {projection.intakeOutput.totalIntakeMl != null ? (
              <div style={{ fontSize: 11, padding: "2px 0" }}>
                {t("emergencyClinicalData.summary.intake24h")}:{" "}
                <strong>{projection.intakeOutput.totalIntakeMl} mL</strong>
              </div>
            ) : null}
            {projection.intakeOutput.totalOutputMl != null ? (
              <div style={{ fontSize: 11, padding: "2px 0" }}>
                {t("emergencyClinicalData.summary.output24h")}:{" "}
                <strong>{projection.intakeOutput.totalOutputMl} mL</strong>
              </div>
            ) : null}
            {projection.intakeOutput.netBalanceMl != null ? (
              <div style={{ fontSize: 11, padding: "2px 0" }}>
                {t("emergencyClinicalData.summary.netBalance")}:{" "}
                <strong>
                  {projection.intakeOutput.netBalanceMl >= 0 ? "+" : ""}
                  {projection.intakeOutput.netBalanceMl} mL
                </strong>
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
