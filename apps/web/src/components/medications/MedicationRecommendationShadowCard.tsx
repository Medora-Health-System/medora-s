"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import type { Phase16RecommendationRow } from "@/lib/medicationPhase16RecommendationApi";

function card(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
    display: "grid",
    gap: 6,
  };
}

type Props = {
  row: Phase16RecommendationRow;
  onAcknowledge?: () => void;
  onReject?: () => void;
  busy?: boolean;
};

/**
 * Provider read-only recommendation card.
 * No order / MAR / add-to-chart actions by design.
 */
export function MedicationRecommendationShadowCard({
  row,
  onAcknowledge,
  onReject,
  busy,
}: Props) {
  const { t } = useI18n();
  const payload = (row.structuredPayload ?? {}) as Record<string, unknown>;

  return (
    <article style={card()} data-order-from-recommendation="false">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 15 }}>{row.title}</strong>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {t("medicationPhase16Recommendations.confidence")}: {row.confidenceScore}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>{row.reasonSummary}</p>
      <div style={{ fontSize: 12, color: "#475569", display: "grid", gap: 2 }}>
        <div>
          {t("medicationPhase16Recommendations.evidenceLevel")}:{" "}
          {row.evidenceLevel ?? "—"}
        </div>
        <div>
          {t("medicationPhase16Recommendations.strength")}:{" "}
          {row.recommendationStrength ?? "—"}
        </div>
        <div>
          {t("medicationPhase16Recommendations.reviewer")}:{" "}
          {row.approvedByUserId ?? "—"}
        </div>
        <div>
          {t("medicationPhase16Recommendations.approvedAt")}:{" "}
          {row.approvedAt
            ? new Date(row.approvedAt).toLocaleString()
            : "—"}
        </div>
        <div>
          {t("medicationPhase16Recommendations.kind")}: {row.recommendationKind}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#64748b" }}>
        <div>
          {t("medicationPhase16Recommendations.alternatives")}:{" "}
          {Array.isArray(payload.alternatives)
            ? payload.alternatives.length
              ? String(payload.alternatives.join(", "))
              : t("medicationPhase16Recommendations.noneListed")
            : t("medicationPhase16Recommendations.noneListed")}
        </div>
        <div>
          {t("medicationPhase16Recommendations.contraindications")}:{" "}
          {Array.isArray(payload.contraindications)
            ? payload.contraindications.length
              ? String(payload.contraindications.join(", "))
              : t("medicationPhase16Recommendations.noneListed")
            : t("medicationPhase16Recommendations.noneListed")}
        </div>
        <div>
          {t("medicationPhase16Recommendations.renal")}:{" "}
          {t("medicationPhase16Recommendations.governedDeferredOrEmpty")}
        </div>
        <div>
          {t("medicationPhase16Recommendations.pregnancy")}:{" "}
          {t("medicationPhase16Recommendations.governedDeferredOrEmpty")}
        </div>
        <div>
          {t("medicationPhase16Recommendations.pediatric")}:{" "}
          {t("medicationPhase16Recommendations.governedDeferredOrEmpty")}
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          padding: "6px 8px",
          background: "#eff6ff",
          borderRadius: 8,
          color: "#1e3a8a",
        }}
      >
        {t("medicationPhase16Recommendations.providerReadOnlyNotice")}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {onAcknowledge ? (
          <button type="button" disabled={busy} onClick={onAcknowledge}>
            {t("medicationPhase16Recommendations.acknowledge")}
          </button>
        ) : null}
        {onReject ? (
          <button type="button" disabled={busy} onClick={onReject}>
            {t("medicationPhase16Recommendations.rejectInfo")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
