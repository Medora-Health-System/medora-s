"use client";

import type { EncounterBillingLedgerReadinessPayload } from "@/lib/billingLedgerReadinessApi";
import {
  billingLedgerReasonLabelKey,
  billingLedgerSideAppliesLabelKey,
  billingLedgerSideBackground,
  billingLedgerStatusLabelKey,
} from "@/lib/billingLedgerReadinessDisplay";
import { useI18n } from "@/lib/i18n";

type SideProps = {
  titleKey: string;
  side: EncounterBillingLedgerReadinessPayload["professional"];
  lineCount?: number;
  packagePreview?: boolean;
};

function LedgerSidePanel({ titleKey, side, lineCount, packagePreview }: SideProps) {
  const { t } = useI18n();
  const bg = billingLedgerSideBackground(side.status);

  return (
    <div
      data-testid={`billing-ledger-side-${titleKey}`}
      style={{
        flex: "1 1 240px",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: bg,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{t(titleKey)}</div>
      <div style={{ fontSize: 13, marginTop: 6, color: "#334155" }}>
        {t("billingLedgerReadiness.appliesLabel")}: {t(billingLedgerSideAppliesLabelKey(side.applies))}
      </div>
      <div style={{ fontSize: 13, marginTop: 4, color: "#334155" }}>
        {t("billingLedgerReadiness.statusLabel")}: {t(billingLedgerStatusLabelKey(side.status))}
      </div>
      {typeof lineCount === "number" ? (
        <div style={{ fontSize: 12, marginTop: 8, color: "#64748b" }}>
          {t("billingLedgerReadiness.ledgerLineCount")}: {lineCount}
        </div>
      ) : null}
      {packagePreview !== undefined ? (
        <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>
          {t("billingLedgerReadiness.packagePreview")}:{" "}
          {packagePreview ? t("billingLedgerReadiness.packagePreviewYes") : t("billingLedgerReadiness.packagePreviewNo")}
        </div>
      ) : null}
      {side.reasons.length > 0 ? (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
          {side.reasons.map((item) => (
            <li key={item}>{t(billingLedgerReasonLabelKey(item))}</li>
          ))}
        </ul>
      ) : null}
      {side.warnings.length > 0 ? (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#475569" }}>
          {side.warnings.map((item) => (
            <li key={item}>{t(billingLedgerReasonLabelKey(item))}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type Props = {
  data: EncounterBillingLedgerReadinessPayload | null;
  loading?: boolean;
  error?: string | null;
};

export function EncounterBillingLedgerReadinessCard({ data, loading, error }: Props) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ marginBottom: 16, fontSize: 13, color: "#64748b" }}>{t("billingLedgerReadiness.loading")}</div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          marginBottom: 16,
          padding: 14,
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

  return (
    <div
      data-testid="billing-ledger-readiness-card"
      style={{
        marginBottom: 20,
        padding: 16,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#fff",
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{t("billingLedgerReadiness.cardTitle")}</h2>
      <p
        data-testid="billing-ledger-readiness-disclaimer"
        style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}
      >
        {t("billingLedgerReadiness.previewOnlyDisclaimer")}
      </p>
      {data.requiresManualReview ? (
        <p
          data-testid="billing-ledger-readiness-manual-review"
          style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#92400e" }}
        >
          {t("billingLedgerReadiness.manualReviewFlag")}
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <LedgerSidePanel
          titleKey="billingLedgerReadiness.professionalTitle"
          side={data.professional}
          lineCount={data.ledgerPreview.professionalLineCount}
          packagePreview={data.exportGrouping.professionalPackagePreview}
        />
        <LedgerSidePanel
          titleKey="billingLedgerReadiness.facilityTitle"
          side={data.facility}
          lineCount={data.ledgerPreview.facilityLineCount}
          packagePreview={data.exportGrouping.facilityPackagePreview}
        />
      </div>
    </div>
  );
}
