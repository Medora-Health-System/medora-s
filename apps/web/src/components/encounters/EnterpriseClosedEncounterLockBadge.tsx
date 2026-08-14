"use client";

import { useI18n } from "@/lib/i18n";

function EncounterLockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * MEDUI.D4C.8A — accessible closed-encounter lock badge for lists and headers.
 * Text + icon; never color-only.
 */
export function EnterpriseClosedEncounterLockBadge(props?: {
  closedAtLabel?: string | null;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const label = t("enterpriseClosedEncounterD4c8a.lock.label");
  const title = props?.closedAtLabel
    ? `${label} — ${props.closedAtLabel}`
    : label;

  return (
    <span
      data-testid="enterprise-closed-encounter-lock"
      role="status"
      aria-label={title}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: props?.compact ? "2px 8px" : "4px 10px",
        borderRadius: 9999,
        fontSize: props?.compact ? 11 : 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        background: "#f4f4f5",
        color: "#3f3f46",
        border: "1px solid #d4d4d8",
        whiteSpace: "nowrap",
      }}
    >
      <EncounterLockIcon />
      <span>{label}</span>
    </span>
  );
}
