"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

const PANEL: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  marginBottom: 14,
};

const SUBHEAD: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  margin: "10px 0 6px",
};

const LIST: React.CSSProperties = {
  margin: "0 0 0 18px",
  padding: 0,
  fontSize: 13,
  color: "#334155",
  lineHeight: 1.45,
};

function linesFromI18n(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function MsppReviewGuidancePanel({ profileId }: { profileId: string }) {
  const { t } = useI18n();
  const base = `msppValidation.reviewGuidance.profiles.${profileId}`;
  const labelKey = `${base}.label`;
  const summaryKey = `${base}.summary`;
  const reviewKey = `${base}.reviewPoints`;
  const inclKey = `${base}.inclusionPoints`;
  const cautionKey = `${base}.cautionPoints`;

  const label = t(labelKey);
  const summaryText = t(summaryKey);
  const reviewRaw = t(reviewKey);
  const inclRaw = t(inclKey);
  const cautionRaw = t(cautionKey);

  const reviewPts = reviewRaw !== reviewKey ? linesFromI18n(reviewRaw) : [];
  const inclPts = inclRaw !== inclKey ? linesFromI18n(inclRaw) : [];
  const cautionPts = cautionRaw !== cautionKey ? linesFromI18n(cautionRaw) : [];

  return (
    <aside style={PANEL} aria-label={t("msppValidation.reviewGuidance.title")}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {t("msppValidation.reviewGuidance.title")}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{t("msppValidation.reviewGuidance.advisory")}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 10 }}>
        {t("msppValidation.reviewGuidance.profileLabel")} : {label !== labelKey ? label : profileId}
      </div>
      {summaryText !== summaryKey ? (
        <p style={{ fontSize: 13, color: "#334155", margin: "8px 0 0", lineHeight: 1.45 }}>{summaryText}</p>
      ) : null}

      {reviewPts.length > 0 ? (
        <>
          <div style={SUBHEAD}>{t("msppValidation.reviewGuidance.subsectionReview")}</div>
          <ul style={LIST}>
            {reviewPts.map((line, i) => (
              <li key={`r-${i}`}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}

      {inclPts.length > 0 ? (
        <>
          <div style={SUBHEAD}>{t("msppValidation.reviewGuidance.subsectionInclusion")}</div>
          <ul style={LIST}>
            {inclPts.map((line, i) => (
              <li key={`i-${i}`}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}

      {cautionPts.length > 0 ? (
        <>
          <div style={SUBHEAD}>{t("msppValidation.reviewGuidance.subsectionCaution")}</div>
          <ul style={LIST}>
            {cautionPts.map((line, i) => (
              <li key={`c-${i}`}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
