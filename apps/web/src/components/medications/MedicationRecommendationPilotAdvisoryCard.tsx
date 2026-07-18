"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";

function card(pilot: boolean): CSSProperties {
  return {
    border: pilot ? "1px solid #f59e0b" : "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: pilot ? "#fffbeb" : "#fff",
    display: "grid",
    gap: 6,
  };
}

export type PilotAdvisoryRow = {
  exposureId: string | null;
  title: string;
  reasonSummary?: string;
  recommendationKind?: string;
  confidenceScore?: number;
  evidenceLevel?: string | null;
  recommendationStrength?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  version?: string;
  knowledgeVersion?: string;
  controlledPilot: boolean;
  structuredPayload?: Record<string, unknown> | null;
};

type Props = {
  row: PilotAdvisoryRow;
  busy?: boolean;
  onAcknowledge?: () => void;
  onDismiss?: () => void;
  onDisagree?: () => void;
};

/**
 * Encounter-adjacent controlled-pilot advisory.
 * Informational only — no order / prescribe / MAR actions.
 */
export function MedicationRecommendationPilotAdvisoryCard({
  row,
  busy,
  onAcknowledge,
  onDismiss,
  onDisagree,
}: Props) {
  const { t } = useI18n();
  const payload = (row.structuredPayload ?? {}) as Record<string, unknown>;

  return (
    <article
      style={card(row.controlledPilot)}
      data-order-from-recommendation="false"
      data-controlled-pilot={row.controlledPilot ? "true" : "false"}
    >
      {row.controlledPilot ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#92400e",
            letterSpacing: 0.2,
          }}
        >
          {t("medicationPhase17Pilot.controlledPilotBadge")}
        </span>
      ) : (
        <span style={{ fontSize: 11, color: "#64748b" }}>
          {t("medicationPhase17Pilot.shadowOnlyBadge")}
        </span>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 15 }}>{row.title}</strong>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {t("medicationPhase17Pilot.confidence")}: {row.confidenceScore ?? "—"}
        </span>
      </div>
      {row.reasonSummary ? (
        <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
          {row.reasonSummary}
        </p>
      ) : null}
      <div style={{ fontSize: 12, color: "#475569", display: "grid", gap: 2 }}>
        <div>
          {t("medicationPhase17Pilot.kind")}: {row.recommendationKind ?? "—"}
        </div>
        <div>
          {t("medicationPhase17Pilot.evidenceLevel")}:{" "}
          {row.evidenceLevel ?? "—"}
        </div>
        <div>
          {t("medicationPhase17Pilot.reviewer")}: {row.approvedByUserId ?? "—"}
        </div>
        <div>
          {t("medicationPhase17Pilot.approvedAt")}:{" "}
          {row.approvedAt ? new Date(row.approvedAt).toLocaleString() : "—"}
        </div>
        <div>
          {t("medicationPhase17Pilot.recommendationVersion")}:{" "}
          {row.version ?? "—"}
        </div>
        <div>
          {t("medicationPhase17Pilot.knowledgeVersion")}:{" "}
          {row.knowledgeVersion ?? "—"}
        </div>
        <div>
          {t("medicationPhase17Pilot.alternatives")}:{" "}
          {Array.isArray(payload.alternatives) && payload.alternatives.length
            ? String(payload.alternatives.join(", "))
            : t("medicationPhase17Pilot.noneListed")}
        </div>
        <div>
          {t("medicationPhase17Pilot.contraindications")}:{" "}
          {Array.isArray(payload.contraindications) &&
          payload.contraindications.length
            ? String(payload.contraindications.join(", "))
            : t("medicationPhase17Pilot.noneListed")}
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          padding: "6px 8px",
          background: "#fef3c7",
          borderRadius: 8,
          color: "#78350f",
        }}
      >
        {t("medicationPhase17Pilot.providerAdvisoryBanner")}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        {t("medicationPhase17Pilot.noOrderActions")}
      </p>
      {row.controlledPilot && row.exposureId ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onAcknowledge ? (
            <button type="button" disabled={busy} onClick={onAcknowledge}>
              {t("medicationPhase17Pilot.acknowledge")}
            </button>
          ) : null}
          {onDismiss ? (
            <button type="button" disabled={busy} onClick={onDismiss}>
              {t("medicationPhase17Pilot.dismiss")}
            </button>
          ) : null}
          {onDisagree ? (
            <button type="button" disabled={busy} onClick={onDisagree}>
              {t("medicationPhase17Pilot.disagree")}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
