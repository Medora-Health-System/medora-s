"use client";

import type { EncounterChargeReviewPayload } from "@/lib/chargeCaptureReviewApi";
import {
  chargeReviewNextActionLabelKey,
  chargeReviewReasonLabelKey,
  chargeReviewStatusCardBackground,
  chargeReviewStatusLabelKey,
  chargeReviewDomainLabelKey,
} from "@/lib/chargeCaptureReviewDisplay";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";

type Props = {
  data: EncounterChargeReviewPayload | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
};

export function EncounterChargeReviewCard({ data, loading, error, compact }: Props) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ marginBottom: compact ? 8 : 16, fontSize: 13, color: "#64748b" }}>
        {t("chargeCaptureReview.loading")}
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

  const bg = chargeReviewStatusCardBackground(data.chargeReviewStatus);

  return (
    <div
      data-testid="charge-review-card"
      style={{
        marginBottom: compact ? 8 : 20,
        padding: compact ? 12 : 16,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: bg,
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: compact ? 14 : 16 }}>{t("chargeCaptureReview.cardTitle")}</h2>
      <p
        data-testid="charge-review-disclaimer"
        style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}
      >
        {t("chargeCaptureReview.previewOnlyDisclaimer")}
      </p>
      <p
        data-testid="charge-review-status"
        style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}
      >
        <strong>{t("chargeCaptureReview.statusLabel")}:</strong>{" "}
        {t(chargeReviewStatusLabelKey(data.chargeReviewStatus))}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <strong>{t("chargeCaptureReview.classificationLabel")}:</strong>{" "}
        {tBillingClassification(t, data.billingClassification)}
      </p>
      {data.domains.length > 0 ? (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
          <strong>{t("chargeCaptureReview.domainsLabel")}:</strong>{" "}
          {data.domains.map((d) => t(chargeReviewDomainLabelKey(d))).join(" · ")}
        </p>
      ) : null}
      <p
        data-testid="charge-review-next-action"
        style={{ margin: "0 0 10px", fontSize: 12, color: "#475569" }}
      >
        {t(chargeReviewNextActionLabelKey(data.nextOperationalAction))}
      </p>
      {data.manualReviewRequired ? (
        <p
          data-testid="charge-review-manual-flag"
          style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#92400e" }}
        >
          {t("chargeCaptureReview.manualReviewFlag")}
        </p>
      ) : null}
      {data.reasons.length > 0 ? (
        <div data-testid="charge-review-missing-items" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
            {t("chargeCaptureReview.missingItems")} ({data.missingItemsCount})
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
            {data.reasons.map((item) => (
              <li key={item}>{t(chargeReviewReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.warnings.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("chargeCaptureReview.warnings")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
            {data.warnings.map((item) => (
              <li key={item}>{t(chargeReviewReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div style={{ fontSize: 11, color: "#64748b" }}>
        {t("chargeCaptureReview.eventCountsLabel")}: {data.eventCounts.professionalEventCount} /{" "}
        {data.eventCounts.facilityEventCount} / {data.eventCounts.unknownSideEventCount} /{" "}
        {data.eventCounts.procedureCodeCount}
      </div>
    </div>
  );
}
