"use client";

/**
 * MEDUI.D4A.3.2 — Compact enterprise hospital patient header.
 * Visual/behavioral reference: ED Active Workspace header.
 * Consumes bootstrap projection; never fabricates clinical values.
 */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { EncounterGovernedRoomChip } from "@/components/encounters/EncounterGovernedRoomChip";
import {
  EmergencyWorkspaceAllergiesCard,
  EmergencyWorkspaceVitalsCard,
} from "@/features/emergency/EmergencyWorkspaceClinicalStrip";
import {
  EMERGENCY_AVATAR_CIRCLE_STYLE,
  esiDisplayChar,
  esiLevelFromUnknown,
  esiUnderAvatarNumberStyle,
} from "@/features/emergency/emergencyEsiDisplay";
import { apiFetch } from "@/lib/apiClient";
import type { HospitalWorkspaceBootstrapV1, InpatientWorkspaceRole } from "@medora/shared";
import { buildInpatientHeaderVitalPairs } from "./inpatientHeaderVitalsPairs";

type HeaderData = NonNullable<HospitalWorkspaceBootstrapV1["header"]>;

type IvActiveRow = {
  insertionEventId: string;
  site: string;
  gauge: string;
  insertedAt: string;
  recordedByDisplayName: string | null;
};

function parseIvActive(raw: unknown): IvActiveRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const a = (raw as { active?: unknown }).active;
  if (!Array.isArray(a)) return [];
  const out: IvActiveRow[] = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = typeof x.insertionEventId === "string" ? x.insertionEventId : "";
    if (!id) continue;
    out.push({
      insertionEventId: id,
      site: typeof x.site === "string" ? x.site : "",
      gauge: typeof x.gauge === "string" ? x.gauge : "",
      insertedAt: typeof x.insertedAt === "string" ? x.insertedAt : "",
      recordedByDisplayName:
        typeof x.recordedByDisplayName === "string" ? x.recordedByDisplayName : null,
    });
  }
  return out;
}

/** MEDUI.D4A.3.3A — further narrowed chips (~25% vs 3.3) for one desktop row. */
const statusChipCard: CSSProperties = {
  padding: "5px 7px",
  borderRadius: 10,
  boxSizing: "border-box",
  alignSelf: "stretch",
  minWidth: 88,
  maxWidth: 118,
  flex: "0 1 104px",
};

/** Compact IV status chip. */
const ivCompactCard: CSSProperties = {
  padding: "5px 7px",
  borderRadius: 10,
  boxSizing: "border-box",
  alignSelf: "stretch",
  minWidth: 92,
  maxWidth: 124,
  flex: "0 1 110px",
};

const interactiveTransition: CSSProperties = {
  transition: "transform 120ms ease, box-shadow 120ms ease, filter 120ms ease",
};

function InteractiveStatusButton({
  testId,
  onClick,
  disabled,
  ariaLabel,
  title,
  style,
  children,
}: {
  testId: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const clickable = Boolean(onClick) && !disabled;
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={!clickable}
      aria-label={ariaLabel}
      title={clickable ? title : undefined}
      onMouseDown={() => clickable && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        ...interactiveTransition,
        ...style,
        cursor: clickable ? "pointer" : "default",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        boxShadow: focused
          ? "0 0 0 2px #0f766e55"
          : clickable
            ? "0 1px 2px rgba(15,23,42,0.06)"
            : "none",
        filter: clickable && !pressed ? undefined : undefined,
      }}
      onMouseEnter={(e) => {
        if (!clickable) return;
        (e.currentTarget as HTMLButtonElement).style.filter = "brightness(0.98)";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLButtonElement).style.filter = "none";
      }}
    >
      {children}
    </button>
  );
}

export function EnterpriseHospitalPatientHeader({
  header,
  sticky = false,
  role: _role = "CHART",
  actions,
  facilityId,
  esiLevel,
  onDocumentVitals,
  onOpenIvAccess,
  onOpenAllergies,
  onOpenCodeStatus,
  onOpenIsolation,
  ivRefreshToken = 0,
  /**
   * Explicit opt-in for hospital assignment chrome (Observation workspace).
   * Inpatient must leave this false/omitted — do not restore assignment globally.
   */
  showAssignmentActions = false,
  onAssignToMe,
  onRemoveAssignment,
  assignmentBusy = false,
}: {
  header: HeaderData;
  sticky?: boolean;
  role?: InpatientWorkspaceRole;
  actions?: ReactNode;
  facilityId?: string | null;
  /** Optional ESI from triage when available — never fabricated. */
  esiLevel?: string | number | null;
  onDocumentVitals?: () => void;
  onOpenIvAccess?: () => void;
  onOpenAllergies?: () => void;
  onOpenCodeStatus?: () => void;
  onOpenIsolation?: () => void;
  ivRefreshToken?: number;
  showAssignmentActions?: boolean;
  onAssignToMe?: () => void;
  onRemoveAssignment?: () => void;
  assignmentBusy?: boolean;
}) {
  void _role;
  const { t, language } = useI18n();
  const initials = header.patientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const esi = esiLevelFromUnknown(esiLevel);
  const vitals = header.latestVitals;
  const vitalsEmpty =
    !vitals ||
    vitals.availability === "NO_DATA_DOCUMENTED" ||
    vitals.availability === "SOURCE_UNAVAILABLE";
  const vitalPairs = useMemo(
    () =>
      buildInpatientHeaderVitalPairs(
        vitals?.availability === "SOURCE_UNAVAILABLE"
          ? { ...vitals, availability: "NO_DATA_DOCUMENTED" }
          : vitals,
        language,
        DISPLAY_DASH
      ),
    [vitals, language]
  );

  const allergyText = useMemo(() => {
    if (header.allergiesSummary?.trim()) return header.allergiesSummary.trim();
    if (
      header.allergiesAvailability === "NOT_DOCUMENTED" ||
      header.allergiesAvailability === "SOURCE_UNAVAILABLE" ||
      header.allergiesAvailability === "UNKNOWN"
    ) {
      return t("inpatientCompactHeaderD4a32.notDocumented");
    }
    if (header.allergiesAvailability === "NOT_PRESENT") {
      return t("inpatientCompactHeaderD4a32.nkda");
    }
    return t("inpatientCompactHeaderD4a32.notDocumented");
  }, [header.allergiesSummary, header.allergiesAvailability, t]);

  const codeStatusText = header.codeStatus?.trim() || t("inpatientCompactHeaderD4a32.notDocumented");
  const isolationText = header.isolation?.length
    ? header.isolation.join(", ")
    : t("inpatientCompactHeaderD4a32.notDocumented");

  const admissionDx =
    header.chiefConcern?.trim() || t("inpatientCompactHeaderD4a32.notDocumented");

  const roomEncounter = {
    roomLabel: header.room,
    type: header.encounterType,
    unitCode: (header.unit?.trim() || null) as
      | "MS"
      | "ICU"
      | "ED"
      | "OBS"
      | null,
  };

  const [ivActive, setIvActive] = useState<IvActiveRow[]>([]);
  const [ivLoading, setIvLoading] = useState(false);

  useEffect(() => {
    if (!facilityId || !header.encounterId) {
      setIvActive([]);
      return;
    }
    let cancelled = false;
    setIvLoading(true);
    void (async () => {
      try {
        const data = await apiFetch(`/encounters/${header.encounterId}/iv-access`, {
          facilityId,
        });
        if (!cancelled) setIvActive(parseIvActive(data));
      } catch {
        if (!cancelled) setIvActive([]);
      } finally {
        if (!cancelled) setIvLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId, header.encounterId, ivRefreshToken]);

  return (
    <header
      data-testid="enterprise-hospital-patient-header"
      style={{
        ...MEDORA_CARD_SHELL,
        padding: "10px 12px",
        marginBottom: 8,
        position: sticky ? "sticky" : "relative",
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 28 : undefined,
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        {/* Single initials avatar + ESI under it (ED pattern) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
            width: 48,
          }}
          data-testid="inpatient-header-avatar"
        >
          <div style={EMERGENCY_AVATAR_CIRCLE_STYLE} aria-hidden>
            {initials || "—"}
          </div>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            {t("inpatientCompactHeaderD4a32.esiLabel")}
          </span>
          <span style={esiUnderAvatarNumberStyle(esi)} data-testid="inpatient-header-esi">
            {esiDisplayChar(esi)}
          </span>
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>
            {header.patientName}
            {header.preferredName ? (
              <span style={{ fontWeight: 500, color: "#64748b", fontSize: 13 }}>
                {" "}
                ({header.preferredName})
              </span>
            ) : null}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: "#475569" }}>
              {t("inpatientWorkspaceRecoveryD4a27b.header.mrn")}
            </span>{" "}
            {header.mrn?.trim() || DISPLAY_DASH}
            {" · "}
            <span style={{ fontWeight: 600, color: "#475569" }}>
              {t("inpatientWorkspaceRecoveryD4a27b.header.dob")}
            </span>{" "}
            {header.dateOfBirth
              ? formatEncounterChromeDateTime(header.dateOfBirth, language)
              : DISPLAY_DASH}
            {" · "}
            <span style={{ fontWeight: 600, color: "#475569" }}>
              {t("inpatientWorkspaceRecoveryD4a27b.header.age")}
            </span>{" "}
            {header.ageYears != null ? String(header.ageYears) : DISPLAY_DASH}
            {" · "}
            <span style={{ fontWeight: 600, color: "#475569" }}>
              {t("inpatientWorkspaceRecoveryD4a27b.header.sex")}
            </span>{" "}
            {header.sexAtBirth?.trim() || DISPLAY_DASH}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#334155", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11 }}>
              {t("inpatientCompactHeaderD4a32.admissionDiagnosis")}
            </span>
            {" — "}
            {admissionDx}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            <span style={{ fontWeight: 600, color: "#475569" }}>
              {t("inpatientCompactHeaderD4a32.admissionLabel")}
            </span>{" "}
            {header.admittedAt
              ? formatEncounterChromeDateTime(header.admittedAt, language)
              : DISPLAY_DASH}
          </p>
        </div>

        <div style={{ marginLeft: "auto", flexShrink: 0 }} data-testid="inpatient-header-room">
          <EncounterGovernedRoomChip
            encounter={roomEncounter}
            clickable={false}
            compact
            alignSelf="flex-start"
            labelKey="printOutput.patientChart.room"
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 6,
          marginTop: 10,
          alignItems: "stretch",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        data-testid="inpatient-header-clinical-cards"
      >
        <div style={{ flex: "1 1 200px", minWidth: 180, maxWidth: 280 }}>
          <EmergencyWorkspaceVitalsCard
            vitalPairs={vitalPairs}
            loading={false}
            editable={Boolean(onDocumentVitals)}
            onEditClick={onDocumentVitals}
            editAriaLabel={t("inpatientCompactHeaderD4a32.vitalsEditAria")}
            displayMode="desktopDense"
          />
          {vitalsEmpty ? (
            <p
              style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}
              data-testid="inpatient-header-no-vitals"
            >
              {t("inpatientCompactHeaderD4a32.noVitalsDocumented")}
            </p>
          ) : null}
        </div>

        <InteractiveStatusButton
          testId="inpatient-header-iv-card"
          onClick={onOpenIvAccess}
          disabled={!onOpenIvAccess}
          ariaLabel={t("inpatientCompactHeaderD4a32.ivAccessOpenAria")}
          title={t("inpatientHeaderNursingD4a33.clickToEdit")}
          style={{
            ...ivCompactCard,
            border: "1px solid #e9d5ff",
            background: "#faf5ff",
            textAlign: "left",
            font: "inherit",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#6b21a8",
            }}
          >
            💉 {t("inpatientCompactHeaderD4a32.ivAccessTitle")}
          </p>
          {ivLoading ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{t("common.loading")}</p>
          ) : (
            <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "#6b21a8" }}>
              {ivActive.length === 0
                ? t("inpatientCompactHeaderD4a32.noActiveIv")
                : t("inpatientHeaderNursingD4a33.iv.activeIv")}
            </p>
          )}
        </InteractiveStatusButton>

        <InteractiveStatusButton
          testId="inpatient-header-allergies-card"
          onClick={onOpenAllergies}
          disabled={!onOpenAllergies}
          ariaLabel={t("inpatientCompactHeaderD4a32.allergiesOpenAria")}
          title={t("inpatientHeaderNursingD4a33.clickToEdit")}
          style={{
            border: "none",
            padding: 0,
            background: "transparent",
            ...statusChipCard,
            textAlign: "left",
          }}
        >
          <EmergencyWorkspaceAllergiesCard allergySummary={allergyText} loading={false} />
        </InteractiveStatusButton>

        <InteractiveStatusButton
          testId="inpatient-header-code-card"
          onClick={onOpenCodeStatus}
          disabled={!onOpenCodeStatus}
          ariaLabel={t("inpatientCompactHeaderD4a32.codeStatusOpenAria")}
          title={t("inpatientHeaderNursingD4a33.clickToEdit")}
          style={{
            ...statusChipCard,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            font: "inherit",
            textAlign: "left",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#92400e",
            }}
          >
            ⚕️ {t("inpatientCompactHeaderD4a32.codeStatusTitle")}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              fontWeight: 700,
              color: "#78350f",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {codeStatusText}
          </p>
        </InteractiveStatusButton>

        <InteractiveStatusButton
          testId="inpatient-header-isolation-card"
          onClick={onOpenIsolation}
          disabled={!onOpenIsolation}
          ariaLabel={t("inpatientCompactHeaderD4a32.isolationOpenAria")}
          title={t("inpatientHeaderNursingD4a33.clickToEdit")}
          style={{
            ...statusChipCard,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            font: "inherit",
            textAlign: "left",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#9f1239",
            }}
          >
            ☣️ {t("inpatientCompactHeaderD4a32.isolationTitle")}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              fontWeight: 700,
              color: "#881337",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isolationText}
          </p>
        </InteractiveStatusButton>
      </div>

      {showAssignmentActions && (onAssignToMe || onRemoveAssignment) ? (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}
          data-testid="hospital-header-assignment-actions"
          aria-label={t("enterpriseHospitalAssignmentD4a30.provider")}
        >
          {onAssignToMe ? (
            <button
              type="button"
              onClick={onAssignToMe}
              disabled={assignmentBusy}
              style={assignmentActionBtn}
              data-testid="hospital-header-assign-me"
            >
              {assignmentBusy
                ? t("enterpriseHospitalAssignmentD4a30.assignSubmitting")
                : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
            </button>
          ) : null}
          {onRemoveAssignment ? (
            <button
              type="button"
              onClick={onRemoveAssignment}
              disabled={assignmentBusy}
              style={assignmentActionBtn}
              data-testid="hospital-header-remove-assignment"
            >
              {t("enterpriseHospitalAssignmentD4a30.removeAssignment")}
            </button>
          ) : null}
        </div>
      ) : null}

      {actions ? <div style={{ marginTop: 8 }}>{actions}</div> : null}
    </header>
  );
}

const assignmentActionBtn: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #99f6e4",
  background: "#f0fdfa",
  color: "#0f766e",
  cursor: "pointer",
};
