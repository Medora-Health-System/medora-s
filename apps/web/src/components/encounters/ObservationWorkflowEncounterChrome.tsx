"use client";

import React, { useMemo } from "react";
import type { ObservationOperationalSnapshot, ObservationTrackboardOpsInput } from "@medora/shared";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

export type ObservationWorkflowStatusTone = "green" | "yellow" | "red" | "amber";

export function resolveObservationWorkflowHeaderPill(
  snapshot: ObservationOperationalSnapshot
): { tone: ObservationWorkflowStatusTone; labelKey: string } {
  const { flags } = snapshot;
  if (flags.criticalLabsUnacked) {
    return { tone: "red", labelKey: "encounterChrome.observationWorkflow.statusPill.criticalResults" };
  }
  if (flags.reassessmentOverdue) {
    return { tone: "red", labelKey: "encounterChrome.observationWorkflow.statusPill.reassessmentOverdue" };
  }
  if (snapshot.vitalsStale) {
    return { tone: "red", labelKey: "encounterChrome.observationWorkflow.statusPill.vitalsStale" };
  }
  if (snapshot.extendedStay24h) {
    return { tone: "amber", labelKey: "encounterChrome.observationWorkflow.statusPill.extended24h" };
  }
  if (flags.reassessmentDue) {
    return { tone: "yellow", labelKey: "encounterChrome.observationWorkflow.statusPill.reassessmentDue" };
  }
  if (flags.resultsPending) {
    return { tone: "yellow", labelKey: "encounterChrome.observationWorkflow.statusPill.resultsPending" };
  }
  if (flags.readyForDischarge) {
    return { tone: "green", labelKey: "encounterChrome.observationWorkflow.statusPill.readyDischarge" };
  }
  return { tone: "green", labelKey: "encounterChrome.observationWorkflow.statusPill.active" };
}

const toneStyles: Record<
  ObservationWorkflowStatusTone,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  green: { backgroundColor: "#dcfce7", borderColor: "#86efac", color: "#166534" },
  yellow: { backgroundColor: "#fef9c3", borderColor: "#eab308", color: "#854d0e" },
  red: { backgroundColor: "#fee2e2", borderColor: "#f87171", color: "#991b1b" },
  amber: { backgroundColor: "#ffedd5", borderColor: "#fb923c", color: "#9a3412" },
};

const badgeBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 600,
  border: "1px solid",
  lineHeight: 1.3,
};

function formatAgeMs(ms: number, t: (k: string) => string): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return t("encounterChrome.observationWorkflow.vitalsUnderOneMinute");
  if (m < 120) return t("encounterChrome.observationWorkflow.vitalsAgeMinutes").replace("{n}", String(m));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return t("encounterChrome.observationWorkflow.vitalsAgeHours").replace("{h}", String(h)).replace("{m}", String(rem));
}

export type ObservationWorkflowEncounterChromeProps = {
  snapshot: ObservationOperationalSnapshot;
  trackboardOps: ObservationTrackboardOpsInput;
  providerDocumentationStatus: string | null | undefined;
  providerDocumentationSignedAt: unknown;
  formatDateTime: (iso: string) => string;
  t: (key: string) => string;
  setActiveTab: (tab: string) => void;
  onOpenDischarge: () => void;
  showNursingTab: boolean;
};

export function ObservationWorkflowEncounterChrome({
  snapshot,
  trackboardOps,
  providerDocumentationStatus,
  providerDocumentationSignedAt,
  formatDateTime,
  t,
  setActiveTab,
  onOpenDischarge,
  showNursingTab,
}: ObservationWorkflowEncounterChromeProps) {
  const nursingAt =
    typeof trackboardOps.lastNursingReassessmentAt === "string" && trackboardOps.lastNursingReassessmentAt.trim()
      ? formatDateTime(trackboardOps.lastNursingReassessmentAt)
      : t("common.dash");

  const providerSigned =
    String(providerDocumentationStatus ?? "").trim() === "SIGNED" &&
    (typeof providerDocumentationSignedAt === "string" || providerDocumentationSignedAt instanceof Date)
      ? formatDateTime(
          providerDocumentationSignedAt instanceof Date
            ? providerDocumentationSignedAt.toISOString()
            : (providerDocumentationSignedAt as string)
        )
      : t("common.dash");

  const pendingCount = typeof trackboardOps.resultsPendingCount === "number" ? trackboardOps.resultsPendingCount : 0;

  const quickBtn: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    color: "#334155",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  };

  const { flags } = snapshot;

  return (
    <div
      style={{
        marginTop: 14,
        padding: "14px 16px",
        backgroundColor: MEDORA_CARD_SHELL.background,
        border: MEDORA_CARD_SHELL.border,
        borderRadius: MEDORA_CARD_SHELL.radius,
        boxShadow: MEDORA_CARD_SHELL.boxShadow,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: "1 1 220px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            {t("encounterChrome.observationWorkflow.cardTitle")}
          </div>
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
            <div>
              <span style={{ color: "#64748b" }}>{t("encounterChrome.observationWorkflow.anchorLabel")}:</span>{" "}
              {snapshot.anchorKind === "admittedAt"
                ? t("encounterChrome.observationWorkflow.anchorAdmittedAt")
                : t("encounterChrome.observationWorkflow.anchorCreatedAt")}{" "}
              · {formatDateTime(snapshot.anchorIso)}
            </div>
            <div>
              <span style={{ color: "#64748b" }}>{t("encounterChrome.observationWorkflow.lineLos")}:</span> {snapshot.losLabel}
              {snapshot.overnightUtcSpan ? (
                <>
                  {" · "}
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.observationOvernightUtc")}</span>
                </>
              ) : null}
              {snapshot.extendedStay24h ? (
                <>
                  {" · "}
                  <span style={{ fontWeight: 600 }}>{t("encounterChrome.observationExtended24h")}</span>
                </>
              ) : null}
            </div>
            <div>
              <span style={{ color: "#64748b" }}>{t("encounterChrome.observationWorkflow.lastNursing")}:</span> {nursingAt}
            </div>
            <div>
              <span style={{ color: "#64748b" }}>{t("encounterChrome.observationWorkflow.lastProviderSigned")}:</span>{" "}
              {providerSigned}
            </div>
            <div>
              <span style={{ color: "#64748b" }}>{t("encounterChrome.observationWorkflow.vitalsAgeLabel")}:</span>{" "}
              {snapshot.vitalsStale
                ? t("encounterChrome.observationWorkflow.vitalsStaleLine")
                : snapshot.vitalsAgeMs != null && Number.isFinite(snapshot.vitalsAgeMs)
                  ? t("encounterChrome.observationWorkflow.vitalsAgeValue").replace(
                      "{age}",
                      formatAgeMs(snapshot.vitalsAgeMs, t)
                    )
                  : t("encounterChrome.observationWorkflow.vitalsClockUnknown")}
            </div>
            <div>
              <span style={{ color: "#64748b" }}>{t("encounterChrome.observationWorkflow.pendingResultsLabel")}:</span>{" "}
              {pendingCount > 0
                ? t("encounterChrome.observationWorkflow.pendingResultsCount").replace("{count}", String(pendingCount))
                : t("encounterChrome.observationWorkflow.pendingResultsNone")}
              {flags.criticalLabsUnacked ? (
                <span style={{ marginLeft: 8, fontWeight: 700, color: "#b91c1c" }}>
                  {t("encounterChrome.observationWorkflow.criticalResultFlag")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: "0 1 auto" }}>
          <button type="button" style={quickBtn} onClick={() => setActiveTab("clinic")}>
            {t("encounterChrome.observationWorkflow.quick.reassess")}
          </button>
          <button type="button" style={quickBtn} onClick={() => setActiveTab("orders")}>
            {t("encounterChrome.observationWorkflow.quick.orders")}
          </button>
          <button type="button" style={quickBtn} onClick={() => setActiveTab("results")}>
            {t("encounterChrome.observationWorkflow.quick.results")}
          </button>
          {showNursingTab ? (
            <button type="button" style={quickBtn} onClick={() => setActiveTab("nursing")}>
              {t("encounterChrome.observationWorkflow.quick.nursing")}
            </button>
          ) : null}
          <button type="button" style={quickBtn} onClick={() => setActiveTab("clinic")}>
            {t("encounterChrome.observationWorkflow.quick.continue")}
          </button>
          <button
            type="button"
            style={{ ...quickBtn, backgroundColor: "#f1f5f9", borderColor: "#cbd5e1", color: "#0f172a" }}
            onClick={onOpenDischarge}
          >
            {t("encounterChrome.observationWorkflow.quick.discharge")}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {flags.assignPhysicianGap ? (
          <span
            style={{
              ...badgeBase,
              backgroundColor: "#fff7ed",
              borderColor: "#fdba74",
              color: "#9a3412",
            }}
          >
            {t("encounterChrome.observationWorkflow.badges.assignPhysician")}
          </span>
        ) : null}
        {flags.assignRnGap ? (
          <span
            style={{
              ...badgeBase,
              backgroundColor: "#fff7ed",
              borderColor: "#fdba74",
              color: "#9a3412",
            }}
          >
            {t("encounterChrome.observationWorkflow.badges.assignRn")}
          </span>
        ) : null}
        {snapshot.vitalsStale ? (
          <span style={{ ...badgeBase, backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }}>
            {t("encounterChrome.observationWorkflow.badges.vitalsStale")}
          </span>
        ) : null}
        {flags.reassessmentOverdue ? (
          <span style={{ ...badgeBase, backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }}>
            {t("encounterChrome.observationWorkflow.badges.reassessmentOverdue")}
          </span>
        ) : flags.reassessmentDue ? (
          <span style={{ ...badgeBase, backgroundColor: "#fef9c3", borderColor: "#fde047", color: "#854d0e" }}>
            {t("encounterChrome.observationWorkflow.badges.reassessmentDue")}
          </span>
        ) : null}
        {flags.resultsPending ? (
          <span style={{ ...badgeBase, backgroundColor: "#fef9c3", borderColor: "#fde047", color: "#854d0e" }}>
            {t("encounterChrome.observationWorkflow.badges.resultsPending").replace("{count}", String(pendingCount))}
          </span>
        ) : null}
        {flags.criticalLabsUnacked ? (
          <span style={{ ...badgeBase, backgroundColor: "#fee2e2", borderColor: "#f87171", color: "#991b1b" }}>
            {t("encounterChrome.observationWorkflow.badges.criticalResults")}
          </span>
        ) : null}
        {snapshot.extendedStay24h ? (
          <span style={{ ...badgeBase, backgroundColor: "#ffedd5", borderColor: "#fb923c", color: "#9a3412" }}>
            {t("encounterChrome.observationWorkflow.badges.extended24h")}
          </span>
        ) : null}
        {flags.readyForDischarge ? (
          <span style={{ ...badgeBase, backgroundColor: "#dcfce7", borderColor: "#86efac", color: "#166534" }}>
            {t("encounterChrome.observationWorkflow.badges.readyDischarge")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ObservationWorkflowHeaderStatusPill({
  snapshot,
  t,
}: {
  snapshot: ObservationOperationalSnapshot;
  t: (key: string) => string;
}) {
  const pill = useMemo(() => resolveObservationWorkflowHeaderPill(snapshot), [snapshot]);
  const ts = toneStyles[pill.tone];
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 700,
        border: `1px solid ${ts.borderColor}`,
        backgroundColor: ts.backgroundColor,
        color: ts.color,
      }}
    >
      {t(pill.labelKey)}
    </span>
  );
}

export function ObservationWorkflowActiveHeaderPill({ t }: { t: (key: string) => string }) {
  return (
    <span
      style={{
        padding: "8px 16px",
        borderRadius: 9999,
        fontSize: 14,
        fontWeight: 700,
        border: "1px solid #c4b5fd",
        backgroundColor: "#f5f3ff",
        color: "#5b21b6",
        flexShrink: 0,
      }}
    >
      {t("encounterChrome.observationWorkflow.headerWorkflowActive")}
    </span>
  );
}
