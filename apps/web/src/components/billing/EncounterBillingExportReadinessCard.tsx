"use client";

import type { EncounterBillingExportReadinessPayload } from "@/lib/billingExportReadinessApi";
import {
  billingExportFormReadinessLabelKey,
  billingExportReadinessCardBackground,
  billingExportReadinessProviderSummaryKey,
  billingExportReasonLabelKey,
  billingExportRouteLabelKey,
} from "@/lib/billingExportReadinessDisplay";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";

type Props = {
  data: EncounterBillingExportReadinessPayload | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
};

export function EncounterBillingExportReadinessCard({ data, loading, error, compact }: Props) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ marginBottom: compact ? 8 : 16, fontSize: 13, color: "#64748b" }}>
        {t("billingExportReadiness.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          marginBottom: compact ? 8 : 16,
          padding: compact ? 10 : 14,
          borderRadius: 8,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#b91c1c",
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }

  if (!data) return null;

  const bg = billingExportReadinessCardBackground(data.requiresManualReview);

  return (
    <div
      data-testid="billing-export-readiness-card"
      style={{
        marginBottom: compact ? 8 : 20,
        padding: compact ? 12 : 16,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: bg,
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: compact ? 14 : 16 }}>{t("billingExportReadiness.cardTitle")}</h2>
      <p
        data-testid="billing-export-readiness-disclaimer"
        style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}
      >
        {t("billingExportReadiness.previewOnlyDisclaimer")}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <strong>{t("billingExportReadiness.classificationLabel")}:</strong>{" "}
        {tBillingClassification(t, data.billingClassification)}
      </p>
      <p
        data-testid="billing-export-readiness-route"
        style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}
      >
        <strong>{t("billingExportReadiness.routeLabel")}:</strong> {t(billingExportRouteLabelKey(data.route))}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <strong>{t("billingExportReadiness.formReadinessLabel")}:</strong>{" "}
        {t(billingExportFormReadinessLabelKey(data.formReadiness))}
      </p>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#475569" }}>
        {t(
          billingExportReadinessProviderSummaryKey({
            requiresManualReview: data.requiresManualReview,
            route: data.route,
          }),
        )}
      </p>
      {data.requiresManualReview ? (
        <p
          data-testid="billing-export-readiness-manual-review"
          style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#92400e" }}
        >
          {t("billingExportReadiness.manualReviewFlag")}
        </p>
      ) : null}
      {data.missingItems.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("billingExportReadiness.missingItems")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
            {data.missingItems.map((item) => (
              <li key={item}>{t(billingExportReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.warnings.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("billingExportReadiness.warnings")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
            {data.warnings.map((item) => (
              <li key={item}>{t(billingExportReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div style={{ fontSize: 11, color: "#64748b" }}>
        {t("billingExportReadiness.facilityIdentityStatus")}:{" "}
        {data.facilityBillingIdentityComplete
          ? t("billingExportReadiness.facilityIdentityComplete")
          : t("billingExportReadiness.facilityIdentityIncomplete")}
      </div>
    </div>
  );
}
