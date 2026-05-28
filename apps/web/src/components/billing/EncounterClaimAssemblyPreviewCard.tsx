"use client";

import type { EncounterClaimAssemblyPreviewPayload } from "@/lib/claimAssemblyPreviewApi";
import {
  claimAssemblyNextActionLabelKey,
  claimAssemblyPackageTypeLabelKey,
  claimAssemblyReasonLabelKey,
  claimAssemblyStatusCardBackground,
  claimAssemblyStatusLabelKey,
} from "@/lib/claimAssemblyPreviewDisplay";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";

type Props = {
  data: EncounterClaimAssemblyPreviewPayload | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
};

function PackageReadinessLine({
  label,
  ready,
  testId,
}: {
  label: string;
  ready: boolean;
  testId: string;
}) {
  const { t } = useI18n();
  return (
    <p data-testid={testId} style={{ margin: "0 0 6px", fontSize: 13, color: "#334155" }}>
      <strong>{label}:</strong>{" "}
      {ready ? t("claimAssemblyPreview.packageReady") : t("claimAssemblyPreview.packageNotReady")}
    </p>
  );
}

export function EncounterClaimAssemblyPreviewCard({ data, loading, error, compact }: Props) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ marginBottom: compact ? 8 : 16, fontSize: 13, color: "#64748b" }}>
        {t("claimAssemblyPreview.loading")}
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

  const bg = claimAssemblyStatusCardBackground(data.status);

  return (
    <div
      data-testid="claim-assembly-preview-card"
      style={{
        marginBottom: compact ? 8 : 20,
        padding: compact ? 12 : 16,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: bg,
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: compact ? 14 : 16 }}>
        {t("claimAssemblyPreview.cardTitle")}
      </h2>
      <p
        data-testid="claim-assembly-disclaimer"
        style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}
      >
        {t("claimAssemblyPreview.previewOnlyDisclaimer")}
      </p>
      <p
        data-testid="claim-assembly-status"
        style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}
      >
        <strong>{t("claimAssemblyPreview.statusLabel")}:</strong>{" "}
        {t(claimAssemblyStatusLabelKey(data.status))}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <strong>{t("claimAssemblyPreview.packageTypeLabel")}:</strong>{" "}
        {t(claimAssemblyPackageTypeLabelKey(data.packageType))}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}>
        <strong>{t("claimAssemblyPreview.classificationLabel")}:</strong>{" "}
        {tBillingClassification(t, data.billingClassification)}
      </p>
      {data.professionalPackage.applies ? (
        <PackageReadinessLine
          label={t("claimAssemblyPreview.professionalPanelTitle")}
          ready={data.professionalReady}
          testId="claim-assembly-professional-ready"
        />
      ) : null}
      {data.facilityPackage.applies ? (
        <PackageReadinessLine
          label={t("claimAssemblyPreview.facilityPanelTitle")}
          ready={data.facilityReady}
          testId="claim-assembly-facility-ready"
        />
      ) : null}
      {data.requiresManualReview ? (
        <p
          data-testid="claim-assembly-manual-review"
          style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#92400e" }}
        >
          {t("claimAssemblyPreview.manualReviewFlag")}
        </p>
      ) : null}
      <p
        data-testid="claim-assembly-next-action"
        style={{ margin: "0 0 8px", fontSize: 13, color: "#334155" }}
      >
        <strong>{t("claimAssemblyPreview.nextActionLabel")}:</strong>{" "}
        {t(claimAssemblyNextActionLabelKey(data.nextOperationalAction))}
      </p>
      {data.reasons.length > 0 ? (
        <div data-testid="claim-assembly-missing-items" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
            {t("claimAssemblyPreview.missingItems")} ({data.missingItemsCount})
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
            {data.reasons.map((item) => (
              <li key={item}>{t(claimAssemblyReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.warnings.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("claimAssemblyPreview.warnings")}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
            {data.warnings.map((item) => (
              <li key={item}>{t(claimAssemblyReasonLabelKey(item))}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
