"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { MsppReviewRow } from "@/lib/msppApi";
import { MSPP_MUTED_INLINE } from "./msppUiChrome";

const BTN: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#475569",
  borderRadius: 8,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "help",
  fontFamily: "system-ui, sans-serif",
};

type Props = {
  reviewId: string;
  reportId: string | null;
  departmentId: string;
};

/**
 * Identifiants techniques réservés au support — jamais affichés en clair dans le tableau.
 */
export function MsppValidationTechnicalIds({ reviewId, reportId, departmentId }: Props) {
  const { t } = useI18n();
  const title = t("msppValidation.technicalIdsTitle")
    .replace("{reviewId}", reviewId)
    .replace("{reportId}", reportId ?? "—")
    .replace("{departmentId}", departmentId);

  return (
    <button type="button" style={BTN} title={title} aria-label={title}>
      {t("msppValidation.technicalIdsTrigger")}
    </button>
  );
}

export function MsppValidationReporterCell({ row }: { row: MsppReviewRow }) {
  const { t } = useI18n();
  const name = row.reporterName?.trim();
  const role = row.reporterRole?.trim();
  if (!name && !role) {
    return <span style={MSPP_MUTED_INLINE}>{t("msppValidation.badgeDash")}</span>;
  }
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{name || t("msppValidation.badgeDash")}</div>
      {role ? <div style={{ color: "#64748b", fontSize: 12 }}>{role}</div> : null}
    </div>
  );
}
