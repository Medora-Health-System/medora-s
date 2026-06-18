"use client";

import React, { useMemo } from "react";
import {
  EdClosedEncounterCertificationStatus,
  type DispositionSafetyReadinessResponse,
  type EdClosedEncounterCertificationResult,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import {
  canProceedToCloseCheckFromCertificationReview,
  groupCertificationDeficienciesForReview,
  resolveEdCertificationReadinessLevel,
  type EdCertificationReadinessLevel,
} from "@/features/emergency/edEncounterCertificationReviewModel";
import {
  edDispositionTouchButtonStyle,
  type EdDispositionLayoutMode,
} from "@/features/emergency/edDispositionResponsiveLayout";

type Props = {
  certification: EdClosedEncounterCertificationResult;
  dispositionReadiness: DispositionSafetyReadinessResponse | null;
  acknowledgeDispositionSafety: boolean;
  onAcknowledgeDispositionSafetyChange: (value: boolean) => void;
  closing: boolean;
  layoutMode: EdDispositionLayoutMode;
  onCancel: () => void;
  onContinueClose: () => void;
};

function readinessIcon(level: EdCertificationReadinessLevel): string {
  if (level === "ready") return "✓";
  if (level === "blocked") return "✕";
  return "⚠";
}

function readinessColors(level: EdCertificationReadinessLevel) {
  if (level === "ready") {
    return { bg: "#d1fae5", border: "#6ee7b7", color: "#065f46" };
  }
  if (level === "blocked") {
    return { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" };
  }
  return { bg: "#fffbeb", border: "#fde68a", color: "#92400e" };
}

function ReadinessSection({
  title,
  level,
  label,
}: {
  title: string;
  level: EdCertificationReadinessLevel;
  label: string;
}) {
  const colors = readinessColors(level);
  return (
    <div
      style={{
        flex: "1 1 180px",
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "12px 14px",
        background: colors.bg,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.04em" }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: colors.color }}>
        {readinessIcon(level)} {label}
      </div>
    </div>
  );
}

function DeficiencyGroup({
  title,
  items,
  t,
}: {
  title: string;
  items: EdClosedEncounterCertificationResult["deficiencies"];
  t: (key: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginTop: 14 }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "#334155" }}>{title}</h3>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((d) => (
          <li
            key={d.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "10px 12px",
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{d.title}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{d.description}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
              {d.blockingClosure
                ? t("edLifecycle.certification.blocksClosure")
                : t("edLifecycle.certification.noClosureBlock")}
              {" · "}
              {d.blockingBilling
                ? t("edLifecycle.certification.blocksBilling")
                : t("edLifecycle.certification.noBillingBlock")}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EdEncounterCertificationReview({
  certification,
  dispositionReadiness,
  acknowledgeDispositionSafety,
  onAcknowledgeDispositionSafetyChange,
  closing,
  layoutMode,
  onCancel,
  onContinueClose,
}: Props) {
  const { t } = useI18n();
  const groups = useMemo(() => groupCertificationDeficienciesForReview(certification), [certification]);

  const closureLevel = resolveEdCertificationReadinessLevel(
    certification.closureReady,
    certification.closureBlockers.length
  );
  const billingLevel = resolveEdCertificationReadinessLevel(
    certification.billingReady,
    certification.billingBlockers.length
  );
  const certificationLevel: EdCertificationReadinessLevel = certification.certifiedClosed
    ? "ready"
    : certification.status === EdClosedEncounterCertificationStatus.READY_FOR_BILLING
      ? "ready"
      : certification.closureReady
        ? "needs_attention"
        : "blocked";

  const canContinue = canProceedToCloseCheckFromCertificationReview({
    certification,
    dispositionReadiness,
    acknowledgeDispositionSafety,
  });

  const showDispositionOverride = Boolean(dispositionReadiness && !dispositionReadiness.canClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ed-encounter-certification-review-title"
      data-testid="ed-encounter-certification-review"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 82,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          ...MEDORA_CARD_SHELL,
          width: "min(720px, 100%)",
          maxHeight: "min(90vh, 900px)",
          overflow: "auto",
          padding: 20,
        }}
      >
        <h2 id="ed-encounter-certification-review-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
          {t("edLifecycle.certification.closeReview.title")}
        </h2>
        {!certification.closureReady ? (
          <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "#991b1b", fontWeight: 600, lineHeight: 1.45 }}>
            {t("edLifecycle.certification.closeReview.cannotCertify")}
          </p>
        ) : null}

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ReadinessSection
            title={t("edLifecycle.certification.closure")}
            level={closureLevel}
            label={t(`edLifecycle.certification.closeReview.level.${closureLevel}`)}
          />
          <ReadinessSection
            title={t("edLifecycle.certification.billing")}
            level={billingLevel}
            label={t(`edLifecycle.certification.closeReview.level.${billingLevel}`)}
          />
          <ReadinessSection
            title={t("edLifecycle.certification.closeReview.certificationStatus")}
            level={certificationLevel}
            label={t(`edLifecycle.certification.status.${certification.status}`)}
          />
        </div>

        {certification.closureBlockers.length > 0 ? (
          <section style={{ marginTop: 16 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "#334155" }}>
              {t("edLifecycle.certification.closeReview.closureBlockers")}
            </h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#451a03", lineHeight: 1.45 }}>
              {certification.closureBlockers.map((d) => (
                <li key={d.id} style={{ marginBottom: 4 }}>
                  {d.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <DeficiencyGroup
          title={t("edLifecycle.certification.providerDeficiencies")}
          items={groups.provider}
          t={t}
        />
        <DeficiencyGroup
          title={t("edLifecycle.certification.nursingDeficiencies")}
          items={groups.nursing}
          t={t}
        />
        <DeficiencyGroup
          title={t("edLifecycle.certification.billingDeficiencies")}
          items={[...groups.billing, ...groups.coding]}
          t={t}
        />
        <DeficiencyGroup
          title={t("edLifecycle.certification.systemDeficiencies")}
          items={groups.system}
          t={t}
        />

        {showDispositionOverride ? (
          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginTop: 16,
              fontSize: 13,
              color: "#0f172a",
              fontWeight: 600,
              cursor: closing ? "default" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={acknowledgeDispositionSafety}
              disabled={closing}
              onChange={(e) => onAcknowledgeDispositionSafetyChange(e.target.checked)}
            />
            <span>{t("dispositionReadiness.overrideCheckbox")}</span>
          </label>
        ) : null}

        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={closing}
            onClick={onCancel}
            style={edDispositionTouchButtonStyle(
              {
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
                fontSize: 14,
                fontWeight: 500,
                cursor: closing ? "wait" : "pointer",
              },
              layoutMode
            )}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={closing || !canContinue}
            onClick={onContinueClose}
            style={edDispositionTouchButtonStyle(
              {
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                backgroundColor: canContinue ? "#b91c1c" : "#cbd5e1",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: closing || !canContinue ? "not-allowed" : "pointer",
              },
              layoutMode
            )}
          >
            {closing ? t("common.loading") : t("edLifecycle.certification.closeReview.continueClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
