"use client";

import React from "react";
import type {
  TriageCarryForwardMeta,
  TriageCarryForwardReviewStatus,
  TriageCarryForwardSectionKey,
  TriageCarryForwardStalenessLevel,
} from "@/features/emergency/triageCarryForward";
import {
  buildTriageCarryForwardSummary,
  getCarriedForwardSections,
  isCarryForwardSectionStale,
  sectionHasCarriedForwardFields,
} from "@/features/emergency/triageCarryForward";
import { useI18n } from "@/lib/i18n";
import { productUiBcp47Tag } from "@/i18n/config";

const STATUS_LABEL_KEY: Record<
  TriageCarryForwardReviewStatus,
  | "erTriage.carryForward.carryForwardStatusPending"
  | "erTriage.carryForward.carryForwardStatusReviewed"
  | "erTriage.carryForward.carryForwardStatusModified"
  | "erTriage.carryForward.carryForwardStatusRemoved"
> = {
  pending_review: "erTriage.carryForward.carryForwardStatusPending",
  reviewed: "erTriage.carryForward.carryForwardStatusReviewed",
  modified: "erTriage.carryForward.carryForwardStatusModified",
  removed: "erTriage.carryForward.carryForwardStatusRemoved",
};

const SECTION_STATUS_LABEL_KEY: Record<
  TriageCarryForwardReviewStatus,
  | "erTriage.carryForward.sectionStatusPending"
  | "erTriage.carryForward.sectionStatusReviewed"
  | "erTriage.carryForward.sectionStatusModified"
  | "erTriage.carryForward.sectionStatusRemoved"
> = {
  pending_review: "erTriage.carryForward.sectionStatusPending",
  reviewed: "erTriage.carryForward.sectionStatusReviewed",
  modified: "erTriage.carryForward.sectionStatusModified",
  removed: "erTriage.carryForward.sectionStatusRemoved",
};

const SECTION_LABEL_KEY: Record<TriageCarryForwardSectionKey, `erTriage.carryForward.${string}`> = {
  allergies: "erTriage.carryForward.sectionLabelAllergies",
  homeMedications: "erTriage.carryForward.sectionLabelHomeMedications",
  history: "erTriage.carryForward.sectionLabelHistory",
  socialHistory: "erTriage.carryForward.sectionLabelSocialHistory",
};

const STALE_BADGE_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};

const actionBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #d97706",
  background: "#fff",
  color: "#92400e",
  fontWeight: 600,
  fontSize: 11,
  cursor: disabled ? "not-allowed" : "pointer",
  minHeight: 36,
});

function stalenessWarningKey(level: TriageCarryForwardStalenessLevel | undefined) {
  if (level === "very_stale") return "erTriage.carryForward.veryStaleWarning";
  if (level === "stale") return "erTriage.carryForward.staleWarning";
  return null;
}

export function TriageCarryForwardBanner({
  meta,
  formDisabled,
  onConfirmAll,
}: {
  meta: TriageCarryForwardMeta | null;
  formDisabled: boolean;
  onConfirmAll: () => void;
}) {
  const { t, language } = useI18n();
  if (!meta || !Object.keys(meta.fields).length) return null;

  const summary = buildTriageCarryForwardSummary(meta);
  const sourceDate =
    summary.sourceEncounterDate != null
      ? new Date(summary.sourceEncounterDate).toLocaleString(productUiBcp47Tag(language), {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";
  const staleKey = stalenessWarningKey(summary.staleness?.level);

  return (
    <div
      role="note"
      data-testid="triage-carry-forward-banner"
      style={{
        marginBottom: 12,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #fcd34d",
        background: "#fffbeb",
        color: "#78350f",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{t("erTriage.carryForward.bannerTitle")}</div>
      <div style={{ marginBottom: 6 }}>{t("erTriage.carryForward.bannerSource").replace("{date}", sourceDate)}</div>
      {staleKey ? (
        <div style={{ marginBottom: 8 }}>
          <span style={STALE_BADGE_STYLE}>{t(staleKey)}</span>
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {summary.sections.map(({ sectionKey, reviewStatus }) => (
          <span
            key={sectionKey}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              color: "#92400e",
            }}
          >
            {t(SECTION_LABEL_KEY[sectionKey])} — {t(SECTION_STATUS_LABEL_KEY[reviewStatus])}
          </span>
        ))}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 600,
            background: "#fff",
            border: "1px solid #e2e8f0",
            color: "#475569",
          }}
        >
          {t(STATUS_LABEL_KEY[meta.reviewStatus])}
        </span>
      </div>
      {meta.reviewStatus !== "reviewed" && meta.reviewStatus !== "removed" ? (
        <button
          type="button"
          disabled={formDisabled}
          onClick={onConfirmAll}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #d97706",
            background: "#fff",
            color: "#92400e",
            fontWeight: 600,
            fontSize: 12,
            cursor: formDisabled ? "not-allowed" : "pointer",
            minHeight: 44,
          }}
        >
          {t("erTriage.carryForward.confirmAll")}
        </button>
      ) : null}
    </div>
  );
}

export function TriageCarryForwardSectionToolbar({
  section,
  meta,
  formDisabled,
  onConfirmSection,
  onClearSection,
}: {
  section: TriageCarryForwardSectionKey;
  meta: TriageCarryForwardMeta | null;
  formDisabled: boolean;
  onConfirmSection: (section: TriageCarryForwardSectionKey) => void;
  onClearSection: (section: TriageCarryForwardSectionKey) => void;
}) {
  const { t } = useI18n();
  if (!meta || !sectionHasCarriedForwardFields(meta, section)) return null;

  const status: TriageCarryForwardReviewStatus = meta.sectionStatus?.[section] ?? "pending_review";
  const stale = isCarryForwardSectionStale(meta);

  return (
    <div
      data-testid={`triage-carry-forward-toolbar-${section}`}
      style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}
    >
      <TriageCarryForwardSectionBadge section={section} meta={meta} />
      {stale ? <span style={STALE_BADGE_STYLE}>{t("erTriage.carryForward.staleWarning")}</span> : null}
      {status !== "reviewed" && status !== "removed" ? (
        <button
          type="button"
          disabled={formDisabled}
          onClick={() => onConfirmSection(section)}
          style={actionBtnStyle(formDisabled)}
        >
          {t("erTriage.carryForward.confirmSection")}
        </button>
      ) : null}
      {status !== "removed" ? (
        <button
          type="button"
          disabled={formDisabled}
          onClick={() => onClearSection(section)}
          style={{ ...actionBtnStyle(formDisabled), borderColor: "#cbd5e1", color: "#475569" }}
        >
          {t("erTriage.carryForward.clearSection")}
        </button>
      ) : null}
    </div>
  );
}

export function TriageCarryForwardSectionBadge({
  section,
  meta,
}: {
  section: TriageCarryForwardSectionKey;
  meta: TriageCarryForwardMeta | null;
}) {
  const { t } = useI18n();
  if (!meta || !sectionHasCarriedForwardFields(meta, section)) return null;
  const status: TriageCarryForwardReviewStatus = meta.sectionStatus?.[section] ?? "pending_review";
  return (
    <span
      data-testid={`triage-carry-forward-badge-${section}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        background: "#fef3c7",
        border: "1px solid #fcd34d",
        color: "#92400e",
      }}
    >
      {t(SECTION_STATUS_LABEL_KEY[status])}
    </span>
  );
}

export function triageCarryForwardSectionsForUi(meta: TriageCarryForwardMeta | null | undefined) {
  if (!meta) return [];
  return getCarriedForwardSections(meta);
}
