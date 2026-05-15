"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import type { PlatformAnnouncementDto } from "@/lib/platformAnnouncementsApi";

function severityTone(
  severity: string | null | undefined
): { bg: string; border: string; color: string } {
  const s = (severity ?? "").toLowerCase();
  if (s === "critical") {
    return { bg: "#fee2e2", border: "#f87171", color: "#991b1b" };
  }
  if (s === "warning") {
    return { bg: "#fef9c3", border: "#eab308", color: "#854d0e" };
  }
  if (s === "release") {
    return { bg: "#f3e8ff", border: "#c084fc", color: "#6b21a8" };
  }
  return { bg: "#eff6ff", border: "#93c5fd", color: "#1e40af" };
}

function severityLabelKey(severity: string | null | undefined): string {
  const s = (severity ?? "").toLowerCase();
  if (s === "critical") return "platformAnnouncement.severity.critical";
  if (s === "warning") return "platformAnnouncement.severity.warning";
  if (s === "release") return "platformAnnouncement.severity.release";
  return "platformAnnouncement.severity.info";
}

export function PlatformAnnouncementModal({
  announcement,
  acknowledging,
  acknowledgeError,
  onAcknowledge,
  onSkip,
}: {
  announcement: PlatformAnnouncementDto;
  acknowledging: boolean;
  acknowledgeError?: string | null;
  onAcknowledge: () => void | Promise<void>;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const tone = severityTone(announcement.severity);
  const sevKey = severityLabelKey(announcement.severity);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2400,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
      }}
      role="presentation"
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: MEDORA_CARD_SHELL.background,
          border: MEDORA_CARD_SHELL.border,
          borderRadius: MEDORA_CARD_SHELL.radius,
          boxShadow: MEDORA_CARD_SHELL.boxShadow,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-announcement-title"
      >
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <p style={{ margin: "0 0 6px 0", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
            {t("platformAnnouncement.newUpdateAvailable")}
          </p>
          <h2 id="platform-announcement-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {t("platformAnnouncement.title")}
          </h2>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 700,
                border: `1px solid ${tone.border}`,
                backgroundColor: tone.bg,
                color: tone.color,
              }}
            >
              {t(sevKey)}
            </span>
            {announcement.versionKey ? (
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {t("platformAnnouncement.versionKeyLabel").replace("{key}", announcement.versionKey)}
              </span>
            ) : null}
          </div>
        </div>
        <div
          style={{
            padding: "14px 18px",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 10 }}>{announcement.title}</div>
          <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {announcement.body}
          </div>
          {acknowledgeError ? (
            <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#b91c1c", fontWeight: 600 }} role="alert">
              {acknowledgeError}
            </p>
          ) : null}
        </div>
        <div
          style={{
            padding: "14px 18px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            disabled={acknowledging}
            onClick={onSkip}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              color: "#334155",
              cursor: acknowledging ? "not-allowed" : "pointer",
            }}
          >
            {t("platformAnnouncement.skipForNow")}
          </button>
          <button
            type="button"
            disabled={acknowledging}
            onClick={() => void onAcknowledge()}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              borderRadius: 10,
              background: "#0f172a",
              color: "#fff",
              cursor: acknowledging ? "not-allowed" : "pointer",
              opacity: acknowledging ? 0.7 : 1,
            }}
          >
            {acknowledging ? t("platformAnnouncement.acknowledging") : t("platformAnnouncement.acknowledge")}
          </button>
        </div>
      </div>
    </div>
  );
}
