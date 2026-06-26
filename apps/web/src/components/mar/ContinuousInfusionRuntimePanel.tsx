"use client";

import React, { useMemo, useState } from "react";
import { formatMarShiftTimelineClinicalDateTime } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import {
  changeMedicationInfusionBag,
  changeMedicationInfusionLine,
  changeMedicationInfusionPump,
  changeMedicationInfusionRate,
  pauseMedicationInfusion,
  restartMedicationInfusion,
} from "@/lib/medicationInfusionApi";
import { extractMarSaveErrorMessage } from "@/features/mar/marSaveErrorMessage";

export type ContinuousInfusionRuntimePanelProps = {
  item: MarShiftTimelineCellItem;
  facilityId: string;
  facilityTimeZone?: string | null;
  readOnly?: boolean;
  onSaved?: () => void | Promise<void>;
};

type InfusionActionKind =
  | "RATE_CHANGE"
  | "PAUSE"
  | "RESTART"
  | "BAG_CHANGE"
  | "PUMP_CHANGE"
  | "LINE_CHANGE";

export function ContinuousInfusionRuntimePanel({
  item,
  facilityId,
  facilityTimeZone = null,
  readOnly = false,
  onSaved,
}: ContinuousInfusionRuntimePanelProps) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const runtime = item.medicationInfusionRuntime;
  const [activeAction, setActiveAction] = useState<InfusionActionKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRate, setNewRate] = useState("");
  const [rateReason, setRateReason] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [previousValue, setPreviousValue] = useState("");
  const [newValue, setNewValue] = useState("");

  const showPanel = useMemo(
    () =>
      Boolean(
        runtime &&
          (item.clinicalAction === "STOP_INFUSION" ||
            item.doseStatus === "IN_PROGRESS" ||
            item.doseStatus === "COMPLETED")
      ),
    [item.clinicalAction, item.doseStatus, runtime]
  );

  if (!showPanel || !runtime) return null;

  const resolveError = (e: unknown) =>
    extractMarSaveErrorMessage(e, language, t("continuousInfusionRuntime.actionError"), t);

  const resetForm = () => {
    setActiveAction(null);
    setNewRate("");
    setRateReason("");
    setActionReason("");
    setPreviousValue("");
    setNewValue("");
    setError(null);
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    if (readOnly || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await fn();
      resetForm();
      await onSaved?.();
    } catch (e) {
      setError(resolveError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = t(`continuousInfusionRuntime.status.${runtime.status}`);

  const actionButtons: Array<{ kind: InfusionActionKind; label: string; disabled?: boolean }> = [
    {
      kind: "RATE_CHANGE",
      label: t("continuousInfusionRuntime.actions.rateChange"),
      disabled: runtime.paused || runtime.status !== "RUNNING",
    },
    {
      kind: "PAUSE",
      label: t("continuousInfusionRuntime.actions.pause"),
      disabled: runtime.paused || runtime.status !== "RUNNING",
    },
    {
      kind: "RESTART",
      label: t("continuousInfusionRuntime.actions.restart"),
      disabled: !runtime.paused || runtime.status !== "PAUSED",
    },
    {
      kind: "BAG_CHANGE",
      label: t("continuousInfusionRuntime.actions.bagChange"),
      disabled: runtime.paused || runtime.status !== "RUNNING",
    },
    {
      kind: "PUMP_CHANGE",
      label: t("continuousInfusionRuntime.actions.pumpChange"),
      disabled: runtime.paused || runtime.status !== "RUNNING",
    },
    {
      kind: "LINE_CHANGE",
      label: t("continuousInfusionRuntime.actions.lineChange"),
      disabled: runtime.paused || runtime.status !== "RUNNING",
    },
  ];

  const submitActiveAction = () => {
    const orderItemId = item.orderItemId;
    if (activeAction === "RATE_CHANGE") {
      void runAction(() =>
        changeMedicationInfusionRate(orderItemId, facilityId, {
          currentRate: newRate.trim(),
          previousRate: runtime.currentRate ?? undefined,
          rateChangeReason: rateReason.trim() || undefined,
        })
      );
      return;
    }
    if (activeAction === "PAUSE") {
      void runAction(() =>
        pauseMedicationInfusion(orderItemId, facilityId, {
          reason: actionReason.trim() || undefined,
        })
      );
      return;
    }
    if (activeAction === "RESTART") {
      void runAction(() =>
        restartMedicationInfusion(orderItemId, facilityId, {
          reason: actionReason.trim() || undefined,
        })
      );
      return;
    }
    const devicePayload = {
      previousValue: previousValue.trim() || undefined,
      newValue: newValue.trim(),
      reason: actionReason.trim() || undefined,
    };
    if (activeAction === "BAG_CHANGE") {
      void runAction(() => changeMedicationInfusionBag(orderItemId, facilityId, devicePayload));
    } else if (activeAction === "PUMP_CHANGE") {
      void runAction(() => changeMedicationInfusionPump(orderItemId, facilityId, devicePayload));
    } else if (activeAction === "LINE_CHANGE") {
      void runAction(() => changeMedicationInfusionLine(orderItemId, facilityId, devicePayload));
    }
  };

  const field = (label: string, value: string | null | undefined) =>
    value?.trim() ? (
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: 13 }}>
        <dt style={{ margin: 0, color: "#64748b" }}>{label}</dt>
        <dd style={{ margin: 0, color: "#0f172a" }}>{value}</dd>
      </div>
    ) : null;

  return (
    <section
      data-testid="continuous-infusion-runtime-panel"
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#f8fafc",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
          {t("continuousInfusionRuntime.title")}
        </h3>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: 9999,
            background: runtime.paused ? "#fef3c7" : "#dcfce7",
            color: runtime.paused ? "#92400e" : "#166534",
          }}
        >
          {statusLabel}
        </span>
      </div>

      <dl style={{ margin: "10px 0 0", display: "grid", gap: 6 }}>
        {field(t("continuousInfusionRuntime.fields.medication"), item.medicationLabel ?? item.primaryText)}
        {field(t("continuousInfusionRuntime.fields.concentration"), runtime.concentration)}
        {field(t("continuousInfusionRuntime.fields.currentRate"), runtime.currentRate)}
        {field(t("continuousInfusionRuntime.fields.route"), runtime.route ?? item.route)}
        {field(t("continuousInfusionRuntime.fields.pumpChannel"), runtime.pumpChannel)}
        {field(t("continuousInfusionRuntime.fields.currentBag"), runtime.currentBag)}
        {field(t("continuousInfusionRuntime.fields.remainingVolume"), runtime.remainingVolume)}
        {field(
          t("continuousInfusionRuntime.fields.startedBy"),
          runtime.startedByDisplay ?? item.startedByDisplay
        )}
        {runtime.startedAt || item.startedAt ? (
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: 13 }}>
            <dt style={{ margin: 0, color: "#64748b" }}>{t("continuousInfusionRuntime.fields.startedTime")}</dt>
            <dd style={{ margin: 0, color: "#0f172a" }}>
              {formatMarShiftTimelineClinicalDateTime(
                (runtime.startedAt ?? item.startedAt) as string,
                dateLocale,
                facilityTimeZone ?? undefined
              )}
            </dd>
          </div>
        ) : null}
        {field(t("continuousInfusionRuntime.fields.verifiedBy"), runtime.verifiedByDisplay)}
      </dl>

      {runtime.timelineRows.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#334155" }}>
            {t("continuousInfusionRuntime.timelineTitle")}
          </h4>
          <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            {runtime.timelineRows.map((row) => (
              <li key={row.id} style={{ fontSize: 12, color: "#334155" }}>
                <strong>{row.label}</strong>
                {row.newValue ? ` · ${row.newValue}` : row.detail ? ` · ${row.detail}` : ""}
                <div style={{ color: "#64748b" }}>
                  {formatMarShiftTimelineClinicalDateTime(
                    row.eventAt,
                    dateLocale,
                    facilityTimeZone ?? undefined
                  )}
                  {row.documentedBy ? ` · ${row.documentedBy}` : ""}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {!readOnly && (runtime.status === "RUNNING" || runtime.status === "PAUSED") ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {actionButtons.map((btn) => (
              <button
                key={btn.kind}
                type="button"
                disabled={Boolean(btn.disabled) || submitting}
                onClick={() => {
                  setActiveAction(btn.kind);
                  setError(null);
                  if (btn.kind === "RATE_CHANGE") setNewRate(runtime.currentRate ?? "");
                  if (btn.kind === "BAG_CHANGE") setPreviousValue(runtime.currentBag ?? "");
                  if (btn.kind === "PUMP_CHANGE") setPreviousValue(runtime.pumpChannel ?? "");
                  if (btn.kind === "LINE_CHANGE") setPreviousValue("");
                }}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: activeAction === btn.kind ? "#e2e8f0" : "#fff",
                  cursor: btn.disabled ? "not-allowed" : "pointer",
                  opacity: btn.disabled ? 0.5 : 1,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {activeAction ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {activeAction === "RATE_CHANGE" ? (
                <>
                  <label style={{ fontSize: 12, color: "#475569" }}>
                    {t("continuousInfusionRuntime.form.previousRate")}
                    <input
                      readOnly
                      value={runtime.currentRate ?? "—"}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#475569" }}>
                    {t("continuousInfusionRuntime.form.newRate")}
                    <input
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#475569" }}>
                    {t("continuousInfusionRuntime.form.reason")}
                    <input
                      value={rateReason}
                      onChange={(e) => setRateReason(e.target.value)}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </label>
                </>
              ) : activeAction === "PAUSE" || activeAction === "RESTART" ? (
                <label style={{ fontSize: 12, color: "#475569" }}>
                  {t("continuousInfusionRuntime.form.reason")}
                  <input
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
                  />
                </label>
              ) : (
                <>
                  <label style={{ fontSize: 12, color: "#475569" }}>
                    {t("continuousInfusionRuntime.form.previousValue")}
                    <input
                      value={previousValue}
                      onChange={(e) => setPreviousValue(e.target.value)}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#475569" }}>
                    {t("continuousInfusionRuntime.form.newValue")}
                    <input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: "#475569" }}>
                    {t("continuousInfusionRuntime.form.reason")}
                    <input
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </label>
                </>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={
                    submitting ||
                    (activeAction === "RATE_CHANGE"
                      ? !newRate.trim()
                      : activeAction !== "PAUSE" &&
                        activeAction !== "RESTART" &&
                        !newValue.trim())
                  }
                  onClick={submitActiveAction}
                  style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: "#0f766e",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {submitting ? t("common.saving") : t("continuousInfusionRuntime.form.submit")}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 12, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
