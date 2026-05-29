"use client";

import React from "react";
import type { ResolveProcedureBillingReadinessOutput } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { procedureBillingReadinessIndicatorKey } from "@/lib/procedureBillingReadinessUi";

const indicatorStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 4,
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 10,
  fontWeight: 600,
  lineHeight: 1.4,
};

const indicatorStyles: Record<
  "review" | "ready" | "documentation" | "chargeMaster",
  React.CSSProperties
> = {
  review: {
    ...indicatorStyle,
    color: "#92400e",
    background: "#fef3c7",
    border: "1px solid #fcd34d",
  },
  ready: {
    ...indicatorStyle,
    color: "#166534",
    background: "#dcfce7",
    border: "1px solid #86efac",
  },
  documentation: {
    ...indicatorStyle,
    color: "#9a3412",
    background: "#ffedd5",
    border: "1px solid #fdba74",
  },
  chargeMaster: {
    ...indicatorStyle,
    color: "#1e40af",
    background: "#dbeafe",
    border: "1px solid #93c5fd",
  },
};

function indicatorStyleForReadiness(
  readiness: ResolveProcedureBillingReadinessOutput
): React.CSSProperties {
  if (readiness.requiresDocumentationReview) return indicatorStyles.documentation;
  if (readiness.requiresFacilityChargeMaster) return indicatorStyles.chargeMaster;
  if (readiness.readinessStatus === "READY") return indicatorStyles.ready;
  return indicatorStyles.review;
}

export function ProcedureBillingReadinessIndicator({
  readiness,
}: {
  readiness: ResolveProcedureBillingReadinessOutput;
}) {
  const { t } = useI18n();
  const labelKey = procedureBillingReadinessIndicatorKey(readiness);
  if (!labelKey) return null;

  return (
    <div style={{ marginTop: 4 }} data-testid="procedure-billing-readiness-indicator">
      <span style={indicatorStyleForReadiness(readiness)}>{t(labelKey)}</span>
    </div>
  );
}
