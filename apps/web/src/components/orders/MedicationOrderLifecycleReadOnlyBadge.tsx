"use client";

import React, { useMemo } from "react";
import {
  buildMedicationOrderLifecycleSummaryLineKeys,
  extractMedicationOrderLifecycleInputFromItem,
  resolveMedicationOrderLifecycleDisplay,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { medicationOrderLifecycleStatusLabelKey } from "@/lib/medicationOrderLifecycleApi";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import type { SupportedLanguage } from "@/i18n/config";

export type MedicationOrderLifecycleReadOnlyBadgeProps = {
  item: Record<string, unknown>;
  orders?: unknown[];
  language?: SupportedLanguage;
  compact?: boolean;
  replacementHref?: string | null;
};

export function MedicationOrderLifecycleReadOnlyBadge({
  item,
  orders = [],
  language,
  compact = false,
  replacementHref = null,
}: MedicationOrderLifecycleReadOnlyBadgeProps) {
  const { t, language: locale } = useI18n();
  const lang = language ?? locale;

  const display = useMemo(() => {
    const input = extractMedicationOrderLifecycleInputFromItem(item, orders);
    return resolveMedicationOrderLifecycleDisplay(input);
  }, [item, orders]);

  if (!display.showLifecycleBadge) return null;

  const lineKeys = buildMedicationOrderLifecycleSummaryLineKeys(display);
  const statusLabel = t(medicationOrderLifecycleStatusLabelKey(display.status));
  const formatWhen = (iso: string | null) => {
    if (!iso?.trim()) return "—";
    try {
      return formatEncounterChromeDateTime(iso, lang);
    } catch {
      return iso;
    }
  };

  const badgeStyle: React.CSSProperties = compact
    ? {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        color: "#92400e",
        background: "#fef3c7",
        border: "1px solid #fcd34d",
      }
    : {
        marginTop: 6,
        padding: "8px 10px",
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 1.45,
        color: "#78350f",
        background: "#fffbeb",
        border: "1px solid #fde68a",
      };

  const lines: React.ReactNode[] = [];
  for (const key of lineKeys) {
    if (key === "status") {
      lines.push(
        <div key={key}>
          <strong>{t("medicationOrderLifecycle.summary.status")}:</strong> {statusLabel}
        </div>
      );
    } else if (key === "reason" && display.reason) {
      lines.push(
        <div key={key}>
          <strong>{t("medicationOrderLifecycle.summary.reason")}:</strong> {display.reason}
        </div>
      );
    } else if (key === "effectiveAt" && display.effectiveAtIso) {
      lines.push(
        <div key={key}>
          <strong>{t("medicationOrderLifecycle.summary.effectiveAt")}:</strong>{" "}
          {formatWhen(display.effectiveAtIso)}
        </div>
      );
    } else if (key === "provider" && display.providerDisplay) {
      lines.push(
        <div key={key}>
          <strong>{t("medicationOrderLifecycle.summary.provider")}:</strong> {display.providerDisplay}
        </div>
      );
    } else if (key === "note" && display.note) {
      lines.push(
        <div key={key}>
          <strong>{t("medicationOrderLifecycle.summary.note")}:</strong> {display.note}
        </div>
      );
    } else if (key === "replacement" && (display.replacementOrderItemId || display.replacesOrderItemId)) {
      lines.push(
        <div key={key}>
          <strong>{t("medicationOrderLifecycle.summary.replacement")}:</strong>{" "}
          {display.replacementOrderItemId ? (
            replacementHref ? (
              <a href={replacementHref}>{display.replacementOrderItemId.slice(0, 8)}…</a>
            ) : (
              display.replacementOrderItemId.slice(0, 8) + "…"
            )
          ) : display.replacesOrderItemId ? (
            t("medicationOrderLifecycle.summary.replacesOrder").replace(
              "{id}",
              display.replacesOrderItemId.slice(0, 8) + "…"
            )
          ) : null}
        </div>
      );
    } else if (key === "previousDose" && display.previousDoseSummary) {
      lines.push(
        <div key={key}>
          <strong>{t("medicationOrderLifecycle.summary.previousDose")}:</strong> {display.previousDoseSummary}
        </div>
      );
    } else if (key === "newDose" && display.doseSummary) {
      lines.push(
        <div key={key}>
          <strong>{t("medicationOrderLifecycle.summary.newDose")}:</strong> {display.doseSummary}
        </div>
      );
    } else if (key === "governanceDeferred" && display.isGovernanceDeferred) {
      lines.push(
        <div key={key} style={{ fontSize: 11, color: "#92400e" }}>
          {t("medicationOrderLifecycle.summary.governanceDeferred")}
        </div>
      );
    }
  }

  return (
    <div data-testid="medication-order-lifecycle-badge" style={badgeStyle}>
      {compact ? (
        <span>{statusLabel}</span>
      ) : (
        <div style={{ display: "grid", gap: 2 }}>{lines}</div>
      )}
    </div>
  );
}

export function formatMedicationOrderLifecycleSummaryText(input: {
  item: Record<string, unknown>;
  orders?: unknown[];
  language: SupportedLanguage;
  t: (key: string) => string;
}): string | null {
  const lifecycleInput = extractMedicationOrderLifecycleInputFromItem(input.item, input.orders ?? []);
  const display = resolveMedicationOrderLifecycleDisplay(lifecycleInput);
  if (!display.showLifecycleBadge) return null;
  const statusLabel = input.t(medicationOrderLifecycleStatusLabelKey(display.status));
  const parts = [`${input.t("medicationOrderLifecycle.summary.status")}: ${statusLabel}`];
  if (display.reason) {
    parts.push(`${input.t("medicationOrderLifecycle.summary.reason")}: ${display.reason}`);
  }
  if (display.effectiveAtIso) {
    try {
      parts.push(
        `${input.t("medicationOrderLifecycle.summary.effectiveAt")}: ${formatEncounterChromeDateTime(display.effectiveAtIso, input.language)}`
      );
    } catch {
      parts.push(`${input.t("medicationOrderLifecycle.summary.effectiveAt")}: ${display.effectiveAtIso}`);
    }
  }
  if (display.providerDisplay) {
    parts.push(`${input.t("medicationOrderLifecycle.summary.provider")}: ${display.providerDisplay}`);
  }
  if (display.previousDoseSummary && display.status === "SUPERSEDED") {
    parts.push(`${input.t("medicationOrderLifecycle.summary.previousDose")}: ${display.previousDoseSummary}`);
  }
  if (display.doseSummary && display.replacesOrderItemId) {
    parts.push(`${input.t("medicationOrderLifecycle.summary.newDose")}: ${display.doseSummary}`);
  }
  if (display.isGovernanceDeferred) {
    parts.push(input.t("medicationOrderLifecycle.summary.governanceDeferred"));
  }
  return parts.join(" · ");
}
