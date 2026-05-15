"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import type { PlatformAnnouncementDto } from "@/lib/platformAnnouncementsApi";
import {
  type AnnouncementBodyBlock,
  parsePlatformAnnouncementBody,
} from "./platformAnnouncementBodyBlocks";

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

function SeverityIcon({ severity }: { severity: string | null | undefined }) {
  const s = (severity ?? "").toLowerCase();
  const size = 18;
  const box = { width: size, height: size, flexShrink: 0 } as const;
  const stroke = "currentColor";

  if (s === "critical") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden style={box}>
        <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.75" />
        <path d="M9 9l6 6M15 9l-6 6" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (s === "warning") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden style={box}>
        <path
          d="M12 9v4M12 17h.01M11.13 4.35L3.39 18.3c-.45.78.11 1.75 1.02 1.75h15.18c.91 0 1.47-.97 1.02-1.75L12.87 4.35c-.46-.8-1.61-.8-2.07 0z"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (s === "release") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden style={box}>
        <path
          d="M12 3l2.4 5 5.5.8-4 3.9 1 5.5L12 16.9 7.1 18.2l1-5.5-4-3.9 5.5-.8L12 3z"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden style={box}>
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.75" />
      <path d="M12 10v5M12 8h.01" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function AnnouncementBodyBlocksView({
  blocks,
  accentBorder,
}: {
  blocks: AnnouncementBodyBlock[];
  accentBorder: string;
}) {
  let priorContent = false;
  return (
    <div>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "spacer":
            return <div key={`s-${idx}`} style={{ height: 14 }} aria-hidden />;
          case "header": {
            const marginTop = priorContent ? 16 : 0;
            priorContent = true;
            return (
              <div
                key={`h-${idx}`}
                style={{
                  marginTop,
                  marginBottom: 8,
                  paddingLeft: 10,
                  borderLeft: `3px solid ${accentBorder}`,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.35,
                  }}
                >
                  {block.text}
                </div>
              </div>
            );
          }
          case "paragraph": {
            priorContent = true;
            return (
              <p
                key={`p-${idx}`}
                style={{
                  margin: "0 0 12px 0",
                  fontSize: 14,
                  color: "#334155",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {block.lines.join("\n")}
              </p>
            );
          }
          case "bulletList": {
            priorContent = true;
            return (
              <ul
                key={`ul-${idx}`}
                style={{
                  margin: "4px 0 14px 0",
                  paddingLeft: "1.25rem",
                  listStyleType: "disc",
                  color: "#334155",
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                {block.items.map((item, j) => (
                  <li key={j} style={{ marginBottom: 6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
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
  const bodyBlocks = useMemo(() => parsePlatformAnnouncementBody(announcement.body), [announcement.body]);

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
          maxHeight: "min(88vh, 860px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: MEDORA_CARD_SHELL.background,
          border: MEDORA_CARD_SHELL.border,
          borderLeft: `4px solid ${tone.border}`,
          borderRadius: MEDORA_CARD_SHELL.radius,
          boxShadow: MEDORA_CARD_SHELL.boxShadow,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-announcement-title"
      >
        <div
          style={{
            padding: "16px 18px 12px",
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
            background: `linear-gradient(180deg, ${tone.bg} 0%, ${MEDORA_CARD_SHELL.background} 72%)`,
          }}
        >
          <p style={{ margin: "0 0 6px 0", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
            {t("platformAnnouncement.newUpdateAvailable")}
          </p>
          <h2 id="platform-announcement-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            {t("platformAnnouncement.title")}
          </h2>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", color: tone.color }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} aria-hidden>
              <SeverityIcon severity={announcement.severity} />
            </span>
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
            flex: "1 1 auto",
            minHeight: 0,
            maxHeight: "calc(88vh - 220px)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>{announcement.title}</div>
          {bodyBlocks.length > 0 ? (
            <AnnouncementBodyBlocksView blocks={bodyBlocks} accentBorder={tone.border} />
          ) : null}
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
