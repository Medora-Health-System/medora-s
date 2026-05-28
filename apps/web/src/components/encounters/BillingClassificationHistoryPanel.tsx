"use client";

import type { BillingClassificationTransitionEntry } from "@medora/shared";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

type Props = {
  transitions: unknown;
  currentClassification: string | null | undefined;
  createdAt?: string | null;
};

function parseTransitions(raw: unknown): BillingClassificationTransitionEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is BillingClassificationTransitionEntry =>
      e != null &&
      typeof e === "object" &&
      typeof (e as BillingClassificationTransitionEntry).from === "string" &&
      typeof (e as BillingClassificationTransitionEntry).to === "string" &&
      typeof (e as BillingClassificationTransitionEntry).changedAt === "string",
  );
}

/** Append-only, immutable billing classification conversion timeline (PHI-safe). */
export function BillingClassificationHistoryPanel({ transitions, currentClassification, createdAt }: Props) {
  const { t, language } = useI18n();
  const entries = parseTransitions(transitions);
  const current = (currentClassification ?? "").trim();
  const initialClassification = entries.length > 0 ? entries[0].from : current;

  if (entries.length === 0 && !current) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: MEDORA_CARD_SHELL.background,
        border: MEDORA_CARD_SHELL.border,
        borderRadius: MEDORA_CARD_SHELL.radius,
        boxShadow: MEDORA_CARD_SHELL.boxShadow,
        padding: "16px 18px",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
        {t("billingClassification.historyTitle")}
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
        {t("billingClassification.historyIntro")}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {createdAt && initialClassification ? (
          <li
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 600, color: "#0f172a" }}>
              {t("billingClassification.historyOpenedAs").replace(
                "{classification}",
                t(`encounterChrome.billingClassification.${initialClassification}`),
              )}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {formatEncounterChromeDateTime(createdAt, language)}
            </div>
          </li>
        ) : null}
        {entries.map((entry, idx) => (
          <li
            key={`${entry.changedAt}-${entry.from}-${entry.to}-${idx}`}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              backgroundColor: "#fff",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 600, color: "#0f172a" }}>
              {t("billingClassification.historyConverted")
                .replace("{from}", t(`encounterChrome.billingClassification.${entry.from}`))
                .replace("{to}", t(`encounterChrome.billingClassification.${entry.to}`))}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {formatEncounterChromeDateTime(entry.changedAt, language)}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {t("billingClassification.historyReason")}:{" "}
              {t(`billingClassification.reasonCodes.${entry.reasonCode}`)}
            </div>
            {entry.patientAcknowledged ? (
              <div style={{ fontSize: 12, color: "#059669", marginTop: 2, fontWeight: 600 }}>
                {t("billingClassification.historyAckCaptured")}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
