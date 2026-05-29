"use client";

import React from "react";
import type { EnterpriseProcedureBillableReviewEventSummary } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { procedureBillableReviewWarningLabelKey } from "@/lib/procedureBillableReviewUi";

const rowStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  marginBottom: 8,
};

export function ProcedureBillableEventsCard({
  events,
  compact,
}: {
  events: EnterpriseProcedureBillableReviewEventSummary[];
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (!events.length) return null;

  return (
    <div
      data-testid="procedure-billable-events-card"
      style={{ marginTop: compact ? 8 : 12 }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: compact ? 13 : 14 }}>
        {t("chargeCaptureReview.procedureBillableEventsTitle")}
      </h3>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
        {t("chargeCaptureReview.procedureBillableEventsDisclaimer")}
      </p>
      <div data-testid="procedure-billable-events-list">
        {events.map((event) => (
          <div key={event.billingEventId} data-testid="procedure-billable-event-row" style={rowStyle}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{event.displayNameFr}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {t("chargeCaptureReview.procedureBillableReadiness")}:{" "}
              {t(`chargeCaptureReview.procedureReadiness.${event.readinessStatus}`)}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {t("chargeCaptureReview.procedureBillableMapping")}:{" "}
              {t(`chargeCaptureReview.procedureMapping.${event.mappingStatus}`)}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {t("chargeCaptureReview.procedureBillableDocumentation")}:{" "}
              {event.documentationLinked
                ? t("chargeCaptureReview.procedureDocumentationLinked")
                : t("chargeCaptureReview.procedureDocumentationMissing")}
            </div>
            {event.reviewWarnings.length > 0 ? (
              <ul
                data-testid="procedure-billable-event-warnings"
                style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#92400e" }}
              >
                {event.reviewWarnings.map((warning) => {
                  const key = procedureBillableReviewWarningLabelKey(warning);
                  return <li key={warning}>{key ? t(key) : warning}</li>;
                })}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
