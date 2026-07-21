"use client";

/**
 * D3C — Admission & Observation Decision Board (feature-flagged).
 * Does not create placement rows from the client identity; API derives facility/patient.
 * Behind INTERNAL_PLACEMENT_WORKFLOW — when OFF, legacy admission shell remains.
 */

import { useI18n } from "@/lib/i18n";
import { internalPlacementWorkflowEnabled } from "@medora/shared";

export type AdmissionObservationDecisionBoardProps = {
  /** Current placement status label key from API projection, if any. */
  placementTrackboardLabel?: string | null;
  requestedEncounterType?: "OBSERVATION" | "INPATIENT" | null;
  onRequestedTypeChange?: (type: "OBSERVATION" | "INPATIENT") => void;
  disabled?: boolean;
};

export function isInternalPlacementWorkflowUiEnabled(): boolean {
  return internalPlacementWorkflowEnabled({
    INTERNAL_PLACEMENT_WORKFLOW_ENABLED: process.env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
    NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED:
      process.env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
  });
}

export function AdmissionObservationDecisionBoard({
  placementTrackboardLabel,
  requestedEncounterType,
  onRequestedTypeChange,
  disabled,
}: AdmissionObservationDecisionBoardProps) {
  const { t } = useI18n();

  if (!isInternalPlacementWorkflowUiEnabled()) {
    return null;
  }

  return (
    <section
      data-testid="admission-observation-decision-board"
      aria-labelledby="d3c-admission-obs-title"
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <h3
        id="d3c-admission-obs-title"
        style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}
      >
        {t("internalPlacementD3c.boardTitle")}
      </h3>
      <p style={{ margin: "6px 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
        {t("internalPlacementD3c.boardHint")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="radiogroup" aria-label={t("internalPlacementD3c.step1Title")}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("internalPlacementD3c.step1Title")}
        </span>
        {(
          [
            ["OBSERVATION", "internalPlacementD3c.observation"],
            ["INPATIENT", "internalPlacementD3c.inpatient"],
          ] as const
        ).map(([value, labelKey]) => (
          <label
            key={value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#0f172a",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <input
              type="radio"
              name="d3c-requested-encounter-type"
              checked={requestedEncounterType === value}
              disabled={disabled}
              onChange={() => onRequestedTypeChange?.(value)}
            />
            <span>{t(labelKey)}</span>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("internalPlacementD3c.step3Title")}
        </span>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#0f172a" }}>
          {placementTrackboardLabel
            ? t(
                `internalPlacementD3c.status.${placementTrackboardLabel}` as Parameters<
                  typeof t
                >[0]
              )
            : t("internalPlacementD3c.statusNone")}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
          {t("internalPlacementD3c.noFalseBedHint")}
        </p>
      </div>
    </section>
  );
}
