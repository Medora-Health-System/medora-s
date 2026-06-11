"use client";

import React, { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import type { MarShiftTimelineCellItem, MarShiftTimelineDrawerAction } from "@/lib/marShiftTimelineApi";
import { isMarShiftTimelineMutationAction } from "@/features/mar/marShiftTimelineDisplay";

export type FacilityMarShiftTimelineDrawerContext = {
  patientDisplay: string;
  roomLabel: string | null;
};

export type FacilityMarShiftTimelineDrawerProps = {
  item: MarShiftTimelineCellItem | null;
  context: FacilityMarShiftTimelineDrawerContext | null;
  onClose: () => void;
};

function actionLabelKey(action: MarShiftTimelineDrawerAction): string {
  return `marShiftTimeline.actions.${action}`;
}

export function FacilityMarShiftTimelineDrawer({
  item,
  context,
  onClose,
}: FacilityMarShiftTimelineDrawerProps) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (item) closeRef.current?.focus();
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item || !context) return null;

  const detailRows: { label: string; value: string | null | undefined }[] = [
    { label: t("marShiftTimeline.drawer.patient"), value: context.patientDisplay },
    { label: t("marShiftTimeline.drawer.room"), value: context.roomLabel },
    { label: t("marShiftTimeline.drawer.due"), value: item.hover.due },
    { label: t("marShiftTimeline.drawer.dose"), value: item.hover.dose },
    { label: t("marShiftTimeline.drawer.route"), value: item.hover.route },
    { label: t("marShiftTimeline.drawer.witness"), value: item.hover.witness },
    { label: t("marShiftTimeline.drawer.status"), value: item.hover.status },
    { label: t("marShiftTimeline.drawer.frequency"), value: item.frequencyCode },
    { label: t("marShiftTimeline.drawer.clinicalAction"), value: item.clinicalAction },
  ];

  return (
    <div
      data-testid="mar-shift-timeline-drawer-overlay"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.35)",
        zIndex: 2200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        data-testid="mar-shift-timeline-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mar-shift-timeline-drawer-title"
        style={{
          width: "min(420px, 100vw)",
          maxWidth: "100%",
          height: "100%",
          backgroundColor: "#fff",
          borderLeft: "1px solid #e2e8f0",
          boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.12)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 18px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h2 id="mar-shift-timeline-drawer-title" style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>
            {item.medicationLabel ?? item.primaryText}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("marShiftTimeline.drawer.close")}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              background: "#f8fafc",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t("marShiftTimeline.drawer.close")}
          </button>
        </div>

        <dl style={{ margin: "16px 0", fontSize: 13, lineHeight: 1.5 }}>
          {detailRows.map((row) =>
            row.value?.trim() ? (
              <div key={row.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, marginBottom: 8 }}>
                <dt style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>{row.label}</dt>
                <dd style={{ margin: 0, color: "#0f172a" }}>{row.value}</dd>
              </div>
            ) : null
          )}
        </dl>

        <div style={{ marginTop: "auto" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 700 }}>{t("marShiftTimeline.drawer.actionsHeading")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {item.actions.map((action) => {
              const isMutation = isMarShiftTimelineMutationAction(action);
              return (
                <button
                  key={action}
                  type="button"
                  data-testid={`mar-shift-timeline-action-${action}`}
                  disabled={isMutation || action === "VIEW_ORDER"}
                  title={isMutation || action === "VIEW_ORDER" ? t("marShiftTimeline.comingSoon") : undefined}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    backgroundColor: isMutation || action === "VIEW_ORDER" ? "#f8fafc" : "#fff",
                    color: isMutation || action === "VIEW_ORDER" ? "#94a3b8" : "#0f172a",
                    cursor: isMutation || action === "VIEW_ORDER" ? "not-allowed" : "pointer",
                    fontSize: 14,
                  }}
                >
                  {t(actionLabelKey(action))}
                  {isMutation || action === "VIEW_ORDER" ? (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#94a3b8" }}>
                      ({t("marShiftTimeline.comingSoon")})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
