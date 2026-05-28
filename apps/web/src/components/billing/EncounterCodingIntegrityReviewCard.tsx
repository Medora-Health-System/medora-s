"use client";

import type { EncounterCodingReviewPayload } from "@/lib/codingIntegrityReviewApi";
import {
  codingIntegrityDomainLabelKey,
  codingIntegrityReasonLabelKey,
  codingIntegrityStatusCardBackground,
  codingIntegrityStatusLabelKey,
  documentationCompletenessIndicatorKeys,
} from "@/lib/codingIntegrityReviewDisplay";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";

type Props = {
  data: EncounterCodingReviewPayload | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
};

export function EncounterCodingIntegrityReviewCard({ data, loading, error, compact }: Props) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ marginBottom: compact ? 8 : 16, fontSize: 13, color: "#64748b" }}>
        {t("codingIntegrityReview.loading")}
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

  const bg = codingIntegrityStatusCardBackground(data.codingIntegrityStatus);
  const completenessKeys = documentationCompletenessIndicatorKeys(data.documentationCompleteness);

  return (
    <div
      data-testid="coding-integrity-review-card"
      style={{
        marginBottom: compact ? 8 : 20,
        padding: compact ? 12 : 16,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: bg,
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: compact ? 14 : 16 }}>
        {t("codingIntegrityReview.cardTitle")}
      </h2>
      <p
        data-testid="coding-integrity-disclaimer"
        style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}
      >
        {t("codingIntegrityReview.previewOnlyDisclaimer")}
      </p>
      <p
        data-testid="coding-integrity-status"
        style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}
      >
        <strong>{t("codingIntegrityReview.statusLabel")}:</strong>{" "}
        {t(codingIntegrityStatusLabelKey(data.codingIntegrityStatus))}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <strong>{t("codingIntegrityReview.classificationLabel")}:</strong>{" "}
        {tBillingClassification(t, data.billingClassification)}
      </p>
      {data.domains.length > 0 ? (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
          <strong>{t("codingIntegrityReview.domainsLabel")}:</strong>{" "}
          {data.domains.map((d) => t(codingIntegrityDomainLabelKey(d))).join(" · ")}
        </p>
      ) : null}
      {data.requiresProviderClarification ? (
        <p
          data-testid="coding-integrity-provider-clarification"
          style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#92400e" }}
        >
          {t("codingIntegrityReview.providerClarificationFlag")}
        </p>
      ) : null}
      {data.requiresObservationReview ? (
        <p
          data-testid="coding-integrity-observation-review"
          style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#92400e" }}
        >
          {t("codingIntegrityReview.observationReviewFlag")}
        </p>
      ) : null}
      {completenessKeys.length > 0 ? (
        <div data-testid="coding-integrity-completeness" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
            {t("codingIntegrityReview.documentationCompleteness")}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#166534" }}>
            {completenessKeys.map((key) => (
              <li key={key}>{t(`codingIntegrityReview.completeness.${key}`)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.reasons.length > 0 ? (
        <div data-testid="coding-integrity-missing-items" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
            {t("codingIntegrityReview.missingItems")} ({data.missingItemsCount})
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
            {data.reasons.map((item) => (
              <li key={item}>{t(codingIntegrityReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.warnings.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("codingIntegrityReview.warnings")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
            {data.warnings.map((item) => (
              <li key={item}>{t(codingIntegrityReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
