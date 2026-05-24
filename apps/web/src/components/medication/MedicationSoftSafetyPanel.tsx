"use client";

import React from "react";
import {
  getMedicationSafetyWarnings,
  type MedicationSafetyCatalogInput,
  type MedicationSafetyWarning,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { normalizeMedicationDisplayForLocale } from "@/lib/localizedMedicationDisplay";
import type { CreateOrderLineItem } from "@/components/orders/createOrderModal/types";

export function orderLineToMedicationSafetyCatalogInput(line: CreateOrderLineItem): MedicationSafetyCatalogInput {
  const s = line._safetyCatalog;
  return {
    code: s?.code,
    name: s?.name,
    displayName: s?.displayName ?? line._label,
    genericName: s?.genericName,
    therapeuticClass: s?.therapeuticClass,
    commonAliases: s?.commonAliases,
    isControlled: line._isControlled,
    controlledSchedule: line._controlledSchedule,
    strength: line.strength,
    route: line.route,
    manualLabel: line.isManual ? (line.manualLabel ?? line._label) : undefined,
  };
}

export function medicationSoftSafetyWarningsForOrderLine(
  line: CreateOrderLineItem,
  allMedicationLines: CreateOrderLineItem[]
): MedicationSafetyWarning[] {
  const self = orderLineToMedicationSafetyCatalogInput(line);
  const siblings = allMedicationLines
    .filter((x) => x._lineId !== line._lineId && x.catalogItemType === "MEDICATION")
    .map(orderLineToMedicationSafetyCatalogInput);
  return getMedicationSafetyWarnings(self, { siblingMedications: siblings });
}

function translateRule(t: (key: string) => string, ruleId: string): string {
  const key = `medicationSoftSafety.rules.${ruleId}`;
  const msg = t(key);
  if (msg === key) {
    return t("medicationSoftSafety.ruleFallback").replace("{ruleId}", ruleId);
  }
  return msg;
}

function translateCategory(t: (key: string) => string, category: MedicationSafetyWarning["category"]): string {
  const key = `medicationSoftSafety.categoryTag.${category}`;
  const msg = t(key);
  if (msg === key) return category;
  return msg;
}

export function MedicationSoftSafetyPanel({
  warnings,
  density = "default",
  therapeuticClass,
}: {
  warnings: MedicationSafetyWarning[];
  density?: "default" | "compact";
  /** Raw catalog therapeutic class — display-only normalization; not used for rule matching. */
  therapeuticClass?: string | null;
}) {
  const { t, language } = useI18n();
  const visible = warnings.filter((w) => w.category !== "CONTROLLED_SUBSTANCE");
  const therapeuticClassDisplay =
    visible.length > 0 && therapeuticClass?.trim()
      ? normalizeMedicationDisplayForLocale(therapeuticClass, language)
      : "";
  if (visible.length === 0) return null;

  const heading =
    density === "compact" ? t("medicationSoftSafety.panelTitleInline") : t("medicationSoftSafety.panelTitle");

  return (
    <div
      role="status"
      style={{
        marginTop: density === "compact" ? 8 : 10,
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #fcd34d",
        backgroundColor: "#fffbeb",
        fontSize: density === "compact" ? 12 : 13,
        color: "#78350f",
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6, color: "#92400e" }}>{heading}</div>
      {therapeuticClassDisplay ? (
        <div style={{ fontSize: 12, color: "#92400e", marginBottom: visible.length > 0 ? 8 : 0 }}>
          {t("medicationSoftSafety.therapeuticClassLabel")}: {therapeuticClassDisplay}
        </div>
      ) : null}
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {visible.map((w) => (
          <li key={`${w.category}-${w.ruleId}`} style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.02em" }}>
              {translateCategory(t, w.category)}
            </span>
            {" — "}
            {translateRule(t, w.ruleId)}
          </li>
        ))}
      </ul>
    </div>
  );
}
