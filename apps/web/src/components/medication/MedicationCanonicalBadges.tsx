"use client";

import type { CSSProperties } from "react";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { useI18n } from "@/lib/i18n";

function chipStyle(kind: "neutral" | "warn" | "danger" | "ok"): CSSProperties {
  if (kind === "danger") return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
  if (kind === "warn") return { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" };
  if (kind === "ok") return { background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0" };
  return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
}

/** Read-only canonical master badges for medication search rows (Phase 19C.2). Aliases stay search-only. */
export function MedicationCanonicalBadges({ item }: { item: CatalogSearchItem }) {
  const { t } = useI18n();
  const badges = item.metadata?.canonicalReadOnly?.badges;
  if (!badges) return null;

  const chips: Array<{ key: string; label: string; kind: "neutral" | "warn" | "danger" | "ok" }> = [];
  if (badges.edFormulary) chips.push({ key: "ed", label: t("pharmacyMedicationSearch.badgeEd"), kind: "ok" });
  if (badges.rsi) chips.push({ key: "rsi", label: t("pharmacyMedicationSearch.badgeRsi"), kind: "warn" });
  if (badges.crashCart) chips.push({ key: "crash", label: t("pharmacyMedicationSearch.badgeCrashCart"), kind: "warn" });
  if (badges.infusion) chips.push({ key: "inf", label: t("pharmacyMedicationSearch.badgeInfusion"), kind: "neutral" });
  if (badges.controlled) chips.push({ key: "ctrl", label: t("pharmacyMedicationSearch.badgeControlled"), kind: "danger" });
  if (badges.highAlert) chips.push({ key: "ha", label: t("pharmacyMedicationSearch.badgeHighAlert"), kind: "danger" });
  if (badges.billingReview) chips.push({ key: "bill", label: t("pharmacyMedicationSearch.badgeBillingReview"), kind: "warn" });
  if (badges.ndcPresent) {
    chips.push({ key: "ndc", label: t("pharmacyMedicationSearch.badgeNdcPresent"), kind: "ok" });
  } else {
    chips.push({ key: "ndc-m", label: t("pharmacyMedicationSearch.badgeNdcMissing"), kind: "warn" });
  }

  if (chips.length === 0) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {chips.map((c) => (
          <span
            key={c.key}
            style={{
              ...chipStyle(c.kind),
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: 9999,
            }}
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
