"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { ClinicalVitalsDisplayMode } from "@/lib/clinicalViewport";
import {
  clinicalVitalsGridStyle,
  clinicalVitalsLabelStyle,
  clinicalVitalsShellStyle,
  clinicalVitalsValueStyle,
} from "@/lib/clinicalViewport";

/** Paires label / valeur serrées (label près de la valeur). */
function VitalPair({
  label,
  value,
  displayMode,
}: {
  label: string;
  value: string;
  displayMode: ClinicalVitalsDisplayMode;
}) {
  if (displayMode === "compactStack") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={clinicalVitalsLabelStyle(displayMode)}>{label}</span>
        <span style={clinicalVitalsValueStyle(displayMode)}>{value}</span>
      </div>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "nowrap",
        alignItems: "baseline",
        gap: displayMode === "tabletReadable" ? 6 : 4,
        minWidth: 0,
      }}
    >
      <span style={clinicalVitalsLabelStyle(displayMode)}>{label}:</span>
      <span style={clinicalVitalsValueStyle(displayMode)}>{value}</span>
    </span>
  );
}

/**
 * Carte compacte 2 colonnes (résumé au lit) — pas de bandeau pleine largeur.
 * Ordre d’affichage : TA|Temp, FC|SpO₂, FR|Poids, puis Taille sur toute la largeur.
 */
export function EmergencyWorkspaceVitalsCard({
  vitalPairs,
  loading,
  editable = false,
  onEditClick,
  editAriaLabel,
  displayMode = "desktopDense",
}: {
  vitalPairs: { label: string; value: string }[];
  loading: boolean;
  /** When true and onEditClick is set, the vitals block is clickable (quick triage vitals edit). */
  editable?: boolean;
  onEditClick?: () => void;
  editAriaLabel?: string;
  displayMode?: ClinicalVitalsDisplayMode;
}) {
  const { t } = useI18n();
  if (loading) {
    return (
      <div
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          backgroundColor: "#fff",
          minWidth: 0,
          flex: "1 1 160px",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{t("emergencyWorkspaceClinicalStrip.vitalsLoading")}</p>
      </div>
    );
  }

  const p = vitalPairs;
  const rowA = p.length >= 4 && p[0] && p[3] ? [p[0], p[3]] : null;
  const rowB = p.length >= 5 && p[1] && p[4] ? [p[1], p[4]] : null;
  const rowC = p.length >= 6 && p[2] && p[5] ? [p[2], p[5]] : null;
  const taille = p.length >= 7 ? p[6] : null;

  const interactive = Boolean(editable && onEditClick);
  const shellStyle: React.CSSProperties = clinicalVitalsShellStyle(displayMode, interactive);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onEditClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEditClick?.();
              }
            }
          : undefined
      }
      aria-label={interactive ? editAriaLabel : undefined}
      style={shellStyle}
    >
      <p
        style={{
          margin: 0,
          fontSize: displayMode === "desktopDense" ? 9 : 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        {t("emergencyWorkspaceClinicalStrip.vitalsTitle")}
      </p>
      <div style={clinicalVitalsGridStyle(displayMode)}>
        {rowA ? (
          <>
            <VitalPair label={rowA[0].label} value={rowA[0].value} displayMode={displayMode} />
            <VitalPair label={rowA[1].label} value={rowA[1].value} displayMode={displayMode} />
          </>
        ) : null}
        {rowB ? (
          <>
            <VitalPair label={rowB[0].label} value={rowB[0].value} displayMode={displayMode} />
            <VitalPair label={rowB[1].label} value={rowB[1].value} displayMode={displayMode} />
          </>
        ) : null}
        {rowC ? (
          <>
            <VitalPair label={rowC[0].label} value={rowC[0].value} displayMode={displayMode} />
            <VitalPair label={rowC[1].label} value={rowC[1].value} displayMode={displayMode} />
          </>
        ) : null}
        {taille ? (
          <div style={{ gridColumn: displayMode === "compactStack" ? undefined : "1 / -1" }}>
            <VitalPair label={taille.label} value={taille.value} displayMode={displayMode} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Bloc allergies compact, rouge, à côté des SV. */
export function EmergencyWorkspaceAllergiesCard({
  allergySummary,
  loading,
}: {
  allergySummary: string;
  loading: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #fecaca",
        backgroundColor: "#fef2f2",
        minWidth: 0,
        flex: "1 1 140px",
        maxWidth: "100%",
        boxSizing: "border-box",
        alignSelf: "stretch",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#b91c1c",
        }}
      >
        {t("emergencyWorkspaceClinicalStrip.allergiesTitle")}
      </p>
      <p
        style={{
          margin: "4px 0 0 0",
          fontSize: 12,
          color: "#991b1b",
          lineHeight: 1.35,
          fontWeight: 600,
          wordBreak: "break-word",
        }}
      >
        {loading ? "…" : allergySummary || t("emergencyWorkspaceClinicalStrip.allergiesNone")}
      </p>
    </div>
  );
}
