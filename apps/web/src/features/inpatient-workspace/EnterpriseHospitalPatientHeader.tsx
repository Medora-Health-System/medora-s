"use client";

/**
 * D4A.2.7C — Enterprise hospital patient header (complete).
 * Consumes bootstrap projection only. Never infers devices.
 */

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import type { HospitalWorkspaceBootstrapV1, InpatientWorkspaceRole } from "@medora/shared";

const metaRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 14px",
  marginTop: 6,
  fontSize: 12,
  color: "#334155",
};

type HeaderData = NonNullable<HospitalWorkspaceBootstrapV1["header"]>;

function indicatorStyle(state: string): CSSProperties {
  if (state === "PRESENT") return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
  if (state === "NOT_PRESENT") return { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" };
  return { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" };
}

export function EnterpriseHospitalPatientHeader({
  header,
  sticky = true,
  role = "CHART",
  actions,
  onDocumentVitals,
  onOpenOrders,
  onOpenMar,
  onOpenResults,
  onOpenHp,
  onOpenProgress,
  onOpenAdmission,
  onOpenAssessments,
  onOpenTasks,
  onOpenHandoff,
}: {
  header: HeaderData;
  sticky?: boolean;
  role?: InpatientWorkspaceRole;
  actions?: ReactNode;
  onDocumentVitals?: () => void;
  onOpenOrders?: () => void;
  onOpenMar?: () => void;
  onOpenResults?: () => void;
  onOpenHp?: () => void;
  onOpenProgress?: () => void;
  onOpenAdmission?: () => void;
  onOpenAssessments?: () => void;
  onOpenTasks?: () => void;
  onOpenHandoff?: () => void;
}) {
  const { t, language } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const initials = header.patientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

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
          vitals.respiratoryRate != null ? `RR ${vitals.respiratoryRate}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || DISPLAY_DASH
      : vitals?.availability === "NO_DATA_DOCUMENTED"
        ? t("inpatientRapidConvergenceD4a27c.header.noVitals")
        : t("inpatientRapidConvergenceD4a27c.header.sourceUnavailable");

  return (
    <header
      data-testid="enterprise-hospital-patient-header"
      style={{
        ...MEDORA_CARD_SHELL,
        padding: "12px 14px",
        marginBottom: 12,
        position: sticky ? "sticky" : "relative",
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 30 : undefined,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "#ecfeff",
            border: "1px solid #99f6e4",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            color: "#0f766e",
            flexShrink: 0,
          }}
        >
          {initials || "—"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {header.patientName}
            {header.preferredName ? (
              <span style={{ fontWeight: 500, color: "#64748b", fontSize: 14 }}>
                {" "}
                ({header.preferredName})
              </span>
            ) : null}
          </h1>
          <div style={metaRow}>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.mrn")}:{" "}
              <strong>{header.mrn?.trim() || DISPLAY_DASH}</strong>
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.dob")}:{" "}
              {header.dateOfBirth
                ? formatEncounterChromeDateTime(header.dateOfBirth, language)
                : DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.age")}:{" "}
              {header.ageYears != null ? String(header.ageYears) : DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.sex")}:{" "}
              {header.sexAtBirth?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.language")}:{" "}
              {header.preferredLanguage?.trim() || DISPLAY_DASH}
            </span>
            {header.interpreterRequired != null ? (
              <span>
                {t("inpatientRapidConvergenceD4a27c.header.interpreter")}:{" "}
                {header.interpreterRequired
                  ? t("inpatientRapidConvergenceD4a27c.yes")
                  : t("inpatientRapidConvergenceD4a27c.no")}
              </span>
            ) : null}
          </div>
          <div style={metaRow}>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.encounterType")}:{" "}
              <strong>{header.encounterType}</strong>
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.hospitalDay")}:{" "}
              {header.hospitalDay != null ? String(header.hospitalDay) : DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.admittedAt")}:{" "}
              {header.admittedAt
                ? formatEncounterChromeDateTime(header.admittedAt, language)
                : DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientRapidConvergenceD4a27c.header.facility")}:{" "}
              {header.facilityName?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.unitRoomBed")}:{" "}
              {[header.unit, header.room, header.bed].filter(Boolean).join(" / ") || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.status")}:{" "}
              {header.encounterStatus?.trim() || DISPLAY_DASH}
            </span>
          </div>
          <div style={metaRow}>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.attending")}:{" "}
              {header.attendingName?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.rn")}:{" "}
              {header.assignedRnName?.trim() || DISPLAY_DASH}
            </span>
            {header.residentOrAppName ? (
              <span>
                {t("inpatientRapidConvergenceD4a27c.header.residentApp")}: {header.residentOrAppName}
              </span>
            ) : null}
          </div>
          <div style={metaRow}>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.chiefConcern")}:{" "}
              {header.chiefConcern?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.codeStatus")}:{" "}
              {header.codeStatus?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.isolation")}:{" "}
              {header.isolation?.length ? header.isolation.join(", ") : DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.allergies")}:{" "}
              {header.allergiesSummary?.trim() ||
                (header.allergiesAvailability === "SOURCE_UNAVAILABLE"
                  ? t("inpatientRapidConvergenceD4a27c.header.sourceUnavailable")
                  : header.allergiesAvailability === "NOT_DOCUMENTED"
                    ? t("inpatientRapidConvergenceD4a27c.header.notDocumented")
                    : DISPLAY_DASH)}
            </span>
            <span>
              {t("inpatientRapidConvergenceD4a27c.header.vitals")}: {vitalsLine}
            </span>
          </div>

          {(expanded || (header.indicators?.length ?? 0) > 0) && (
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
              aria-label={t("inpatientRapidConvergenceD4a27c.header.indicators")}
            >
              {(header.indicators ?? []).map((ind) => (
                <span
                  key={ind.code}
                  title={`${ind.code}: ${ind.state}`}
                  style={{
                    ...indicatorStyle(ind.state),
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: 9999,
                  }}
                >
                  {t(ind.labelKey)}: {t(`inpatientRapidConvergenceD4a27c.indicatorStates.${ind.state}`)}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            fontSize: 12,
            border: "1px solid #cbd5e1",
            background: "#fff",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          {expanded
            ? t("inpatientRapidConvergenceD4a27c.header.collapse")
            : t("inpatientRapidConvergenceD4a27c.header.expand")}
        </button>
      </div>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}
        aria-label={t("inpatientWorkspaceRecoveryD4a27b.header.quickActions")}
      >
        {(role === "NURSING" || role === "TECHNICIAN" || role === "CHART") && onDocumentVitals ? (
          <button type="button" onClick={onDocumentVitals} style={actionBtn}>
            {t("inpatientWorkspaceRecoveryD4a27b.header.actions.vitals")}
          </button>
        ) : null}
        {(role === "PROVIDER" || role === "CHART") && onOpenHp ? (
          <button type="button" onClick={onOpenHp} style={actionBtn}>
            {t("inpatientRapidConvergenceD4a27c.actions.hp")}
          </button>
        ) : null}
        {(role === "PROVIDER" || role === "CHART") && onOpenProgress ? (
          <button type="button" onClick={onOpenProgress} style={actionBtn}>
            {t("inpatientRapidConvergenceD4a27c.actions.progress")}
          </button>
        ) : null}
        {(role === "PROVIDER" || role === "CHART" || role === "NURSING") && onOpenOrders ? (
          <button type="button" onClick={onOpenOrders} style={actionBtn}>
            {t("inpatientWorkspaceRecoveryD4a27b.header.actions.orders")}
          </button>
        ) : null}
        {(role === "NURSING" || role === "PROVIDER" || role === "CHART") && onOpenMar ? (
          <button type="button" onClick={onOpenMar} style={actionBtn}>
            {t("inpatientWorkspaceRecoveryD4a27b.header.actions.mar")}
          </button>
        ) : null}
        {(role === "PROVIDER" || role === "NURSING" || role === "CHART") && onOpenResults ? (
          <button type="button" onClick={onOpenResults} style={actionBtn}>
            {t("inpatientWorkspaceRecoveryD4a27b.header.actions.results")}
          </button>
        ) : null}
        {role === "NURSING" && onOpenAdmission ? (
          <button type="button" onClick={onOpenAdmission} style={actionBtn}>
            {t("inpatientRapidConvergenceD4a27c.actions.admission")}
          </button>
        ) : null}
        {role === "NURSING" && onOpenAssessments ? (
          <button type="button" onClick={onOpenAssessments} style={actionBtn}>
            {t("inpatientRapidConvergenceD4a27c.actions.assessments")}
          </button>
        ) : null}
        {role === "NURSING" && onOpenHandoff ? (
          <button type="button" onClick={onOpenHandoff} style={actionBtn}>
            {t("inpatientRapidConvergenceD4a27c.actions.handoff")}
          </button>
        ) : null}
        {role === "TECHNICIAN" && onOpenTasks ? (
          <button type="button" onClick={onOpenTasks} style={actionBtn}>
            {t("inpatientRapidConvergenceD4a27c.actions.tasks")}
          </button>
        ) : null}
        <Link href={`/app/patients/${encodeURIComponent(header.patientId)}`} style={actionLink}>
          {t("inpatientWorkspaceRecoveryD4a27b.header.actions.fullChart")}
        </Link>
        {actions}
      </div>
    </header>
  );
}

const actionBtn: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #99f6e4",
  background: "#f0fdfa",
  color: "#0f766e",
  cursor: "pointer",
};

const actionLink: CSSProperties = {
  ...actionBtn,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};
