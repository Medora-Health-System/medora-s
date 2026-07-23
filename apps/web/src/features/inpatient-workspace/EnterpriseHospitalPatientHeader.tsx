"use client";

/**
 * D4A.2.7B — Reusable enterprise hospital patient header.
 * Consumes bootstrap projection only. Never infers devices.
 */

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import type { HospitalWorkspaceBootstrapV1 } from "@medora/shared";

const metaRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 14px",
  marginTop: 8,
  fontSize: 12,
  color: "#334155",
};

type HeaderData = NonNullable<HospitalWorkspaceBootstrapV1["header"]>;

export function EnterpriseHospitalPatientHeader({
  header,
  sticky = true,
  actions,
  onDocumentVitals,
  onOpenOrders,
  onOpenMar,
  onOpenResults,
}: {
  header: HeaderData;
  sticky?: boolean;
  actions?: ReactNode;
  onDocumentVitals?: () => void;
  onOpenOrders?: () => void;
  onOpenMar?: () => void;
  onOpenResults?: () => void;
}) {
  const { t, language } = useI18n();
  const initials = header.patientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

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
              {t("inpatientWorkspaceRecoveryD4a27b.header.unitRoomBed")}:{" "}
              {[header.unit, header.room, header.bed].filter(Boolean).join(" / ") || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.attending")}:{" "}
              {header.attendingName?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.rn")}:{" "}
              {header.assignedRnName?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientWorkspaceRecoveryD4a27b.header.status")}:{" "}
              {header.encounterStatus?.trim() || DISPLAY_DASH}
            </span>
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
              {header.allergiesSummary?.trim() || DISPLAY_DASH}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 10,
        }}
        aria-label={t("inpatientWorkspaceRecoveryD4a27b.header.quickActions")}
      >
        {onDocumentVitals ? (
          <button type="button" onClick={onDocumentVitals} style={actionBtn}>
            {t("inpatientWorkspaceRecoveryD4a27b.header.actions.vitals")}
          </button>
        ) : null}
        {onOpenOrders ? (
          <button type="button" onClick={onOpenOrders} style={actionBtn}>
            {t("inpatientWorkspaceRecoveryD4a27b.header.actions.orders")}
          </button>
        ) : null}
        {onOpenMar ? (
          <button type="button" onClick={onOpenMar} style={actionBtn}>
            {t("inpatientWorkspaceRecoveryD4a27b.header.actions.mar")}
          </button>
        ) : null}
        {onOpenResults ? (
          <button type="button" onClick={onOpenResults} style={actionBtn}>
            {t("inpatientWorkspaceRecoveryD4a27b.header.actions.results")}
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
