"use client";

/**
 * MEDUI.D4A.3.2 — Longitudinal overview summary with deep-links (not a second chart).
 */

import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import type { HospitalWorkspaceBootstrapV1 } from "@medora/shared";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";

type HeaderData = NonNullable<HospitalWorkspaceBootstrapV1["header"]>;

const linkBtn: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "5px 9px",
  borderRadius: 8,
  border: "1px solid #99f6e4",
  background: "#f0fdfa",
  color: "#0f766e",
  cursor: "pointer",
};

export function InpatientLongitudinalOverviewStrip({
  header,
  onNavigateSection,
  onOpenVitals,
}: {
  header: HeaderData;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
  onOpenVitals?: () => void;
}) {
  const { t, language } = useI18n();
  const vitals = header.latestVitals;
  const vitalsLine =
    vitals?.availability === "AVAILABLE"
      ? [
          vitals.systolic != null && vitals.diastolic != null
            ? `${vitals.systolic}/${vitals.diastolic}`
            : null,
          vitals.heartRate != null ? `HR ${vitals.heartRate}` : null,
          vitals.spo2 != null ? `SpO₂ ${vitals.spo2}%` : null,
          vitals.temperatureC != null ? `${vitals.temperatureC}°C` : null,
        ]
          .filter(Boolean)
          .join(" · ") || t("inpatientCompactHeaderD4a32.noVitalsDocumented")
      : t("inpatientCompactHeaderD4a32.noVitalsDocumented");

  const allergy =
    header.allergiesSummary?.trim() ||
    (header.allergiesAvailability === "NOT_PRESENT"
      ? t("inpatientCompactHeaderD4a32.nkda")
      : t("inpatientCompactHeaderD4a32.notDocumented"));

  return (
    <section
      data-testid="inpatient-longitudinal-overview"
      style={{ ...MEDORA_CARD_SHELL, padding: "10px 12px", marginBottom: 12 }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
        {t("inpatientCompactHeaderD4a32.overview.longitudinalTitle")}
      </h2>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
        {t("inpatientCompactHeaderD4a32.overview.deepLinkHint")}
      </p>
      <dl
        style={{
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "6px 12px",
          fontSize: 12,
          color: "#334155",
        }}
      >
        <div>
          <dt style={{ fontWeight: 600 }}>{t("inpatientCompactHeaderD4a32.overview.admissionDx")}</dt>
          <dd style={{ margin: 0 }}>{header.chiefConcern?.trim() || DISPLAY_DASH}</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>{t("inpatientCompactHeaderD4a32.overview.admissionAt")}</dt>
          <dd style={{ margin: 0 }}>
            {header.admittedAt
              ? formatEncounterChromeDateTime(header.admittedAt, language)
              : DISPLAY_DASH}
          </dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>{t("inpatientCompactHeaderD4a32.overview.room")}</dt>
          <dd style={{ margin: 0 }}>{header.room?.trim() || DISPLAY_DASH}</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>{t("inpatientCompactHeaderD4a32.overview.latestVitals")}</dt>
          <dd style={{ margin: 0 }}>{vitalsLine}</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>{t("inpatientCompactHeaderD4a32.overview.allergies")}</dt>
          <dd style={{ margin: 0 }}>{allergy}</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>{t("inpatientCompactHeaderD4a32.overview.codeStatus")}</dt>
          <dd style={{ margin: 0 }}>{header.codeStatus?.trim() || t("inpatientCompactHeaderD4a32.notDocumented")}</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>{t("inpatientCompactHeaderD4a32.overview.isolation")}</dt>
          <dd style={{ margin: 0 }}>
            {header.isolation?.length
              ? header.isolation.join(", ")
              : t("inpatientCompactHeaderD4a32.notDocumented")}
          </dd>
        </div>
      </dl>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {onOpenVitals ? (
          <button type="button" style={linkBtn} onClick={onOpenVitals}>
            {t("inpatientCompactHeaderD4a32.overview.openVitalsHistory")}
          </button>
        ) : null}
        <button type="button" style={linkBtn} onClick={() => onNavigateSection?.("orders")}>
          {t("inpatientCompactHeaderD4a32.overview.openOrders")}
        </button>
        <button type="button" style={linkBtn} onClick={() => onNavigateSection?.("medications")}>
          {t("inpatientCompactHeaderD4a32.overview.openMar")}
        </button>
        <button type="button" style={linkBtn} onClick={() => onNavigateSection?.("results")}>
          {t("inpatientCompactHeaderD4a32.overview.openResults")}
        </button>
        <button type="button" style={linkBtn} onClick={() => onNavigateSection?.("carePlan")}>
          {t("inpatientCompactHeaderD4a32.overview.openCarePlan")}
        </button>
        <button type="button" style={linkBtn} onClick={() => onNavigateSection?.("admission")}>
          {t("inpatientCompactHeaderD4a32.overview.openAdmission")}
        </button>
        <button type="button" style={linkBtn} onClick={() => onNavigateSection?.("nursing")}>
          {t("inpatientCompactHeaderD4a32.overview.openNursing")}
        </button>
        <button type="button" style={linkBtn} onClick={() => onNavigateSection?.("timeline")}>
          {t("inpatientCompactHeaderD4a32.overview.openTimeline")}
        </button>
        <button type="button" style={linkBtn} onClick={() => onNavigateSection?.("dischargePlanning")}>
          {t("inpatientCompactHeaderD4a32.overview.openDischarge")}
        </button>
      </div>
    </section>
  );
}
